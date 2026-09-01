# S17 · Compartilhamento e Permissões

**Fase:** Metadados BIM  
**Status:** Concluído  
**Depende de:** S01 (RBAC base), S12 (cenário a ser compartilhado)  
**Bloqueia:** S30 (PDF de comparação de cenários precisa de link público), S31 (Presentation Studio usa link público)

---

## Objetivo

Link de visualização sem login (read-only), controle de acesso por papel, expiração de link compartilhado.

> **Nota para o agente:** Este sprint é o **mecanismo de distribuição** do produto, mas também a maior superfície de vazamento. A prioridade é garantir que dados sensíveis (custo, fornecedor, dados internos) **nunca** cheguem ao viewer público, a ausência de vazamento tem precedência sobre conveniência de implementação. Token opaco, jamais expor IDs internos na URL.

---

## Fora de Escopo

Pertencem a sprints futuros, **não implementar aqui**:

- PDF de comparação de cenários (S30 consome o link público)
- Presentation Studio (S31)
- White-label / domínio customizado enterprise
- SSO / convites por organização externa
- Edição colaborativa em tempo real

---

## Por que importa a longo prazo

Compartilhamento é o mecanismo de distribuição do produto. Um cliente enterprise que usa ArxisVR internamente precisa enviar um link de revisão para o cliente final sem que o cliente precise criar conta. Sem isso, o produto não entra no fluxo de aprovação de projetos.

O modelo de permissão granular definido aqui precisa escalar para o S29 (cenários com papéis diferentes) e para white-label enterprise (onde o cliente quer ocultar que usa ArxisVR).

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Link público | Token opaco de 32 bytes em `shared_links` | Não expõe IDs internos na URL |
| Expiração | Configurável: 7d, 30d, nunca | Casos de uso diferentes |
| Nível de acesso | `viewer` (leitura) / `commenter` (leitura + comentário) | Viewer público para clientes, commenter para revisores |
| Propriedades sensíveis | Ocultas em viewer público por padrão | Custos, fornecedores, dados internos não vazam |
| Papéis por projeto | `owner`, `admin`, `editor`, `viewer` | Standard RBAC |
| Cenário compartilhado | Link pode apontar para cenário específico | "Compartilhar Cenário A com o cliente" |

---

## Schema

```sql
shared_links (
  id          UUID PK,
  token       VARCHAR(64) UNIQUE NOT NULL,  -- token público da URL
  project_id  UUID FK projects NOT NULL,
  scenario_id UUID FK scenarios,            -- NULL = compartilha projeto inteiro
  access_level VARCHAR(20) NOT NULL,        -- 'viewer' | 'commenter'
  expires_at  TIMESTAMP,                   -- NULL = nunca expira
  created_by  UUID FK users NOT NULL,
  revoked_at  TIMESTAMP,
  view_count  INT DEFAULT 0,
  created_at  TIMESTAMP
)

project_members (
  project_id UUID FK projects,
  user_id    UUID FK users,
  role       VARCHAR(20) NOT NULL,  -- 'owner' | 'admin' | 'editor' | 'viewer'
  invited_at TIMESTAMP,
  accepted_at TIMESTAMP,
  PRIMARY KEY (project_id, user_id)
)
```

---

## Arquivos principais

```
backend/src/modules/sharing/
  sharing.routes.ts     ← POST /projects/:id/share, DELETE /share/:token
  sharing.service.ts    ← gera token, valida acesso, oculta props sensíveis

frontend/src/
  viewer/SharedViewer.ts  ← viewer sem autenticação, somente leitura
  sharing/ShareModal.ts   ← UI para criar e gerenciar links
```

---

## Definition of Done (global)

Build · type-check · lint · testes passam · sem regressões conhecidas · documentação atualizada · demo executável em até 5 minutos.

---

## Critérios de aceite

- [x] Link público abre viewer sem autenticação
- [x] Viewer público não exibe campos marcados como sensíveis (custo, fornecedor), testado com payload real
- [x] Token é opaco; nenhum ID interno (project_id, scenario_id) aparece na URL
- [x] Link expirado retorna 410 Gone com mensagem clara
- [x] Revogar link torna-o inativo imediatamente (sem cache)
- [x] Link para cenário específico abre naquele cenário
- [x] `view_count` incrementado a cada abertura única
- [x] Build e lint passam
- [x] Demo em até 5 minutos
