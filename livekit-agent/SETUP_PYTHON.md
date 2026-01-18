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
