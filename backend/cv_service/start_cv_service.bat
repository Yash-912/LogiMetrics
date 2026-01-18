@echo off
REM Start CV Service (Windows)

echo.
echo 🎯 Starting CV Service...
echo.

cd /d "%~dp0"

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Start Flask app
echo CV Service running on: http://localhost:5000
echo Press Ctrl+C to stop
python app.py

pause
