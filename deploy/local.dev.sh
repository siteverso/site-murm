#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/.."

[ -f .env ] && set -a && source .env && set +a

PORT="${DEV_PORT:-4321}"

echo "Limpando cache..."
rm -rf node_modules/.astro node_modules/.vite dist .astro

echo "Instalando dependências..."
npm install --loglevel info

echo "Iniciando em http://localhost:$PORT"
npm run dev -- --host 0.0.0.0 --port "$PORT" --force