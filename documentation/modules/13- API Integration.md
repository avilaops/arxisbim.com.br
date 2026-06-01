# 13- API Integration

## Objetivo
Padrões e integrações do módulo de APIs. Centraliza comunicação backend (REST, GraphQL, WebSocket). Segurança, versionamento, observabilidade, desacoplamento de serviços frontend.

## Responsabilidades
- Centralizar chamadas HTTP/REST, GraphQL, WebSocket — sem duplicidade
- Auth de requests (JWT, refresh, headers custom)
- Versionamento de endpoints (`/api/v1/`, `/api/v2/`)
- Erros, timeouts, retries, fallback, circuit breaker
- Serialização + validação de contratos (Zod/Yup)
- API tipada e desacoplada para serviços/controllers
- Upload/download com progresso
- Métricas: latência, falhas, auditoria
- Interceptors: headers, logs, erros globais, auth
- Mock/fake API para testes e dev offline

## APIs/Contratos
Métodos principais:
- `get<T>(url, params?, options?): Promise<T>`
- `post<T>(url, data, options?): Promise<T>`
- `put<T>(url, data, options?): Promise<T>`
- `delete<T>(url, options?): Promise<T>`
- `patch<T>(url, data, options?): Promise<T>`
- `subscribeWS<T>(channel, onMessage): UnsubscribeFn`
- `uploadFile(url, file, onProgress?): Promise<string>`
- `downloadFile(url): Promise<Blob>`

Suporta: interceptors req/res, middlewares (logs/métricas/auth), schemas Zod/Yup, mock API.

## Fluxos
### REST autenticada
1. Controller chama `api.get/post/put/delete`
2. Interceptor injeta JWT no header
3. Request → backend
4. Response validado por schema/DTO
5. Erros tratados globalmente (refresh, logout, notif)

### Upload/Download
- Upload: multipart/form-data, callback progresso, tratamento erro
- Download: streaming, validação permissões, fallback

### WebSocket
1. Subscribe em canal
2. Mensagens disparam callbacks
3. Reconexão automática on failure

### Versionamento
- URLs versionadas. Múltiplas versões coexistem.

### Mock API
- Dev offline + testes. Switch real/fake via env.

## Exemplos
```typescript
// GET autenticado com schema
const projects = await api.get<Project[]>('/api/v1/projects', {}, { schema: projectListSchema });

// POST com tratamento de erro
try {
  const newModel = await api.post<Model>('/api/v1/models', { name: 'Novo Modelo' });
} catch (err) {
  showError(err.message);
}

// Upload com progresso
const url = await api.uploadFile('/api/v1/upload', file, (progress) => updateProgress(progress));

// WebSocket com reconexão
const unsubscribe = api.subscribeWS('notifications', (msg) => showToast(msg));

// Mock API
api.useMock();
```

## Integração
- **Services:** Auth, Storage, Budget, IFC — todas integrações backend
- **Controllers:** orquestração + erros
- **State Manager:** atualização global, sync
- **UI:** progresso, erros, notif
- **Observabilidade:** logs, métricas, tracing, auditoria
- **Testes:** mock, integração

## Critérios de Qualidade
- Segurança: auth, CORS, CSRF/XSS, logs acesso
- Performance: cache, compressão, lazy, streaming
- Resiliência: retries, fallback, circuit breaker, WS reconnect
- Testes unit + integração endpoints críticos
- Documentação clara contratos + exemplos
- Extensão fácil novos endpoints/protocolos/middlewares
- Monitoramento latência/falhas/uso/auditoria
- Suporte dev offline + testes

## Guia de Uso

### Base API Client

```typescript
import { api } from '@/api/client';

// GET
const projects = await api.get<Project[]>('/api/v1/projects');

// POST
const newProject = await api.post<Project>('/api/v1/projects', {
  name: 'New Project',
  description: 'Description',
});

// PUT
const updated = await api.put<Project>('/api/v1/projects/1', {
  name: 'Updated Name',
});

// DELETE
await api.delete('/api/v1/projects/1');

// PATCH
const patched = await api.patch<Project>('/api/v1/projects/1', {
  description: 'New description',
});
```

#### Request Options

```typescript
// Query params
const projects = await api.get<Project[]>('/api/v1/projects', {
  page: 1,
  limit: 10,
  search: 'keyword',
});

// Headers custom
const data = await api.get<Data>('/api/v1/data', {}, {
  headers: {
    'X-Custom-Header': 'value',
  },
});

// Timeout
const data = await api.get<Data>('/api/v1/data', {}, {
  timeout: 5000,
});
```

### Authentication

#### JWT Token

```typescript
import { AuthInterceptor } from '@/api/auth';

const authInterceptor = new AuthInterceptor({
  tokenStorage: 'localStorage',
  refreshTokenUrl: '/api/v1/auth/refresh',
});

authInterceptor.setToken('your-jwt-token');
const token = authInterceptor.getToken();
const isAuthenticated = authInterceptor.isAuthenticated();
authInterceptor.logout();
```

#### Integração Interceptor

```typescript
import { api } from '@/api/client';
import { AuthInterceptor } from '@/api/auth';

const authInterceptor = new AuthInterceptor({
  tokenStorage: 'localStorage',
  refreshTokenUrl: '/api/v1/auth/refresh',
});

api.addRequestInterceptor(authInterceptor.requestInterceptor);
api.addResponseInterceptor(authInterceptor.responseInterceptor);
```

### WebSocket

#### Uso básico

```typescript
import { WebSocketClient, WebSocketManager } from '@/api/websocket';

const wsClient = new WebSocketClient({
  url: 'ws://localhost:3000',
  reconnectInterval: 5000,
  maxReconnectAttempts: 10,
});

wsClient.connect();

const unsubscribe = wsClient.subscribe((message) => {
  console.log('Received:', message);
});

wsClient.send({ type: 'ping', data: {} });
wsClient.disconnect();
```

#### WebSocket Manager

```typescript
import { WebSocketManager } from '@/api/websocket';

const wsManager = new WebSocketManager();

const client = wsManager.createConnection('notifications', {
  url: 'ws://localhost:3000/notifications',
});

client.subscribe((message) => {
  console.log('Notification:', message);
});

const notificationsClient = wsManager.getConnection('notifications');
wsManager.removeConnection('notifications');
```

### Middleware

#### Built-in

```typescript
import { MiddlewareManager } from '@/api/middleware';

const middlewareManager = new MiddlewareManager();

middlewareManager.addRequestMiddleware('logging', (context) => {
  console.log('Request:', context.url, context.data);
});

middlewareManager.addRequestMiddleware('metrics', (context) => {
  metrics.recordRequest(context.url);
});

middlewareManager.addResponseMiddleware('cache', (context) => {
  if (context.status === 200) {
    cache.set(context.url, context.data);
  }
});
```

#### Custom

```typescript
middlewareManager.addRequestMiddleware('custom', (context) => {
  context.headers['X-Custom'] = 'value';
  return context;
});

middlewareManager.addResponseMiddleware('custom', (context) => {
  context.data = transformData(context.data);
  return context;
});
```

### Schema Validation

#### Zod

```typescript
import { ValidationMiddleware } from '@/api/validation';
import { z } from 'zod';

const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
});

const validationMiddleware = new ValidationMiddleware();

api.addRequestMiddleware('validation', (context) => {
  return validationMiddleware.validateRequest(context, projectSchema);
});

api.addResponseMiddleware('validation', (context) => {
  return validationMiddleware.validateResponse(context, projectSchema);
});
```

#### Métodos validados

```typescript
import { api } from '@/api/client';

const projects = await api.getValidated<Project[]>(
  '/api/v1/projects',
  projectListSchema
);

const newProject = await api.postValidated<Project>(
  '/api/v1/projects',
  projectData,
  projectSchema
);
```

### Mock API

```typescript
import { MockAPI } from '@/api/mock';

const mockAPI = new MockAPI();
mockAPI.enable();

mockAPI.addEndpoint('/api/v1/projects', 'GET', {
  data: [
    { id: '1', name: 'Project 1' },
    { id: '2', name: 'Project 2' },
  ],
  delay: 500,
});

const projects = await api.get('/api/v1/projects'); // mock
```

#### Dinâmico

```typescript
mockAPI.addEndpoint('/api/v1/projects/:id', 'GET', (req) => {
  const id = req.params.id;
  return {
    data: { id, name: `Project ${id}` },
  };
});
```

### File Upload/Download

```typescript
import { api } from '@/api/client';

const file = document.querySelector('input[type="file"]').files[0];

const url = await api.uploadFile('/api/v1/upload', file, (progress) => {
  console.log(`Upload progress: ${progress}%`);
});

// Download blob
const blob = await api.downloadFile('/api/v1/files/document.pdf');

// Download auto-trigger
const url = await api.downloadFile('/api/v1/files/document.pdf', {
  filename: 'document.pdf',
  triggerDownload: true,
});
```

### Error Handling

#### Global

```typescript
import { api } from '@/api/client';

api.addResponseInterceptor((response) => {
  if (response.status >= 400) {
    console.error('API Error:', response.data);
    showError(response.data.message);
  }
  return response;
});
```

#### Try-catch

```typescript
try {
  const data = await api.get('/api/v1/data');
} catch (error) {
  if (error.status === 401) {
    redirectToLogin();
  } else if (error.status === 404) {
    showNotFound();
  } else {
    showError(error.message);
  }
}
```

### Environment

```env
# API
VITE_API_BASE_URL=http://localhost:3000
VITE_API_TIMEOUT=30000
VITE_API_ENABLE_MOCK=false
VITE_API_ENABLE_CACHE=true
VITE_API_CACHE_TTL=300000

# Auth
VITE_AUTH_TOKEN_STORAGE=localStorage
VITE_AUTH_REFRESH_TOKEN_URL=/api/v1/auth/refresh

# WebSocket
VITE_WS_URL=ws://localhost:3000
VITE_WS_RECONNECT_INTERVAL=5000
VITE_WS_MAX_RECONNECT_ATTEMPTS=10
```

### React

```typescript
import { useState, useEffect } from 'react';
import { api } from '@/api/client';

function ProjectList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/api/v1/projects');
      setProjects(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      <ul>
        {projects.map(project => (
          <li key={project.id}>{project.name}</li>
        ))}
      </ul>
    </div>
  );
}
```
