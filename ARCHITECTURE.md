# ArxisVR - Arquitetura de Software

## Visão Geral
Plataforma BIM colaborativa com AR/VR, multi-tenant, para gestão de projetos de construção.

## Stack Tecnológico
- **Backend:** Fastify (Node.js), Drizzle ORM, PostgreSQL
- **Frontend:** React, Three.js, Vite
- **Deploy:** Render (backend + frontend estático)

## Estrutura de Dados (Backend)

### Multi-Tenancy
- **tenants:** Isolamento por cliente (federationEnabled, maxProjects)
- **companies:** Empresas dentro de tenants
- **users:** Usuários com roles (admin, user, viewer) e permissões

### Projetos e Modelos
- **projects:** Projetos scoped por tenant + company
- **ifcModels:** Modelos IFC individuais (discipline, phase, metadata)
- **federatedModels:** Combinação de múltiplos IFCs com transformações
- **modelElements:** Elementos extraídos para query (expressId, type, properties)

### BIM Features
- **scenarios:** Cenários salvos (view states, selections)
- **scheduling:** Agendamento 4D (tasks, dependencies, milestones)
- **virtual-meetings:** Reuniões XR com avatares

### Observabilidade
- **logs, metrics, traces:** Monitoramento por tenant

## APIs Existentes (Backend)
- ✅ `/api/v1/auth/*` - Autenticação completa (login, register, 2FA, webauthn, API keys)
- ✅ `/api/v1/observability/health` - Health check

## APIs Faltantes (Backend)
- ❌ `/api/v1/tenants/*` - CRUD de tenants
- ❌ `/api/v1/companies/*` - CRUD de empresas
- ❌ `/api/v1/projects/*` - CRUD de projetos
- ❌ `/api/v1/projects/:projectId/ifc-models/*` - Upload/listagem de IFCs
- ❌ `/api/v1/projects/:projectId/federated-models/*` - Modelos federados
- ❌ `/api/v1/projects/:projectId/scenarios/*` - Cenários BIM
- ❌ `/api/v1/projects/:projectId/scheduling/*` - Agendamento 4D
- ❌ `/api/v1/projects/:projectId/virtual-meetings/*` - Reuniões XR

## Frontend Features (Implementadas)
- ✅ ViewerHost com Three.js
- ✅ IFCSimpleLoader (carregamento IFC)
- ✅ IFCProjectPanel (UI de modelos)
- ✅ BIM4DManager (planejamento 4D)
- ✅ AvatarSystem (XR avatares)
- ✅ ScenariosPanel, SectionsPanel, MeasurementsPanel, QueryPanel, TakeoffPanel, BudgetPanel

## Frontend Features (Faltando Conexão Real)
- ❌ Autenticação real (login/logout com token)
- ❌ Seleção de tenant/project
- ❌ Upload de IFC para backend
- ❌ Listagem de modelos do backend
- ❌ Criação/gerenciamento de modelos federados
- ❌ Salvamento/carga de cenários
- ❌ Agendamento 4D com dados reais
- ❌ Reuniões XR com backend

## Fluxos de Usuário

### Admin
1. Criar tenant
2. Criar empresas dentro do tenant
3. Convidar usuários com roles
4. Gerenciar permissões

### Usuário
1. Login
2. Selecionar tenant (se multi-tenant)
3. Criar projeto
4. Upload de IFCs
5. Criar modelo federado
6. Usar features BIM (4D, XR, etc)

## Próximos Passos
1. Implementar APIs de tenants/companies/projects
2. Implementar APIs de IFC upload/management
3. Conectar frontend auth com backend
4. Implementar seleção de tenant/project
5. Conectar IFC upload com backend storage
6. Implementar federação real de modelos
7. Conectar features BIM com dados reais

# ArxisVR - Arquitetura de Software

## Visão Geral
Plataforma BIM colaborativa com AR/VR, multi-tenant, para gestão de projetos de construção.

## Stack Tecnológico
- **Backend:** Fastify (Node.js), Drizzle ORM, PostgreSQL
- **Frontend:** React, Three.js, Vite
- **Deploy:** Render (backend + frontend estático)

## Estrutura de Dados (Backend)

### Multi-Tenancy
- **tenants:** Isolamento por cliente (federationEnabled, maxProjects)
- **companies:** Empresas dentro de tenants
- **users:** Usuários com roles (admin, user, viewer) e permissões

### Projetos e Modelos
- **projects:** Projetos scoped por tenant + company
- **ifcModels:** Modelos IFC individuais (discipline, phase, metadata)
- **federatedModels:** Combinação de múltiplos IFCs com transformações
- **modelElements:** Elementos extraídos para query (expressId, type, properties)

### BIM Features
- **scenarios:** Cenários salvos (view states, selections)
- **scheduling:** Agendamento 4D (tasks, dependencies, milestones)
- **virtual-meetings:** Reuniões XR com avatares

### Observabilidade
- **logs, metrics, traces:** Monitoramento por tenant

## APIs Existentes (Backend)
- ✅ `/api/v1/auth/*` - Autenticação completa (login, register, 2FA, webauthn, API keys)
- ✅ `/api/v1/tenants/*` - CRUD de tenants
- ✅ `/api/v1/companies/*` - CRUD de empresas
- ✅ `/api/v1/projects/*` - CRUD de projetos
- ✅ `/api/v1/ifc-models/*` - Upload, download, list, update, delete de IFCs
- ✅ `/api/v1/federated-models/*` - Modelos federados (combinar IFCs com transformações)
- ✅ `/api/v1/schedules/*` - BIM 4D scheduling (cronogramas, tarefas, links elementos, simulações)
- ✅ `/api/v1/meetings/*` - Reuniões XR com avatares (já existia no módulo virtual-meetings)
- ✅ `/api/v1/scenarios/*` - Cenários 3D salvos (camera, player, config)
- ✅ `/api/v1/budgets/*` - Orçamentos 5D (budgets e cost items)
- ✅ `/api/v1/storage/*` - Storage service com presigned URLs e download direto
- ✅ `/api/v1/ifc/*` - Análise avançada de IFC:
  - `/api/v1/ifc/:id/elements` - Análise de elementos
  - `/api/v1/ifc/:id/elements/:type` - Elementos por tipo (IFCWALL, IFCBEAM, etc)
  - `/api/v1/ifc/:id/quantities` - Quantitativos (takeoff)
  - `/api/v1/ifc/:id/costs` - Análise de custos 5D
  - `/api/v1/ifc/:id/structural` - Análise estrutural
  - `/api/v1/ifc/:id/mep` - Análise MEP (elétrica, hidráulica, HVAC)
  - `/api/v1/ifc/:id/transport` - Análise de transporte/elevadores
- ✅ `/api/v1/observability/health` - Health check

## Configurações
- ✅ CORS configurado (origin: '*' ou por env var CORS_ORIGIN)
- ✅ Storage: LocalStorageService com diretório uploads/
- ✅ Multipart configurado para uploads até 100MB
- ✅ Rate limiting configurado (100 req/min)
- ✅ Database: PostgreSQL via Drizzle ORM (DATABASE_URL env var, default: postgresql://postgres:postgres@localhost:5432/arxisvr)

## Frontend Features (Implementadas)
- ✅ ViewerHost com Three.js
- ✅ IFCSimpleLoader (carregamento IFC)
- ✅ IFCProjectPanel (UI de modelos)
- ✅ BIM4DManager (planejamento 4D)
- ✅ AvatarSystem (XR avatares)
- ✅ ScenariosPanel, SectionsPanel, MeasurementsPanel, QueryPanel, TakeoffPanel, BudgetPanel

## Frontend Features (Conectadas ao Backend)
- ✅ AuthModal - Login/registro com autenticação real (tokens no localStorage)
- ✅ AdminPanel - Gerenciar tenants/companies/projects (CRUD completo)
- ✅ TenantProjectSelector - Seleção de workspace com criação de projetos
- ✅ FederatedModelsPanel - Gerenciar modelos federados (combinar IFCs com transformações)
- ✅ SchedulingPanel - Cronograma 4D com tarefas e progresso
- ✅ MeetingsPanel - Salas de reunião XR com avatares
- ✅ ScenariosPanel - Cenários 3D salvos (conectado via scenarios.service.ts)
- ✅ BudgetPanel - Orçamentos 5D (conectado via BudgetApiClient)
- ✅ IFC Upload - Upload via botão ou drag-drop para backend
- ✅ IFC List - Carregada do backend via tenantService.getIFCModels()
- ✅ IFC Download - Download do backend para carregar no viewer 3D
- ✅ ViewerHost com Three.js
- ✅ IFCSimpleLoader (carregamento IFC)

## Frontend Features (Pendentes)
- ❌ Upload/download direto via storage presigned URLs (opcional, já tem download direto)

## Frontend Features (Locais - Não requerem backend)
- ✅ TakeoffPanel - Quantitativos do modelo IFC (processamento local)
- ✅ SectionsPanel - Cortes de seção (manipulação viewer 3D)
- ✅ MeasurementsPanel - Medições (manipulação viewer 3D)
- ✅ QueryPanel - Query de elementos (manipulação viewer 3D)

## Fluxos de Usuário

### Admin
1. Criar tenant
2. Criar empresas dentro do tenant
3. Convidar usuários com roles
4. Gerenciar permissões

### Usuário
1. Login
2. Selecionar tenant (se multi-tenant)
3. Criar projeto
4. Upload de IFCs
5. Criar modelo federado
6. Usar features BIM (4D, XR, etc)

## Fluxo Completo Implementado

### Admin
1. Login via AuthModal
2. Acessar AdminPanel (botão configurações)
3. Criar tenant
4. Criar empresas dentro do tenant
5. Criar projetos dentro das empresas
6. Gerenciar permissões (via auth API)

### Usuário
1. Login via AuthModal (token salvo no localStorage)
2. Selecionar tenant/company/project via TenantProjectSelector
3. Criar projeto (botão no selector)
4. Upload de IFC (botão "Abrir IFC" ou drag-drop)
5. Listagem de IFCs (carregada do backend)
6. Carregar IFC no viewer (clique na lista → download → load)
7. Criar modelo federado (FederatedModelsPanel)
8. Combinar IFCs com transformações
9. Criar cronograma 4D (SchedulingPanel)
10. Gerenciar tarefas e progresso
11. Criar sala de reunião XR (MeetingsPanel)
12. Convidar participantes via código

## Storage
- **Driver:** LocalStorageService (filesystem local)
- **Diretório:** `uploads/` (configurável via UPLOAD_DIR env var)
- **Storage Key Format:** `tenants/{tenantId}/{projectId}/{filename}`
- **Endpoints:**
  - `POST /api/v1/storage/presign-get` - Presigned URL para download (S3)
  - `POST /api/v1/storage/presign-put` - Presigned URL para upload (S3)
  - `GET /api/v1/storage/:key` - Download direto (local)
  - `GET /api/v1/storage/info` - Info do storage driver

## API Client (Frontend)
- **Base URL:** `VITE_API_URL` ou `http://localhost:3001`
- **Token Storage:** `localStorage.getItem('arxisvr_token')`
- **User Storage:** `localStorage.getItem('arxisvr_user')`
- **Project Storage:** `localStorage.getItem('arxisvr_project_id')`
- **Tenant Storage:** `localStorage.getItem('arxisvr_tenant_id')`
- **Retry Logic:** 3 tentativas com delay exponencial
- **Timeout:** 30 segundos padrão

## Multiplayer XR (Reuniões)

### Socket.IO Gateway
- **Path:** `/socket.io/`
- **CORS:** Configurável via `CORS_ORIGIN` env var (default: localhost:5173, 3000, 5174)
- **Autenticação:** JWT token no handshake
- **Transports:** WebSocket + Polling

### Eventos Socket.IO

**Client → Server:**
- `JOIN_ROOM` - Entrar na sala com avatar state
- `UPDATE_AVATAR` - Atualizar posição/rotação do avatar
- `SEND_MESSAGE` - Enviar mensagem de chat
- `CREATE_ACTION` - Criar ação (laser pointer, highlight, etc)
- `COLLABORATION_UPDATE` - Updates CRDT (Yjs) para seleções/annotations
- `COLLABORATION_HISTORY_REQUEST` - Recuperar histórico de colaboração
- `WEBRTC_OFFER` - Enviar WebRTC SDP offer
- `WEBRTC_ANSWER` - Enviar WebRTC SDP answer
- `WEBRTC_ICE_CANDIDATE` - Enviar WebRTC ICE candidate
- `LEAVE_ROOM` - Sair da sala

**Server → Client:**
- `JOINED` - Confirmação de join com lista de participantes
- `PARTICIPANT_JOINED` - Novo participante entrou
- `PARTICIPANT_LEFT` - Participante saiu
- `AVATAR_UPDATED` - Avatar atualizado (broadcast)
- `MESSAGE_RECEIVED` - Mensagem de chat recebida
- `ACTION_CREATED` - Ação criada (laser, highlight)
- `COLLABORATION_UPDATED` - Update CRDT recebido
- `COLLABORATION_HISTORY` - Histórico de colaboração
- `WEBRTC_OFFER` - WebRTC offer recebida
- `WEBRTC_ANSWER` - WebRTC answer recebida
- `WEBRTC_ICE_CANDIDATE` - WebRTC ICE candidate recebido
- `ERROR` - Erro

### WebRTC (Áudio/Vídeo)
- **Signaling:** Via Socket.IO (offer/answer/ICE candidates)
- **STUN Servers:** stun.l.google.com:19302, stun1.l.google.com:19302
- **TURN Servers:** Configurável via environment (produção)
- **Peer-to-Peer:** Conexões diretas entre participantes
- **MediaService:** Captura de microfone/câmera
  - Echo cancellation
  - Noise suppression
  - Auto gain control
  - Sample rate: 48kHz
  - Channel count: 1 (mono)
- **Video Config:** 640x360 @ 30fps
- **Screen Share:** 1280x720 @ 15-30fps

### Colaboração CRDT (Yjs)
- Updates persistidos no banco
- Histórico para recuperação em reconnect
- Late joiners recebem histórico completo
- Sincronização de seleções, annotations, sections

### Avatar System
- Position (x, y, z)
- Rotation (x, y, z)
- Animation state (idle, walk, etc)
- Updates broadcast em tempo real

### Frontend Services
- **MeetingsSocketService.ts** - Socket.IO client wrapper
- **MediaService.ts** - Captura de áudio/vídeo
- **WebRTCManager.ts** - Gerenciamento de conexões P2P
- **WebRTCPeer.ts** - Conexão individual WebRTC
- **SignalingService.ts** - Signaling WebSocket (alternativo)
