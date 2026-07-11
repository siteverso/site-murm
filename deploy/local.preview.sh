#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

PREVIEW_HOST="${PREVIEW_HOST:-127.0.0.1}"
PREVIEW_PORT="${PREVIEW_PORT:-3002}"

cd "$APP_DIR"

npm install
npm run build
HOST="$PREVIEW_HOST" PORT="$PREVIEW_PORT" node dist/server/entry.mjs
