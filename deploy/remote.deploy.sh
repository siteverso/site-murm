#!/usr/bin/env bash
set -euo pipefail

APP="site-murm"
LOCAL="/home/daniel/Code/$APP"
REMOTE="ubuntu@44.219.174.82"
KEY="/home/daniel/amazon.ssh"
DEST="/home/sites/$APP"

echo "Preparando destino..."
ssh -i "$KEY" "$REMOTE" "sudo mkdir -p '$DEST' && sudo chown -R ubuntu:ubuntu '$DEST'"

echo "Enviando arquivos..."
rsync -az --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude dist \
  --exclude .astro \
  --exclude .env \
  --exclude '*.log' \
  --exclude '*.zip' \
  --exclude '*:Zone.Identifier' \
  -e "ssh -i $KEY" \
  "$LOCAL/" "$REMOTE:$DEST/"

echo "Arquivos enviados."