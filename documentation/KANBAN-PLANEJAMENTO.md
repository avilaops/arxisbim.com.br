# Kanban • organização do planejamento

Publicado em 16/11/2026 em `/planejamento`. O usuário escolheu organização por
etapas, sem registrar execução real. Gantt e Kanban exibem as mesmas atividades
do cronograma selecionado; não há uma segunda lista de tarefas.

## Uso

Clique em **Kanban** ao lado de Gantt. As etapas iniciais são Sem etapa,
Preparação, Fundações, Estrutura e Acabamentos. Mova cartões por arraste ou pelo
seletor de etapa, inclusive no celular. É possível adicionar, renomear, ordenar
e remover etapas, até o limite de 12. Sem etapa é fixa; remover outra etapa
devolve seus cartões para ela.

As datas planejadas/CPM, predecessoras e contagem de elementos IFC aparecem nos
cartões. Mover um cartão organiza o planejamento e não altera essas informações,
datas reais ou percentual de conclusão. O Gantt continua sendo a visão das
datas/dependências. A escolha Gantt/Kanban fica na URL e sobrevive à recarga.

## Persistência e autorização

`GET/PATCH /api/v1/schedules/:scheduleId/planning-board` lê/altera o quadro.
PATCH recebe revisão e uma operação: mover atividade ou atualizar etapas.
As etapas e atribuições ficam em metadata do cenário, separadas por cronograma;
nenhuma migração foi necessária. São armazenadas somente atribuições explícitas.

O servidor valida tenant, projeto, cenário ativo e cronograma. Atividade de
outro cronograma é recusada. Viewer pode ler, mas não editar; a interface
desabilita edição/arraste e o backend retorna 403 para escrita. Revisão otimista
mais lock do cenário recusam alterações concorrentes obsoletas com 409.

Salvar câmera/visibilidade pelo endpoint genérico de cenário preserva o quadro
atual, inclusive quando o cliente envia metadata antiga. Esse endpoint não pode
sobrescrever o recurso dedicado de Kanban. Atividades excluídas não reaparecem
por causa de atribuições antigas.

## Verificação

• Cinco testes backend: distribuição, remoção, validação, referências excluídas
  e permissão de viewer.
• Integração PostgreSQL descartável: persistência, concorrência real, tenant/
  cronograma alheios, metadados do viewer, save genérico e campos de execução
  inalterados. A primeira rodada detectou serialização JSONB incorreta, corrigida
  e revalidada.
• Quatorze testes frontend: quatro do quadro e dez regressões do planejamento.
• Tipos, builds e lint sem erros; o lint mantém aviso heurístico no contador
  de geração de requisições. Revisão independente sem bloqueadores.

Prova publicada em `provas/kanban-planejamento/resultado.json`: OIDC oficial e
conta sintética comum, movimento por seletor e arraste, reload, criação/renomeação/
ordem/remoção de etapa, Gantt preservado, save da câmera sem perda do quadro e
celular de 390 px com rolagem interna. O cronograma completo retornado pela API
foi comparado antes/depois sem diferença; nenhum dado humano foi alterado.
Reprodução: `deploy/bench/prove-planning-kanban.cjs`, com diretório privado de
fixture e módulo Playwright indicados por variáveis de ambiente.

API/frontend publicados com checagem de saúde e rollback preservado. Auth
oficial e banco em `applications` mantidos. Nenhum serviço contratado.

## Pendências dos módulos 4D/5D

O quadro conclui esta organização visual, não os demais critérios do roadmap:

• 4D: integrar importação/reimportação de cronogramas à interface e comprovar
  preservação dos vínculos; validar animação/desempenho em modelos maiores.
  Há rotas de importação CSV/XML/XER no backend; isso não prova o fluxo completo.
• 5D: concluir a interface de importação SINAPI, agrupamento por pavimento e
  exportação XLSX dos quantitativos; expor curva acumulada, memória de cálculo
  e ficha/visualização de custos no viewer.
• Ambos: comprovar precisão dos quantitativos contra referência manual,
  desempenho em modelos de 50 mil elementos e critérios de estabilidade.
  Propriedades no viewer e histórico/rollback de cenários também permanecem
  frentes abertas. Não há percentual global inferido dos marcos concluídos.

Avanço real, responsáveis e orçamento executado não foram implementados por
este Kanban e exigem uma entrega própria se forem incorporados ao produto.
