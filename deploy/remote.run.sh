#!/usr/bin/env bash
# cd /home/daniel/Code/site-murm/deploy/
set -euo pipefail

APP="site-murm"
REMOTE="ubuntu@44.219.174.82"
KEY="/home/daniel/amazon.ssh"
DIR="/home/sites/$APP"

ssh -i "$KEY" "$REMOTE" "
  set -e
  cd '$DIR'

  [ -f .env ] || { echo 'ERRO: .env não encontrado'; exit 1; }

  set -a
  source .env
  set +a

  HOST=\"\${SITE_MURM_REMOTE_HOST:?Defina SITE_MURM_REMOTE_HOST no .env remoto}\"
  PORT=\"\${SITE_MURM_REMOTE_PORT:?Defina SITE_MURM_REMOTE_PORT no .env remoto}\"

  if ss -ltn \"sport = :\$PORT\" 2>/dev/null | grep -q LISTEN; then
    EXISTING_PID=\"\$(pm2 pid '$APP' 2>/dev/null || true)\"
    if [ -z \"\$EXISTING_PID\" ] || [ \"\$EXISTING_PID\" = '0' ]; then
      echo \"ERRO: a porta remota \$PORT já está ocupada por outro processo.\"
      ss -ltnp \"sport = :\$PORT\" || true
      exit 1
    fi
  fi

  echo 'Instalando dependências...'
  npm ci --omit=dev --no-audit --no-fund

  echo 'Gerando build...'
  npm run build

  [ -f dist/server/entry.mjs ] || {
    echo 'ERRO: build não gerou dist/server/entry.mjs'
    exit 1
  }

  command -v pm2 >/dev/null || sudo npm install -g pm2 --no-audit --no-fund

  echo \"Iniciando em \$HOST:\$PORT...\"
  if pm2 describe '$APP' >/dev/null 2>&1; then
    HOST=\"\$HOST\" PORT=\"\$PORT\" pm2 restart '$APP' --update-env
  else
    HOST=\"\$HOST\" PORT=\"\$PORT\" pm2 start dist/server/entry.mjs --name '$APP'
  fi

  pm2 save
  pm2 status '$APP'

  echo 'Testando aplicação...'
  sleep 2
  curl -fsS --max-time 10 \"http://\$HOST:\$PORT\" >/dev/null

  echo 'Produção atualizada.'
"
