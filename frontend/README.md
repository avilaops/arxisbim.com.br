# ArxisVR: Frontend

Vite MPA + Three.js + IFC. Viewer BIM com colaboração realtime e pipeline AAA de renderização.

---

## Scripts

```bash
npm run dev          # dev server
npm run build        # build produção
npm run test         # vitest
npm run lint         # eslint
npm run format       # prettier
```

Node 20.x. Ver `.nvmrc` na raiz.

---

## Estrutura

```
src/
├── core/           # EventBus, AppState, tipos, utils
├── services/       # Singletons: Auth, Realtime, IFC, Storage, etc.
├── viewer/         # Engine Three.js (ViewerHost, LODManager, PostProcessing)
├── workers/        # Web workers: ifcWorker, glbWorker
├── controllers/    # Controllers de domínio
├── components/     # UI components
├── state/          # State manager
└── navigation/     # Routing
```

---

## Serviços principais

| Serviço | Responsabilidade |
|---|---|
| `AuthService` | JWT + OAuth Google/GitHub |
| `RealtimeService` | WebSocket, presença, chat, seleções |
| `IFCService` | Parse, streaming, LOD |
| `StorageService` | Upload/download R2 |
| `BudgetService` | Quantitativos 5D |

Padrão singleton: `getAuthService()`, `getRealtimeService()`, etc.

---

## Viewer 3D

Pipeline AAA ativo: SAO · UnrealBloom · BokehPass · SMAA · FilmPass · GodRays · CSM · AdaptiveQuality.

Presets de qualidade: `low · medium · high · ultra` - trocáveis via `setQuality()`.

Testar pipeline: `window.__postProcess` exposto no browser.

---

## Variáveis de ambiente

```bash
cp .env.example .env.local
# VITE_API_URL=https://api.arxisvr.avilaops.com
# VITE_WS_URL=wss://api.arxisvr.avilaops.com
```

---

## Deploy

Push em `main` → workflow `Deploy to Production` (`.github/workflows/deploy-prod.yml`) → build e verificação → deploy por SSH no servidor apps-noclient, que serve frontend e backend em `arxisvr.avilaops.com` (`/opt/arxisvr`, Caddy do container `arxisvr-web`).
