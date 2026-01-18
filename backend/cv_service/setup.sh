#!/bin/bash

echo "🚀 Setting up YOLOv8 + Driver Monitoring System"
echo "================================================"

# Step 1: Create Python virtual environment
echo "1️⃣  Creating Python virtual environment..."
cd backend/cv_service
python -m venv venv

# Windows
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
  source venv/Scripts/activate
else
  # Linux/Mac
  source venv/bin/activate
fi

# Step 2: Install Python dependencies
echo "2️⃣  Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Download YOLOv8 model (first time only)
echo "3️⃣  Downloading YOLOv8 model..."
python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"

echo ""
echo "✅ Setup Complete!"
echo ""
echo "To start the CV service:"
echo "  cd backend/cv_service"
echo "  source venv/bin/activate  # Linux/Mac"
echo "  # OR venv\\Scripts\\activate.bat  # Windows"
echo "  python app.py"
echo ""
echo "The service will be available at: http://localhost:5000"
