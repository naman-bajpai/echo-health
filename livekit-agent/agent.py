"""
LiveKit Agent for Echo Health
Real-time transcription agent for healthcare encounters
"""
from dotenv import load_dotenv
import os
import json
import logging
import asyncio

from livekit import agents, rtc
from livekit.agents import (
    JobContext,
    WorkerOptions,
    cli,
    AutoSubscribe,
)
from livekit.plugins import deepgram, silero

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()


async def entrypoint(ctx: JobContext):
    """Entry point for the transcription agent"""
    logger.info(f"🚀 Healthcare transcription agent starting for room: {ctx.room.name}")
    
    # Wait for participants to join
    await ctx.wait_for_participants()
    
    logger.info("👥 Participants joined, starting transcription...")
    
    # Send test message to verify connection
    try:
        await ctx.room.local_participant.publish_data(
            data=json.dumps({
                "type": "transcription",
                "text": "Agent connected and ready for transcription",
                "final": True,
                "speaker": "system",
            }).encode(),
            kind=rtc.DataPacket_Kind.RELIABLE,
        )
        logger.info("✅ Test message sent")
    except Exception as e:
        logger.error(f"Error sending test message: {e}")
    
    # Initialize STT using Deepgram
    stt = deepgram.STT(model="nova-2", language="en-US")
    
    # Auto-subscribe to all audio tracks
    await AutoSubscribe(ctx.room).start()
    
    # Store active transcription tasks
    transcription_tasks = []
    
    async def process_audio_track(track: rtc.Track, participant: rtc.RemoteParticipant):
        """Process audio track and transcribe"""
        if track.kind != rtc.TrackKind.KIND_AUDIO:
            return
            
        logger.info(f"🎤 Processing audio track from {participant.identity}")
        
        # Create audio stream
        stream = rtc.AudioStream(track)
        
        # Buffer for accumulating audio
        audio_buffer = []
        buffer_size = 20  # Process every 20 frames (~1 second)
        
        async def transcribe_loop():
            try:
                frame_count = 0
                async for frame in stream:
                    audio_buffer.append(frame)
                    frame_count += 1
                    
                    # Process buffer periodically
                    if frame_count >= buffer_size:
                        if audio_buffer:
                            try:
                                # Transcribe accumulated audio
                                # Note: Deepgram STT expects audio frames
                                for audio_frame in audio_buffer:
                                    result = await stt.transcribe(audio_frame)
                                    
                                    if result and hasattr(result, 'text') and result.text:
                                        text = result.text.strip()
                                        if text and len(text) > 2:
                                            logger.info(f"📝 Transcription from {participant.identity}: '{text}'")
                                            
                                            # Send to room as data message
                                            try:
                                                await ctx.room.local_participant.publish_data(
                                                    data=json.dumps({
                                                        "type": "transcription",
                                                        "text": text,
                                                        "final": True,
                                                        "speaker": participant.identity,
                                                    }).encode(),
                                                    kind=rtc.DataPacket_Kind.RELIABLE,
                                                )
                                                logger.info(f"✅ Sent transcription: {text}")
                                            except Exception as e:
                                                logger.error(f"Error sending data: {e}")
                                
                                # Clear buffer
                                audio_buffer.clear()
                                frame_count = 0
                                
                            except Exception as e:
                                logger.error(f"Error transcribing: {e}")
                                
            except Exception as e:
                logger.error(f"Error in transcription loop: {e}")
        
        # Start transcription task
        task = asyncio.create_task(transcribe_loop())
        transcription_tasks.append(task)
        logger.info(f"✅ Started transcription task for {participant.identity}")
    
    # Process existing participants and their tracks
    for participant in ctx.room.remote_participants.values():
        logger.info(f"👤 Processing existing participant: {participant.identity}")
        for track_publication in participant.track_publications.values():
            if track_publication.track:
                await process_audio_track(track_publication.track, participant)
    
    # Handle new participants
    async def on_participant_connected(participant: rtc.RemoteParticipant):
        logger.info(f"👤 New participant connected: {participant.identity}")
        # Process their tracks when they publish
        for track_publication in participant.track_publications.values():
            if track_publication.track:
                await process_audio_track(track_publication.track, participant)
    
    ctx.room.on("participant_connected", on_participant_connected)
    
    # Handle track subscribed
    async def on_track_subscribed(
        track: rtc.Track,
        publication: rtc.TrackPublication,
        participant: rtc.RemoteParticipant,
    ):
        logger.info(f"🎤 Track subscribed: {track.kind} from {participant.identity}")
        if track.kind == rtc.TrackKind.KIND_AUDIO:
            await process_audio_track(track, participant)
    
    ctx.room.on("track_subscribed", on_track_subscribed)
    
    # Keep running
    try:
        logger.info("🔄 Agent running, waiting for audio...")
        # Wait for room to disconnect
        await ctx.room.wait_for_disconnect()
    except Exception as e:
        logger.error(f"Error in agent: {e}")
    finally:
        logger.info("🛑 Agent shutting down, cancelling tasks...")
        # Cancel all transcription tasks
        for task in transcription_tasks:
            task.cancel()
        await stt.aclose()
        logger.info("✅ Agent shutdown complete")


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
