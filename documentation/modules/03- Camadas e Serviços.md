
# Etapa 3: Camadas e Serviços

## Objetivo
Implementar uma separação clara de responsabilidades entre camadas (serviços, controllers, UI), promovendo baixo acoplamento, testabilidade e evolução sustentável do frontend.

## Como executar esta etapa
- Para cada item, detalhar padrões de arquitetura (service/controller/view), exemplos de código e contratos de interface.
- Sugerir onde criar arquivos e como dividir responsabilidades.
- Indicar dependências e fluxos de dados entre camadas.
- Usar diagramas ou listas para ilustrar a arquitetura proposta.

---

## 3.1 Implementar Camada de Serviços

**Propostas:**
- Criar um serviço para cada domínio principal em `/src/services/`:
  - `authService.ts`: autenticação, sessão, usuário.
  - `storageService.ts`: upload/download/listagem de arquivos.
  - `apiService.ts`: REST genérico.
  - `budgetService.ts`: orçamentos.
  - `ifcService.ts`: manipulação de modelos IFC.
- Cada serviço deve expor uma interface TypeScript clara, ex:
```typescript
export interface AuthService {
  login(email: string, password: string): Promise<User>;
  logout(): void;
  getUser(): User | null;
  onAuthChange(callback: (user: User | null) => void): void;
}
```
- Serviços não devem acessar/manipular UI diretamente.

---

## 3.2 Criar Camada de Controllers

**Propostas:**
- Criar controllers para orquestrar lógica entre UI e serviços em `/src/controllers/`:
  - `authController.ts`, `viewerController.ts`, `budgetController.ts`, etc.
- Controllers recebem eventos da UI, chamam métodos dos serviços e atualizam estado.
- Exemplo:
```typescript
export class ViewerController {
  constructor(private viewer: ViewerHost, private ifcService: IfcService) {}
  async loadIFC(file: File) {
    const model = await this.ifcService.parseIFC(file);
    this.viewer.addModel(model);
  }
}
```
- Controllers não devem renderizar UI diretamente.

---

## 3.3 Adotar Padrão de Comunicação

**Propostas:**
- Implementar um EventBus simples em `/src/core/eventBus.ts`:
```typescript
type Listener = (data: any) => void;
const listeners: Record<string, Listener[]> = {};
export function on(event: string, cb: Listener) { (listeners[event] = listeners[event] || []).push(cb); }
export function emit(event: string, data?: any) { (listeners[event] || []).forEach(cb => cb(data)); }
```
 Exemplos de eventos e fluxos:
  - `user:login` (UI → AuthController → AuthService → API → emit 'auth:changed')
  - `ifc:uploaded` (UI → StorageController → StorageService → API → emit 'ifc:uploaded')
  - `budget:created` (UI → BudgetController → BudgetService → API → emit 'budget:created')
  - `ifc:parsed` (UI → IfcController → IfcService → emit 'ifc:parsed')


## 3.4 Documentação da Arquitetura

**Propostas:**
- Criar diagrama de camadas (Mermaid):
```mermaid
graph TD
  UI --> Controllers
  Controllers --> Services
  Services --> [APIs/Backend]
```
- Listar dependências entre camadas.
- Exemplificar fluxos típicos:
  - Login: UI → AuthController → AuthService → API
  - Upload IFC: UI → ViewerController → StorageService/IfcService → API
  - Seleção IFC: UI → ViewerController → IfcService

---

# Checklist

## 3.1 Implementar Camada de Serviços
- [ ] Criar serviços para cada domínio principal
- [ ] Definir contratos de interface para cada serviço
- [ ] Garantir que serviços não dependam de UI diretamente

## 3.2 Criar Camada de Controllers
- [ ] Implementar controllers para orquestrar lógica entre UI e serviços
- [ ] Controllers recebem eventos da UI, chamam serviços e atualizam estado
- [ ] Controllers não devem renderizar UI diretamente

## 3.3 Adotar Padrão de Comunicação
- [ ] Implementar padrão de eventos/pub-sub para comunicação entre módulos
- [ ] Documentar principais eventos e fluxos

## 3.4 Documentar Arquitetura
- [ ] Criar diagrama de camadas (ex: Mermaid)
- [ ] Listar dependências entre camadas
- [ ] Exemplificar fluxo típico (ex: login, upload, seleção IFC)

---

# Checklist

## 3.1 Implementar Camada de Serviços
- [ ] Criar serviços para cada domínio principal
- [ ] Definir contratos de interface para cada serviço
- [ ] Garantir que serviços não dependam de UI diretamente

## 3.2 Criar Camada de Controllers
- [ ] Implementar controllers para orquestrar lógica entre UI e serviços
- [ ] Controllers recebem eventos da UI, chamam serviços e atualizam estado
- [ ] Controllers não devem renderizar UI diretamente

## 3.3 Adotar Padrão de Comunicação
- [ ] Implementar padrão de eventos/pub-sub para comunicação entre módulos
- [ ] Documentar principais eventos e fluxos

## 3.4 Documentar Arquitetura
- [ ] Criar diagrama de camadas (ex: Mermaid)
- [ ] Listar dependências entre camadas
- [ ] Exemplificar fluxo típico (ex: login, upload, seleção IFC)

---
