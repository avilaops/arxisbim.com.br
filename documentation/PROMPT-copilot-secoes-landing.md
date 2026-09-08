# Prompt para o Copilot: recuperar as cinco seções da landing

Cole tudo abaixo da linha no Copilot. O contexto foi levantado em 08/09/2026 e
está verificado no repositório; o Copilot não precisa redescobrir nada.

---

Quero que você RECUPERE cinco seções da landing page do ArxisVR que foram
perdidas numa conversão de HTML para React, e as reconstrua em React,
mobile-first, ligadas aos links do menu que hoje apontam para o nada.

Repositório: `arxisvr.avilaops.com`. Arquivo alvo: `frontend/src/pages/LandingPage.tsx`.
URL publicada: https://arxisvr.avilaops.com

IMPORTANTE:
- Não é redesign. A identidade visual atual (header claro, hero escuro, pill
  buttons preto/branco, badge, CTA band claro) fica como está.
- Não toque no header, no drawer mobile, no hero, no CTA band nem no rodapé:
  foram corrigidos e validados em 08/09/2026. Você INSERE seções entre eles.
- Não invente conteúdo. O texto das seções existe no git e é para ser
  reaproveitado. Só corrija o que estiver factualmente errado (ver preços).
- Não escreva preço à mão. A seção de planos LÊ da API.
- Não adicione dependência nova.
- Sem travessão (—) em texto que o cliente lê: use vírgula, dois-pontos ou
  hífen. É regra da casa.

==================================================
CONTEXTO: O QUE ACONTECEU
==================================================

Em 24/06/2026 a landing foi convertida de HTML estático para React (commit
`8c11b92`, "conversão html para tsx"). A conversão trouxe o hero, o CTA band e o
rodapé, e DEIXOU DE FORA cinco seções. No mesmo dia um `body { overflow: hidden }`
do layout do app travou o scroll da landing (já corrigido), então ninguém desceu
a página para notar que as seções sumiram.

Os links do menu (`Recursos`, `Para compradores`, `Exemplos`, `Casos de uso`,
`Planos`) continuam apontando para `#features`, `#selo`, `#usecases`, `#cases`
e `#pricing`. Esses ids não existem mais na página. Clicar não faz nada. É isso
que você vai resolver, restaurando o conteúdo.

==================================================
ONDE ESTÁ O CONTEÚDO ORIGINAL
==================================================

No commit anterior à conversão. Leia com:

```bash
git show 8c11b92^:frontend/index.html          # tem #selo, #usecases, #cases
git show 8c11b92^:frontend/arxisvr-build.html  # tem #features, #pricing
```

Tamanho e essência de cada uma:

| id | linhas | o que é |
|---|---|---|
| `#features` | 56 | "Diferenciais Tecnológicos": escala humana, detecção de clash, modelos 4D, IFC, reunião AR remota |
| `#selo` | 54 | "Quem compra na planta não enxerga uma planta 2D. Enxerga a casa onde vai morar." Proposta de valor para o comprador final |
| `#usecases` | 17 | "Do estande de vendas ao canteiro de obras": 5 cards (vendas na planta, comprador, arquitetura, construção 4D, engenharia MEP), com copy pronta |
| `#cases` | 46 | "Feito para times AEC": construtoras, escritórios de arquitetura, engenharia/MEP, gerenciadoras |
| `#pricing` | 53 | "Planos e Preços". **Os preços deste HTML estão ERRADOS** (Grátis / Pro R$199 / R$499). Ver seção de planos abaixo. |

O HTML antigo tem entidades escapadas (`&amp;`) e emojis como ícones. Converta
as entidades; os emojis podem ficar se estiverem coerentes com o resto da
página (o hero usa `✓` verde nos benefícios), ou troque por ícones do
`lucide-react`, que já está no projeto.

==================================================
ONDE INSERIR
==================================================

Em `LandingPage.tsx`, dentro de `<main id="main-content">`, DEPOIS do
`</section>` do hero e ANTES do comentário `{/* SIMPLE CTA SECTION */}`.

Ordem, igual à do menu: `#features` → `#selo` → `#usecases` → `#cases` → `#pricing`.

Cada seção: `<section id="..." data-track-section="...">` com um `.container`
dentro. Os ids têm de bater EXATAMENTE com os `href` do menu e do drawer (estão
em `LandingPage.tsx`, no `<nav className="nav-links">` e no array do
`.lp-drawer__list`).

O header é `position: sticky` com 68px no desktop e 60px no mobile. Sem
`scroll-margin-top`, o título de cada seção fica escondido atrás dele ao clicar
no link. Use:

```css
main section[id] { scroll-margin-top: calc(72px + env(safe-area-inset-top, 0px)); }
```

==================================================
SISTEMA MOBILE JÁ EXISTENTE (REUTILIZE)
==================================================

Está em `frontend/src/styles/globals.css`, bloco
`/* ===== Landing — responsivo de verdade ===== */`. Leia antes de escrever CSS.

- Breakpoints em uso: **760px** (mobile), **600px** (container), **400px** e
  **480px** (uma coluna). Não crie outros.
- `.container` já cuida do padding lateral (20 / 16 / 12px).
- Padrão adotado: **inline carrega a identidade; só o que varia por viewport
  vai para CSS**, com valor desktop + mobile. `@media` dentro de `style={{}}`
  é no-op em React, não use.
- Tokens de texto sobre fundo escuro: `var(--c-text)` (branco) para títulos,
  `var(--c-text2)` (#b4b4b4, 9,5:1) para corpo, `var(--c-text3)` para
  metadado. **Não use `--text-secondary` nem `--text-primary`**: são aliases
  legados da versão clara (#666 e #000) e reprovam contraste no fundo escuro.
- Grids: 3 ou 4 colunas no desktop, 2 em ≤760, 1 em ≤480. Use
  `repeat(auto-fit, minmax(240px, 1fr))` quando fizer sentido, e confira que
  não estoura em 360px.
- Cards: `.card` global existe (surface2, border, radius 6px). Pode usar ou
  criar uma classe `.lp-card` no bloco da landing, com o mesmo estilo dos
  cards que já existem na página.

==================================================
SEÇÃO DE PLANOS: LÊ DA API, NÃO ESCREVE À MÃO
==================================================

Em 01/09/2026 a aba de cobrança do app foi refeita porque desenhava "Free / 3
de 3 projetos" escrito à mão enquanto o backend dizia outra coisa. Não repita.

Endpoint público, sem auth: `GET https://api.arxisvr.avilaops.com/api/v1/billing/plans`

Resposta (verificada em 08/09/2026):

```json
{
  "plans": [
    {
      "name": "Free Trial",
      "description": "Teste gratuito para validar modelos IFC e navegação básica.",
      "monthlyAmountCents": 0,
      "currency": "BRL",
      "features": ["ifc_viewer", "cloud_storage", "measurement_tools"],
      "limits": { "maxUsers": 2, "maxProjects": 3, "maxStorageGB": 5, "maxFileSizeMB": 50, "collaboratorsPerSession": 2, "apiCallsPerMonth": 0, "maxScenarios": 2 }
    },
    { "name": "Starter",      "monthlyAmountCents": 8700,  "...": "..." },
    { "name": "Professional", "monthlyAmountCents": 23700, "...": "..." },
    { "name": "Enterprise",   "monthlyAmountCents": 59700, "...": "..." }
  ],
  "provider": "mercadopago"
}
```

Regras:
- Use `buildApiV1Url('/billing/plans')` de `@/config/apiBaseUrl` (é como os
  services vivos chamam a API). Crie `frontend/src/services/plans.service.ts`
  no molde de `dashboard.service.ts`.
- `monthlyAmountCents` → formatar com `Intl.NumberFormat('pt-BR', { style: 'currency', currency })`. 0 → "Grátis".
- `-1` em qualquer limite → "Ilimitado".
- `features` são chaves internas. Mapeie para rótulos em português num objeto
  no próprio componente (ex.: `ifc_viewer` → "Visualizador IFC", `vr_mode` →
  "Modo VR", `ar_mode` → "Modo AR", `federation` → "Federação de modelos",
  `api_access` → "Acesso à API", `sso` → "SSO", `custom_branding` → "Marca
  própria", `dedicated_support` → "Suporte dedicado"). Chave sem rótulo: não
  exibir, e registrar um `console.warn` para não passar despercebida.
- Estados obrigatórios: **carregando** (skeleton de 4 cards, sem layout
  shift), **erro** (mensagem curta com botão de tentar de novo, sem quebrar o
  resto da página) e **vazio** (não deve acontecer, mas não pode explodir).
- Destaque visual para o plano do meio (`Professional`): é a âncora de preço.
- CTA de cada card → `/register`. Não há checkout público na landing; o
  checkout é dentro do app, depois do cadastro.
- **Nenhum número de preço, limite ou nome de plano pode existir no JSX
  fora do que veio da API.** Se o backend mudar o preço, a landing muda junto.

==================================================
ACESSIBILIDADE E COPY
==================================================

- Um `<h2>` por seção, hierarquia `h2 > h3` nos cards.
- Contraste AA em tudo (medido, não estimado).
- `<section>` com `aria-labelledby` apontando para o `<h2>`.
- Sem travessão. Sem "Lorem ipsum". Sem placeholder.
- Corrija `&amp;` → `&`.

==================================================
PROCEDIMENTO
==================================================

FASE 1 — Leia, não escreva ainda:
- `git show 8c11b92^:frontend/index.html` e `arxisvr-build.html`.
- `LandingPage.tsx` inteiro (ponto de inserção, hrefs do menu e do drawer).
- O bloco "Landing — responsivo de verdade" em `globals.css`.
- `src/services/dashboard.service.ts` (molde do service).

FASE 2 — Port das quatro seções de copy (`#features`, `#selo`, `#usecases`,
`#cases`), mobile-first, uma de cada vez, conferindo em 360px a cada uma.

FASE 3 — `#pricing` lendo da API, com os três estados.

FASE 4 — `scroll-margin-top` e teste de cada link do menu e do drawer.

FASE 5 — Validação (abaixo).

FASE 6 — Deploy com `./deploy/deploy-aplicacoes.sh web`. Ele reconstrói, envia
e **confere que o bundle publicado é o que acabou de construir**; se abortar,
o deploy falhou de verdade, não ignore.

==================================================
VALIDAÇÃO OBRIGATÓRIA
==================================================

Playwright já está instalado no monorepo. Teste em 360×800, 375×812, 390×844,
393×852, 430×932, 768×1024, 1280×800, 1440×900 e 1920×1080, contra o preview
local E contra a URL publicada depois do deploy. Para cada viewport:

- `document.documentElement.scrollWidth <= clientWidth` (sem scroll horizontal).
- Cada um dos 5 links do menu: clicar leva a um elemento com aquele id, e o
  `<h2>` da seção fica visível abaixo do header (não escondido atrás dele).
- Contraste de `h2`, corpo e metadado de cada seção ≥ 4,5:1 (calcule por
  luminância a partir de `getComputedStyle`).
- Nenhum card com `scrollWidth > clientWidth`.
- `#pricing`: 4 cards renderizados a partir da API; preço formatado em BRL;
  nenhum "-1" visível; estado de erro exibido quando a API responde 500
  (simule com `page.route`).
- No mobile: grids em 2 ou 1 coluna, nunca 3+.
- Wheel de 500px rola a página (`scrollY > 100`).

Screenshots de 390×844 (cada seção, rolando), 430×932 e 1440×900, salvos em
`documentation/provas/mobile/secoes/`.

==================================================
CRITÉRIOS DE ACEITE
==================================================

[ ] os 5 ids existem na página, na ordem do menu
[ ] clicar em cada link do menu e do drawer chega na seção certa, com o título visível
[ ] copy original preservada, entidades corrigidas, sem travessão
[ ] `#pricing` lê da API: 4 planos, preços em BRL, "Grátis" e "Ilimitado" tratados
[ ] nenhum preço/limite/nome escrito à mão no JSX
[ ] skeleton, erro e vazio implementados e testados
[ ] contraste AA medido em todas as seções
[ ] sem scroll horizontal em nenhum dos 9 viewports
[ ] header, drawer, hero, CTA band e rodapé intocados (diff limpo neles)
[ ] `npm run build` passa
[ ] deploy conferiu o hash e a URL publicada responde 200
[ ] validação repetida contra a URL publicada, não só local

==================================================
AO FINAL, ENTREGUE
==================================================

1. Diff resumido por arquivo.
2. Para cada seção: de onde veio o conteúdo (arquivo e linhas do commit antigo)
   e o que mudou no port.
3. O mapeamento `features` → rótulo, completo.
4. Resultado da validação nos 9 viewports, com os números (não "passou").
5. Screenshots.
6. Qualquer coisa do HTML antigo que você decidiu NÃO trazer, e por quê.
7. Dívida encontrada no caminho.

REGRA DE OURO:
Prefira a menor alteração capaz de resolver corretamente. Reutilize o sistema
mobile, os tokens, o `.container`, o molde de service e o script de deploy que
já existem. Se encontrar algo estrutural diferente do descrito aqui, explique
antes de contornar. Não esconda problema com `overflow: hidden`, altura fixa
ou media query para um modelo específico de aparelho.

Conhecido e fora do escopo: `tsc --noEmit` não roda no frontend por um
`--ignoreDeprecations` inválido no `tsconfig.json` (pré-existente). O build do
Vite é o portão.
