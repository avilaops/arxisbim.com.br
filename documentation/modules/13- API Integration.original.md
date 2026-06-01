# 13- API Integration

## Objetivo
Definir padrões, responsabilidades e integrações do módulo de integração com APIs, centralizando comunicação com o backend (REST, GraphQL, WebSocket) e garantindo segurança, versionamento, observabilidade e desacoplamento dos serviços de frontend.

## Responsabilidades Detalhadas
- Centralizar todas as chamadas HTTP/REST, GraphQL e WebSocket para o backend, evitando duplicidade de lógica
- Gerenciar autenticação de requisições (JWT, tokens, refresh, headers customizados)
- Implementar versionamento de endpoints e contratos (ex: /api/v1/, /api/v2/)
- Tratar erros, timeouts, retries, fallback e circuit breaker
- Serializar/deserializar dados, validar contratos (DTOs, schemas, Zod/Yup)
- Expor API clara, tipada e desacoplada para serviços e controllers do frontend
- Suportar upload/download de arquivos via API, com feedback de progresso
- Monitorar métricas de uso, latência, falhas e logs de auditoria
- Suportar interceptors para headers, logs, tratamento global de erros e autenticação
- Permitir mock/fake API para testes e desenvolvimento offline

## APIs/Contratos
- Métodos principais:
  - `get<T>(url: string, params?: object, options?: object): Promise<T>`
  - `post<T>(url: string, data: object, options?: object): Promise<T>`
  - `put<T>(url: string, data: object, options?: object): Promise<T>`
  - `delete<T>(url: string, options?: object): Promise<T>`
  - `patch<T>(url: string, data: object, options?: object): Promise<T>`
  - `subscribeWS<T>(channel: string, onMessage: (data: T) => void): UnsubscribeFn`
  - `uploadFile(url: string, file: File, onProgress?: (progress: number) => void): Promise<string>`
  - `downloadFile(url: string): Promise<Blob>`
- Suporte a:
  - Interceptors (request/response)
  - Middlewares (ex: para logs, métricas, autenticação)
  - Schemas/DTOs para validação de payloads (ex: Zod, Yup)
  - Mock/fake API para testes

## Fluxos Detalhados
### Requisição REST autenticada
1. Controller/serviço chama `api.get/post/put/delete`
2. Interceptor adiciona JWT/token ao header
3. Requisição é enviada ao backend
4. Resposta é validada por schema/DTO
5. Erros tratados globalmente (ex: refresh token, logout, notificação)

### Upload/Download de Arquivos
1. Upload: multipart/form-data, callback de progresso, tratamento de erros
2. Download: streaming, validação de permissões, fallback

### WebSocket
1. Subscrição em canal (ex: notificações, colaboração)
2. Mensagens recebidas disparam eventos/callbacks
3. Reconexão automática em caso de falha

### Versionamento de Endpoints
1. Controllers/serviços usam URLs versionadas (ex: /api/v1/models)
2. Suporte a múltiplas versões coexistindo

### Mock/Fake API
1. Permite desenvolvimento offline e testes automatizados
2. Switch entre real e fake API por configuração/env

## Exemplos de Uso Avançados
```typescript
// GET autenticado com schema de validação
const projects = await api.get<Project[]>('/api/v1/projects', {}, { schema: projectListSchema });

// POST com payload e tratamento de erro
try {
  const newModel = await api.post<Model>('/api/v1/models', { name: 'Novo Modelo' });
} catch (err) {
  showError(err.message);
}

// Upload de arquivo com progresso
const url = await api.uploadFile('/api/v1/upload', file, (progress) => updateProgress(progress));

// WebSocket com reconexão
const unsubscribe = api.subscribeWS('notifications', (msg) => showToast(msg));

// Mock API para testes
api.useMock();
```

## Pontos de Integração Detalhados
- **Services:** Auth, Storage, Budget, IFC, etc (todas as integrações backend)
- **Controllers:** Orquestração de fluxos, tratamento de erros
- **State Manager:** Atualização de dados globais, sincronização
- **UI:** Feedback de progresso, erros, notificações
- **Observabilidade:** Logs, métricas, tracing, auditoria
- **Testes:** Mock/fake API, testes de integração

## Critérios de Qualidade
- Segurança: autenticação, CORS, CSRF/XSS, logs de acesso
- Performance: cache, compressão, lazy loading, streaming
- Resiliência: retries, fallback, circuit breaker, reconexão WS
- Testes unitários e de integração para endpoints críticos
- Documentação clara dos contratos, exemplos de uso e schemas
- Facilidade de extensão para novos endpoints, protocolos e middlewares
- Monitoramento de latência, falhas, uso e auditoria
- Suporte a desenvolvimento offline e testes automatizados

## Guia de Uso e Integração

### Base API Client

#### Basic Usage

```typescript
import { api } from '@/api/client';

// GET request
const projects = await api.get<Project[]>('/api/v1/projects');

// POST request
const newProject = await api.post<Project>('/api/v1/projects', {
  name: 'New Project',
  description: 'Description',
});

// PUT request
const updated = await api.put<Project>('/api/v1/projects/1', {
  name: 'Updated Name',
});

// DELETE request
await api.delete('/api/v1/projects/1');

// PATCH request
const patched = await api.patch<Project>('/api/v1/projects/1', {
  description: 'New description',
});
```

#### Request Options

```typescript
// With query parameters
const projects = await api.get<Project[]>('/api/v1/projects', {
  page: 1,
  limit: 10,
  search: 'keyword',
});

// With custom headers
const data = await api.get<Data>('/api/v1/data', {}, {
  headers: {
    'X-Custom-Header': 'value',
  },
});

// With timeout
const data = await api.get<Data>('/api/v1/data', {}, {
  timeout: 5000, // 5 seconds
});
```

### Authentication

#### JWT Token Management

```typescript
import { AuthInterceptor } from '@/api/auth';

const authInterceptor = new AuthInterceptor({
  tokenStorage: 'localStorage',
  refreshTokenUrl: '/api/v1/auth/refresh',
});

// Set token
authInterceptor.setToken('your-jwt-token');

// Get token
const token = authInterceptor.getToken();

// Check if authenticated
const isAuthenticated = authInterceptor.isAuthenticated();

// Logout
authInterceptor.logout();
```

#### Auth Interceptor Integration

```typescript
import { api } from '@/api/client';
import { AuthInterceptor } from '@/api/auth';

const authInterceptor = new AuthInterceptor({
  tokenStorage: 'localStorage',
  refreshTokenUrl: '/api/v1/auth/refresh',
});

// Add auth interceptor
api.addRequestInterceptor(authInterceptor.requestInterceptor);
api.addResponseInterceptor(authInterceptor.responseInterceptor);
```

### WebSocket

#### Basic WebSocket Usage

```typescript
import { WebSocketClient, WebSocketManager } from '@/api/websocket';

// Create WebSocket client
const wsClient = new WebSocketClient({
  url: 'ws://localhost:3000',
  reconnectInterval: 5000,
  maxReconnectAttempts: 10,
});

// Connect
wsClient.connect();

// Subscribe to messages
const unsubscribe = wsClient.subscribe((message) => {
  console.log('Received:', message);
});

// Send message
wsClient.send({ type: 'ping', data: {} });

// Disconnect
wsClient.disconnect();
```

#### WebSocket Manager

```typescript
import { WebSocketManager } from '@/api/websocket';

const wsManager = new WebSocketManager();

// Create connection
const client = wsManager.createConnection('notifications', {
  url: 'ws://localhost:3000/notifications',
});

// Subscribe
client.subscribe((message) => {
  console.log('Notification:', message);
});

// Get connection
const notificationsClient = wsManager.getConnection('notifications');

// Remove connection
wsManager.removeConnection('notifications');
```

### Middleware

#### Using Built-in Middlewares

```typescript
import { MiddlewareManager } from '@/api/middleware';

const middlewareManager = new MiddlewareManager();

// Add logging middleware
middlewareManager.addRequestMiddleware('logging', (context) => {
  console.log('Request:', context.url, context.data);
});

// Add metrics middleware
middlewareManager.addRequestMiddleware('metrics', (context) => {
  metrics.recordRequest(context.url);
});

// Add caching middleware
middlewareManager.addResponseMiddleware('cache', (context) => {
  if (context.status === 200) {
    cache.set(context.url, context.data);
  }
});
```

#### Custom Middleware

```typescript
middlewareManager.addRequestMiddleware('custom', (context) => {
  // Modify request
  context.headers['X-Custom'] = 'value';
  return context;
});

middlewareManager.addResponseMiddleware('custom', (context) => {
  // Modify response
  context.data = transformData(context.data);
  return context;
});
```

### Schema Validation

#### Using Zod Schemas

```typescript
import { ValidationMiddleware } from '@/api/validation';
import { z } from 'zod';

// Define schema
const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
});

// Create validation middleware
const validationMiddleware = new ValidationMiddleware();

// Validate request
api.addRequestMiddleware('validation', (context) => {
  return validationMiddleware.validateRequest(context, projectSchema);
});

// Validate response
api.addResponseMiddleware('validation', (context) => {
  return validationMiddleware.validateResponse(context, projectSchema);
});
```

#### Validated API Methods

```typescript
import { api } from '@/api/client';

// GET with validation
const projects = await api.getValidated<Project[]>(
  '/api/v1/projects',
  projectListSchema
);

// POST with validation
const newProject = await api.postValidated<Project>(
  '/api/v1/projects',
  projectData,
  projectSchema
);
```

### Mock API

#### Enabling Mock API

```typescript
import { MockAPI } from '@/api/mock';

const mockAPI = new MockAPI();

// Enable mock
mockAPI.enable();

// Add mock endpoint
mockAPI.addEndpoint('/api/v1/projects', 'GET', {
  data: [
    { id: '1', name: 'Project 1' },
    { id: '2', name: 'Project 2' },
  ],
  delay: 500, // Simulate network delay
});

// Use with api client
const projects = await api.get('/api/v1/projects'); // Returns mock data
```

#### Dynamic Mock Endpoints

```typescript
// Dynamic response based on request
mockAPI.addEndpoint('/api/v1/projects/:id', 'GET', (req) => {
  const id = req.params.id;
  return {
    data: { id, name: `Project ${id}` },
  };
});
```

### File Upload/Download

#### Upload with Progress

```typescript
import { api } from '@/api/client';

const file = document.querySelector('input[type="file"]').files[0];

const url = await api.uploadFile('/api/v1/upload', file, (progress) => {
  console.log(`Upload progress: ${progress}%`);
});
```

#### Download File

```typescript
// Download as blob
const blob = await api.downloadFile('/api/v1/files/document.pdf');

// Download with auto-trigger
const url = await api.downloadFile('/api/v1/files/document.pdf', {
  filename: 'document.pdf',
  triggerDownload: true,
});
```

### Error Handling

#### Global Error Handling

```typescript
import { api } from '@/api/client';

api.addResponseInterceptor((response) => {
  if (response.status >= 400) {
    console.error('API Error:', response.data);
    // Show error notification
    showError(response.data.message);
  }
  return response;
});
```

#### Try-Catch Pattern

```typescript
try {
  const data = await api.get('/api/v1/data');
} catch (error) {
  if (error.status === 401) {
    // Unauthorized - redirect to login
    redirectToLogin();
  } else if (error.status === 404) {
    // Not found
    showNotFound();
  } else {
    // Other error
    showError(error.message);
  }
}
```

### Environment Configuration

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3000
VITE_API_TIMEOUT=30000
VITE_API_ENABLE_MOCK=false
VITE_API_ENABLE_CACHE=true
VITE_API_CACHE_TTL=300000

# Auth Configuration
VITE_AUTH_TOKEN_STORAGE=localStorage
VITE_AUTH_REFRESH_TOKEN_URL=/api/v1/auth/refresh

# WebSocket Configuration
VITE_WS_URL=ws://localhost:3000
VITE_WS_RECONNECT_INTERVAL=5000
VITE_WS_MAX_RECONNECT_ATTEMPTS=10
```

### Integration with React

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

---
> Este documento serve como guia aprofundado para implementação, testes e evolução do módulo de integração com APIs do frontend, cobrindo fluxos avançados, segurança, versionamento, mock, observabilidade e exemplos sofisticados.
