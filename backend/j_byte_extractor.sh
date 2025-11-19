#!/bin/bash

# ==========================================
# J-ROUTE BYTE EXTRACTOR
# Uses 'dd' for Zero-Copy partial streaming
# ==========================================

FILE_PATH=$1
START_BYTE=$2
LENGTH=$3

if [ ! -f "$FILE_PATH" ]; then
    exit 1
fi

# if=Input, bs=1(byte), skip=Offset, count=Length, status=none(silent)
dd if="$FILE_PATH" bs=1 skip="$START_BYTE" count="$LENGTH" status=none
