# Etapa 7: Testes e Qualidade

## Objetivo
Garantir a robustez, confiabilidade e manutenibilidade do frontend por meio de testes automatizados, ferramentas de qualidade de código e integração contínua.

## Como executar esta etapa
- Estruture `/src/services/__tests__/`, `/src/controllers/__tests__/`, `/src/components/__tests__/` para testes unitários.
- Use Jest, Vitest ou equivalente para unitários/integrados; Playwright/Cypress para E2E.
- Adote ESLint, Prettier e configure CI para rodar testes e lint a cada push/PR.
- Defina critérios claros de cobertura e revisão de código.

---

## 7.1 Adicionar Testes Unitários
- Teste funções puras, serviços e controllers isoladamente.
- Exemplo:

```typescript
// authService.test.ts
import { authService } from '../authService';
describe('authService', () => {
  it('deve autenticar usuário válido', async () => {
    const user = await authService.login('user@exemplo.com', 'senha');
    expect(user).toHaveProperty('id');
  });
});
```
- Estruture:
  - `/src/services/__tests__/authService.test.ts`
  - `/src/controllers/__tests__/viewerController.test.ts`

## 7.2 Adicionar Testes de Integração
- Teste fluxos completos entre módulos (ex: login, upload, seleção IFC).
- Use mocks/stubs para dependências externas.
- Exemplo:

```typescript
// loginFlow.test.ts
it('deve logar e redirecionar para dashboard', async () => {
  // simula login e navegação
});
```
- Estruture:
  - `/src/__tests__/integration/loginFlow.test.ts`

## 7.3 Adotar Testes End-to-End (E2E)
- Simule cenários reais de uso no navegador.
- Use Playwright ou Cypress.
- Exemplo:

```javascript
// login.spec.ts (Playwright)
test('usuário faz login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name=email]', 'user@exemplo.com');
  await page.fill('input[name=password]', 'senha');
  await page.click('button[type=submit]');
  await expect(page).toHaveURL('/dashboard');
});
```
- Estruture:
  - `/e2e/login.spec.ts`
  - `/e2e/viewer.spec.ts`

## 7.4 Configurar Lint, Prettier e CI
- Adote ESLint para padronização:
  - `.eslintrc.json`
- Use Prettier para formatação:
  - `.prettierrc`
- Configure CI (exemplo GitHub Actions):

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm test
```

## 7.5 Definir Critérios de Cobertura e Qualidade
- Estabeleça meta de cobertura mínima (ex: 80%).
- Use Istanbul/Coveralls para monitorar cobertura.
- Práticas recomendadas:
  - Todo PR deve passar por revisão de código.
  - Testes obrigatórios para novos módulos/funcionalidades.
  - Automatize rodagem de testes/lint no CI.

---

> Preencha cada item acima com exemplos de testes, ferramentas, workflows e critérios de qualidade. Use este documento como guia para garantir a qualidade do frontend.

# Checklist

## 7.1 Adicionar Testes Unitários
- [ ] Implementar testes unitários para serviços e controllers
- [ ] Utilizar frameworks como Jest, Vitest ou equivalente

## 7.2 Adicionar Testes de Integração
- [ ] Testar fluxos críticos (login, upload, navegação, seleção IFC)
- [ ] Simular interações entre múltiplos módulos

## 7.3 Adotar Testes End-to-End (E2E)
- [ ] Implementar testes E2E para cenários reais de uso
- [ ] Utilizar ferramentas como Playwright ou Cypress

## 7.4 Configurar Lint, Prettier e CI
- [ ] Adotar ESLint para padronização de código
- [ ] Configurar Prettier para formatação automática
- [ ] Integrar testes e lint no pipeline de CI

## 7.5 Definir Critérios de Cobertura e Qualidade
- [ ] Estabelecer meta de cobertura mínima (ex: 80%)
- [ ] Monitorar cobertura com ferramentas como Istanbul/Coveralls
- [ ] Documentar práticas recomendadas de testes e revisão de código

---
