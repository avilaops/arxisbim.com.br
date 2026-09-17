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
# Enderecos publicos. O canonico e arxisbim.com.br desde 17/09/2026; enquanto o
# DNS nao apontar, rode com ARXISVR_SITE_URL/ARXISVR_API_URL do dominio antigo.
# Ver documentation/MIGRACAO-2026-09-17-dominio-arxisbim.md
SITE_URL="${ARXISVR_SITE_URL:-https://arxisbim.com.br}"
API_URL="${ARXISVR_API_URL:-https://api.arxisbim.com.br}"
KEY="${ARXISVR_SSH_KEY:-$HOME/.ssh/hetzner_avilaops}"
REMOTE=/opt/arxisvr
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ALVO="${1:-tudo}"

ssh_() { ssh -i "$KEY" -o StrictHostKeyChecking=no "root@$HOST" "$@"; }

deploy_api() {
  # Portao: type-check ANTES de empacotar. O build e esbuild, que remove tipos
  # sem checar, entao sem isto um erro de tipo viaja para producao sem ninguem
  # ver. Foi assim que 9 erros ficaram meses invisiveis (commit 21bd9f4).
  # Para pular num incidente: ARXISVR_SEM_CONFERIR=1 ./deploy/deploy.sh api
  if [ "${ARXISVR_SEM_CONFERIR:-0}" != "1" ]; then
    echo "==> [api] conferindo tipos antes de subir"
    ( cd "$ROOT/backend" && npm run type-check ) || {
      echo "[api] type-check falhou. Corrija antes de subir." >&2
      return 1
    }
  fi

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
  # --force-recreate nao e zelo: sem ele o container que ja esta de pe mantem a
  # referencia antiga do bind mount e serve 404 com o dist novo no lugar.
  # Aconteceu tres vezes antes de virar regra.
  ssh_ "cd $REMOTE && docker compose up -d --force-recreate web"
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
curl -s -o /dev/null -w "  api  %{http_code}\n" --max-time 20 "$API_URL/health"
curl -s -o /dev/null -w "  site %{http_code}\n" --max-time 20 "$SITE_URL/validador"
