# Diagrama de Camadas - Arquitetura Frontend

## Visão Geral das Camadas

```mermaid
graph TB
    subgraph "Camada de Apresentação (UI)"
        UI[Componentes UI<br/>Panels, Dialogs, Buttons]
        UIEvents[Eventos UI<br/>Click, Drag, Input]
    end

    subgraph "Camada de Controllers"
        AppController[AppController<br/>Orquestrador Principal]
        ModelController[ModelController<br/>Upload/Processamento]
        SelectionController[SelectionController<br/>Seleção de Objetos]
        ExportController[ExportController<br/>Exportação]
        BatchController[BatchController<br/>Operações em Lote]
        UndoRedoController[UndoRedoController<br/>Histórico]
    end

    subgraph "Camada de Serviços (Business Logic)"
        StorageService[StorageService<br/>Gerenciamento de Arquivos]
        BudgetService[BudgetService<br/>Orçamentos 5D]
        IFCService[IFCService<br/>Parsing IFC]
        NavigationService[NavigationService<br/>Navegação]
        UserService[UserService<br/>Usuários]
        NotificationService[NotificationService<br/>Notificações]
        LoggingService[LoggingService<br/>Logs]
        AnalyticsService[AnalyticsService<br/>Métricas]
    end

    subgraph "Camada de Integração"
        APIClient[API Client<br/>HTTP/WebSocket]
        EventBus[EventBus<br/>Pub/Sub]
    end

    subgraph "Camada de Engine 3D"
        Viewer3D[Viewer 3D<br/>Three.js Engine]
        IFCLoader[IFC Loader<br/>web-ifc]
    end

    subgraph "Camada de Estado"
        AppState[AppState<br/>Estado Global]
    end

    %% Fluxos de Dados
    UI -->|Eventos| UIEvents
    UIEvents -->|Dispatch| AppController
    UIEvents -->|Dispatch| ModelController
    UIEvents -->|Dispatch| SelectionController
    
    AppController -->|Orquestra| ModelController
    AppController -->|Orquestra| SelectionController
    AppController -->|Orquestra| ExportController
    
    ModelController -->|Chama| StorageService
    ModelController -->|Chama| IFCService
    ModelController -->|Atualiza| AppState
    
    SelectionController -->|Atualiza| AppState
    SelectionController -->|Notifica| Viewer3D
    
    StorageService -->|HTTP| APIClient
    BudgetService -->|HTTP| APIClient
    IFCService -->|Processa| IFCLoader
    
    AppController -->|Emit/On| EventBus
    ModelController -->|Emit/On| EventBus
    SelectionController -->|Emit/On| EventBus
    StorageService -->|Emit/On| EventBus
    
    EventBus -->|Propaga| UI
    EventBus -->|Propaga| AppState
    
    AppState -->|Reativo| UI
    
    Viewer3D -->|Eventos 3D| EventBus
    IFCLoader -->|Dados| Viewer3D

    style UI fill:#e1f5ff
    style AppController fill:#fff4e1
    style StorageService fill:#e8f5e9
    style APIClient fill:#f3e5f5
    style EventBus fill:#ffebee
    style Viewer3D fill:#fce4ec
    style AppState fill:#fff9c4
```

## Dependências Entre Camadas

### Regras de Dependência
- **UI** depende de: Controllers, AppState, EventBus
- **Controllers** dependem de: Serviços, AppState, EventBus
- **Serviços** dependem de: APIClient, EventBus (NÃO dependem de UI)
- **APIClient** depende de: Nenhuma camada superior
- **EventBus** é: Singleton global, acessível por todas as camadas
- **AppState** é: Singleton global, acessível por todas as camadas
- **Engine 3D** depende de: EventBus (emite eventos), independente de UI

### Matriz de Dependência

| Camada | UI | Controllers | Serviços | APIClient | EventBus | AppState | Engine 3D |
|--------|-----|-------------|----------|-----------|----------|----------|-----------|
| UI | - | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Controllers | ❌ | - | ✅ | ❌ | ✅ | ✅ | ✅ |
| Serviços | ❌ | ❌ | - | ✅ | ✅ | ❌ | ❌ |
| APIClient | ❌ | ❌ | ❌ | - | ❌ | ❌ | ❌ |
| EventBus | ❌ | ❌ | ❌ | ❌ | - | ❌ | ✅ |
| AppState | ❌ | ❌ | ❌ | ❌ | ✅ | - | ❌ |
| Engine 3D | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | - |

## Fluxos Típicos

### Fluxo 1: Upload de Arquivo IFC

```mermaid
sequenceDiagram
    participant UI
    participant ModelController
    participant StorageService
    participant APIClient
    participant EventBus
    participant IFCService
    participant Viewer3D
    participant AppState

    UI->>ModelController: openModel(file)
    ModelController->>ModelController: validateFile(file)
    ModelController->>EventBus: emit(MODEL_LOADING)
    ModelController->>StorageService: uploadFile(file)
    StorageService->>APIClient: POST /api/v1/storage/upload
    APIClient-->>StorageService: url
    StorageService-->>ModelController: url
    ModelController->>IFCService: parseIFC(url)
    IFCService->>Viewer3D: loadModel(url)
    Viewer3D-->>IFCService: modelId
    IFCService-->>ModelController: properties
    ModelController->>AppState: updateState({ modelLoaded: true })
    ModelController->>EventBus: emit(MODEL_LOADED)
    EventBus-->>UI: MODEL_LOADED
    UI->>AppState: getState()
    AppState-->>UI: { modelLoaded: true }
```

### Fluxo 2: Seleção de Objeto 3D

```mermaid
sequenceDiagram
    participant Viewer3D
    participant EventBus
    participant SelectionController
    participant AppState
    participant UI

    Viewer3D->>EventBus: emit(OBJECT_SELECTED, { object, expressID })
    EventBus->>SelectionController: on(OBJECT_SELECTED)
    SelectionController->>SelectionController: selectObject(id)
    SelectionController->>Viewer3D: highlightObject(id)
    SelectionController->>AppState: updateState({ selectedId: id })
    SelectionController->>EventBus: emit(SELECTION_CHANGED)
    EventBus-->>UI: SELECTION_CHANGED
    UI->>AppState: getState()
    AppState-->>UI: { selectedId: id }
    UI->>UI: showPropertiesPanel(id)
```

### Fluxo 3: Login de Usuário

```mermaid
sequenceDiagram
    participant UI
    participant AuthController
    participant AuthService
    participant APIClient
    participant EventBus
    participant AppState

    UI->>AuthController: login(email, password)
    AuthController->>AuthService: login(email, password)
    AuthService->>APIClient: POST /api/auth/login
    APIClient-->>AuthService: { user, token }
    AuthService->>EventBus: emit(AUTH_SUCCESS)
    AuthService-->>AuthController: user
    AuthController->>AppState: setUser(user)
    AuthController->>EventBus: emit(USER_LOGGED_IN)
    EventBus-->>UI: USER_LOGGED_IN
    UI->>UI: showDashboard()
```

## Contratos de Interface

### EventBus
- `on(event, callback, priority?, filter?)` - Registra listener
- `off(event, callback)` - Remove listener
- `emit(event, data)` - Emite evento síncrono
- `emitAsync(event, data)` - Emite evento assíncrono
- `once(event, callback, priority?)` - Listener único

### BaseController
- `executeAsync(operation, context)` - Executa operação com error handling
- `setState(newState)` - Atualiza estado local
- `getState()` - Retorna estado local
- `setProgressCallback(callback)` - Configura callback de progresso
- `setErrorCallback(callback)` - Configura callback de erro
- `setSuccessCallback(callback)` - Configura callback de sucesso

### ModelController
- `openModel(file, options)` - Abre e processa modelo
- `closeModel()` - Fecha modelo atual
- `reloadModel()` - Recarrega modelo
- `getModelProperties()` - Retorna propriedades do modelo
- `isModelLoaded()` - Verifica se modelo está carregado

### SelectionController
- `selectObject(id, options)` - Seleciona objeto
- `deselectObject(id)` - Deseleciona objeto
- `clearSelection()` - Limpa seleção
- `getSelectedObjects()` - Retorna objetos selecionados
- `setMultiSelect(enabled)` - Habilita multi-select

### StorageService
- `uploadFile(file, path, options)` - Upload de arquivo
- `downloadFile(path, options)` - Download de arquivo
- `listFiles(params)` - Lista arquivos
- `deleteFile(path)` - Deleta arquivo
- `getFileMetadata(path)` - Retorna metadados
- `getFileVersions(path)` - Retorna versões

## Principais Eventos

### Model Events
- `MODEL_LOADING` - Início do carregamento
- `MODEL_LOADED` - Modelo carregado com sucesso
- `MODEL_ERROR` - Erro no carregamento
- `MODEL_SELECTED` - Modelo selecionado

### Selection Events
- `OBJECT_SELECTED` - Objeto selecionado
- `OBJECT_DESELECTED` - Objeto deselecionado
- `SELECTION_CHANGED` - Seleção alterada

### Tool Events
- `TOOL_ACTIVATED` - Ferramenta ativada
- `TOOL_DEACTIVATED` - Ferramenta desativada
- `TOOL_CHANGED` - Ferramenta alterada

### Camera Events
- `CAMERA_MODE_CHANGED` - Modo de câmera alterado
- `CAMERA_POSITION_CHANGED` - Posição alterada
- `CAMERA_FOCUS_SELECTION` - Foco na seleção

### UI Events
- `UI_PANEL_OPENED` - Painel aberto
- `UI_PANEL_CLOSED` - Painel fechado
- `UI_MODAL_OPEN` - Modal aberto
- `UI_MODAL_CLOSE` - Modal fechado

### Project Events
- `PROJECT_NEW` - Novo projeto
- `PROJECT_SAVE` - Salvar projeto
- `PROJECT_SAVED` - Projeto salvo
- `PROJECT_LOAD` - Carregar projeto
- `PROJECT_LOADED` - Projeto carregado

## Status de Implementação

### ✅ Implementado
- EventBus - Sistema completo de pub/sub com prioridades e filtros
- BaseController - Classe base com callbacks e estado
- ModelController - Orquestração de upload/processamento
- SelectionController - Gerenciamento de seleção
- StorageService - Integração completa com MinIO
- BudgetService - Orquestração 5D completa
- AppController - Orquestrador principal da aplicação

### ⚠️ Parcialmente Implementado
- IFCService - Apenas interface/esqueleto (falta parsing real)
- NavigationService - Existe NavigationManager mas não segue especificação
- AuthService - Implementação básica existe mas não segue especificação OAuth2

### ❌ Não Implementado
- UserService - Serviço completo de usuários
- NotificationService - Sistema de notificações
- LoggingService - Logging estruturado
- AnalyticsService - Coleta de métricas
- PluginService - Sistema de plugins
- FederationService - Federação de modelos
- AutomationService - Orquestração de automações
- IntegrationService - Integrações externas
