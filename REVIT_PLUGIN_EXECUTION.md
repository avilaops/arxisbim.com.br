# Execução: Plugin Revit para ArxisVR

**Escopo:** MVP Completo (P1.1 + P1.2 + P1.3)  
**Timeline:** 6 semanas (agressiva)  
**Status:** ⚡ INICIANDO  
**Última atualização:** 16/07/2026

---

## 🎯 Objetivo

Lançar plugin Revit 2024+ que permite exportar modelo → ArxisVR em **< 2 minutos**.

**Entregável:** Plugin v1.0 (beta) + Validador local + Asset Manager básico

---

## 📋 Backlog Executivo (Sprints)

### Sprint 0: Setup (Dias 1–3)

**Objetivo:** Ambiente dev 100% funcional

- [ ] Scaffold projeto C# (.NET 7)
- [ ] Instalar Revit 2024 SDK
- [ ] Criar sln + projetos (Plugin | Tests | Shared)
- [ ] Setup backend Node.js (validador)
- [ ] Electron app scaffolding
- [ ] Git repo estruturado
- [ ] CI/CD básico (GitHub Actions)

**Deliverable:** Primeira build sem erros

---

### Sprint 1: UI + Export Core (Semana 1–2)

**Objetivo:** Ribbon + Dialog + primeiro export funcional

#### Tarefas
- [ ] Ribbon: botão "Export to ArxisVR" (C#)
- [ ] Dialog de configuração (WPF)
  - [ ] Checkboxes (STRUT / ARQUI / MEP)
  - [ ] LOD selector (200/300/350/400)
  - [ ] Project name input
  - [ ] Preview de elementos (stats)
- [ ] IFC Exporter básico
  - [ ] Export IFC via Revit API
  - [ ] Compressão Draco
  - [ ] Validação de file
- [ ] REST Client (ArxisVRClient)
  - [ ] Upload async com progress
  - [ ] Error handling
- [ ] Progress Dialog
  - [ ] Mostrar status em tempo real
  - [ ] Cancelar export

**Deliverable:** Plugin que exporta IFC e faz upload (sem validação)

**Tests:** Unit tests para IFCExporter

---

### Sprint 2: Validador Local (Semana 3)

**Objetivo:** Validação IFC antes de upload (backend + UI)

#### Tarefas
- [ ] ValidationService (Node.js)
  - [ ] Parse IFC (web-ifc)
  - [ ] Checklist: geometria, propriedades, hierarquia
  - [ ] Detecção de duplicatas, unidades, orphans
  - [ ] Score de validação
- [ ] Auto-fix engine
  - [ ] Remove elementos orfãos
  - [ ] Regenera GUIDs duplicadas
  - [ ] Normaliza unidades
- [ ] Electron app (React UI)
  - [ ] Drag & drop de IFC
  - [ ] Mostrar issues com sugestões
  - [ ] Botão "Auto-Fix"
  - [ ] Export relatório PDF
- [ ] Integração com plugin
  - [ ] Botão "Validate" no plugin Revit
  - [ ] Chamar validador local (Node.js subprocess)

**Deliverable:** Validador standalone + integrado no plugin

**Tests:** Integration tests (IFC parse + validation)

---

### Sprint 3: Asset Manager MVP (Semana 4)

**Objetivo:** Biblioteca de componentes básica

#### Backend (Fastify)
- [ ] Tabelas: `components`, `component_versions`
- [ ] Rotas:
  - [ ] POST /api/v1/components (criar)
  - [ ] GET /api/v1/components (listar)
  - [ ] PATCH /api/v1/components/:id (versionar)
  - [ ] DELETE /api/v1/components/:id
- [ ] Autenticação + tenant isolation

#### Plugin (C#)
- [ ] Dialog "Component Manager"
  - [ ] Listar componentes locais (cache)
  - [ ] Buscar (nome, categoria)
  - [ ] Criar novo componente (família Revit → IFC)
  - [ ] Sync com backend
- [ ] Evento: quando família mudou → push nova versão

#### Frontend (React)
- [ ] Painel Asset Manager
  - [ ] Listar biblioteca
  - [ ] Ver detalhes (IFC, thumbnail, metadados)
  - [ ] Usar em projeto

**Deliverable:** Asset Manager base (CRUD completo)

---

### Sprint 4: Sync Bidirectional (Semana 5)

**Objetivo:** Mudanças ArxisVR → Revit (custos, cronograma)

#### Tarefas
- [ ] CostSyncer (C#)
  - [ ] Import CSV de custos do ArxisVR
  - [ ] Mapear para parâmetros Revit
  - [ ] Atualizar schedule de custos
  - [ ] Validação de delta
- [ ] TimelineExtractor (C#)
  - [ ] Parse Revit Phases → tasks
  - [ ] Gerar arquivo XML (MS Project compatible)
  - [ ] Export direto para ArxisVR
- [ ] WebSocket sync
  - [ ] Listen para notificações (ex: "clash resolvido")
  - [ ] Toastr notifications no plugin

**Deliverable:** Sync unidirecional completo (arquivo-based first)

---

### Sprint 5: Testes + Polish + Docs (Semana 6)

**Objetivo:** Qualidade, preparação para launch

#### Tarefas
- [ ] Testes
  - [ ] Unit tests (C#): 80%+ coverage
  - [ ] Integration tests: export + validate + sync
  - [ ] E2E: Revit → ArxisVR → browser
- [ ] Bug fixes + performance
  - [ ] Optimize memory (exports 50MB+)
  - [ ] Error messages em PT + EN + ES + DE
  - [ ] Fallbacks graceful
- [ ] Documentação
  - [ ] Install guide (step-by-step)
  - [ ] User guide (com screenshots)
  - [ ] API docs (para integradores)
  - [ ] Troubleshooting
- [ ] Packaging
  - [ ] .addin manifest finalizado
  - [ ] Autodesk Store submission
  - [ ] GitHub Releases v1.0-beta

**Deliverable:** Plugin pronto para beta testing

---

## 📊 Timeline Visual

```
SPRINT 0      SPRINT 1       SPRINT 2       SPRINT 3       SPRINT 4       SPRINT 5
(Setup)      (UI + Export) (Validador)   (Asset Mgr)   (Sync 2-way)   (Polish)
Dias 1–3      Semana 1–2      Semana 3       Semana 4       Semana 5       Semana 6
──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────
Build OK  │   Export OK   │  Validate OK  │  CRUD OK  │  Sync OK  │  v1.0-beta
          │               │               │           │           │
```

---

## 🛠️ Setup de Ambiente

### Requisitos

```
Windows 11
├── Visual Studio 2022+ (C# workload)
├── .NET 7 SDK
├── Revit 2024 (ou SDK)
├── Node.js 20.x
├── npm 10.x
└── Git

WSL2 (opcional, para backend):
├── Ubuntu 22.04
├── PostgreSQL (dev)
└── Node.js 20.x
```

### Passo 1: Preparar Revit SDK

```powershell
# 1. Download Revit 2024 SDK
# https://www.autodesk.com/developer-network/platform-technologies/revit

# 2. Instalar SDK
# No instalador, selecionar "Revit API" + "Revit Database"

# 3. Copiar assemblies para projeto
# De: C:\Program Files\Autodesk\Revit 2024\AddIns\RevitAPI.dll
# Para: revit-plugin\libs\

# 4. Verificar PATH
dotnet --version  # deve ser 7.0+
```

### Passo 2: Scaffold C#

```powershell
# Navegar para projeto
cd d:\Projetos\arxisvr

# Criar estrutura
mkdir revit-plugin
cd revit-plugin

# Novo projeto
dotnet new sln -n ArxisVR.RevitPlugin
dotnet new classlib -n ArxisVR.RevitPlugin
dotnet new nunit -n ArxisVR.RevitPlugin.Tests

# Adicionar ao sln
dotnet sln add ArxisVR.RevitPlugin/ArxisVR.RevitPlugin.csproj
dotnet sln add ArxisVR.RevitPlugin.Tests/ArxisVR.RevitPlugin.Tests.csproj

# NuGet packages
cd ArxisVR.RevitPlugin
dotnet add package Newtonsoft.Json
dotnet add package Serilog
dotnet add package Serilog.Sinks.Console
```

### Passo 3: Backend Validador (Node.js)

```bash
# No WSL2 ou terminal Node
cd d:\Projetos\arxisvr

mkdir validator-backend
cd validator-backend

npm init -y
npm install express web-ifc zod dotenv

# Estrutura
mkdir src
mkdir src/services
mkdir src/routes
mkdir src/models
```

### Passo 4: Electron App

```bash
# No Windows (PowerShell)
cd revit-plugin

npx create-electron-app validator-app
cd validator-app
npm install react react-dom

# Estrutura
mkdir src/components
mkdir src/services
```

---

## 📁 Estrutura de Projeto Final

```
arxisvr/
├── revit-plugin/
│   ├── ArxisVR.RevitPlugin.sln
│   ├── ArxisVR.RevitPlugin/
│   │   ├── src/
│   │   │   ├── ArxisVRRibbon.cs
│   │   │   ├── Commands/
│   │   │   │   ├── ExportCommand.cs
│   │   │   │   ├── ValidateCommand.cs
│   │   │   │   └── ComponentCommand.cs
│   │   │   ├── Dialogs/
│   │   │   │   ├── ExportDialog.xaml
│   │   │   │   ├── ExportDialog.xaml.cs
│   │   │   │   └── ...
│   │   │   ├── Services/
│   │   │   │   ├── ArxisVRClient.cs
│   │   │   │   ├── IFCExporter.cs
│   │   │   │   ├── ValidationEngine.cs
│   │   │   │   ├── CostSyncer.cs
│   │   │   │   └── TimelineExtractor.cs
│   │   │   ├── Models/
│   │   │   ├── Utils/
│   │   │   ├── App.xaml
│   │   │   └── AssemblyInfo.cs
│   │   ├── Properties/
│   │   ├── ArxisVR.addin
│   │   ├── app.config
│   │   └── ArxisVR.RevitPlugin.csproj
│   ├── ArxisVR.RevitPlugin.Tests/
│   │   ├── Tests/
│   │   │   ├── IFCExporterTests.cs
│   │   │   ├── ArxisVRClientTests.cs
│   │   │   └── ...
│   │   └── ArxisVR.RevitPlugin.Tests.csproj
│   ├── libs/
│   │   ├── RevitAPI.dll
│   │   └── RevitAPIUI.dll
│   └── .gitignore
│
├── validator-backend/
│   ├── src/
│   │   ├── index.ts
│   │   ├── services/
│   │   │   ├── validationService.ts
│   │   │   └── ifcParser.ts
│   │   ├── routes/
│   │   │   └── validation.ts
│   │   └── models/
│   │       └── types.ts
│   ├── tests/
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── validator-app/
│   ├── src/
│   │   ├── main.ts
│   │   ├── preload.ts
│   │   ├── components/
│   │   │   └── ValidatorWindow.tsx
│   │   └── services/
│   ├── public/
│   ├── package.json
│   └── electron-builder.config.js
│
├── .github/
│   └── workflows/
│       ├── build-plugin.yml
│       ├── test-plugin.yml
│       └── release.yml
│
├── docs/
│   ├── INSTALL.md
│   ├── USER_GUIDE.md
│   └── API_REFERENCE.md
│
└── REVIT_PLUGIN_EXECUTION.md (este arquivo)
```

---

## 🚀 Primeiras Tarefas (TODAY)

### Task 1: Criar arquitetura de pastas

```powershell
# Executar isto no PowerShell
cd d:\Projetos\arxisvr

# Criar estrutura
@(
  "revit-plugin/ArxisVR.RevitPlugin/src/Services",
  "revit-plugin/ArxisVR.RevitPlugin/src/Commands",
  "revit-plugin/ArxisVR.RevitPlugin/src/Dialogs",
  "revit-plugin/ArxisVR.RevitPlugin/src/Models",
  "revit-plugin/ArxisVR.RevitPlugin.Tests/Tests",
  "validator-backend/src/services",
  "validator-backend/src/routes",
  "validator-backend/src/models",
  "validator-app/src/components",
  "validator-app/src/services",
  "docs"
) | ForEach-Object { mkdir -Path $_ -Force }

Write-Host "✅ Estrutura criada"
```

### Task 2: Criar arquivos raiz

- [ ] `.gitignore` (adicionar `bin/`, `obj/`, `node_modules/`, `.env`)
- [ ] `README.md` (overview do plugin)
- [ ] `.env.example` (template de variáveis)

### Task 3: Primeiro build (C#)

```bash
cd revit-plugin
dotnet build ArxisVR.RevitPlugin.sln
```

### Task 4: Sincronizar com backend ArxisVR

- [ ] Novo endpoint: `POST /api/v1/exports`
- [ ] Nova tabela: `exports` + `export_logs`
- [ ] WebSocket handler para notificações

---

## 📈 Métricas de Sucesso (6 semanas)

| Marco | Target | Status |
|---|---|---|
| Sprint 0: Build OK | Day 3 | ⏳ |
| Sprint 1: Export funcional | Week 2 | ⏳ |
| Sprint 2: Validador OK | Week 3 | ⏳ |
| Sprint 3: Asset Manager CRUD | Week 4 | ⏳ |
| Sprint 4: Sync 2-way | Week 5 | ⏳ |
| Sprint 5: v1.0-beta | Week 6 | ⏳ |
| **Teste com 5 users-piloto** | Week 6–7 | ⏳ |
| **Correções de feedback** | Week 7–8 | ⏳ |
| **Launch: Autodesk Store** | Week 8–9 | ⏳ |

---

## 🔗 Referências

- Revit API: https://www.revitapidocs.com
- Autodesk SDK: https://developer.autodesk.com/
- web-ifc: https://github.com/IFCjs/web-ifc
- Electron: https://www.electronjs.org/docs

---

## 📞 Suporte

**Perguntas comuns:**
- "Como debugar plugin Revit?" → Visual Studio attach process `RevitCore.exe`
- "IFC export travando?" → Revisar memory usage, considerar chunks
- "WebSocket connection failed?" → Check firewall + backend running

---

**Status:** Ready to execute  
**Começamos quando:** Agora! 🚀

Próximo passo: Task 1 (criar estrutura)
