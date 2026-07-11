#!/usr/bin/env bash
set -euo pipefail

APP_NAME="site-murm"
LOCAL_DIR="/home/daniel/Code/site-murm"

REMOTE_USER="ubuntu"
REMOTE_HOST="44.219.174.82"
SSH_KEY="/home/daniel/amazon.ssh"

REMOTE_BASE="/home/sites"
REMOTE_DIR="$REMOTE_BASE/$APP_NAME"

if [ ! -d "$LOCAL_DIR" ]; then
  echo "ERRO: pasta local não encontrada: $LOCAL_DIR"
  exit 1
fi

if [ ! -f "$SSH_KEY" ]; then
  echo "ERRO: chave SSH não encontrada: $SSH_KEY"
  exit 1
fi

cd "$LOCAL_DIR"

echo "Verificando/criando pasta remota: $REMOTE_DIR"
ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" "
  set -e
  sudo mkdir -p '$REMOTE_DIR'
  sudo chown -R '$REMOTE_USER:$REMOTE_USER' '$REMOTE_BASE'
"

echo "Enviando arquivos de $LOCAL_DIR para $REMOTE_HOST:$REMOTE_DIR"
rsync -avz --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude dist \
  --exclude .astro \
  --exclude .env \
  --exclude '*.log' \
  --exclude '*.zip' \
  --exclude '*:Zone.Identifier' \
  -e "ssh -i $SSH_KEY" \
  "$LOCAL_DIR/" \
  "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/"

echo "Deploy de arquivos concluído."
echo "Agora rode: ./deploy/remote.run.sh"
