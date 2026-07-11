#!/usr/bin/env bash
set -euo pipefail

APP_NAME="site-murm"
REMOTE_USER="ubuntu"
REMOTE_HOST="44.219.174.82"
SSH_KEY="/home/daniel/amazon.ssh"

REMOTE_DIR="/home/sites/$APP_NAME"
APP_HOST="${APP_HOST:-127.0.0.1}"
APP_PORT="${APP_PORT:-3002}"

if [ ! -f "$SSH_KEY" ]; then
  echo "ERRO: chave SSH não encontrada: $SSH_KEY"
  exit 1
fi

echo "Executando install/build/start remoto em $REMOTE_HOST..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" "
  set -e

  cd '$REMOTE_DIR'

  echo 'Instalando dependências...'
  if [ -f package-lock.json ]; then
    npm ci
  else
    npm install
  fi

  echo 'Gerando build Astro...'
  npm run build

  echo 'Verificando PM2...'
  if ! command -v pm2 >/dev/null 2>&1; then
    echo 'PM2 não encontrado. Instalando...'
    sudo npm install -g pm2
  fi

  echo 'Subindo ou reiniciando aplicação PM2: $APP_NAME'
  if pm2 describe '$APP_NAME' >/dev/null 2>&1; then
    HOST='$APP_HOST' PORT='$APP_PORT' pm2 restart '$APP_NAME' --update-env
  else
    HOST='$APP_HOST' PORT='$APP_PORT' pm2 start dist/server/entry.mjs --name '$APP_NAME'
  fi

  pm2 save
  pm2 status '$APP_NAME'
  echo 'Aplicação ativa em $APP_HOST:$APP_PORT'
"

echo "Remote run concluído."
