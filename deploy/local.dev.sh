#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$APP_DIR/.env"

cd "$APP_DIR"

if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

DEV_PORT="${DEV_PORT:-4324}"

echo "────────────────────────────────────────"
echo "Projeto:    $APP_DIR"
echo "Env file:   $ENV_FILE"
echo "Dev port:   $DEV_PORT"
echo "URL local:  http://localhost:$DEV_PORT"
echo "────────────────────────────────────────"

rm -rf node_modules/.astro node_modules/.vite dist .astro

npm install
npm run dev -- --host 0.0.0.0 --port "$DEV_PORT" --force
