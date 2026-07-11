#!/usr/bin/env bash
set -euo pipefail

LOCAL_ENV="/home/daniel/Code/site-murm/.env"

REMOTE_USER="ubuntu"
REMOTE_HOST="44.219.174.82"
SSH_KEY="/home/daniel/amazon.ssh"
REMOTE_ENV="/home/sites/site-murm/.env"

if [ ! -f "$LOCAL_ENV" ]; then
  echo "ERRO: arquivo não encontrado: $LOCAL_ENV"
  exit 1
fi

echo "Enviando .env para $REMOTE_HOST:$REMOTE_ENV"

scp   -i "$SSH_KEY"   "$LOCAL_ENV"   "$REMOTE_USER@$REMOTE_HOST:$REMOTE_ENV"

ssh   -i "$SSH_KEY"   "$REMOTE_USER@$REMOTE_HOST"   "chmod 600 '$REMOTE_ENV'"

echo ".env enviado com sucesso."
echo "Agora rode: ./deploy/remote.run.sh"