"""
LiveKit Agent for Echo Health
Real-time transcription and note generation agent for healthcare encounters
Based on the note-taking-assistant implementation pattern
"""
import base64
import os
import logging
import asyncio
import json
import re
import multiprocessing
from pathlib import Path
from dotenv import load_dotenv

# Set multiprocessing start method early to avoid issues with PyAV imports
# Using 'fork' on macOS/Linux avoids re-importing modules in child processes,
# which can prevent KeyboardInterrupt errors during worker process spawn
# Note: These errors are non-fatal - the worker will eventually start successfully
try:
    # Try fork first (faster, avoids re-imports)
    multiprocessing.set_start_method('fork', force=True)
except (RuntimeError, ValueError):
    # Fallback to spawn if fork is not available (e.g., on Windows)
    try:
        multiprocessing.set_start_method('spawn', force=True)
    except RuntimeError:
        # Already set, ignore
        pass

from livekit.agents import JobContext, WorkerOptions, cli, metrics
from livekit.agents.voice import Agent, AgentSession, MetricsCollectedEvent
from livekit.agents.llm import ChatContext, ChatMessage
from livekit.plugins import openai, silero, deepgram
from livekit.agents.telemetry import set_tracer_provider
from typing import List

load_dotenv(dotenv_path=Path(__file__).parent / '.env')
usage_collector = metrics.UsageCollector()
logger = logging.getLogger("echo_health_agent")
logger.setLevel(logging.INFO)


def setup_langfuse(
    host: str | None = None, public_key: str | None = None, secret_key: str | None = None
):
    """Setup Langfuse tracing if configured"""
    try:
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor

        public_key = public_key or os.getenv("LANGFUSE_PUBLIC_KEY")
        secret_key = secret_key or os.getenv("LANGFUSE_SECRET_KEY")
        host = host or os.getenv("LANGFUSE_HOST")

        if not public_key or not secret_key or not host:
            logger.info("Langfuse not configured, skipping telemetry setup")
            return

        langfuse_auth = base64.b64encode(f"{public_key}:{secret_key}".encode()).decode()
        os.environ["OTEL_EXPORTER_OTLP_ENDPOINT"] = f"{host.rstrip('/')}/api/public/otel"
        os.environ["OTEL_EXPORTER_OTLP_HEADERS"] = f"Authorization=Basic {langfuse_auth}"

        trace_provider = TracerProvider()
        trace_provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
        set_tracer_provider(trace_provider)
        logger.info("✅ Langfuse telemetry configured")
    except Exception as e:
        logger.warning(f"Failed to setup Langfuse: {e}")


class EchoHealthAssistant:
    """Real-time transcription and note generation assistant for Echo Health"""
    
    def __init__(self, ctx: JobContext):
        self.transcriptions: List[str] = []
        self.current_notes: str = ""
        self.note_update_task = None
        # Keep a running copy of the full transcript text
        self.full_transcript: str = ""
        # Remember the last transcription snippet sent to the frontend to avoid duplicates
        self._last_transcription_sent: str = ""
        # Create LLM instance - use OpenAI by default, or Cerebras if configured
        llm_provider = os.getenv("LLM_PROVIDER", "openai").lower()
        if llm_provider == "cerebras":
            self.llm = openai.LLM.with_cerebras(model=os.getenv("CEREBRAS_MODEL", "gpt-oss-120b"))
        else:
            # Use OpenAI GPT-4 or GPT-3.5
            model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
            self.llm = openai.LLM(model=model)
        # Store context for RPC communication
        self.ctx = ctx

    def build_display_transcript(self, partial: str | None = None, max_sentences: int = 3) -> str:
        """Return a trimmed transcript preview for the frontend."""
        segments: List[str] = []
        if self.full_transcript.strip():
            segments.append(self.full_transcript.strip())
        if partial and partial.strip():
            segments.append(partial.strip())

        combined = " ".join(segments).strip()
        if not combined:
            return ""

        sentences = [match.group().strip() for match in re.finditer(r'[^.!?]+[.!?]?', combined)]
        if not sentences:
            sentences = [combined]

        recent = sentences[-max_sentences:]
        return " ".join(recent).strip()

    async def update_notes(self, transcript: str):
        """Send the full transcript to LLM and update notes"""
        if not transcript.strip():
            logger.info("Skipping note update because transcript is empty")
            return
        try:
            # Send to LLM for processing
            prompt = f"""
                You are a medical note-taking assistant for a voice-based encounter between a healthcare provider and a patient. 
                You will get a transcript of what is being said, and your job is to take structured medical notes.
                
                Current Notes:
                {self.current_notes if self.current_notes else "(No notes yet)"}

                Transcript So Far:
                {transcript}

                Instructions:
                You should try to track:
                - Chief complaints
                - History of present illness
                - Past medical history
                - Current medications
                - Allergies
                - Vital signs (if mentioned)
                - Physical examination findings
                - Assessment and plan

                Only add headers for this information if it is explicitly discussed in the transcription.
                If it is not discussed, do not add any headers for that topic.

                - Integrate the new information into the existing notes if there is any information that should be included.
                - Your job is to capture the spirit of the conversation and the key points that are being discussed, but you don't need to
                include every single thing that is said
                - Never add any information that is not in the transcription.
                - Never add notes about things that should be "confirmed" or "asked" to the patient that haven't been discussed.
                - Your job is exclusively to capture what has been discussed, not keep track of what SHOULD be discussed.
                - Only ever add information that is explicitly discussed in the transcription.
                - Keep the notes organized and structured in a medical format
                - Return the complete set of notes. If no update is required, repeat the existing notes verbatim.

                Updated Notes:
            """

            ctx = ChatContext([
                ChatMessage(
                    type="message",
                    role="system",
                    content=["""
                             You are an intelligent note-taking medical assistant that creates well-organized, comprehensive notes from patient & provider transcriptions.
                             - Never add any information that is not in the transcription.
                             - Never add notes about things that should be "confirmed" or "asked" to the patient that haven't been discussed.
                             - Your job is exclusively to capture what has been discussed, not keep track of what SHOULD be discussed.
                             - Format notes in a clear, structured medical format suitable for clinical documentation.
                             """]
                ),
                ChatMessage(
                    type="message",
                    role="user",
                    content=[prompt]
                )
            ])

            response = ""
            async with self.llm.chat(chat_ctx=ctx) as stream:
                async for chunk in stream:
                    if not chunk:
                        continue
                    content = getattr(chunk.delta, 'content', None) if hasattr(chunk, 'delta') else str(chunk)
                    if content:
                        response += content

            self.current_notes = response.strip()

            # Send updated notes to frontend via RPC
            await self.send_notes_to_frontend()

        except Exception as e:
            logger.error(f"Error updating notes: {e}")

    async def send_notes_to_frontend(self):
        """Send current notes and transcriptions to frontend via RPC"""
        try:
            # Get remote participants
            remote_participants = list(self.ctx.room.remote_participants.values())
            if not remote_participants:
                logger.info("No remote participants found to send notes")
                return

            # Send to the first remote participant (the frontend)
            client_participant = remote_participants[0]

            # Send notes via RPC
            await self.ctx.room.local_participant.perform_rpc(
                destination_identity=client_participant.identity,
                method="receive_notes",
                payload=json.dumps({
                    "notes": self.current_notes,
                    "transcriptions": self.transcriptions,
                    "timestamp": asyncio.get_event_loop().time()
                })
            )
            logger.info(f"Sent notes to frontend ({client_participant.identity})")
        except Exception as e:
            logger.error(f"Error sending notes via RPC: {e}")

    async def send_transcription_to_frontend(self, transcription: str):
        """Send the current transcript to frontend via RPC"""
        if not transcription:
            return
        if transcription == self._last_transcription_sent:
            return
        previous_sent = self._last_transcription_sent
        self._last_transcription_sent = transcription
        try:
            # Get remote participants
            remote_participants = list(self.ctx.room.remote_participants.values())
            if not remote_participants:
                logger.info("No remote participants found to send transcription")
                self._last_transcription_sent = previous_sent
                return

            # Send to the first remote participant (the frontend)
            client_participant = remote_participants[0]

            # Send transcription via RPC
            await self.ctx.room.local_participant.perform_rpc(
                destination_identity=client_participant.identity,
                method="receive_transcription",
                payload=json.dumps({
                    "transcription": transcription,
                    "timestamp": asyncio.get_event_loop().time()
                })
            )
            logger.info(f"Sent transcription to frontend: {transcription[:50]}...")
        except Exception as e:
            self._last_transcription_sent = previous_sent
            logger.error(f"Error sending transcription via RPC: {e}")


async def entrypoint(ctx: JobContext):
    """Entry point for the Echo Health transcription and note generation agent"""
    setup_langfuse()  # set up the langfuse tracer if configured

    # Set up exception handler for unhandled exceptions in async tasks
    def handle_exception(loop, context):
        """Handle unhandled exceptions in async tasks"""
        exception = context.get('exception')
        if exception:
            # Suppress known race condition errors in LiveKit track publications
            if isinstance(exception, KeyError) and 'track_publications' in str(exception):
                logger.debug(f"Ignoring track publication race condition: {exception}")
                return
            # Log other exceptions
            logger.error(f"Unhandled exception in async task: {exception}", exc_info=exception)
        else:
            # Log other context errors
            logger.error(f"Unhandled error in async task: {context}")
    
    # Set the exception handler for the current event loop
    loop = asyncio.get_event_loop()
    loop.set_exception_handler(handle_exception)

    session = AgentSession()

    # Create the agent with Deepgram STT
    agent = Agent(
        instructions="""
            You are a medical transcription and note-taking assistant for Echo Health.
            Your role is to transcribe conversations and generate structured medical notes in real-time.
        """,
        stt=deepgram.STT(model="nova-2-general"),
        vad=silero.VAD.load()
    )

    # Create Echo Health assistant
    health_assistant = EchoHealthAssistant(ctx)

    @session.on("user_input_transcribed")
    def on_transcript(transcript):
        try:
            logger.info(f"Transcript received: {transcript}")
            fragment = transcript.transcript.strip()
            if not fragment:
                return

            if transcript.is_final:
                health_assistant.transcriptions.append(fragment)
                if health_assistant.full_transcript:
                    health_assistant.full_transcript = f"{health_assistant.full_transcript} {fragment}"
                else:
                    health_assistant.full_transcript = fragment

                display_text = health_assistant.build_display_transcript()
                asyncio.create_task(
                    health_assistant.send_transcription_to_frontend(display_text)
                )

                logger.info(f"Transcript updated: {fragment}")

                # Cancel previous note update task if still running
                if health_assistant.note_update_task and not health_assistant.note_update_task.done():
                    health_assistant.note_update_task.cancel()

                # Start new note update task
                health_assistant.note_update_task = asyncio.create_task(
                    health_assistant.update_notes(health_assistant.full_transcript)
                )
            else:
                # Interim transcription - send to frontend for live display
                display_text = health_assistant.build_display_transcript(partial=fragment)
                asyncio.create_task(
                    health_assistant.send_transcription_to_frontend(display_text)
                )
        except Exception as e:
            logger.error(f"Error in transcript handler: {e}", exc_info=True)

    @session.on("metrics_collected")
    def _on_metrics_collected(ev: MetricsCollectedEvent):
        try:
            usage_collector.collect(ev.metrics)
        except Exception as e:
            logger.error(f"Error collecting metrics: {e}")

    async def log_usage():
        try:
            summary = usage_collector.get_summary()
            logger.info(f"Usage: {summary}")
        except Exception as e:
            logger.error(f"Error logging usage: {e}")

    logger.info("Echo Health assistant started. Listening for transcriptions...")

    try:
        await session.start(
            agent=agent,
            room=ctx.room
        )
    except Exception as e:
        logger.error(f"Error starting session: {e}", exc_info=True)
        raise
    finally:
        ctx.add_shutdown_callback(log_usage)


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
