#!/usr/bin/env bash
#
# Deploy do ArxisVR no servidor de APLICACOES (178.105.82.48).
#
# Existe por causa de um erro concreto, em 08/09/2026: rodei o `docker save` da
# imagem da API enquanto o `docker build` dela ainda estava em andamento, entao
# enviei a imagem ANTIGA. O `docker load` e o `--force-recreate` funcionaram sem
# erro nenhum, o /health respondeu 200, e o deploy pareceu bem-sucedido, com a
# correcao que eu tinha acabado de fazer ausente do servidor. So foi descoberto
# porque o Nicolas perguntou se o deploy estava indo para o servidor.
#
# A licao: "o comando de deploy nao deu erro" NAO e prova de que o codigo novo
# esta rodando. Por isso cada etapa aqui verifica o resultado, e o script para
# na primeira que nao bater.
#
# Uso:  ./deploy/deploy-aplicacoes.sh [api|web|tudo]
set -euo pipefail

HOST="${ARXISVR_HOST:-178.105.82.48}"
KEY="${ARXISVR_SSH_KEY:-$HOME/.ssh/hetzner_avilaops}"
REMOTE=/opt/arxisvr
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

ssh_() { ssh -i "$KEY" -o StrictHostKeyChecking=no "root@$HOST" "$@"; }

deploy_api() {
  echo "==> [api] build local"
  # Local, e nao no servidor: o build e o pico de consumo de RAM e a maquina
  # divide 3,7 GB com os clientes. Compilar la arrisca derrubar quem paga.
  docker build -t arxisvr-api:local "$ROOT/backend"

  # Marca do build: a data de modificacao do dist dentro da imagem. Serve para
  # provar, depois, que o servidor recebeu ESTA imagem e nao uma anterior.
  local marca
  marca="$(docker run --rm --entrypoint sh arxisvr-api:local -c 'cat /app/dist/index.js | wc -c')"
  echo "    marca do build (bytes de dist/index.js): $marca"

  echo "==> [api] enviando a imagem"
  docker save arxisvr-api:local | gzip -1 | ssh_ 'gunzip | docker load'

  echo "==> [api] conferindo a imagem NO SERVIDOR antes de subir"
  local remoto
  remoto="$(ssh_ "docker run --rm --entrypoint sh arxisvr-api:local -c 'cat /app/dist/index.js | wc -c'")"
  if [ "$marca" != "$remoto" ]; then
    echo "[api] ABORTADO: a imagem no servidor ($remoto) nao e a que acabei de" >&2
    echo "      construir ($marca). Foi isso que aconteceu em 08/09/2026." >&2
    return 1
  fi
  echo "    ok, e a mesma imagem"

  echo "==> [api] subindo"
  ssh_ "cd $REMOTE && docker compose up -d --force-recreate api"

  echo "==> [api] esperando o /health"
  for _ in $(seq 1 40); do
    if ssh_ "curl -fsS http://127.0.0.1:3101/health >/dev/null 2>&1"; then
      echo "    ok"
      return 0
    fi
    sleep 5
  done
  echo "[api] nao respondeu. ultimos logs:" >&2
  ssh_ "docker logs arxisvr-api --tail 40" >&2
  return 1
}

deploy_web() {
  echo "==> [web] build local"
  # VITE_API_URL entra no bundle em tempo de build: sem isto o site publicado
  # aponta para localhost e nenhuma tela carrega dado.
  (cd "$ROOT/frontend" && VITE_API_URL=https://api.arxisvr.avilaops.com npm run build)

  local bundle
  bundle="$(basename "$(ls "$ROOT"/frontend/dist/assets/pages-*.js | head -1)")"
  echo "    bundle: $bundle"

  echo "==> [web] enviando o dist"
  tar -C "$ROOT/frontend" -czf - dist | ssh_ "mkdir -p $REMOTE/web && cd $REMOTE/web && rm -rf dist && tar -xzf -"

  # `--force-recreate` NAO e zelo: o container mantem a referencia antiga do
  # bind mount quando o dist e trocado embaixo dele, e passa a responder 404
  # com os arquivos novos no lugar. Aconteceu duas vezes antes de eu entender.
  echo "==> [web] recriando o container"
  ssh_ "cd $REMOTE && docker compose up -d --force-recreate web"
  sleep 4

  echo "==> [web] conferindo que o bundle PUBLICADO e o que acabei de construir"
  local publicado
  publicado="$(curl -s --max-time 30 https://arxisvr.avilaops.com/ | grep -oE 'pages-[^"]*\.js' | head -1)"
  if [ "$bundle" != "$publicado" ]; then
    echo "[web] ABORTADO: publicado '$publicado', esperado '$bundle'." >&2
    return 1
  fi
  echo "    ok, $publicado no ar"
}

case "${1:-tudo}" in
  api)  deploy_api ;;
  web)  deploy_web ;;
  tudo) deploy_api; deploy_web ;;
  *)    echo "uso: $0 [api|web|tudo]" >&2; exit 1 ;;
esac

echo
echo "==> conferindo no ar"
for u in https://api.arxisvr.avilaops.com/health https://arxisvr.avilaops.com/; do
  printf '  %-45s %s\n' "$u" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 25 "$u")"
done
