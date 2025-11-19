#!/bin/bash

echo "Starting Jroute Chat Application..."
echo "------------------------------------------------"
echo "This script will start the backend server."
echo "Before running, please ensure you have:"
echo "  1. Created a Python virtual environment (e.g., 'python3 -m venv venv')"
echo "  2. Activated it (e.g., 'source venv/bin/activate')"
echo "  3. Installed requirements (e.g., 'pip install -r backend/requirements.txt')"
echo "------------------------------------------------"

echo "Ensuring file directories..."
mkdir -p backend/uploads
mkdir -p backend/shared_files
mkdir -p backend/chunks

echo "Setting execution permissions for J-Transport Protocol..."

if [ -f backend/jtransport.sh ]; then
    chmod +x backend/jtransport.sh
    echo "  -> backend/jtransport.sh [OK]"
else
    echo "  -> WARNING: backend/jtransport.sh not found!"
fi

if [ -f backend/j_byte_extractor.sh ]; then
    chmod +x backend/j_byte_extractor.sh
    echo "  -> backend/j_byte_extractor.sh [OK]"
else
    echo "  -> WARNING: backend/j_byte_extractor.sh not found!"
fi

if [ -f backend/clean_storage.sh ]; then
    chmod +x backend/clean_storage.sh
    echo "  -> backend/clean_storage.sh [OK]"
fi

echo "Setup complete."

IP_ADDRESS=$(ip route get 1.1.1.1 2>/dev/null | awk -F"src " 'NR==1{split($2,a," ");print a[1]}')

if [ -z "$IP_ADDRESS" ]; then
   
    IP_ADDRESS="localhost"
fi

echo "Starting server on 0.0.0.0:8000..."
echo ""
echo "You can access the chat locally at:"
echo "  http://localhost:8000/"
echo ""
echo "Other users on your LAN can access it at:"
echo "  http://$IP_ADDRESS:8000/"
echo "(If that IP doesn't work, find your LAN IP manually using 'ip addr' or 'ifconfig')"
echo "------------------------------------------------"
echo "Press Ctrl+C to stop the server."

uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload