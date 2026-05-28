#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/arxisvr}"
REPO_URL="${ARXISVR_REPO_URL:-https://github.com/avilaops/arxisvr.git}"
BRANCH="${DEPLOY_BRANCH:-master}"

log() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

fail() {
  printf '\n❌ %s\n' "$*" >&2
  exit 1
}

if [ "${EUID:-$(id -u)}" -eq 0 ]; then
  SUDO=""
elif command -v sudo >/dev/null 2>&1; then
  SUDO="sudo"
else
  fail "This first-time deployment needs root privileges or passwordless sudo to prepare $APP_DIR"
fi

install_package() {
  local package_name="$1"
  if command -v apt-get >/dev/null 2>&1; then
    $SUDO apt-get update
    $SUDO apt-get install -y "$package_name"
  else
    fail "Cannot install $package_name automatically because apt-get is unavailable"
  fi
}

ensure_command() {
  local command_name="$1"
  local package_name="${2:-$1}"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    log "📦 Installing $package_name"
    install_package "$package_name"
  else
    log "✅ $command_name already installed"
  fi
}

ensure_global_npm_package() {
  local command_name="$1"
  local package_name="$2"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    log "📦 Installing $package_name"
    $SUDO npm install -g "$package_name"
  else
    log "✅ $command_name $($command_name --version 2>/dev/null || true) already installed"
  fi
}

ensure_node() {
  if ! command -v node >/dev/null 2>&1 || [ "$(node -v | sed 's/^v//' | cut -d. -f1)" -lt 20 ]; then
    log "📦 Installing Node.js 20"
    ensure_command curl curl
    curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO bash -
    $SUDO apt-get install -y nodejs
  else
    log "✅ Node.js $(node -v) already installed"
  fi
}

prepare_repository() {
  ensure_command git git

  if [ -d "$APP_DIR/.git" ]; then
    log "📂 Repository exists; synchronizing $BRANCH"
    cd "$APP_DIR"
    git fetch origin "$BRANCH"
    git reset --hard "origin/$BRANCH"
    return
  fi

  if [ -e "$APP_DIR" ]; then
    if [ -z "$(find "$APP_DIR" -mindepth 1 -maxdepth 1 2>/dev/null | head -n 1)" ]; then
      log "📂 Using existing empty directory $APP_DIR"
    else
      local backup_dir="${APP_DIR}.backup.$(date +%Y%m%d%H%M%S)"
      log "⚠️ $APP_DIR exists but is not a git repository; moving it to $backup_dir"
      $SUDO mv "$APP_DIR" "$backup_dir"
    fi
  fi

  log "📂 Cloning repository into $APP_DIR"
  $SUDO mkdir -p "$APP_DIR"
  $SUDO chown -R "$(id -u):$(id -g)" "$APP_DIR"
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
}

run_setup_or_deploy() {
  cd "$APP_DIR"
  mkdir -p logs

  if [ -x scripts/deploy.sh ] || [ -f scripts/deploy.sh ]; then
    if pm2 describe arxisvr-backend >/dev/null 2>&1 || pm2 describe arxisvr-signaling >/dev/null 2>&1; then
      log "🚀 Existing PM2 apps detected; running regular deploy"
      bash scripts/deploy.sh
      return
    fi
  fi

  log "🏗️ First-time ArxisVR deployment setup"

  if [ ! -f .env ]; then
    if [ -f .env.production ]; then
      cp .env.production .env
      chmod 600 .env
      log "Created .env from .env.production"
    else
      fail ".env not found and .env.production is unavailable. Create $APP_DIR/.env and rerun deployment."
    fi
  else
    log "✅ .env already exists"
  fi

  log "📚 Installing dependencies"
  pnpm install --frozen-lockfile

  log "🏗️ Building application"
  pnpm run build

  log "🚀 Starting PM2 apps"
  pm2 start ecosystem.config.js --update-env
  pm2 save

  log "⚙️ Configuring PM2 startup"
  if [ "${EUID:-$(id -u)}" -eq 0 ]; then
    pm2 startup systemd -u root --hp /root || true
  else
    $SUDO env PATH="$PATH" pm2 startup systemd -u "$(id -un)" --hp "$HOME" || true
  fi
  pm2 save

  log "🏥 Running initial health checks"
  sleep 10
  curl -fsS http://127.0.0.1:3001/health >/dev/null && log "✅ Backend healthy" || fail "Backend health check failed"
  curl -fsS http://127.0.0.1:3002/health >/dev/null && log "✅ Signaling healthy" || fail "Signaling health check failed"

  log "📊 PM2 status"
  pm2 list
}

log "🧭 Bootstrapping ArxisVR deployment"
ensure_node
ensure_global_npm_package pnpm pnpm
ensure_global_npm_package pm2 pm2
prepare_repository
run_setup_or_deploy
log "✅ Bootstrap deployment completed successfully"
