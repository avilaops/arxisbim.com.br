# Imagem do backend do ArxisVR.
#
# Duas etapas porque `bcrypt` é nativo: a primeira precisa de python3/make/g++
# para compilar quando não há prebuild, a segunda fica só com o runtime. As duas
# saem do mesmo `node:20-slim`, então o .node compilado na etapa de build roda
# sem mudança de ABI na etapa final.
#
# O build usa esbuild (`build.mjs`) com `bundle: false`: cada .ts vira um .js e
# os imports continuam apontando para `node_modules`. Por isso a imagem final
# carrega `node_modules` de produção, não um bundle único.
#
# As migrations vão junto: `runMigrations()` lê `../migrations` a partir de
# `dist/` no boot, então `dist` e `migrations` precisam ser irmãos em /app.

FROM node:20-slim AS build
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:20-slim
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
