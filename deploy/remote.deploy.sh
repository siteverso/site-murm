#!/usr/bin/env bash
# cd /home/daniel/Code/site-murm/deploy/
set -euo pipefail

APP="site-murm"
LOCAL="/home/daniel/Code/$APP"
REMOTE="ubuntu@44.219.174.82"
KEY="/home/daniel/amazon.ssh"
DEST="/home/sites/$APP"
LOCAL_ENV="$LOCAL/.env"
PROD_ENV="$LOCAL/.env.prod"

[ -f "$LOCAL_ENV" ] || {
  echo "ERRO: $LOCAL_ENV não encontrado"
  exit 1
}

set -a
source "$LOCAL_ENV"
set +a

: "${SITE_MURM_REMOTE_HOST:?Defina SITE_MURM_REMOTE_HOST em $LOCAL_ENV}"
: "${SITE_MURM_REMOTE_PORT:?Defina SITE_MURM_REMOTE_PORT em $LOCAL_ENV}"

CONFIG_SOURCE="$LOCAL_ENV"
if [ -f "$PROD_ENV" ]; then
  CONFIG_SOURCE="$PROD_ENV"
fi

TEMP_ENV="$(mktemp)"
trap 'rm -f "$TEMP_ENV"' EXIT

cat "$CONFIG_SOURCE" > "$TEMP_ENV"
printf '\nSITE_MURM_REMOTE_HOST=%q\n' "$SITE_MURM_REMOTE_HOST" >> "$TEMP_ENV"
printf 'SITE_MURM_REMOTE_PORT=%q\n' "$SITE_MURM_REMOTE_PORT" >> "$TEMP_ENV"

echo "Preparando destino..."
ssh -i "$KEY" "$REMOTE" "sudo mkdir -p '$DEST' && sudo chown -R ubuntu:ubuntu '$DEST'"

echo "Enviando arquivos..."
rsync -az --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude dist \
  --exclude .astro \
  --exclude '.env*' \
  --exclude '*.log' \
  --exclude '*.zip' \
  --exclude '*:Zone.Identifier' \
  -e "ssh -i $KEY" \
  "$LOCAL/" "$REMOTE:$DEST/"

echo "Enviando configuração de produção..."
rsync -az -e "ssh -i $KEY" "$TEMP_ENV" "$REMOTE:$DEST/.env"
ssh -i "$KEY" "$REMOTE" "chmod 600 '$DEST/.env'"

echo "Arquivos enviados."
