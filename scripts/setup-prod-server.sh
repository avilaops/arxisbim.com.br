#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/arxisvr"
REPO_URL="${ARXISVR_REPO_URL:-https://github.com/avilaops/arxisvr.git}"
BRANCH="${DEPLOY_BRANCH:-main}"

log() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

fail() {
  printf '\n❌ %s\n' "$*" >&2
  exit 1
}

if [ "${EUID:-$(id -u)}" -ne 0 ]; then
  fail "Run this script as root or with sudo"
fi

log "🏗️ Preparing ArxisVR production server"

if ! command -v node >/dev/null 2>&1 || [ "$(node -v | sed 's/^v//' | cut -d. -f1)" -lt 20 ]; then
  log "📦 Installing Node.js 20"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
else
  log "✅ Node.js $(node -v) already installed"
fi

if ! command -v git >/dev/null 2>&1; then
  log "📦 Installing git"
  apt-get update
  apt-get install -y git
fi

if ! command -v curl >/dev/null 2>&1; then
  log "📦 Installing curl"
  apt-get update
  apt-get install -y curl
fi

if ! command -v pnpm >/dev/null 2>&1; then
  log "📦 Installing pnpm"
  npm install -g pnpm
else
  log "✅ pnpm $(pnpm -v) already installed"
fi

if ! command -v pm2 >/dev/null 2>&1; then
  log "📦 Installing PM2"
  npm install -g pm2
else
  log "✅ PM2 $(pm2 -v) already installed"
fi

if [ ! -d "$APP_DIR/.git" ]; then
  log "📂 Cloning repository into $APP_DIR"
  mkdir -p "$(dirname "$APP_DIR")"
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
else
  log "📂 Repository already exists; synchronizing"
  cd "$APP_DIR"
  git fetch origin "$BRANCH"
  git reset --hard "origin/$BRANCH"
fi

cd "$APP_DIR"
mkdir -p logs

if [ ! -f .env ]; then
  if [ -f .env.production ]; then
    cp .env.production .env
    chmod 600 .env
    log "Created .env from .env.production"
  else
    fail ".env not found. Create $APP_DIR/.env before running the production setup."
  fi
else
  log "✅ .env already exists"
fi

log "📚 Installing backend dependencies"
pnpm --dir backend install --frozen-lockfile

log "🏗️ Building backend (esbuild)"
pnpm --dir backend run build

log "📚 Installing frontend dependencies"
pnpm --dir frontend install --frozen-lockfile

log "🏗️ Building frontend (vite)"
pnpm --dir frontend run build

log "📚 Installing signaling-server dependencies"
(cd signaling-server && npm install --omit=dev --no-audit --no-fund)

log "🚀 Starting PM2 apps"
pm2 start ecosystem.config.js --update-env
pm2 save

log "⚙️ Configuring PM2 startup"
pm2 startup systemd -u root --hp /root || true
pm2 save

log "🏥 Running initial health checks"
sleep 10
curl -fsS http://127.0.0.1:3001/health >/dev/null && log "✅ Backend healthy" || log "⚠️ Backend health check failed"
curl -fsS http://127.0.0.1:3002/health >/dev/null && log "✅ Signaling healthy" || log "⚠️ Signaling health check failed"

log "📊 PM2 status"
pm2 list

log "✅ Server setup complete"
log "Next: configure GitHub Actions secrets and Nginx reverse proxy."
