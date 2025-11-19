import json
import os
import shutil
import subprocess
from datetime import datetime
from typing import Dict, List

from fastapi import (FastAPI, File, Query, UploadFile, Request,
                     WebSocket, WebSocketDisconnect, HTTPException)
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="Jroute LAN Chat Backend")

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Directories ---
UPLOADS_DIR = "backend/uploads"
SHARED_FILES_DIR = "backend/shared_files"
CHUNKS_DIR = "backend/chunks"

for directory in [UPLOADS_DIR, SHARED_FILES_DIR, CHUNKS_DIR]:
    os.makedirs(directory, exist_ok=True)

# --- Connection Manager ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, nickname: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[nickname] = websocket

    def disconnect(self, nickname: str):
        if nickname in self.active_connections:
            del self.active_connections[nickname]

    def get_online_users(self) -> List[str]:
        return list(self.active_connections.keys())

    async def broadcast(self, message: str):
        for connection in self.active_connections.values():
            await connection.send_text(message)

manager = ConnectionManager()

# --- Helpers ---
def create_message(msg_type: str, name: str, text: str, filename: str = None) -> str:
    payload = {
        "type": msg_type,
        "name": name,
        "text": text,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }
    if filename:
        payload["filename"] = filename
    return json.dumps(payload)

# --- REST Endpoints ---
@app.get("/online-users")
async def get_online_users():
    return manager.get_online_users()

# --- J-TRANSPORT UPLOAD (UNIX LAB LOGIC) ---
@app.post("/upload")
async def upload_file(nickname: str = Query(...), file: UploadFile = File(...)):
    # 1. Ingestion
    safe_filename = file.filename.replace(" ", "_")
    temp_path = os.path.join(UPLOADS_DIR, safe_filename)
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {e}")

    # 2. ENCODE via Bash (Using jtransport.sh now)
    print(f"--- [PYTHON] Encoding {safe_filename} via J-Transport ---")
    try:
        encode_proc = subprocess.run(
            ["./backend/jtransport.sh", "encode", temp_path, "512k", safe_filename],
            capture_output=True, text=True, check=True
        )
        print(encode_proc.stderr) 
        
        encode_output = encode_proc.stdout.strip().split('\n')[-1]
        if not encode_output.startswith("SUCCESS:"):
             raise Exception(f"Bash Encoding Failed: {encode_output}")
        
        chunk_storage_path = encode_output.split("SUCCESS:")[1]
        
        # 3. DECODE via Bash (Immediate reassembly for availability)
        print(f"--- [PYTHON] Reassembling packets... ---")
        decode_proc = subprocess.run(
            ["./backend/jtransport.sh", "decode", chunk_storage_path, safe_filename],
            capture_output=True, text=True, check=True
        )
        print(decode_proc.stderr)

        decode_output = decode_proc.stdout.strip().split('\n')[-1]
        if not decode_output.startswith("SUCCESS:"):
             raise Exception("Integrity Check Failed")

        # 4. Cleanup
        os.remove(temp_path)

        # 5. Broadcast
        final_filename = decode_output.split("SUCCESS:")[1]
        file_msg = create_message(
            "file", nickname, 
            f"Transfer Complete via J-Transport.", final_filename
        )
        await manager.broadcast(file_msg)
        
        return {"status": "success", "file": final_filename}

    except subprocess.CalledProcessError as e:
        print(f"Bash Script Error: {e.stderr}")
        raise HTTPException(status_code=500, detail="J-Transport Layer Error")
    except Exception as e:
        print(f"Python Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- ADVANCED DOWNLOAD (MULTI-SOCKET SUPPORT) ---
@app.get("/download/{filename}")
async def download_file(filename: str, request: Request):
    file_path = os.path.join(SHARED_FILES_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    file_size = os.path.getsize(file_path)
    range_header = request.headers.get("Range")
    
    # If Range Header exists, use Unix 'dd' for byte extraction
    if range_header:
        try:
            start_byte, end_byte = map(int, range_header.strip().split('=')[1].split('-'))
            if end_byte >= file_size: end_byte = file_size - 1
            length = end_byte - start_byte + 1
            
            def bash_stream():
                process = subprocess.Popen(
                    ["./backend/j_byte_extractor.sh", file_path, str(start_byte), str(length)],
                    stdout=subprocess.PIPE, stderr=subprocess.PIPE
                )
                while True:
                    chunk = process.stdout.read(8192)
                    if not chunk: break
                    yield chunk
                process.stdout.close()
                process.wait()

            headers = {
                "Content-Range": f"bytes {start_byte}-{end_byte}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(length),
                "X-Protocol": "J-Transport-dd"
            }
            return StreamingResponse(bash_stream(), status_code=206, headers=headers, media_type="application/octet-stream")
            
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid Range")
    
    # Fallback to simple file response
    return FileResponse(file_path, media_type="application/octet-stream", filename=filename)

# --- WebSocket ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, name: str = Query(...)):
    if name in manager.get_online_users():
        await websocket.accept()
        await websocket.send_text(create_message("error", "System", "Nickname taken."))
        await websocket.close(code=1008)
        return

    await manager.connect(name, websocket)
    await manager.broadcast(create_message("join", name, f"{name} entered the grid."))

    try:
        while True:
            data = await websocket.receive_text()
            msg_data = json.loads(data)
            await manager.broadcast(create_message("message", msg_data["name"], msg_data["text"]))
    except WebSocketDisconnect:
        manager.disconnect(name)
        await manager.broadcast(create_message("leave", name, f"{name} disconnected."))
    except Exception:
        manager.disconnect(name)

app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")