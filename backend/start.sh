#!/usr/bin/env bash
set -e

PORT="${PORT:-8001}"
HOST="${HOST:-0.0.0.0}"

echo "Starting FastAPI backend on $HOST:$PORT..."
exec uvicorn main:app --host "$HOST" --port "$PORT"

