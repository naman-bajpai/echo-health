# Python Setup for LiveKit Agent

## Problem
Python 3.14 is too new. LiveKit Agents requires Python >=3.10, <3.14.

## Solution: Install Python 3.13

### Option 1: Using Homebrew (Recommended)

```bash
# Install Python 3.13
brew install python@3.13

# Create venv with Python 3.13
cd livekit-agent
python3.13 -m venv venv

# Activate venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Option 2: Using pyenv

```bash
# Install pyenv if not installed
brew install pyenv

# Install Python 3.13
pyenv install 3.13.2

# Set local Python version
cd livekit-agent
pyenv local 3.13.2

# Create venv
python -m venv venv

# Activate venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## After Setup

Once Python 3.13 is installed and venv is created:

```bash
cd livekit-agent
source venv/bin/activate

# Set Deepgram key
export DEEPGRAM_API_KEY=your-key

# Deploy
lk agent create
```

## Known Issues

### KeyboardInterrupt Errors During Startup

If you see `KeyboardInterrupt` errors in the logs during agent startup (especially related to `av`, `propcache`, or multiprocessing), these are **expected and non-fatal**. They occur when worker processes are interrupted during import of C extensions (PyAV). The agent will eventually start successfully - look for the "registered worker" message in the logs. This is a known issue with Python 3.13 and heavy C extensions in multiprocessing contexts.

The code includes a workaround that sets the multiprocessing start method to 'fork' to minimize these errors.

### KeyError in track_publications

If you see `KeyError: 'TR_...'` errors related to `track_publications` in the logs, these are **expected and non-fatal**. They occur due to a race condition in LiveKit when tracks are published/unpublished rapidly. The agent continues to function normally - these errors are caught and handled internally. This is a known issue with LiveKit's internal event handling and doesn't affect transcription functionality.
