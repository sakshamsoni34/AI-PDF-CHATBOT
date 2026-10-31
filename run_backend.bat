@echo off
cd /d "%~dp0backend"
echo Checking for previous instances on port 8001...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8001 ^| findstr LISTENING') do (
    echo Freeing port 8001 from PID %%a...
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul
echo Starting FastAPI Backend on port 8001...
if exist "..\..\.venv\Scripts\python.exe" (
    "..\..\.venv\Scripts\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
) else (
    "..\.venv\Scripts\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
)
pause
