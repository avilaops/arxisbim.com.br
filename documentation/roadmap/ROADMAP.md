# ROADMAP: ArxisVR

**Última atualização:** 14/11/2026 • S12/S18 revalidados e S26 ★ atingido.
**Versão:** 3.0, 32 sprints atômicos
**Status:** três dos quatro marcos funcionais comprovados. O backend continua
à frente da interface em propriedades, quantitativos e custos. A auditoria de
02/09 é histórica; a situação atual está nas provas por marco.

**S12, S18 e S26 atingidos**, com prova no navegador da aplicação publicada.
S12/S18 foram revalidados em 14/11, e o S26 demonstrou cronogramas distintos,
propagação, diferença de dez dias, estado visual por data, reload e celular.
Evidência: `documentation/S26-PROVA-BROWSER.md`.

Próxima frente: tornar propriedades e quantitativos utilizáveis na interface,
seguida da entrada de custos por cenário e do marco **S30 ★**. Não há percentual
global inferido da contagem de marcos.

**Infra atual:** app e API em Docker no `apps-noclient`; banco `arxisvr` no
PostgreSQL 18 de `applications`, via WireGuard; autenticação pelo Auth oficial.
O Auth continua hospedado no Render. A decisão de setembro sobre o antigo
orquestrador não descreve esta topologia. Ver `documentation/REATIVACAO-2026-11-14.md`.

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

> **Três dos quatro marcos comprovados:** S12 e S18 revalidados em 14/11/2026;
> S26 atingido nesta mesma data. Falta S30. Marco só fecha com fluxo real na
> aplicação publicada, incluindo recarga; existência de backend não basta.

| Marco | Sprint | Valida | Estado | Por quê |
|---|---|---|---|---|
| ★ Primeiro cenário salvo | **S12** | "Usuários querem comparar alternativas?" | ✅ **ATINGIDO 03/09/2026** | Provado em browser real na aplicação publicada, 9/9 passos: cria cenário, guarda a câmera, um segundo cenário guarda câmera **diferente**, sobrevivem ao reload e a troca A↔B reaplica o estado. Evidência: `documentation/S12-PROVA-BROWSER.md`. |
| ★ Primeira comparação visual | **S18** | "Side-by-side resolve a decisão visual?" | ✅ **ATINGIDO 09/09/2026** (split em 04/09; estado real em 09/09) | Provado em browser real: cenários que diferem em **visibilidade por categoria IFC** (não só câmera), split A\|B com o que só um lado mostra destacado, legenda vinda do estado, câmera sincronizada, PNG exportado com a diferença, reload mantém. 28 passos em três rodadas. Evidência: `documentation/S18-PROVA-BROWSER.md`. |
| ★ Primeira comparação temporal | **S26** | "Diferença de prazo entre cenários importa?" | ✅ **ATINGIDO 14/11/2026** | Dois cronogramas criados na tela, categorias IFC vinculadas, predecessoras propagadas, dez dias de diferença, régua alterando a imagem de cada cenário, reload e celular. Ver `documentation/S26-PROVA-BROWSER.md`. |
| ★ Primeira comparação financeira | **S30** | "Tabela custo+prazo fecha venda?" | ☐ **não atingido** | Há rotas de comparação financeira e PDF no backend. Faltam entrada de custos utilizável e integração à tela, seguidas da prova em produção. |

**O viewer vivo** oferece projetos, upload IFC, cenários com câmera e
visibilidade, comparação visual e cronograma 4D por cenário. O painel de
informações ainda é um estado vazio; propriedades e custos não estão concluídos.

---

## Definition of Done: Global

Todo sprint só é concluído quando:

- [ ] **A funcionalidade é acionável por um fluxo que o usuário alcança.**
      Este critério é o primeiro porque foi o único que faltava: em 02/09/2026
      sete sprints tinham backend pronto e nenhum chegava ao usuário.
      Entrar no bundle é **necessário, não suficiente**: dá para importar um
      módulo em qualquer canto e ele passa a compilar sem que ninguém consiga
      chegar nele. A prova é o caminho inteiro:

      ```
      rota/tela → ação do usuário → API → persistência → retorno visual
      ```

- [ ] Build passa
- [ ] Lint passa
- [ ] Testes passam
- [ ] Sem regressões conhecidas em sprints anteriores
- [ ] Demo de até 5 minutos disponível, feita na aplicação publicada
- [ ] **Para sprint ★: teste em browser real**, na aplicação publicada, com
      recarga de página. Teste de API não fecha um marco.

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
