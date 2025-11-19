#!/bin/bash

# ==========================================
# J-TRANSPORT PROTOCOL (Layer 1: Bash)
# ==========================================

OPERATION=$1
INPUT_PATH=$2
ARG3=$3
ARG4=$4

GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

function log() {
    echo -e "${CYAN}[J-TP]${NC} $1"
}

if [ "$OPERATION" == "encode" ]; then
    # ARG3 = Chunk Size (e.g., 512k), ARG4 = Session ID/Filename
    FILE_PATH="$INPUT_PATH"
    CHUNK_SIZE="$ARG3"
    ID="$ARG4"
    
    STAGING_DIR="backend/chunks/$ID"
    
    log "Initiating Encoding Sequence for $ID"
    
    mkdir -p "$STAGING_DIR"
    
    # Generate Integrity Signature (SHA256)
    HASH=$(sha256sum "$FILE_PATH" | awk '{print $1}')
    echo "$HASH" > "$STAGING_DIR/integrity.sig"
    log "Integrity Signature Generated: ${GREEN}$HASH${NC}"
    
    # Split File into Packets
    split -b "$CHUNK_SIZE" -d --suffix-length=3 "$FILE_PATH" "$STAGING_DIR/packet_"
    
    echo "SUCCESS:$STAGING_DIR"
    exit 0

elif [ "$OPERATION" == "decode" ]; then
    # ARG3 = Output Filename
    CHUNKS_DIR="$INPUT_PATH"
    OUTPUT_FILENAME="$ARG3"
    DESTINATION="backend/shared_files/$OUTPUT_FILENAME"
    
    log "Initiating Decoding Sequence for $OUTPUT_FILENAME"
    
    # Reassemble Packets
    cat "$CHUNKS_DIR"/packet_* > "$DESTINATION"
    
    # Verify Integrity
    ORIGINAL_HASH=$(cat "$CHUNKS_DIR/integrity.sig")
    NEW_HASH=$(sha256sum "$DESTINATION" | awk '{print $1}')
    
    if [ "$ORIGINAL_HASH" == "$NEW_HASH" ]; then
        log "Integrity Check: ${GREEN}PASSED${NC}"
        rm -rf "$CHUNKS_DIR"
        echo "SUCCESS:$OUTPUT_FILENAME"
        exit 0
    else
        log "Integrity Check: ${RED}FAILED${NC}"
        mv "$DESTINATION" "$DESTINATION.corrupt"
        echo "ERROR:CORRUPT_FILE"
        exit 1
    fi
fi
