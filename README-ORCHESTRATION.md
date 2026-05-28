# ArxisVR - Orquestração de Serviços

## 🚀 Rodar todos os serviços com um comando

Este projeto foi configurado para rodar **Backend, Frontend e Signaling Server** simultaneamente com um único comando.

### Opções de execução

#### Opção 1: Script Batch (Windows - Recomendado)
```bash
start-all.bat
```
Este script abre 3 janelas separadas para cada serviço.

#### Opção 2: Script PowerShell
```powershell
.\start-all.ps1
```
Este script usa PowerShell Jobs para rodar os serviços em paralelo.

#### Opção 3: NPM (requer npm funcionando)
```bash
npm run dev
```
Roda todos os serviços usando concurrently (requer npm install na raiz).

### Serviços

| Serviço | Porta | Tecnologia | Comando individual |
|---------|-------|------------|-------------------|
| **Backend** | 3001 | Fastify + TypeScript | `cd backend && npm run dev` |
| **Frontend** | 5173 | Vite + TypeScript | `cd frontend && npm run dev` |
| **Signaling Server** | 3002 | WebSocket + Node.js | `cd signaling-server && npm run dev` |

### Endpoints após iniciar

- **Backend API**: http://localhost:3001
- **Frontend**: http://localhost:5173
- **Signaling WebSocket**: ws://localhost:3002
- **Health Check Backend**: http://localhost:3001/health
- **Health Check Signaling**: http://localhost:3002/health

### Estrutura do projeto

```
arxisvr/
├── backend/              # Fastify API (TypeScript)
│   ├── src/
│   │   └── index.ts      # Entry point
│   ├── package.json      # Configuração (usa dependências compartilhadas)
│   └── tsconfig.json
├── frontend/             # Vite App (TypeScript)
│   ├── src/
│   ├── vite.config.ts    # Configuração Vite
│   └── package.json
├── signaling-server/     # WebSocket Server
│   ├── server.js         # Entry point
│   └── package.json
├── package.json          # Scripts de orquestração
├── start-all.bat         # Script Windows (Batch)
└── start-all.ps1         # Script PowerShell
```

### Dependências

O projeto usa **dependências compartilhadas** do `node_modules` na raiz para evitar duplicação:
- `tsx` - Execução TypeScript
- `typescript` - Compilação
- `@fastify/*` - Framework backend
- `vite` - Framework frontend

### Variáveis de ambiente

Configure o arquivo `.env` na raiz (baseado no `.env.example`):

```env
# Backend
DATABASE_URL=postgres://user:password@localhost:5432/arxisvr_dev
PORT=3001
JWT_SECRET=your_secret_key

# Frontend
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3002

# Signaling Server
SIGNALING_PORT=3002
```

### Troubleshooting

**Erro: "tsx não encontrado"**
- As dependências estão no `node_modules` raiz. Se faltar, rode na raiz: `npm install`

**Erro: "vite não encontrado"**
- O Vite deve estar no `node_modules` raiz. Rode: `npm install`

**Portas já em uso**
- Altere as portas no `.env` ou nos arquivos de configuração

**Backend não inicia**
- Verifique se o PostgreSQL está rodando
- Verifique as variáveis de ambiente no `.env`

### Desenvolvimento individual

Para rodar apenas um serviço:

```bash
# Apenas backend
cd backend && npm run dev

# Apenas frontend
cd frontend && npm run dev

# Apenas signaling server
cd signaling-server && npm run dev
```

### Build para produção

```bash
npm run build
```

Isso compila o backend TypeScript e builda o frontend Vite.
