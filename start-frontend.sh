#!/bin/bash
# OutreachPro - Start Frontend
set -e

cd "$(dirname "$0")/frontend"

echo "🎨 Starting OutreachPro Frontend..."
echo "📡 Connecting to API at http://localhost:8000"
echo "🌐 Frontend will be available at http://localhost:3000"

npm run dev
