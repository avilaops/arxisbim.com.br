#!/usr/bin/env bash
# Deploy do backend do ArxisVR no servidor orquestrador.
#
# Manda o fonte por tar sobre SSH (a máquina não tem rsync), constrói a imagem
# lá e sobe. Constrói no servidor de propósito: `bcrypt` é nativo e uma imagem
# montada no Windows não serve para Linux.
#
# Uso:  ./deploy/deploy.sh
# Requer: ~/.ssh/hetzner_avilaops e o /opt/arxisvr/.env já criado no servidor.
set -euo pipefail

HOST="${ARXISVR_HOST:-23.88.60.193}"
KEY="${ARXISVR_SSH_KEY:-$HOME/.ssh/hetzner_avilaops}"
REMOTE=/opt/arxisvr
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

ssh_() { ssh -i "$KEY" -o StrictHostKeyChecking=no "root@$HOST" "$@"; }

echo "==> empacotando fonte do backend"
tar -C "$ROOT" -czf - \
  --exclude=backend/node_modules \
  --exclude=backend/dist \
  --exclude=backend/coverage \
  --exclude=backend/logs \
  --exclude=backend/uploads \
  --exclude='backend/.env*' \
  backend deploy/docker-compose.yml \
| ssh_ "mkdir -p $REMOTE && tar -C $REMOTE -xzf - && mv -f $REMOTE/deploy/docker-compose.yml $REMOTE/docker-compose.yml && rmdir $REMOTE/deploy 2>/dev/null || true"

echo "==> build da imagem"
ssh_ "cd $REMOTE && docker compose build api"

echo "==> subindo"
ssh_ "cd $REMOTE && docker compose up -d"

echo "==> esperando o /health responder"
for i in $(seq 1 40); do
  if ssh_ "docker exec arxisvr-api curl -fsS http://127.0.0.1:3001/health >/dev/null 2>&1"; then
    echo "ok em ${i}0s"
    ssh_ "docker exec arxisvr-api curl -s http://127.0.0.1:3001/health"
    exit 0
  fi
  sleep 10
done

echo "não respondeu. últimos logs:" >&2
ssh_ "docker logs --tail 60 arxisvr-api" >&2
exit 1
