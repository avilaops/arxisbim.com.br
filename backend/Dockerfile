# Imagem do backend do ArxisVR.
#
# Duas etapas porque `bcrypt` é nativo: a primeira precisa de python3/make/g++
# para compilar quando não há prebuild, a segunda fica só com o runtime. As duas
# saem do mesmo `node:24-slim`, então o .node compilado na etapa de build roda
# sem mudança de ABI na etapa final. A versão acompanha o `engines` do
# package.json (>=24): manter em 20 fazia a imagem divergir do que o projeto
# declara e do que o CI usa.
#
# O build usa esbuild (`build.mjs`) com `bundle: false`: cada .ts vira um .js e
# os imports continuam apontando para `node_modules`. Por isso a imagem final
# carrega `node_modules` de produção, não um bundle único.
#
# As migrations vão junto: `runMigrations()` lê `../migrations` a partir de
# `dist/` no boot, então `dist` e `migrations` precisam ser irmãos em /app.

FROM node:24-slim AS build
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Portao de tipos dentro da imagem (11/09/2026): o build e esbuild, que nao
# checa tipos; sem isto um erro de tipo viaja para producao em silencio.
# CONFERIR=1 pula (emergencia comprovada, nunca por rotina).
ARG CONFERIR=0
# Teto de heap do Node no type-check e no build, so nesta etapa: quem constroi
# no servidor dos agentes passa --build-arg NODE_OPTIONS=--max-old-space-size=N
# (deploy/deploy-aplicacoes.sh, via build-pesado). Sem o argumento fica vazio,
# como antes. A etapa final nao herda.
ARG NODE_OPTIONS
ENV NODE_OPTIONS=$NODE_OPTIONS
RUN if [ "$CONFERIR" != "1" ]; then npm run type-check; fi
RUN npm run build && npm prune --omit=dev

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/package.json ./package.json

# UPLOAD_DIR do driver local. Recebe volume no compose; sem volume os IFCs
# morrem junto com o container.
RUN mkdir -p /app/uploads

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3001/health/live || exit 1

CMD ["node", "--import", "./dist/instrument.js", "dist/index.js"]
