#!/bin/bash
# OutreachPro - Start Backend
set -e

cd "$(dirname "$0")/backend"

echo "🚀 Starting OutreachPro Backend..."

# Create virtual env if not exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

echo "📦 Installing dependencies..."
pip install -q -r requirements.txt

echo "✅ Starting FastAPI server on http://localhost:8000"
uvicorn main:app --reload --port 8000 --host 0.0.0.0
