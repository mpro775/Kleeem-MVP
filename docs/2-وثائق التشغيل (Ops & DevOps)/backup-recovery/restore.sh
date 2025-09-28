#!/usr/bin/env bash
set -euo pipefail

ARCHIVE="$1"
MONGO_URI=${MONGO_URI:-"mongodb://mongo:27017/kaleem"}

if [ -z "$ARCHIVE" ]; then
  echo "Usage: restore.sh <backup-archive.tar.gz>"
  exit 1
fi

WORK="/tmp/kaleem-restore"
rm -rf "$WORK"
mkdir -p "$WORK"
tar -xzf "$ARCHIVE" -C "$WORK"

echo "[*] Restore MongoDB"
mongorestore --uri="$MONGO_URI" "$WORK"/*/mongo

echo "[*] Qdrant snapshot restore: apply as needed (manual per collection)"
echo "[!] Redis RDB: place in /data/dump.rdb and restart Redis if required"
echo "[+] Done"
