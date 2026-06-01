# 12- UI Components

## Objetivo
Definir padrões, responsabilidades e integrações dos componentes de UI, promovendo reutilização, consistência visual, acessibilidade e desacoplamento da lógica de negócio.

## Responsabilidades Detalhadas
- Fornecer biblioteca de componentes visuais reutilizáveis: painéis, toolbars, dialogs, botões, inputs, listas, cards, menus, tabs, modais, tooltips, etc.
- Centralizar tokens de design (cores, espaçamentos, fontes, bordas, sombras) e temas (dark/light, glassmorphism, high-contrast)
- Garantir acessibilidade (a11y): navegação por teclado, ARIA, contraste, foco visível, labels
- Suportar responsividade (mobile, tablet, desktop) e internacionalização (i18n/l10n)
- Receber dados e callbacks via props, sem lógica de domínio acoplada
- Integrar com controllers, state manager e event bus para atualização reativa
- Facilitar testes de interface e documentação viva (Storybook, exemplos de uso)
- Permitir customização via slots, overrides de estilo e composição

## APIs/Contratos
- Props padronizadas para dados, eventos, estilos e customização
- Suporte a slots/customização de conteúdo (ex: children, render props)
- Eventos de interação (onClick, onChange, onSelect, onClose, onOpen, etc)
- Suporte a estados visuais: loading, disabled, selected, error, warning, success
- Exemplo:
  - `<Panel title="Propriedades" onClose={...} size="md" variant="glass">{children}</Panel>`
  - `<Button variant="primary" size="lg" icon="save" loading={isSaving} onClick={...}>Salvar</Button>`
  - `<Input value={...} onChange={...} placeholder="Buscar..." error={!!error} />`
  - `<Dialog open={isOpen} onClose={closeDialog}><Dialog.Title>Confirmar</Dialog.Title>{children}</Dialog>`

## Fluxos Detalhados
1. **Renderização reativa:**
   - Componentes recebem props do controller/state manager
   - Atualizam visual automaticamente ao mudar props/estado
2. **Emissão de eventos:**
   - Usuário interage (clique, input, seleção)
   - Componente emite evento para controller/state manager
3. **Composição:**
   - Componentes básicos compõem componentes complexos (ex: Panel + Toolbar + List)
   - Suporte a slots para customização de conteúdo
4. **Temas e tokens:**
   - Componentes consomem tokens/temas globais para estilos
   - Mudança de tema reflete automaticamente em todos os componentes
5. **Acessibilidade:**
   - Labels, ARIA, foco visível, navegação por teclado, roles semânticos

## Exemplos de Uso Avançados
```typescript
<Panel title="Propriedades" onClose={closePanel} size="lg" variant="glass">
  <PropertyList properties={selectedObjectProps} />
  <Button variant="danger" onClick={handleDelete}>Remover</Button>
</Panel>

<Toolbar>
  <Button icon="upload" onClick={handleUpload} loading={isUploading}>Upload IFC</Button>
  <Button icon="camera" onClick={handleSnapshot} disabled={!canSnapshot}>Snapshot</Button>
  <Menu>
    <Menu.Item onClick={handleExport}>Exportar GLB</Menu.Item>
    <Menu.Item onClick={handleExportPNG}>Exportar PNG</Menu.Item>
  </Menu>
</Toolbar>

<Input value={search} onChange={setSearch} placeholder="Buscar..." autoFocus error={!!searchError} />

<Dialog open={isDialogOpen} onClose={closeDialog}>
  <Dialog.Title>Confirmar exclusão</Dialog.Title>
  <Dialog.Content>Tem certeza que deseja remover este modelo?</Dialog.Content>
  <Dialog.Actions>
    <Button onClick={closeDialog}>Cancelar</Button>
    <Button variant="danger" onClick={confirmDelete}>Remover</Button>
  </Dialog.Actions>
</Dialog>
```

## Pontos de Integração Detalhados
- **Controllers:** Recebem eventos dos componentes, atualizam props/estado
- **State Manager:** Props derivadas do estado global, atualização reativa
- **Event Bus:** Eventos globais (notificações, toasts, modais)
- **Design System:** Tokens, temas, estilos globais, documentação de padrões
- **Testes:** Unitários (Jest/Vitest), integração (Testing Library), documentação viva (Storybook)
- **Acessibilidade:** Ferramentas de linting a11y, testes com leitores de tela

## Critérios de Qualidade
- Reutilização máxima, baixo acoplamento e alta coesão
- Consistência visual e aderência ao design system
- Acessibilidade total (teclado, leitores de tela, contraste, ARIA)
- Responsividade e adaptação a diferentes telas e temas
- Testes unitários, integração e documentação viva (Storybook)
- Facilidade de customização, extensão e override de estilos
- Performance: renderização eficiente, lazy loading de componentes pesados
- Internacionalização: suporte a múltiplos idiomas e formatos

## Design System

### Design Tokens

Design tokens são os elementos fundamentais do design system, armazenados em `src/styles/tokens.css` e usados via CSS custom properties.

#### Usage Example

```css
.my-component {
  background: var(--panel);
  color: var(--text-primary);
  padding: var(--space-4);
  border-radius: var(--radius-md);
}
```

### Sistema de Cores

#### Cores Primárias

| Token | Light Theme | Dark Theme | High Contrast |
|-------|------------|------------|---------------|
| `--bg-primary` | #ffffff | #0f1217 | #000000 |
| `--bg-secondary` | #f3f4f6 | #161b22 | #000000 |
| `--panel` | #ffffff | #151a21 | #000000 |
| `--border` | #e5e7eb | #2a3441 | #ffffff |
| `--text-primary` | #111827 | #e6edf3 | #ffffff |

#### Cores de Acento

| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | #3b82f6 | Primary actions, links |
| `--success` | #10b981 | Success states |
| `--warning` | #f59e0b | Warning states |
| `--danger` | #ef4444 | Error states |

### Tipografia

#### Fontes

```css
--font-sans: 'Inter', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

#### Escalas de Tamanho

| Token | Size | Usage |
|-------|------|-------|
| `--text-xs` | 0.75rem | Labels, captions |
| `--text-sm` | 0.875rem | Secondary text |
| `--text-base` | 1rem | Body text |
| `--text-lg` | 1.125rem | Subheadings |
| `--text-xl` | 1.25rem | Headings |
| `--text-2xl` | 1.5rem | Large headings |
| `--text-3xl` | 1.875rem | Page titles |

### Espaçamento

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 0.25rem | 4px |
| `--space-2` | 0.5rem | 8px |
| `--space-3` | 0.75rem | 12px |
| `--space-4` | 1rem | 16px |
| `--space-6` | 1.5rem | 24px |
| `--space-8` | 2rem | 32px |
| `--space-12` | 3rem | 48px |
| `--space-16` | 4rem | 64px |

### Sombras

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | 0 1px 2px rgba(0,0,0,0.05) | Subtle elevation |
| `--shadow-md` | 0 4px 6px rgba(0,0,0,0.1) | Cards, panels |
| `--shadow-lg` | 0 10px 15px rgba(0,0,0,0.1) | Modals, dropdowns |
| `--shadow-xl` | 0 20px 25px rgba(0,0,0,0.15) | Floating elements |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 0.25rem | Small elements |
| `--radius-md` | 0.375rem | Buttons, inputs |
| `--radius-lg` | 0.5rem | Cards, panels |
| `--radius-xl` | 0.75rem | Large containers |
| `--radius-full` | 9999px | Pills, badges |

### Temas

#### Light Theme (Default)

```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f3f4f6;
  --panel: #ffffff;
  --border: #e5e7eb;
  --text-primary: #111827;
  --text-secondary: #6b7280;
}
```

#### Dark Theme

```css
[data-theme="dark"] {
  --bg-primary: #0f1217;
  --bg-secondary: #161b22;
  --panel: #151a21;
  --border: #2a3441;
  --text-primary: #e6edf3;
  --text-secondary: #8b949e;
}
```

#### High Contrast Theme

```css
[data-theme="high-contrast"] {
  --bg-primary: #000000;
  --bg-secondary: #000000;
  --panel: #000000;
  --border: #ffffff;
  --text-primary: #ffffff;
  --text-secondary: #ffffff;
}
```

### Componentes

#### Button

```typescript
<Button variant="primary" size="md" icon="save" loading={isSaving} onClick={handleSave}>
  Salvar
</Button>

// Variants: primary, secondary, danger, ghost, link
// Sizes: sm, md, lg, xl
```

#### Input

```typescript
<Input
  value={value}
  onChange={setValue}
  placeholder="Buscar..."
  error={!!error}
  helperText={error}
  icon="search"
/>
```

#### Panel

```typescript
<Panel title="Propriedades" onClose={closePanel} size="lg" variant="glass">
  <Panel.Content>
    {children}
  </Panel.Content>
  <Panel.Footer>
    <Button onClick={closePanel}>Fechar</Button>
  </Panel.Footer>
</Panel>

// Variants: default, glass, elevated
// Sizes: sm, md, lg, xl, full
```

#### Dialog

```typescript
<Dialog open={isOpen} onClose={closeDialog}>
  <Dialog.Title>Confirmar exclusão</Dialog.Title>
  <Dialog.Content>
    Tem certeza que deseja remover este modelo?
  </Dialog.Content>
  <Dialog.Actions>
    <Button onClick={closeDialog}>Cancelar</Button>
    <Button variant="danger" onClick={confirmDelete}>Remover</Button>
  </Dialog.Actions>
</Dialog>
```

#### Toolbar

```typescript
<Toolbar>
  <Toolbar.Group>
    <Button icon="upload" onClick={handleUpload}>Upload</Button>
    <Button icon="camera" onClick={handleSnapshot}>Snapshot</Button>
  </Toolbar.Group>
  <Toolbar.Group align="right">
    <Menu>
      <Menu.Item onClick={handleExport}>Exportar GLB</Menu.Item>
      <Menu.Item onClick={handleExportPNG}>Exportar PNG</Menu.Item>
    </Menu>
  </Toolbar.Group>
</Toolbar>
```

#### Menu

```typescript
<Menu>
  <Menu.Item icon="file" onClick={handleOpen}>Abrir</Menu.Item>
  <Menu.Item icon="save" onClick={handleSave}>Salvar</Menu.Item>
  <Menu.Separator />
  <Menu.Item icon="settings" onClick={handleSettings}>Configurações</Menu.Item>
</Menu>
```

#### Card

```typescript
<Card variant="elevated" hoverable onClick={handleClick}>
  <Card.Header>
    <Card.Title>Project Name</Card.Title>
    <Card.Subtitle>Last updated: 2 days ago</Card.Subtitle>
  </Card.Header>
  <Card.Content>
    <p>Project description...</p>
  </Card.Content>
  <Card.Footer>
    <Button size="sm">View Details</Button>
  </Card.Footer>
</Card>
```

### Acessibilidade

#### Navegação por Teclado

```typescript
// Componentes devem suportar navegação por teclado
<button
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
  Button
</button>
```

#### ARIA Labels

```typescript
<button aria-label="Fechar painel" onClick={closePanel}>
  <CloseIcon />
</button>

<div role="dialog" aria-labelledby="dialog-title" aria-modal="true">
  <h2 id="dialog-title">Título do Dialog</h2>
</div>
```

#### Contraste

- Usar tokens de cor que garantem contraste mínimo de 4.5:1
- Verificar com ferramentas como axe DevTools ou Lighthouse

### Responsividade

#### Breakpoints

```css
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;
--breakpoint-2xl: 1536px;
```

#### Uso

```css
@media (min-width: var(--breakpoint-md)) {
  .panel {
    width: 50%;
  }
}
```

### Internacionalização

#### Formatação de Datas

```typescript
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formattedDate = format(new Date(), 'dd/MM/yyyy', { locale: ptBR });
```

#### Formatação de Números

```typescript
const formattedNumber = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
}).format(1234.56);
```

### Integração com React

```typescript
import { useState } from 'react';
import { Button, Dialog, Input } from '@/components';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState('');

  return (
    <div>
      <Button onClick={() => setIsOpen(true)}>Abrir Dialog</Button>
      <Dialog open={isOpen} onClose={() => setIsOpen(false)}>
        <Dialog.Title>Input Dialog</Dialog.Title>
        <Dialog.Content>
          <Input
            value={value}
            onChange={setValue}
            placeholder="Digite algo..."
          />
        </Dialog.Content>
      </Dialog>
    </div>
  );
}
```

---
> Este documento serve como guia aprofundado para implementação, testes e evolução dos componentes de UI do frontend, cobrindo padrões avançados, acessibilidade, temas, integração e exemplos de uso.
