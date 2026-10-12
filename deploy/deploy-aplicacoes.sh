#!/usr/bin/env bash
#
# Deploy do ArxisVR no servidor apps-noclient (204.168.249.111, Hetzner hel1).
# Ate 10/09/2026 era o servidor de aplicacoes (178.105.82.48).
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

HOST="${ARXISVR_HOST:-204.168.249.111}"
KEY="${ARXISVR_SSH_KEY:-$HOME/.ssh/hetzner_avilaops}"
# Enderecos publicos. O canonico e arxisbim.com.br desde 17/09/2026: entra no
# bundle (VITE_SITE_URL) e nas conferencias do fim do script.
# Enquanto o DNS nao apontar, rode com ARXISVR_SITE_URL/ARXISVR_API_URL do
# dominio antigo. Ver documentation/MIGRACAO-2026-09-17-dominio-arxisbim.md
SITE_URL="${ARXISVR_SITE_URL:-https://arxisbim.com.br}"
API_URL="${ARXISVR_API_URL:-https://api.arxisbim.com.br}"
# Origem do app (login, validador, visualizador). Separada do site desde
# 10/10/2026: o site publico vai para o CMS, e e aqui que a SPA deste
# repositorio e conferida depois de publicar.
APP_URL="${ARXISVR_APP_URL:-https://app.arxisbim.com.br}"
REMOTE=/opt/arxisvr
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

ssh_() { ssh -i "$KEY" -o StrictHostKeyChecking=no "root@$HOST" "$@"; }

# Builds que rodam NESTA maquina passam pelo build-pesado quando ele existe (no
# servidor dos agentes, 4 GB de RAM): um build pesado por vez, com teto de heap
# no Node. Sem ele no PATH (maquina do Nicolas, CI) o comando e o de sempre.
# Dentro do `docker build` o ambiente de quem chama nao entra: o teto vai por
# --build-arg e o backend/Dockerfile o recebe. O build no servidor (padrao da
# API) nao passa por aqui.
PESADO=()
TETO=()
if command -v build-pesado >/dev/null 2>&1; then
  PESADO=(build-pesado)
  TETO=(--build-arg "NODE_OPTIONS=--max-old-space-size=${BUILD_PESADO_HEAP_MB:-1024}")
fi

# Type-check + build de cada alvo sao UMA etapa, que roda numa execucao interna
# deste script (_api-local, _web-local) por dentro do build-pesado: uma trava
# so em volta das duas coisas. Antes o `tsc` rodava fora da trava, somando com
# o build de outra sessao, e so o build esperava a vez. Sem o build-pesado a
# etapa roda do mesmo jeito, sem trava.
sob_trava() {
  ARXISVR_NODE_OPTIONS_DE_FORA="${NODE_OPTIONS-}" \
    ${PESADO[@]+"${PESADO[@]}"} bash "$ROOT/deploy/deploy-aplicacoes.sh" "$1"
}

# O teto de heap que o build-pesado exporta vale para o build. O type-check
# fica so com a trava, com o NODE_OPTIONS de quem chamou o deploy: o `tsc`
# nunca foi medido com 1024 MB.
sem_teto() {
  if [ "${#PESADO[@]}" -gt 0 ] && [ "${ARXISVR_NODE_OPTIONS_DE_FORA+x}" = x ]; then
    NODE_OPTIONS="$ARXISVR_NODE_OPTIONS_DE_FORA" "$@"
  else
    "$@"
  fi
}

# Etapa interna _api-local (so com ARXISVR_BUILD_LOCAL=1).
local_api() {
  if [ "${ARXISVR_SEM_CONFERIR:-0}" != "1" ]; then
    echo "==> [api] type-check (npm run type-check)"
    (cd "$ROOT/backend" && sem_teto npm run type-check) || { echo "    tipos com erro: deploy parado antes de construir"; return 1; }
  fi
  echo "==> [api] build local"
  docker build ${TETO[@]+"${TETO[@]}"} -t arxisvr-api:local "$ROOT/backend"
}

# Etapa interna _web-local.
local_web() {
  # Portao: tipos do frontend antes de empacotar (mesma regra do backend).
  # O tsconfig cobre o grafo de src/main.tsx, o que entra no bundle.
  if [ "${ARXISVR_SEM_CONFERIR:-0}" != "1" ]; then
    echo "==> [web] type-check (npm run typecheck)"
    (cd "$ROOT/frontend" && sem_teto npm run typecheck) || { echo "    tipos com erro: deploy parado antes de empacotar"; return 1; }
  fi
  echo "==> [web] build local (Vite, ~1 min: nao vale o tar de 14 MB de dist mais o node_modules no servidor)"
  # VITE_SITE_URL entra no bundle em tempo de build (sitemap, robots, feed e
  # canonical). A origem da API nao e mais fixada aqui: desde 17/09/2026 ela e
  # resolvida em execucao por src/config/site.config.ts, para o mesmo bundle
  # servir o dominio novo e o antigo. Para forcar uma origem (teste, staging):
  # VITE_API_URL=... ./deploy/deploy-aplicacoes.sh web
  (cd "$ROOT/frontend" && VITE_SITE_URL="$SITE_URL" npm run build)
}

deploy_api() {
  # Portao: tipos do backend ANTES de construir a imagem. O build e esbuild,
  # que remove os tipos sem checar: um erro de tipo viaja para producao sem
  # nenhum aviso. O portao existia em deploy/deploy.sh (orquestrador) e nao
  # tinha vindo para ca; achado na prova de deploy de 11/09/2026.
  # O type-check tambem roda no servidor (etapa do Dockerfile, abaixo), pelo
  # mesmo motivo do build: a maquina do Nicolas e dividida com outras sessoes
  # e um `tsc` local chegou a ficar 20 min sem terminar (11/09/2026).
  # ARXISVR_BUILD_LOCAL=1 confere aqui, como antes (em local_api, junto com
  # o build, sob a mesma trava).
  # Build NO SERVIDOR, a partir do codigo enviado por tar (11/09/2026). No
  # servidor de aplicacoes o build era local porque a maquina dividia 3,7 GB
  # com clientes pagantes; o apps-noclient nao tem cliente, tem 2,4 GB livres,
  # e o app esta em desenvolvimento: um build pesado la so pesa no proprio
  # ArxisVR. Local, a imagem de 850 MB levava 20 min para construir e outros
  # tantos para subir (o `docker save | ssh` trava a maquina do Nicolas).
  # ARXISVR_BUILD_LOCAL=1 volta ao caminho antigo, se um dia fizer falta.
  local marca
  if [ "${ARXISVR_BUILD_LOCAL:-0}" = "1" ]; then
    sob_trava _api-local
    marca="$(docker run --rm --entrypoint sh arxisvr-api:local -c 'cat /app/dist/index.js | wc -c')"
    echo "    marca do build (bytes de dist/index.js): $marca"
    echo "==> [api] enviando a imagem"
    docker save arxisvr-api:local | gzip -1 | ssh_ 'gunzip | docker load'
  else
    echo "==> [api] enviando o codigo (tar, respeitando o .dockerignore)"
    # O tar leva so o que o Dockerfile usaria: sem node_modules, dist, .env,
    # uploads. Sao ~1 MB em vez de 850 MB de imagem.
    # O .dockerignore exclui o proprio Dockerfile (ele nao precisa ir para
    # DENTRO da imagem), mas o build precisa dele no contexto: vai a parte.
    tar -C "$ROOT/backend" --exclude-from="$ROOT/backend/.dockerignore" -czf - .       | ssh_ "rm -rf $REMOTE/build-api && mkdir -p $REMOTE/build-api && tar -C $REMOTE/build-api -xzf -"
    scp -q -i "$KEY" "$ROOT/backend/Dockerfile" "$ROOT/backend/.dockerignore" "root@$HOST:$REMOTE/build-api/"
    echo "==> [api] type-check + build NO SERVIDOR (o Dockerfile roda tsc --noEmit antes do esbuild)"
    ssh_ "cd $REMOTE/build-api && DOCKER_BUILDKIT=1 docker build --build-arg CONFERIR=${ARXISVR_SEM_CONFERIR:-0} -q -t arxisvr-api:local . >/dev/null && rm -rf $REMOTE/build-api"       || { echo "[api] type-check ou build falhou no servidor (leia acima)" >&2; return 1; }
    marca="$(ssh_ "docker run --rm --entrypoint sh arxisvr-api:local -c 'cat /app/dist/index.js | wc -c'")"
    echo "    marca do build (bytes de dist/index.js): $marca"
  fi

  # Marca do build: o tamanho do dist dentro da imagem. Depois de subir, o
  # container em execucao tem de mostrar a MESMA marca: e a prova de que o
  # que esta rodando e o que acabou de ser construido (08/09/2026: um deploy
  # "sem erro" tinha subido a imagem anterior).
  echo "==> [api] subindo"
  ssh_ "cd $REMOTE && docker compose up -d --force-recreate api"
  local rodando
  rodando="$(ssh_ "docker exec arxisvr-api sh -c 'cat /app/dist/index.js | wc -c'")"
  if [ "$marca" != "$rodando" ]; then
    echo "[api] ABORTADO: o container em execucao ($rodando) nao e a imagem recem-construida ($marca)." >&2
    return 1
  fi
  echo "    ok, o container roda a imagem recem-construida"

  # O .env e o volume de uploads nao sao tocados pelo deploy: conferido aqui
  # porque perde-los seria silencioso (a API sobe, os IFCs somem).
  echo "==> [api] conferindo .env e volume de uploads no container novo"
  ssh_ "test -s $REMOTE/.env && docker inspect arxisvr-api --format '{{range .Mounts}}{{.Name}} {{.Destination}}{{println}}{{end}}' | grep -q 'arxisvr_uploads /app/uploads'"     || { echo "[api] ABORTADO: .env vazio ou volume de uploads nao montado" >&2; return 1; }
  echo "    ok"

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
  # Type-check + build, sob uma trava so (local_web).
  sob_trava _web-local

  # O arquivo de entrada que o index.html do build aponta: o nome leva o hash
  # do conteudo, entao muda a cada build. (Ate 12/10/2026 a conferencia usava
  # `pages-*.js`, pedaco que deixou de existir quando as telas passaram a ser
  # carregadas sob demanda.)
  local bundle
  bundle="$(grep -oE 'assets/main-[^"]*\.js' "$ROOT/frontend/dist/index.html" | head -1)"
  [ -n "$bundle" ] || { echo "[web] ABORTADO: o build nao tem arquivo de entrada no index.html." >&2; return 1; }
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
  publicado="$(curl -s --max-time 30 "$APP_URL/" | grep -oE 'assets/main-[^"]*\.js' | head -1)"
  if [ "$bundle" != "$publicado" ]; then
    echo "[web] ABORTADO: publicado '$publicado', esperado '$bundle'." >&2
    return 1
  fi
  echo "    ok, $publicado no ar"
}

case "${1:-tudo}" in
  _api-local) local_api; exit 0 ;;
  _web-local) local_web; exit 0 ;;
  api)  deploy_api ;;
  web)  deploy_web ;;
  tudo) deploy_api; deploy_web ;;
  *)    echo "uso: $0 [api|web|tudo]" >&2; exit 1 ;;
esac

echo
echo "==> conferindo no ar"
falhou=0
for u in "$API_URL/health" "$SITE_URL/" "$APP_URL/login" "$APP_URL/validador" "$APP_URL/app/compare"; do
  codigo="$(curl -s -o /dev/null -w '%{http_code}' --max-time 25 "$u")"
  printf '  %-45s %s
' "$u" "$codigo"
  [ "$codigo" = "200" ] || falhou=1
done
# /health precisa dizer que o banco esta de pe: 200 com database:down foi o incidente de 09/09.
curl -s --max-time 25 "$API_URL/health" | grep -q '"database":"up"' && echo '  banco: up' || { echo '  banco: NAO esta up' >&2; falhou=1; }
[ "$falhou" = 0 ] || { echo "deploy terminou, mas a conferencia publica falhou" >&2; exit 1; }
