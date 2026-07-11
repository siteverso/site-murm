#!/usr/bin/env bash
set -euo pipefail

APP="site-murm"
REMOTE="ubuntu@44.219.174.82"
KEY="/home/daniel/amazon.ssh"
DIR="/home/sites/$APP"
HOST="${APP_HOST:-127.0.0.1}"
PORT="${APP_PORT:-3002}"

ssh -i "$KEY" "$REMOTE" "
  set -e
  cd '$DIR'

  [ -f .env ] || { echo 'ERRO: .env não encontrado'; exit 1; }

  set -a
  source .env
  set +a

  echo 'Instalando dependências...'
  npm ci --omit=dev --no-audit --no-fund

  echo 'Gerando build...'
  npm run build

  [ -f dist/server/entry.mjs ] || {
    echo 'ERRO: build não gerou dist/server/entry.mjs'
    exit 1
  }

  command -v pm2 >/dev/null || sudo npm install -g pm2 --no-audit --no-fund

  echo 'Reiniciando aplicação...'
  if pm2 describe '$APP' >/dev/null 2>&1; then
    HOST='$HOST' PORT='$PORT' pm2 restart '$APP' --update-env
  else
    HOST='$HOST' PORT='$PORT' pm2 start dist/server/entry.mjs --name '$APP'
  fi

  pm2 save
  pm2 status '$APP'

  echo 'Testando aplicação...'
  sleep 2
  curl -fsS --max-time 10 'http://$HOST:$PORT' >/dev/null

  echo 'Produção atualizada.'
"