#!/usr/bin/env bash
# Bootstrap do servidor de produção do ArxisVR — SEM Docker para banco e Node.
#
#   PostgreSQL 18  → pacote nativo do PGDG, serviço systemd em 127.0.0.1:5432
#   Node 24 + PM2  → nativos, sem container
#   Caddy (web)    → único container que sobrou, subido pelo deploy/deploy.sh
#
# Idempotente: pode rodar de novo em servidor já configurado.
set -euo pipefail

APP_DIR="/opt/arxisvr"
REPO_URL="${ARXISVR_REPO_URL:-https://github.com/avilaops/arxisvr.git}"
BRANCH="${DEPLOY_BRANCH:-main}"
PG_MAJOR=18
PG_MIN_PATCH=6

log()  { printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
fail() { printf '\n[ERRO] %s\n' "$*" >&2; exit 1; }

[ "${EUID:-$(id -u)}" -eq 0 ] || fail "Rode como root ou com sudo"

log "Preparando servidor de produção do ArxisVR"

# --- pacotes base ---------------------------------------------------------
apt-get update -qq
for pkg in git curl ca-certificates gnupg lsb-release; do
  command -v "${pkg%%-*}" >/dev/null 2>&1 || apt-get install -y "$pkg"
done

# --- Node 24 --------------------------------------------------------------
# O frontend exige >=24 (vite 8 / rolldown) e o CI já roda em 24; o servidor
# precisa acompanhar, agora que não há imagem fixando a versão.
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | sed 's/^v//' | cut -d. -f1)" -lt 24 ]; then
  log "Instalando Node.js 24"
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
else
  log "Node.js $(node -v) já instalado"
fi

command -v pm2 >/dev/null 2>&1 || { log "Instalando PM2"; npm install -g pm2; }

# --- PostgreSQL 18 (nativo, via PGDG) -------------------------------------
if ! command -v psql >/dev/null 2>&1 || [ "$(psql -V | awk '{print $3}' | cut -d. -f1)" -lt "$PG_MAJOR" ]; then
  log "Instalando PostgreSQL $PG_MAJOR do repositório PGDG"
  install -d /usr/share/postgresql-common/pgdg
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc
  echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
    > /etc/apt/sources.list.d/pgdg.list
  apt-get update -qq
  apt-get install -y "postgresql-$PG_MAJOR"
else
  log "PostgreSQL $(psql -V | awk '{print $3}') já instalado"
fi

systemctl enable --now "postgresql@$PG_MAJOR-main" 2>/dev/null || systemctl enable --now postgresql

PG_VER="$(psql -V | awk '{print $3}')"
PG_PATCH="$(echo "$PG_VER" | cut -d. -f2)"
if [ "$(echo "$PG_VER" | cut -d. -f1)" -eq "$PG_MAJOR" ] && [ "${PG_PATCH:-0}" -lt "$PG_MIN_PATCH" ]; then
  log "AVISO: PostgreSQL $PG_VER está abaixo do alvo $PG_MAJOR.$PG_MIN_PATCH — rode 'apt-get upgrade postgresql-$PG_MAJOR'"
else
  log "PostgreSQL $PG_VER ok"
fi

# --- repositório e .env ---------------------------------------------------
if [ ! -d "$APP_DIR/.git" ]; then
  log "Clonando repositório em $APP_DIR"
  mkdir -p "$(dirname "$APP_DIR")"
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
else
  log "Repositório já existe; sincronizando"
  git -C "$APP_DIR" fetch origin "$BRANCH"
  git -C "$APP_DIR" reset --hard "origin/$BRANCH"
fi

cd "$APP_DIR"
mkdir -p logs
[ -f .env ] || fail ".env não encontrado. Crie $APP_DIR/.env (com DATABASE_URL apontando para 127.0.0.1:5432) antes de seguir."
chmod 600 .env

# --- dependências e build -------------------------------------------------
# npm em todos: o repo é npm-only (um package-lock.json por subprojeto).
log "Instalando e construindo o backend"
npm --prefix backend ci --include=dev
npm --prefix backend run build

log "Instalando o signaling-server"
npm --prefix signaling-server ci --omit=dev --no-audit --no-fund

# O frontend NÃO é construído aqui: 3,7 GB de RAM não dão conta. O `dist` sobe
# pronto da máquina do dev via deploy/deploy.sh web.

# --- PM2 ------------------------------------------------------------------
log "Subindo os processos no PM2"
pm2 start ecosystem.config.js --update-env || pm2 reload ecosystem.config.js --update-env
pm2 save
pm2 startup systemd -u root --hp /root || true
pm2 save

log "Health checks"
sleep 10
curl -fsS http://127.0.0.1:3001/health >/dev/null && log "backend ok" || log "AVISO: backend não respondeu"
curl -fsS http://127.0.0.1:3002/health >/dev/null && log "signaling ok" || log "AVISO: signaling não respondeu"

pm2 list
log "Pronto. Falta: apontar o Caddy de /opt/observabilidade para 10.10.0.1:3001 (era api:3001)."
