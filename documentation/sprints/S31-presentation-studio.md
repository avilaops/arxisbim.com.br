# S31 · Presentation Studio

**Fase:** Apresentação e Entrega  
**Status:** Pendente  
**Depende de:** S30 (comparação financeira como slide principal), S27 (animação 4D para slides)  
**Bloqueia:** S32 (release candidate inclui Presentation Studio)

---

## Objetivo

Sequência de slides configuráveis com câmera salva, visibilidade, anotações e comparação financeira. Export de apresentação como vídeo MP4 ou sequência de imagens. Compartilhamento por link sem login.

---

## Por que importa a longo prazo

O produto precisa de um mecanismo de entrega do trabalho ao cliente final (dono da obra, banco financiador, fiscal da prefeitura). O Presentation Studio é o output do ArxisVR: todo o trabalho feito desde o S01 resulta numa apresentação que pode ser enviada por e-mail e aberta num browser sem login.

O compartilhamento por link sem login é crítico para adoção: construtoras precisam mostrar o modelo para clientes que jamais criarão uma conta na plataforma.

O export em vídeo atende uma necessidade específica de licitações públicas: o edital pode exigir um vídeo do modelo 3D como parte da documentação técnica.

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Slide = snapshot de estado | `{ camera, visibility, annotations, activeScenario }` | Determinístico, replayável |
| Sequência | Array ordenado de slides, reordenável via drag-and-drop | Simples e flexível |
| Export vídeo | `CCapture.js` + Three.js `render()` frame a frame | Funciona sem codec nativo no servidor |
| Link público | Token JWT com `exp` configurável (7d, 30d, never) | Sem conta necessária para visualizar |
| Modo apresentação | Fullscreen com teclas ← → para navegar entre slides | UX de PowerPoint |
| Thumbnail | Screenshot automático ao salvar slide | Pré-visualização no editor |

---

## Estrutura de dados

```typescript
interface Presentation {
  id: string
  project_id: string
  name: string
  slides: Slide[]
  created_by: string
  share_token?: string
  share_expires_at?: string
}

interface Slide {
  id: string
  order: number
  title: string
  camera: CameraState             // { position, target, fov }
  visibility: VisibilityState     // { hidden: expressID[] }
  active_scenario_id?: string
  annotations: Annotation[]
  duration_seconds: number        // para export de vídeo
  thumbnail_url?: string
}
```

---

## Arquivos principais

```
backend/src/modules/presentations/
  presentations.routes.ts        ← CRUD /projects/:id/presentations
  presentation-share.routes.ts   ← POST /presentations/:id/share-link
  presentation-export.routes.ts  ← POST /presentations/:id/export (job assíncrono)

frontend/src/presentations/
  PresentationEditor.tsx         ← editor de slides com drag-and-drop
  SlidePreview.tsx               ← thumbnail + título de cada slide
  PresentationPlayer.tsx         ← modo fullscreen com navegação por teclas
  PublicPresentation.tsx         ← viewer público (sem autenticação)
  ExportProgress.tsx             ← progresso de export de vídeo
```

---

## Riscos

| Risco | Mitigação |
|---|---|
| Export de vídeo lento (frame a frame no browser) | Processar no servidor via Puppeteer headless com WebGL; fallback para sequência de PNGs |
| Link público expirando no meio de uma apresentação para cliente | Renovar token automaticamente se usuário autenticado reabrir o link |
| Slide com câmera de cenário arquivado | Detectar e alertar na abertura do editor |

---

## Critérios de aceite

- [ ] Criar apresentação com mínimo 3 slides com câmera, visibilidade e cenário diferentes
- [ ] Reordenar slides via drag-and-drop
- [ ] Modo fullscreen com navegação por teclas ← →
- [ ] Link público funciona sem login por 7 dias (padrão)
- [ ] Export gera sequência de PNG (uma por slide) em < 30s
- [ ] Thumbnail salvo automaticamente ao criar slide
- [ ] Build e lint passam
- [ ] Demo em até 5 minutos
