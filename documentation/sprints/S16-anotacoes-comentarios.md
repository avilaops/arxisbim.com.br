# S16 · Anotações e Comentários em Elementos

**Fase:** Metadados BIM  
**Status:** Pendente  
**Depende de:** S09 (seleção de elemento), S01 (autenticação para @menção)  
**Bloqueia:** S17 (compartilhamento — viewer público pode mostrar comentários)

---

## Objetivo

Comentários ancorados a elementos IFC específicos, com thread de replies e notificação por email.

---

## Por que importa a longo prazo

Comentários são o primeiro mecanismo de colaboração assíncrona do produto. Em fluxos de revisão de projeto (arquiteto → engenheiro → cliente), o ciclo inteiro acontece via comentários em elementos específicos.

O desafio de longo prazo: `GlobalId` de um elemento pode mudar se o modelo for reimportado com ajustes. Comentários ancorados a `GlobalId` ficam órfãos. A solução é vincular o comentário ao `GlobalId` + fallback para `expressID` + fallback para posição 3D do elemento — três camadas de âncora para sobreviver a reimports.

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Âncora | `global_id` primário + `world_position` fallback | Sobrevive a reimport parcial |
| Thread | `parent_comment_id` para replies | Até 2 níveis (comentário + replies) |
| @menção | Parse `@username` no body, notifica por email | Simples e efetivo |
| Marcador no viewer | Sprite 3D na posição do elemento | Visível sem selecionar |
| Resolução | Campo `is_resolved` + quem resolveu | Fluxo de revisão formal |
| Permissão | Qualquer membro do projeto pode comentar | Viewer público apenas lê |

---

## Schema

```sql
element_comments (
  id               UUID PK,
  project_id       UUID FK projects NOT NULL,
  model_version_id UUID FK model_versions,
  global_id        VARCHAR(22),       -- âncora primária
  world_position   JSONB,             -- fallback: { x, y, z }
  body             TEXT NOT NULL,
  parent_id        UUID FK element_comments,
  author_id        UUID FK users NOT NULL,
  is_resolved      BOOLEAN DEFAULT false,
  resolved_by      UUID FK users,
  resolved_at      TIMESTAMP,
  created_at       TIMESTAMP
)
```

---

## Arquivos principais

```
backend/src/modules/comments/
  comments.routes.ts    ← CRUD /projects/:id/comments
  comments.service.ts   ← criação, @menção parsing, notify

backend/src/modules/email/
  mention.email.ts      ← template de email de @menção

frontend/src/viewer/
  CommentMarkers.ts     ← sprites 3D sobre elementos com comentários
  CommentPanel.ts       ← thread lateral por elemento selecionado
```

---

## Riscos

| Risco | Mitigação |
|---|---|
| GlobalId muda após reimport | Armazenar também `world_position` como fallback |
| Email de @menção enviado para usuário que saiu do projeto | Verificar permissão antes de enviar, não na hora da menção |
| Spam de comentários no viewer público | Viewer público não exibe comentários por padrão |

---

## Critérios de aceite

- [ ] Comentário criado ao clicar em elemento aparece como marcador 3D no modelo
- [ ] Thread de reply funciona com até 2 níveis
- [ ] @menção de usuário do projeto dispara email em < 1 min
- [ ] `is_resolved` marca comentário como concluído com visual distinto
- [ ] Comentários persistem ao reimportar modelo (âncora por GlobalId)
- [ ] Build e lint passam
- [ ] Demo em até 5 minutos
