#!/bin/bash
echo "============================================================"
echo "Starting TypeForge AI FastAPI Backend (Local Dev Port 8001)"
echo "============================================================"
cd backend
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi
source venv/bin/activate
echo "Installing dependencies..."
pip install -r requirements.txt
echo "Launching Uvicorn server..."
python3 -m uvicorn main:app --reload --port 8001
