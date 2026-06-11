# S05 · Frontend — Onboarding e Dashboard

**Fase:** Fundação SaaS  
**Status:** Pendente  
**Depende de:** S01 (auth), S03 (projetos), S04 (billing)  
**Bloqueia:** S09 (viewer precisar de shell de navegação)

---

## Objetivo

Primeiro contato do usuário com o produto. Fluxo de criação de conta → dashboard → upload de modelo em menos de 3 cliques.

---

## Por que importa a longo prazo

O onboarding define o time-to-value. Cada fricção aqui reduz a conversão de trial para Pro. O shell de navegação criado neste sprint (sidebar, header, rotas) é reutilizado por todos os sprints de frontend até o S32. Mudá-lo depois custa muito.

O empty state deste sprint é o que clientes enterprise veem quando abrem a plataforma pela primeira vez em uma demo. Ele precisa comunicar a tese do produto, não apenas "nenhum projeto encontrado".

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Roteamento | File-based routing via Vite MPA | Já estabelecido no projeto |
| Estado global | Zustand ou Context mínimo | Evitar over-engineering em estado simples |
| Design system | CSS variables + componentes próprios | Sem dependência de Tailwind/MUI |
| Upload UX | Drag-and-drop + botão | Padrão esperado por engenheiros |
| Feedback de erro | Toast global + mensagem inline | Erros críticos inline, informativos em toast |
| Dashboard | Grid de cards com thumbnail gerado no S08 | Placeholder geométrico por enquanto |

---

## Fluxo de onboarding

```
Landing → Register → (email verify se habilitado) → Dashboard vazio
→ "Crie seu primeiro projeto" → Modal de criação → Dashboard com projeto
→ "Faça upload do seu modelo IFC" → Upload com progresso → Modelo na fila
→ "Modelo processando..." → (S11 processa) → Modelo pronto → Viewer
```

---

## Arquivos principais

```
frontend/src/
  pages/
    dashboard.ts        ← listagem de projetos
    login.ts
    register.ts
    onboarding.ts       ← wizard de primeiro acesso
  components/
    Shell.ts            ← sidebar + header + layout
    ProjectCard.ts      ← card de projeto com status
    UploadZone.ts       ← drag-and-drop com progresso
    EmptyState.ts       ← estado vazio com CTA
    Toast.ts            ← notificações globais
  api/
    projects.ts         ← fetch /projects
    models.ts           ← fetch upload URL
```

---

## Empty state — copy

```
"Ainda não há modelos aqui."
"Faça upload do seu primeiro IFC para começar a comparar cenários de obra."
[Botão primário: "Fazer upload de modelo IFC"]
```

---

## Riscos

| Risco | Mitigação |
|---|---|
| Shell de navegação rígido dificulta mudanças futuras | Componentes atômicos, sem lógica de negócio no Shell |
| Upload progresso desaparece em navegação | Estado de upload global persistido no Zustand |
| Mobile quebra em < 375px | Testar em viewport 360px antes de marcar pronto |

---

## Critérios de aceite

- [ ] Usuário novo cria conta, projeto e faz upload em < 3 cliques sem instrução
- [ ] Dashboard lista projetos com status (uploading / processing / ready / failed)
- [ ] Barra de progresso de upload aparece e reflete % real
- [ ] Empty state exibe CTA claro
- [ ] Shell de navegação funciona em mobile (360px) e desktop
- [ ] Build e lint passam
- [ ] Demo em até 5 minutos
