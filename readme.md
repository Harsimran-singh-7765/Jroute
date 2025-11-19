
# JROUTE: The LAN Underground

![Python](https://img.shields.io/badge/Python-3.9%2B-3776AB?logo=python&logoColor=white)
![Bash](https://img.shields.io/badge/Shell-Bash-4EAA25?logo=gnu-bash&logoColor=white)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)
![HTML5](https://img.shields.io/badge/Frontend-HTML5%2FJS-E34F26?logo=html5&logoColor=white)
![Network](https://img.shields.io/badge/Network-LAN%20Only-blue)

> "Ever heard of the Silk Road? That was global. This is local."
>
> **JROUTE** brings the spirit of the decentralized web to your college lab. No internet? No problem.

-----

## Overview

**JROUTE** is a zero-dependency, **LAN-native** real-time communication and file transport system. Built for environments with restricted internet access, it turns a single workstation into a central communication hub for an entire local network.

This project is unique in its leveraging of the **Unix Operating System** to handle data physics. It features a custom **Hybrid Transport Protocol (J-Transport)** where Python orchestrates the network traffic, but **Bash** executes the heavy lifting for file manipulation, utilizing low-level system calls (`split`, `cat`, `dd`) to achieve high-throughput data transfer on local hardware.

-----
## Screenshots

The Jroute interface is designed with a **Cyberpunk Terminal UI** aesthetic, prioritizing readability and visual feedback for the **J-Transport Protocol** status.

| Jroute Terminal View 
| :------------------ |
| <img src="image.png" alt="Main Jroute Terminal Screenshot" width="500"/> 

-----
## Key Features

* **Local-First Architecture:** Works entirely offline on a Local Area Network (WiFi/Ethernet).
* **Real-Time Relay:** WebSocket-based instant messaging with zero latency.
* **J-Transport Protocol:** A custom file transfer layer that uses **Unix System Calls** (`split`, `cat`, `sha256sum`) to ensure data integrity during packet transfer simulation.
* **Surgical Data Extraction:** Uses `dd` (Disk Dump) to stream large media files (400MB+) instantly without loading them into RAM, allowing for zero-copy partial content streaming.
* **Hybrid Backend:** Combines the ease of **FastAPI** (Python) for asynchronous network I/O with the power of **Bash** for command-line file processing.
* **Cyberpunk Terminal UI:** A "Diegetic" interface with scanlines, phosphor glow, and simulated terminal logs.
* **Anonymous:** No database, no accounts, session-based volatile identity.

-----

## The J-Transport Protocol

The **J-Transport Layer** avoids high-level language complexity by delegating core file operations to the operating system shell. This demonstrates effective **Inter-Process Communication (IPC)** between Python and Bash.

### Architecture: The General & The Soldier
* **Python (The General):** Manages connections, authentication, and routes.
* **Bash (The Soldier):** Handles the raw "Data Physics" (Moving bytes on the disk).

### How it works:

1.  **Ingestion:** FastAPI receives the raw binary stream from the client.
2.  **Fragmentation (Upload):** Python invokes `jtransport.sh`. Bash utilizes **`split`** to chop the file into 512KB binary packets and generates a **SHA-256** signature.
3.  **Reassembly (Verification):** The system uses **`cat`** to stitch packets back together and verifies the hash.
4.  **Surgical Streaming (Download):** When a user requests a large file (e.g., video), `j_byte_extractor.sh` uses **`dd`** to extract specific byte ranges instantly. This allows for 400MB+ files to be streamed with near-zero latency.

### Architecture Flowchart

```mermaid
graph TD
    subgraph Client_Side
        User[User Interface]
        WS[WebSocket Connection]
    end

    subgraph Server_Side_Python
        API[FastAPI Gateway]
        CM[Connection Manager]
    end

    subgraph Unix_Shell_Layer
        Bash[jtransport.sh]
        Extractor[j_byte_extractor.sh]
        Split[Binary Splitter: split]
        DD[Surgical Extractor: dd]
        Merge[Packet Merger: cat]
    end

    subgraph Filesystem
        Uploads[Raw Uploads]
        Chunks[Packet Chunks]
        Shared[Public Storage]
    end

    User -->|POST File| API
    API -->|Subprocess Call| Bash
    Bash -->|Process| Split
    Split -->|Write| Chunks
    Bash -->|Reassemble| Merge
    Merge -->|Finalize| Shared
    
    User -->|GET Range Request| API
    API -->|Subprocess Call| Extractor
    Extractor -->|Seek & Read| DD
    DD -->|Stream Bytes| API
    API -->|Stream Response| User
````

-----

## Project Structure

```text
jroute/
├── backend/
│   ├── j_byte_extractor.sh   # The "dd" Engine for partial content streaming
│   ├── jtransport.sh         # The Bash Protocol Brain (Splitting/Hashing/Merging)
│   ├── main.py               # FastAPI Controller (Orchestrator)
│   ├── requirements.txt      # Python Dependencies (fastapi, uvicorn)
│   ├── shared_files/         # Final destination for reassembled files
│   ├── upload.log            # Server events log
│   └── uploads/              # Temporary raw file ingestion zone
├── frontend/
│   ├── index.html            # The CRT Monitor UI Structure (HTML5)
│   ├── script.js             # Client Logic (WS, DOM & Bash Simulation Visuals)
│   └── styles.css            # CRT Effects (Custom CSS)
└── run.sh                    # One-click environment bootstrapper
```

-----

## Installation & Usage

### Prerequisites

  * **OS:** Linux (Arch, Ubuntu, Debian) or macOS.
  * **Python:** 3.9+ installed with `venv`.
  * **Tools:** `dos2unix` (Required for sanitizing scripts on some systems).

### 1\. Setup Environment

```bash
# Navigate to the project directory
cd jroute

# Create Virtual Environment
python -m venv venv
source venv/bin/activate

# Install Dependencies
pip install -r backend/requirements.txt python-multipart
```

### 2\. Sanitize & Authorize Scripts (Critical)

If you developed or copied files from a Windows environment, you must sanitize the Bash scripts to prevent `Exec format error` or `\r` errors.

**For Arch Linux / Ubuntu:**

```bash
# Install dos2unix (if not present)
sudo pacman -S dos2unix  # Arch
# sudo apt install dos2unix # Ubuntu

# Sanitize line endings
dos2unix backend/jtransport.sh backend/j_byte_extractor.sh

# Grant execution permissions
chmod +x backend/jtransport.sh backend/j_byte_extractor.sh
```

### 3\. Launch the Grid

```bash
# Run the server on 0.0.0.0 to expose it to the LAN
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### 4\. Connect

  * **Local:** `http://localhost:8000`
  * **LAN:** Find your IP (`ip addr` or `ifconfig`) and visit `http://<YOUR_IP>:8000` from any device on the network.

<!-- end list -->
