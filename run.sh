#!/bin/bash
echo "Starting Jroute Chat Application..."
echo "------------------------------------------------"
echo "This script will start the backend server."
echo "Before running, please ensure you have:"
echo "  1. Created a Python virtual environment (e.g., 'python3 -m venv venv')"
echo "  2. Activated it (e.g., 'source venv/bin/activate')"
echo "  3. Installed requirements (e.g., 'pip install -r backend/requirements.txt')"
echo "------------------------------------------------"

# --- PHASE 2 SETUP ---
echo "Ensuring file directories and permissions..."
mkdir -p backend/uploads
mkdir -p backend/shared_files
chmod +x process_upload.sh
echo "Setup complete."
# ---------------------

IP_ADDRESS=$(ip route get 1.1.1.1 | awk -F"src " 'NR==1{split($2,a," ");print a[1]}')

echo "Starting server on 0.0.0.0:8000..."
echo ""
echo "You can access the chat locally at:"
echo "  http://localhost:8000/"
echo ""
echo "Other users on your LAN can access it at:"
echo "  http://$IP_ADDRESS:8000/"
echo "(If that IP doesn't work, find your LAN IP manually and share that.)"
echo "------------------------------------------------"
echo "Press Ctrl+C to stop the server."

uvicorn backend.main:app --host 0.0.0.0 --port 8000 --app-dir .