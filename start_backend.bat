@echo off
echo ============================================================
echo Starting TypeForge AI FastAPI Backend (Local Dev Port 8001)
echo ============================================================
cd backend
if not exist venv (
    echo Creating Python virtual environment...
    python -m venv venv
)
call venv\Scripts\activate
echo Installing dependencies...
pip install -r requirements.txt
echo Launching Uvicorn server...
python -m uvicorn main:app --reload --port 8001
pause
