# Arxisvr Frontend

Frontend BIM/IFC viewer com arquitetura modular, serviços centralizados e suporte a colaboração realtime.

## Arquitetura

### Estrutura de Diretórios

```
src/
├── core/              # Core: EventBus, AppState, tipos, utils
├── services/          # Serviços modulares (singleton pattern)
│   ├── AuthService/           # OAuth2/OIDC com auth.avilaops.com
│   ├── UserService/           # Gerenciamento de usuários
│   ├── NotificationService/   # Sistema de notificações
│   ├── LoggingService/        # Logging estruturado
│   ├── AnalyticsService/      # Coleta de métricas
│   ├── PluginService/         # Sistema de plugins
│   ├── FederationService/     # Federação de modelos
│   ├── AutomationService/     # Orquestração de automações
│   ├── IntegrationService/    # Integrações externas
│   └── RealtimeService/       # Colaboração realtime (WebSocket)
├── viewer/            # Engine 3D Three.js
│   ├── ViewerHost.ts
│   ├── controls/
│   ├── loaders/
│   ├── inspector/
│   ├── LODManager.ts
│   └── MemoryMonitor.ts
├── workers/           # Web workers para parsing pesado
│   ├── ifcWorker.ts
│   └── glbWorker.ts
├── controllers/       # Controllers de domínio
├── components/        # Componentes UI reutilizáveis
├── state/            # State manager
└── navigation/       # Navegação
```

## Serviços

### AuthService
Autenticação OAuth2/OIDC centralizada com auth.avilaops.com.

```typescript
import { getAuthService } from './services/AuthService';

const authService = getAuthService();

// Login SSO
authService.login('/dashboard');

// Obter usuário
const user = authService.getUser();

// Verificar permissão
if (authService.hasPermission('model:edit')) {
  // ...
}

// Logout
authService.logout();
```

### RealtimeService
Colaboração em tempo real via WebSocket.

```typescript
import { getRealtimeService } from './services/RealtimeService';

const realtime = getRealtimeService();

// Conectar
realtime.connect('ws://localhost:8080/realtime');

// Enviar mensagem
realtime.sendMessage('Olá!');

// Atualizar cursor
realtime.updateCursor(x, y);

// Ouvir eventos
realtime.onRealtimeEvent((event) => {
  console.log('Event:', event.type);
});
```

### UserService
Gerenciamento de usuários, perfis e permissões.

```typescript
import { getUserService } from './services/UserService';

const userService = getUserService();

// Login
const session = await userService.login(email, password);

// Obter usuário atual
const user = userService.getCurrentUser();

// Verificar permissão
if (userService.hasPermission('edit')) {
  // ...
}
```

### NotificationService
Sistema de notificações com deduplicação e badges.

```typescript
import { getNotificationService } from './services/NotificationService';

const notificationService = getNotificationService();

// Adicionar notificação
notificationService.add({
  id: '1',
  title: 'Atualização',
  message: 'Modelo atualizado',
  type: 'info',
});

// Ouvir eventos
notificationService.onNotification((notification) => {
  console.log('New notification:', notification);
});
```

### LoggingService
Logging estruturado com múltiplos níveis e retenção.

```typescript
import { getLoggingService } from './services/LoggingService';

const loggingService = getLoggingService();

// Log
loggingService.info('User logged in', { userId: '123' });
loggingService.error('Failed to load model', { error });

// Exportar logs
const logs = loggingService.exportLogs('json');
```

### AnalyticsService
Coleta de métricas e eventos de usuário.

```typescript
import { getAnalyticsService } from './services/AnalyticsService';

const analyticsService = getAnalyticsService();

// Rastrear evento
analyticsService.trackEvent('button_click', { button: 'save' });

// Rastrear página
analyticsService.trackPageView('/dashboard');

// Exportar dados
const data = analyticsService.exportData('json');
```

## Viewer 3D

### ViewerHost
Engine Three.js isolada com ciclo de vida gerenciado.

```typescript
import { ViewerHost } from './viewer';

const viewer = new ViewerHost(canvas);

// Adicionar modelo
viewer.addModel(model);

// Definir controles
viewer.setControls('orbit');

// Dispose
viewer.dispose();
```

### LODManager
Gerenciamento de níveis de detalhe para performance.

```typescript
import { LODManager } from './viewer';

const lodManager = new LODManager(scene, camera);

// Adicionar seção
lodManager.addSection(sectionId, boundingBox, geometries);

// Atualizar automaticamente
lodManager.startAutoUpdate();
```

### MemoryMonitor
Monitoramento e otimização de memória.

```typescript
import { MemoryMonitor } from './viewer';

const memoryMonitor = new MemoryMonitor(scene);

// Iniciar limpeza automática
memoryMonitor.startAutoCleanup();

// Obter estatísticas
const stats = memoryMonitor.getStats();
```

## Web Workers

Parsing pesado em workers para não travar a UI.

```typescript
// ifcWorker.ts
const worker = new Worker('./workers/ifcWorker.ts');
worker.postMessage(file);
worker.onmessage = (event) => {
  const model = event.data;
  // ...
};
```

## Scripts

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Testes
npm run test
npm run test:ui

# Lint
npm run lint
npm run lint:fix

# Formatação
npm run format
npm run format:check
```

## Configuração

### ESLint
`.eslintrc.json` - Configuração de linting para TypeScript e React.

### Prettier
`.prettierrc` - Configuração de formatação automática.

## Documentação

- ADRs (Architecture Decision Records): `docs/ADR/`
- Roadmap técnico: `docs/ROADMAP.md`
- Documentação de módulos: `Docs/` (raiz do projeto)

## Desenvolvimento

### Adicionar Novo Serviço

1. Criar diretório em `src/services/NomeServico/`
2. Implementar classe com singleton pattern
3. Criar `index.ts` com barrel export
4. Adicionar testes em `NomeServico.test.ts`
5. Documentar no `Docs/XX- NomeServico.md`

### Padrões

- **Singleton**: Todos os serviços usam pattern singleton com factory getter
- **EventBus**: Comunicação desacoplada via eventos
- **LocalStorage**: Persistência de estado e dados
- **TypeScript**: Tipagem estrita em todo o códigobase

## Roadmap

Veja `docs/ROADMAP.md` para o roadmap técnico de evolução (Q3 2026 - Q4 2027).

## Licença

Proprietário: AvilaOps
