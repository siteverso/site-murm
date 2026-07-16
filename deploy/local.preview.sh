#!/usr/bin/env bash
# cd /home/daniel/Code/site-murm/deploy/
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$APP_DIR/.env"

[ -f "$ENV_FILE" ] || {
  echo "ERRO: $ENV_FILE não encontrado."
  exit 1
}

set -a
source "$ENV_FILE"
set +a

LOCAL_HOST="${SITE_MURM_LOCAL_HOST:?Defina SITE_MURM_LOCAL_HOST no .env}"
LOCAL_PORT="${SITE_MURM_LOCAL_PORT:?Defina SITE_MURM_LOCAL_PORT no .env}"

cd "$APP_DIR"

if ss -ltn "sport = :$LOCAL_PORT" 2>/dev/null | grep -q LISTEN; then
  echo "ERRO: a porta local $LOCAL_PORT já está ocupada."
  ss -ltnp "sport = :$LOCAL_PORT" || true
  exit 1
fi

npm install
npm run build
HOST="$LOCAL_HOST" PORT="$LOCAL_PORT" node dist/server/entry.mjs
