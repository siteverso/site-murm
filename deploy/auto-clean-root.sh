#!/usr/bin/env bash
# cd /home/daniel/Code/site-inst/deploy/
set -euo pipefail

# -----------------------------------------------------------------------------
# auto-clean-root.sh
# Monitora a raiz do projeto e a pasta Downloads do Windows.
#
# Padrão:
# - raiz do projeto = pasta pai de /deploy, sem hardcode de nome/caminho;
# - funciona em outros projetos site-* automaticamente;
# - apaga *:Zone.Identifier em qualquer subpasta do projeto;
# - gera/atualiza src.zip a cada ciclo a partir da pasta src;
# - apaga .zip da raiz somente quando tiver pelo menos ZIP_MIN_AGE_SECONDS,
#   preservando src.zip;
# - monitora Downloads e, quando chegar zip do padrão do projeto, move para a
#   raiz, extrai sobrescrevendo e apaga o zip do Downloads/projeto.
#
# Ajuste os parâmetros abaixo dentro do próprio script.
# Não precisa passar nada por linha de comando.
# -----------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_NAME="$(basename "$PROJECT_ROOT")"

# Intervalo entre ciclos completos, em segundos.
# 10 = gera novo src.zip e verifica limpeza/importação a cada 10 segundos.
INTERVAL_SECONDS=6

# De quanto em quanto tempo a tela mostra o tempo restante até o próximo ciclo.
# Exemplo: 10 = atualiza a contagem regressiva a cada 10 segundos.
COUNTDOWN_STEP_SECONDS=2

# Idade mínima para apagar ZIPs que estejam na raiz do projeto.
# 300 segundos = 5 minutos.
ZIP_MIN_AGE_SECONDS=30

# 1 = gerar/atualizar src.zip a cada ciclo.
# 0 = não gerar.
CREATE_SRC_ZIP_EVERY_CYCLE=1

# Pasta de origem para o backup zip, relativa à raiz do projeto.
SRC_DIR_NAME="src"

# Nome do zip gerado na raiz do projeto.
# Este arquivo é protegido e NÃO será apagado pela limpeza de ZIPs.
SRC_ZIP_NAME="src.zip"

# 1 = apagar arquivos Zone.Identifier em qualquer subpasta do projeto.
# 0 = não apagar.
DELETE_ZONE_IDENTIFIER=1

# 1 = apagar arquivos .zip apenas da raiz do projeto, respeitando ZIP_MIN_AGE_SECONDS.
# 0 = não apagar.
DELETE_ZIP_FROM_ROOT=1

# 1 = monitorar Downloads do Windows para importar zips do projeto.
# 0 = não monitorar.
WATCH_WINDOWS_DOWNLOADS=1

# Padrão de zip aceito na pasta Downloads.
# Derivado automaticamente do nome da pasta do projeto.
# Exemplo: projeto site-inst => site-inst-*.zip
DOWNLOAD_ZIP_PATTERN="${PROJECT_NAME}-*.zip"

# Pasta Downloads. Deixe vazio para detectar automaticamente via Windows/WSL.
# Pode ajustar manualmente aqui se necessário, sem mexer no restante do script.
DOWNLOADS_DIR=""

# Aguarda o arquivo baixado ficar estável antes de mover/extrair.
DOWNLOAD_STABLE_WAIT_SECONDS=2

# 1 = exibir ações realizadas.
# 0 = silencioso, exceto mensagens de início/erro.
VERBOSE=1

# 1 = exibir uma linha de resumo mesmo quando nada foi feito.
SHOW_IDLE_SUMMARY=1

line() {
  echo "────────────────────────────────────────────────────────────"
}

now_text() {
  date '+%Y-%m-%d %H:%M:%S'
}

log() {
  if [ "$VERBOSE" = "1" ]; then
    echo "[$(now_text)] $*"
  fi
}

warn() {
  echo "[$(now_text)] AVISO: $*" >&2
}

format_seconds() {
  local seconds="$1"
  local minutes rest
  if [ "$seconds" -lt 0 ]; then
    seconds=0
  fi
  minutes=$((seconds / 60))
  rest=$((seconds % 60))
  printf '%02d:%02d' "$minutes" "$rest"
}

resolve_downloads_dir() {
  if [ -n "${DOWNLOADS_DIR:-}" ]; then
    echo "$DOWNLOADS_DIR"
    return 0
  fi

  local win_profile=""
  local wsl_profile=""

  if command -v cmd.exe >/dev/null 2>&1 && command -v wslpath >/dev/null 2>&1; then
    win_profile="$(cmd.exe /c "echo %USERPROFILE%" 2>/dev/null | tr -d '\r' || true)"
    if [ -n "$win_profile" ]; then
      wsl_profile="$(wslpath "$win_profile" 2>/dev/null || true)"
      if [ -d "$wsl_profile/Downloads" ]; then
        echo "$wsl_profile/Downloads"
        return 0
      fi
    fi
  fi

  if [ -d "/mnt/c/Users/${USER}/Downloads" ]; then
    echo "/mnt/c/Users/${USER}/Downloads"
    return 0
  fi

  echo ""
}

file_age_seconds() {
  local file="$1"
  local now birth modified base

  now="$(date +%s)"
  birth="$(stat -c %W -- "$file" 2>/dev/null || echo 0)"
  modified="$(stat -c %Y -- "$file" 2>/dev/null || echo 0)"

  # %W pode retornar 0 ou -1 quando o filesystem não expõe criação.
  # Nesse caso, usa modificação como fallback seguro.
  if [[ "$birth" =~ ^[0-9]+$ ]] && [ "$birth" -gt 0 ]; then
    base="$birth"
  else
    base="$modified"
  fi

  echo $((now - base))
}

is_file_stable() {
  local file="$1"
  local size1 size2

  [ -f "$file" ] || return 1

  size1="$(stat -c %s -- "$file" 2>/dev/null || echo -1)"
  sleep "$DOWNLOAD_STABLE_WAIT_SECONDS"
  [ -f "$file" ] || return 1
  size2="$(stat -c %s -- "$file" 2>/dev/null || echo -2)"

  [ "$size1" = "$size2" ] && [ "$size1" -gt 0 ]
}

extract_zip_into_project() {
  local zip_file="$1"

  if ! command -v unzip >/dev/null 2>&1; then
    warn "comando unzip não encontrado. Instale com: sudo apt install -y unzip"
    return 1
  fi

  log "Extraindo e sobrescrevendo arquivos locais:"
  log "  ZIP:     $zip_file"
  log "  Destino: $PROJECT_ROOT"
  unzip -oq -- "$zip_file" -d "$PROJECT_ROOT"
}

import_download_zips_once() {
  [ "$WATCH_WINDOWS_DOWNLOADS" = "1" ] || return 0

  local downloads_dir imported skipped
  downloads_dir="$(resolve_downloads_dir)"
  imported=0
  skipped=0

  if [ -z "$downloads_dir" ] || [ ! -d "$downloads_dir" ]; then
    warn "Downloads não encontrado. Ajuste DOWNLOADS_DIR dentro do script se quiser importar zips automaticamente."
    return 0
  fi

  log "Verificando Downloads: $downloads_dir"
  log "Padrão procurado: $DOWNLOAD_ZIP_PATTERN"

  while IFS= read -r -d '' file; do
    local base target
    base="$(basename "$file")"
    target="$PROJECT_ROOT/$base"

    log "ZIP encontrado no Downloads: $base"

    # Evita pegar arquivo ainda baixando/gravando.
    if ! is_file_stable "$file"; then
      log "  Aguardando próximo ciclo: arquivo ainda parece estar baixando/gravando."
      skipped=$((skipped + 1))
      continue
    fi

    log "  Movendo para a raiz do projeto: $target"
    mv -f -- "$file" "$target"

    if extract_zip_into_project "$target"; then
      log "  Extração concluída. Apagando ZIP importado: $target"
      rm -f -- "$target"
      imported=$((imported + 1))
    else
      warn "falha ao extrair: $target"
      skipped=$((skipped + 1))
    fi
  done < <(find "$downloads_dir" -maxdepth 1 -type f -iname "$DOWNLOAD_ZIP_PATTERN" -print0 2>/dev/null)

  log "Resumo Downloads: importados=$imported, aguardando/erro=$skipped"
}

clean_zone_identifier_once() {
  [ "$DELETE_ZONE_IDENTIFIER" = "1" ] || return 0

  local removed
  removed=0

  log "Procurando Zone.Identifier dentro do projeto..."

  while IFS= read -r -d '' file; do
    log "  Apagando: $file"
    rm -f -- "$file"
    removed=$((removed + 1))
  done < <(find "$PROJECT_ROOT" -type f -name '*:Zone.Identifier' -print0 2>/dev/null)

  log "Resumo Zone.Identifier: apagados=$removed"
}

create_src_zip_once() {
  [ "$CREATE_SRC_ZIP_EVERY_CYCLE" = "1" ] || return 0

  local src_dir zip_target tmp_zip size_bytes
  src_dir="$PROJECT_ROOT/$SRC_DIR_NAME"
  zip_target="$PROJECT_ROOT/$SRC_ZIP_NAME"
  tmp_zip="$PROJECT_ROOT/.${SRC_ZIP_NAME}.tmp.zip"

  if [ ! -d "$src_dir" ]; then
    warn "pasta $SRC_DIR_NAME não encontrada. Nada foi zipado: $src_dir"
    return 0
  fi

  if ! command -v zip >/dev/null 2>&1; then
    warn "comando zip não encontrado. Instale com: sudo apt install -y zip"
    return 1
  fi

  log "Gerando backup da pasta $SRC_DIR_NAME em $SRC_ZIP_NAME..."
  log "  Origem:  $src_dir"
  log "  Destino: $zip_target"
  rm -f -- "$tmp_zip"

  if (cd "$PROJECT_ROOT" && zip -qr "$tmp_zip" "$SRC_DIR_NAME"); then
    mv -f -- "$tmp_zip" "$zip_target"
    size_bytes="$(stat -c %s -- "$zip_target" 2>/dev/null || echo 0)"
    log "  src.zip atualizado com sucesso: $zip_target (${size_bytes} bytes)"
  else
    rm -f -- "$tmp_zip"
    warn "falha ao gerar $SRC_ZIP_NAME a partir de $src_dir"
    return 1
  fi
}

clean_old_root_zips_once() {
  [ "$DELETE_ZIP_FROM_ROOT" = "1" ] || return 0

  local removed kept total
  removed=0
  kept=0
  total=0

  log "Verificando ZIPs na raiz do projeto: $PROJECT_ROOT"
  log "Regra: apagar somente ZIP com idade mínima de $(format_seconds "$ZIP_MIN_AGE_SECONDS")"

  while IFS= read -r -d '' file; do
    local age remaining base
    base="$(basename "$file")"
    age="$(file_age_seconds "$file")"
    remaining=$((ZIP_MIN_AGE_SECONDS - age))
    total=$((total + 1))

    if [ "$base" = "$SRC_ZIP_NAME" ]; then
      log "  Protegido: $base | backup automático da pasta $SRC_DIR_NAME, não será apagado"
      kept=$((kept + 1))
    elif [ "$age" -ge "$ZIP_MIN_AGE_SECONDS" ]; then
      log "  Apagando: $base | idade=$(format_seconds "$age")"
      rm -f -- "$file"
      removed=$((removed + 1))
    else
      log "  Mantendo: $base | idade=$(format_seconds "$age") | falta=$(format_seconds "$remaining") para poder apagar"
      kept=$((kept + 1))
    fi
  done < <(find "$PROJECT_ROOT" -maxdepth 1 -type f -iname '*.zip' -print0 2>/dev/null)

  if [ "$total" -eq 0 ]; then
    log "Resumo ZIP raiz: nenhum ZIP encontrado."
  else
    log "Resumo ZIP raiz: encontrados=$total, apagados=$removed, mantidos=$kept"
  fi
}

run_once() {
  local cycle="$1"

  if [ ! -d "$PROJECT_ROOT" ]; then
    echo "ERRO: PROJECT_ROOT não existe: $PROJECT_ROOT" >&2
    exit 1
  fi

  line
  log "Ciclo #$cycle iniciado."
  import_download_zips_once
  clean_zone_identifier_once
  create_src_zip_once
  clean_old_root_zips_once

  if [ "$SHOW_IDLE_SUMMARY" = "1" ]; then
    log "Ciclo #$cycle finalizado. Próxima verificação em $(format_seconds "$INTERVAL_SECONDS")."
  fi
}

sleep_with_countdown() {
  local remaining step
  remaining="$INTERVAL_SECONDS"

  while [ "$remaining" -gt 0 ]; do
    if [ "$remaining" -lt "$COUNTDOWN_STEP_SECONDS" ]; then
      step="$remaining"
    else
      step="$COUNTDOWN_STEP_SECONDS"
    fi

    log "Aguardando próximo ciclo... faltam $(format_seconds "$remaining")"
    sleep "$step"
    remaining=$((remaining - step))
  done
}

stop() {
  echo
  line
  echo "Monitoramento encerrado."
  exit 0
}

trap stop INT TERM

RESOLVED_DOWNLOADS_DIR="$(resolve_downloads_dir)"

line
echo "Monitor de limpeza/importação iniciado"
line
echo "Projeto:                  $PROJECT_ROOT"
echo "Nome do projeto:          $PROJECT_NAME"
echo "Intervalo de ciclo:       ${INTERVAL_SECONDS}s"
echo "Atualização da espera:    ${COUNTDOWN_STEP_SECONDS}s"
echo "Gerar src.zip por ciclo:  $CREATE_SRC_ZIP_EVERY_CYCLE"
echo "ZIP protegido:            $SRC_ZIP_NAME"
echo "Apagar Zone.Identifier:   $DELETE_ZONE_IDENTIFIER"
echo "Apagar ZIP da raiz após:  ${ZIP_MIN_AGE_SECONDS}s ($(format_seconds "$ZIP_MIN_AGE_SECONDS"))"
echo "Monitorar Downloads:      $WATCH_WINDOWS_DOWNLOADS"
echo "Downloads detectado:      ${RESOLVED_DOWNLOADS_DIR:-não encontrado}"
echo "Padrão aceito Downloads:  $DOWNLOAD_ZIP_PATTERN"
echo "Para parar:               Ctrl+C"
line

auto_clean_cycle=1
while true; do
  run_once "$auto_clean_cycle"
  auto_clean_cycle=$((auto_clean_cycle + 1))
  sleep_with_countdown
done
