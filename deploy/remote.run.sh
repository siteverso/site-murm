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

echo "============================================================"
echo "Deploy remoto: $APP_NAME"
echo "Servidor: $REMOTE_USER@$REMOTE_HOST"
echo "Diretório: $REMOTE_DIR"
echo "Aplicação: $APP_HOST:$APP_PORT"
echo "Início: $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================================"

ssh \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=10 \
  -i "$SSH_KEY" \
  "$REMOTE_USER@$REMOTE_HOST" "
    set -euo pipefail

    executar_com_aviso() {
      descricao=\"\$1\"
      shift

      inicio=\$(date +%s)

      echo
      echo '------------------------------------------------------------'
      echo \"[\$(date '+%Y-%m-%d %H:%M:%S')] \$descricao\"
      echo '------------------------------------------------------------'

      \"\$@\" &
      processo=\$!

      while kill -0 \"\$processo\" 2>/dev/null; do
        agora=\$(date +%s)
        decorrido=\$((agora - inicio))

        echo \"[\$(date '+%H:%M:%S')] Ainda executando: \$descricao (\${decorrido}s)...\"
        sleep 5
      done

      wait \"\$processo\"
      resultado=\$?

      fim=\$(date +%s)
      duracao=\$((fim - inicio))

      if [ \"\$resultado\" -ne 0 ]; then
        echo \"ERRO: \$descricao falhou após \${duracao}s.\"
        exit \"\$resultado\"
      fi

      echo \"[\$(date '+%H:%M:%S')] Concluído: \$descricao (\${duracao}s).\"
    }

    echo
    echo 'Conectado ao servidor.'
    echo \"Servidor: \$(hostname)\"
    echo \"Usuário: \$(whoami)\"
    echo \"Diretório atual: \$(pwd)\"

    echo
    echo 'Acessando diretório da aplicação...'
    cd '$REMOTE_DIR'
    echo \"Diretório: \$(pwd)\"

    echo
    echo 'Informações do ambiente:'
    echo \"Node: \$(node --version)\"
    echo \"NPM: \$(npm --version)\"
    echo \"Espaço disponível:\"
    df -h '$REMOTE_DIR' | tail -n 1

    echo
    echo 'Arquivos principais:'
    ls -lh package.json package-lock.json astro.config.mjs 2>/dev/null || true

    echo
    if [ -f package-lock.json ]; then
      executar_com_aviso \
        'Instalando dependências com npm ci' \
        npm ci --no-audit --no-fund --loglevel=verbose
    else
      executar_com_aviso \
        'Instalando dependências com npm install' \
        npm install --no-audit --no-fund --loglevel=verbose
    fi

    executar_com_aviso \
      'Gerando build Astro' \
      npm run build

    echo
    echo 'Verificando resultado do build...'

    if [ ! -f dist/server/entry.mjs ]; then
      echo 'ERRO: dist/server/entry.mjs não foi gerado.'
      exit 1
    fi

    ls -lh dist/server/entry.mjs

    echo
    echo 'Verificando PM2...'

    if ! command -v pm2 >/dev/null 2>&1; then
      executar_com_aviso \
        'Instalando PM2 globalmente' \
        sudo npm install -g pm2 --no-audit --no-fund --loglevel=verbose
    fi

    echo \"PM2: \$(pm2 --version)\"

    echo
    echo 'Subindo ou reiniciando aplicação PM2: $APP_NAME'

    if pm2 describe '$APP_NAME' >/dev/null 2>&1; then
      HOST='$APP_HOST' PORT='$APP_PORT' \
        pm2 restart '$APP_NAME' --update-env
    else
      HOST='$APP_HOST' PORT='$APP_PORT' \
        pm2 start dist/server/entry.mjs --name '$APP_NAME'
    fi

    echo
    echo 'Salvando configuração PM2...'
    pm2 save

    echo
    echo 'Status final:'
    pm2 status '$APP_NAME'

    echo
    echo 'Últimas linhas do log:'
    pm2 logs '$APP_NAME' --lines 30 --nostream || true

    echo
    echo 'Testando aplicação localmente...'

    for tentativa in 1 2 3 4 5 6; do
      echo \"Tentativa \$tentativa de 6 em http://$APP_HOST:$APP_PORT\"

      if curl \
        --silent \
        --show-error \
        --fail \
        --max-time 10 \
        --output /dev/null \
        'http://$APP_HOST:$APP_PORT'; then

        echo 'Aplicação respondeu corretamente.'
        break
      fi

      if [ \"\$tentativa\" -eq 6 ]; then
        echo 'ERRO: aplicação não respondeu na porta $APP_PORT.'
        pm2 logs '$APP_NAME' --lines 100 --nostream || true
        exit 1
      fi

      sleep 5
    done

    echo
    echo '============================================================'
    echo 'Deploy remoto concluído.'
    echo 'Aplicação: $APP_NAME'
    echo 'Endereço interno: http://$APP_HOST:$APP_PORT'
    echo \"Fim: \$(date '+%Y-%m-%d %H:%M:%S')\"
    echo '============================================================'
"

echo
echo "Deploy concluído no servidor $REMOTE_HOST."