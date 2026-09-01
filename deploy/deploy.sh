#!/usr/bin/env bash
# Deploy do ArxisVR no servidor orquestrador.
#
# Uso:  ./deploy/deploy.sh [api|web]     (sem argumento = os dois)
# Requer: ~/.ssh/hetzner_avilaops e o /opt/arxisvr/.env já criado no servidor.
#
# Os dois lados sobem de jeitos diferentes de propósito:
#   api  manda o fonte e constrói LÁ, porque `bcrypt` é nativo e imagem montada
#        no Windows não roda em Linux.
#   web  constrói AQUI e manda só o `dist`, porque 213 mil linhas de frontend não
#        cabem confortavelmente nos 3,7 GB de RAM da máquina.
#
# A máquina não tem rsync; tudo viaja como tar sobre SSH.
set -euo pipefail

HOST="${ARXISVR_HOST:-23.88.60.193}"
KEY="${ARXISVR_SSH_KEY:-$HOME/.ssh/hetzner_avilaops}"
REMOTE=/opt/arxisvr
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ALVO="${1:-tudo}"

ssh_() { ssh -i "$KEY" -o StrictHostKeyChecking=no "root@$HOST" "$@"; }

deploy_api() {
  echo "==> [api] empacotando fonte do backend"
  tar -C "$ROOT" -czf - \
    --exclude=backend/node_modules \
    --exclude=backend/dist \
    --exclude=backend/coverage \
    --exclude=backend/logs \
    --exclude=backend/uploads \
    --exclude='backend/.env*' \
    backend deploy/docker-compose.yml \
  | ssh_ "mkdir -p $REMOTE && tar -C $REMOTE -xzf - && mv -f $REMOTE/deploy/docker-compose.yml $REMOTE/docker-compose.yml && rmdir $REMOTE/deploy 2>/dev/null || true"

  echo "==> [api] build da imagem no servidor"
  ssh_ "cd $REMOTE && docker compose build api"

  echo "==> [api] subindo"
  ssh_ "cd $REMOTE && docker compose up -d api"

  echo "==> [api] esperando o /health"
  for i in $(seq 1 40); do
    if ssh_ "docker exec arxisvr-api curl -fsS http://127.0.0.1:3001/health >/dev/null 2>&1"; then
      echo "    ok"
      return 0
    fi
    sleep 5
  done
  echo "[api] não respondeu. últimos logs:" >&2
  ssh_ "docker logs --tail 60 arxisvr-api" >&2
  return 1
}

deploy_web() {
  echo "==> [web] build do frontend"
  npm --prefix "$ROOT/frontend" run build

  echo "==> [web] enviando o dist"
  # O dist é volume montado: o Caddy lê do disco a cada pedido, então não há
  # container para reiniciar. index.html e service worker vão com no-cache para
  # o navegador enxergar a versão nova.
  tar -C "$ROOT/frontend" -czf - dist \
  | ssh_ "mkdir -p $REMOTE/web && cd $REMOTE/web && rm -rf dist && tar -xzf -"

  scp -i "$KEY" -o StrictHostKeyChecking=no "$ROOT/deploy/web.Caddyfile" "root@$HOST:$REMOTE/web/Caddyfile"
  ssh_ "cd $REMOTE && docker compose up -d web"
  echo "    ok"
}

case "$ALVO" in
  api)   deploy_api ;;
  web)   deploy_web ;;
  tudo)  deploy_api; deploy_web ;;
  *)     echo "uso: $0 [api|web]" >&2; exit 2 ;;
esac

echo
echo "==> conferindo no ar"
curl -s -o /dev/null -w "  api  %{http_code}\n" --max-time 20 https://api.arxisvr.avilaops.com/health
curl -s -o /dev/null -w "  site %{http_code}\n" --max-time 20 https://arxisvr.avilaops.com/validador
