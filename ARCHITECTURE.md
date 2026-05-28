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
- ✅ `/api/v1/storage/*` - Storage service com presigned URLs e download direto
- ✅ `/api/v1/observability/health` - Health check

## Configurações
- ✅ CORS configurado (origin: '*' ou por env var CORS_ORIGIN)
- ✅ Storage: LocalStorageService com diretório uploads/
- ✅ Multipart configurado para uploads até 100MB
- ✅ Rate limiting configurado (100 req/min)

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
- ✅ IFC Upload - Upload via botão ou drag-drop para backend
- ✅ IFC List - Carregada do backend via tenantService.getIFCModels()
- ✅ IFC Download - Download do backend para carregar no viewer 3D
- ✅ ViewerHost com Three.js
- ✅ IFCSimpleLoader (carregamento IFC)
- ✅ ScenariosPanel, SectionsPanel, MeasurementsPanel, QueryPanel, TakeoffPanel, BudgetPanel

## Frontend Features (Pendentes)
- ❌ Salvamento/carga de cenários (scenarios) com backend
- ❌ Upload/download direto via storage presigned URLs (opcional, já tem download direto)

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
