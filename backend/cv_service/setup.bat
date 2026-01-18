@echo off
REM YOLOv8 + Driver Monitoring System Setup (Windows)

echo.
echo 🚀 Setting up YOLOv8 + Driver Monitoring System
echo ================================================
echo.

cd /d "%~dp0"

REM Step 1: Create Python virtual environment
echo 1️⃣  Creating Python virtual environment...
python -m venv venv

REM Step 2: Activate virtual environment
echo 2️⃣  Activating virtual environment...
call venv\Scripts\activate.bat

REM Step 3: Install dependencies
echo 3️⃣  Installing Python dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt

REM Step 4: Download YOLOv8 model
echo 4️⃣  Downloading YOLOv8 model (this may take a minute)...
python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"

echo.
echo ✅ Setup Complete!
echo.
echo To start the CV service, run: start_cv_service.bat
echo.
pause
