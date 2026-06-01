#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/arxisvr"
BRANCH="${DEPLOY_BRANCH:-main}"

log() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

fail() {
  printf '\n❌ %s\n' "$*" >&2
  exit 1
}

cd "$APP_DIR" || fail "Application directory not found: $APP_DIR"
[ -f package.json ] || fail "package.json not found in $APP_DIR"
[ -f pnpm-lock.yaml ] || fail "pnpm-lock.yaml not found in $APP_DIR"

log "🚀 Deploying ArxisVR from branch $BRANCH"

log "📦 Synchronizing repository"
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

log "🧰 Checking runtime tools"
command -v node >/dev/null 2>&1 || fail "node is not installed"
command -v pnpm >/dev/null 2>&1 || fail "pnpm is not installed"
command -v pm2 >/dev/null 2>&1 || fail "pm2 is not installed"

log "🔐 Checking production environment"
if [ ! -f .env ]; then
  if [ -f .env.production ]; then
    cp .env.production .env
    chmod 600 .env
    log "Created .env from .env.production"
  else
    fail ".env not found and .env.production is unavailable"
  fi
fi

log "🔗 Preparing local workspace links"
mkdir -p node_modules/@avilaops
if [ ! -e node_modules/@avilaops/email ] && [ -d Bucket/nodejs/@avilaops/email ]; then
  ln -sfn "$APP_DIR/Bucket/nodejs/@avilaops/email" node_modules/@avilaops/email
  log "Linked @avilaops/email from Bucket"
fi

if [ ! -e node_modules/pino-pretty ] && [ -d Bucket/nodejs/pino-pretty ]; then
  ln -sfn "$APP_DIR/Bucket/nodejs/pino-pretty" node_modules/pino-pretty
  log "Linked pino-pretty from Bucket"
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

log "📁 Ensuring log directory"
mkdir -p "$APP_DIR/logs"

log "🔄 Reloading PM2 apps"
if pm2 describe arxisvr-backend >/dev/null 2>&1 || pm2 describe arxisvr-signaling >/dev/null 2>&1; then
  pm2 reload ecosystem.config.js --update-env
else
  pm2 start ecosystem.config.js --update-env
fi
pm2 save

log "⏳ Waiting for services to settle"
sleep 10

log "🏥 Running health checks"
BACKEND_STATUS="$(curl -fsS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/health || true)"
SIGNALING_STATUS="$(curl -fsS -o /dev/null -w '%{http_code}' http://127.0.0.1:3002/health || true)"

printf 'Backend health:   %s\n' "${BACKEND_STATUS:-000}"
printf 'Signaling health: %s\n' "${SIGNALING_STATUS:-000}"

if [ "${BACKEND_STATUS:-000}" != "200" ] || [ "${SIGNALING_STATUS:-000}" != "200" ]; then
  log "📋 Recent PM2 logs"
  pm2 logs --lines 80 --nostream || true
  fail "One or more health checks failed"
fi

log "📊 PM2 status"
pm2 list

log "✅ Deployment completed successfully"
