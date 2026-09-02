# ROADMAP: ArxisVR

**Última atualização:** 02/09/2026 (marcos zerados por auditoria)
**Versão:** 3.0, 32 sprints atômicos
**Status:** Backend à frente da interface. Os 4 marcos ★ estão zerados: o que
foi construído não chega ao usuário. Ver `AUDIT-2026-09-02-sprints-e-codigo-morto.md`.

---

## Tese Central

O ArxisVR não é um viewer IFC. É uma plataforma de **tomada de decisão baseada em cenários de obra**.

A cadeia de valor:

```
IFC → Metadados → Cenários → Tempo → Custo → Decisão
```

A camada de visualização (Three.js, Babylon, WebXR) pode ser trocada.
A cadeia de cenários é o ativo intransferível.

---

## Marcos Críticos: Não Movem

> **Todos os quatro marcos estão ZERADOS** (auditoria de 02/09/2026,
> `documentation/AUDIT-2026-09-02-sprints-e-codigo-morto.md`). Nenhum foi
> atingido. Marco só cai quando o usuário consegue fazer aquilo na tela, e
> hoje nenhum consegue: o backend existe, a interface não é alcançada pelo
> build. Não remarque nenhum sem abrir a aplicação e fazer o fluxo.

| Marco | Sprint | Valida | Estado | Por quê |
|---|---|---|---|---|
| ★ Primeiro cenário salvo | **S12** | "Usuários querem comparar alternativas?" | ☐ **não atingido** | Backend pronto (`modules/scenario`). Nenhuma tela viva menciona cenário: no bundle a palavra só aparece como rótulo de escopo de API token e texto de marketing. |
| ★ Primeira comparação visual | **S18** | "Side-by-side resolve a decisão visual?" | ☐ **não atingido** | `comparison/ComparisonPage.ts` e `viewer/ComparisonExport.ts` existem e estão órfãos. `SplitView` não aparece no bundle. |
| ★ Primeira comparação temporal | **S26** | "Diferença de prazo entre cenários importa?" | ☐ **não atingido** | Rota de backend existe (`scenario-comparison.routes.ts`). A UI (`src/timeline/`) está órfã. |
| ★ Primeira comparação financeira | **S30** | "Tabela custo+prazo fecha venda?" | ☐ **não atingido** | Backend gera o PDF (`scenario-pdf.service.ts`). Não há rota nem tela que chegue nele. |

**O viewer vivo** (`/app` → `Viewer3DPage`, 356 linhas) oferece quatro botões:
projetos e modelos, redefinir visualização, tela cheia e informações. É todo o
alcance da interface hoje.

---

## Definition of Done: Global

Todo sprint só é concluído quando:

- [ ] **A funcionalidade é alcançável pela aplicação publicada.** Existe rota, a
      tela chega nela, e o arquivo entra no bundle. Este critério é o primeiro
      porque foi o único que faltava: em 02/09/2026 sete sprints tinham backend
      pronto e nenhum deles chegava ao usuário.
- [ ] Build passa
- [ ] Lint passa
- [ ] Testes passam
- [ ] Sem regressões conhecidas em sprints anteriores
- [ ] Demo de até 5 minutos disponível, feita na aplicação publicada

---

## Sequência Estratégica

```
S01–S06  Fundação SaaS
S07–S12  IFC Core          → ★ S12
S13–S17  Metadados BIM
S18–S24  5D BIM            → ★ S18
S25–S28  4D BIM            → ★ S26
S29–S32  Cenários + Release → ★ S30
```

---

## FASE 1: Fundação SaaS · S01–S06

### S01 · Auth e multi-tenant base
- Register → login → logout funcionam
- Token refresh sem re-login
- Workspaces isolados: user de org A não vê org B
- Testes de auth-security passando

### S02 · Upload e storage de arquivos
- Upload de arquivo IFC < 500 MB completa
- URL assinada expira em 1h
- Arquivo isolado por tenant
- Erro claro em tipo inválido

### S03 · Modelo de dados: Projetos
- POST /projects cria projeto
- POST /projects/:id/models faz upload vinculado
- Listagem com paginação
- Soft-delete preserva histórico

### S04 · Billing e planos
- Assinatura no Mercado Pago funciona com credencial de teste
- Webhook ativa plano no banco
- Upload bloqueado se limite de modelos atingido
- Downgrade preserva dados, bloqueia novas entradas

### S05 · Frontend: Onboarding e dashboard
- Usuário novo faz onboarding em < 3 cliques
- Dashboard lista projetos com status
- Upload com barra de progresso
- Empty state claro para projeto sem modelo

### S06 · Deploy, CI e observabilidade
- Deploy automático em push na main
- Health check responde em < 200ms
- Erros 5xx geram alerta
- Rollback de deploy em < 2 minutos

---

## FASE 2: IFC Core · S07–S12

### S07 · Parser IFC: estrutura base
- Parser lê IFC 2x3 e IFC 4.x sem crash
- Hierarquia espacial extraída como JSON
- Teste com 5 modelos de referência buildingSMART
- Parsing de 50 MB em < 10 segundos

### S08 · Parser IFC: geometria
- Modelo visível no canvas após parse
- Cada IfcProduct vira mesh identificável
- FPS estável em modelo de 10.000 elementos
- Nenhum elemento sumindo ou invertido

### S09 · Viewer: navegação e câmera
- Navegação suave em touch e mouse
- Clique seleciona elemento e destaca
- Preset de câmera reorienta em < 300ms
- Reset de câmera reseta corretamente

### S10 · Viewer: filtros e visibilidade
- Toggle por disciplina oculta/mostra em < 100ms
- Corte transversal navegável
- Isolamento de pavimento funciona
- Visibilidade não afeta outros usuários

### S11 · Processamento assíncrono + observabilidade IFC
- Upload retorna 202 imediatamente
- Status polling informa progresso em tempo real
- Modelo > 200 MB processa sem timeout
- Falha no parse notifica usuário com erro claro
- Logs estruturados por etapa de parsing (header, geometria, propriedades)
- Métrica de tempo por etapa rastreada
- Falhas identificam modelo e etapa exata

### S12 ★ · Primeiro cenário salvo
- Criar cenário a partir de modelo base
- Alternar A↔B muda estado do viewer
- Cenários persistem entre sessões
- Primeiro usuário real consegue usar sem instrução

---

## FASE 3: Metadados BIM · S13–S17

### S13 · Extração de propriedades IFC
- Clique em elemento abre painel de props
- PropertySets customizados aparecem corretamente
- Busca por nome de propriedade filtra elementos
- Props exportáveis como CSV

### S14 · Classificação e tipos de elementos
- Elementos coloridos por tipo automaticamente
- Categorias editáveis por projeto
- Mapeamento customizável por modelo
- Legenda visível no viewer

### S15 · Busca BIM
- Busca por GUID retorna elemento correto
- Busca por nome com resultado parcial funciona
- Busca por PropertySet e valor filtra elementos
- Resultado em < 500ms em modelos de 50.000 elementos

### S16 · Anotações e comentários em elementos
- Comentário ancorado em elemento específico
- Thread com replies e @menção
- Email de notificação em < 1 minuto
- Comentário visível como marcador no viewer

### S17 · Compartilhamento e permissões
- Link público abre viewer sem autenticação
- Viewer público não exibe propriedades sensíveis
- Revogação de link funciona imediatamente
- Permissão por papel funciona

---

## FASE 4: 5D BIM · S18–S24

### S18 ★ · Primeira comparação visual de cenários
- Split-view A|B sincroniza câmera
- Elementos diferentes entre cenários destacados
- Comparação exportável como imagem
- Funciona com modelos de tamanhos diferentes

### S19 · Modelo de dados de custos
- CostItem tem código, descrição, unidade, preço unitário
- CostTable agrupa itens por projeto
- ElementCostLink vincula GUID IFC a CostItem + quantidade
- Migration reversível

### S20 · Takeoff automático de quantitativos
- Tabela de quantitativos gerada em < 30s
- Agrupamento por tipo e pavimento
- Exportação para XLSX
- Desvio < 2% vs quantitativo manual de referência

### S21 · Importação de tabela SINAPI
- Upload de planilha SINAPI importa sem erro
- Busca por código ou descrição retorna < 500ms
- Vínculo salvo por projeto
- Atualização de base não quebra vínculos existentes

### S22 · Engine de cálculo 5D
- Custo recalculado em mudança de preço em < 5s
- Breakdown por nível de hierarquia IFC
- Curva de custo acumulado gerada
- Exportação de memória de cálculo

### S23 · Performance e cache 5D
- Cálculo de custo em modelo de 50.000 elementos em < 10s
- Cache de quantitativos invalidado apenas em mudança de modelo
- Consumo de memória estável em sessões longas
- Sem regressão de FPS no viewer durante cálculo em background

### S24 · Painel de custos no viewer
- Heatmap renderiza sem queda de FPS
- Clique em elemento abre ficha de custo
- Painel de breakdown atualizável em tempo real
- Usuário leigo entende o painel sem treinamento

---

## FASE 5: 4D BIM · S25–S28

### S25 · Modelo de dados 4D: atividades
- Import de CSV com colunas: id, nome, início, fim, predecessores
- Vínculo atividade ↔ GUID IFC salvo
- API retorna schedule completo de um projeto
- Import de MS Project .xml funcionando

### S26 ★ · Primeira comparação temporal de cenários
- Slider de data anima construção
- Comparação A|B mostra diferença de prazo
- Data de conclusão calculada por cenário
- Atraso de atividade propaga para sucessoras

### S27 · Animação 4D no viewer
- Animação em > 30 FPS em modelo médio
- 3 estados de cor distintos e customizáveis
- Play a 1x, 2x, 5x, 10x velocidade
- Seek para data específica em < 1s

### S28 · Importação MS Project / Primavera
- Import de .mpp sem plugin adicional
- Mapeamento automático com confiança > 70%
- Revisão manual de vínculos não mapeados
- Reimport atualiza cronograma sem perder vínculos

---

## FASE 6: Cenários Avançados + Release · S29–S32

### S29 · Motor de cenários: branching completo
- Clone de cenário preserva todos os dados
- Edição de cronograma por cenário sem afetar base
- Histórico com rollback
- Máximo 10 cenários ativos por projeto no plano Pro

### S30 ★ · Primeira comparação financeira de cenários
- Tabela com N cenários lado a lado
- Delta de custo e prazo calculado automaticamente
- Export PDF para reunião com cliente
- Cenário recomendado destacado

### S31 · Presentation Studio
- Salvar câmera em ponto do timeline
- Percurso reproduzível sem interação
- Link de apresentação abre em browser sem login
- Export para PDF com screenshots automáticos

### S32 · Release Candidate: hardening
- 100 usuários simultâneos sem degradação
- Penetration test básico sem vulnerabilidades críticas
- API docs publicada em /docs
- SLA de 99.5% comprovado em 2 semanas de staging

---

## Regras para agentes (Claude Code, Copilot, Cursor)

**Quebrar um sprint quando:**
- Possuir mais de um objetivo principal
- Exigir áreas técnicas muito diferentes (infra + feature + UI ao mesmo tempo)
- Não puder ser demonstrado em menos de 5 minutos

**Unir sprints quando:**
- Uma entrega depende totalmente da outra
- Os critérios de aceite não fazem sentido isoladamente
- O usuário final não percebe valor entre as duas entregas

**Prioridade absoluta:** qualquer sprint que bloqueia um marco ★ tem prioridade sobre tudo.
