# Importações 4D e relatórios 5D

## Planejamento 4D

Em **Planejamento 4D**, selecione projeto e cenário e abra **Importar cronograma • CSV, XML ou XER**. Escolha o arquivo, informe o nome e gere a prévia. Confira atividades novas, atualizadas e mantidas; só depois marque a confirmação e aplique a importação.

O arquivo pode ter até 1 MB e 4.000 atividades. CSV usa UTF-8 e vírgula ou ponto e vírgula, com aspas para campos que contêm separadores. Cabeçalho de exemplo:

```csv
id,name,start,end,predecessors,wbs
1,Fundações,2026-12-01,2026-12-05,,1.1
2,Estrutura,2026-12-06,2026-12-15,1FS+2d,1.2
```

Datas são `AAAA-MM-DD`. Predecessoras suportam FS, SS, FF e SF, com defasagem de -365 a 365 dias; múltiplas relações usam ponto e vírgula dentro do campo. Todas as predecessoras devem existir no arquivo. IDs precisam ser únicos e estáveis entre importações.

XML usa o formato do MS Project, incluindo namespaces, entidades e CDATA. Documentos malformados, relações inválidas, IDs repetidos, datas impossíveis e ciclos são recusados. Tarefas resumo do MS Project são excluídas; relações que apontam para elas precisam ser corrigidas no arquivo.

Primavera usa XER com tabelas TASK e TASKPRED. As datas civis são mantidas, sem conversão de fuso horário. Calendários de trabalho, feriados, recursos e durações por hora não são importados. O CPM existente usa dias corridos; defasagens XML/XER usam equivalência de oito horas por dia, arredondadas para dias inteiros e apresentadas na prévia.

### Reimportação e preservação

A importação atualiza o cronograma mais recente do cenário. A correspondência utiliza exclusivamente o ID externo • nunca o nome. Atividades correspondentes mantêm UUID, vínculos IFC, etapa do Kanban, avanço e datas reais. Nome, datas planejadas, WBS, ordem e predecessoras das atividades incluídas no arquivo são atualizados.

Atividades ausentes são mantidas com seus vínculos. Atividades manuais sem ID externo permanecem e não são associadas automaticamente a uma linha importada. O avanço do arquivo é ignorado e novas atividades começam com zero de avanço real.

A prévia não grava dados. A aplicação compara uma revisão do cronograma e bloqueia cenário, cronograma, atividades e predecessoras existentes em transação. Uma edição concorrente invalida a prévia com HTTP 409. Papéis de leitura não podem aplicar arquivos; projeto e cenário precisam pertencer à organização autenticada.

Rotas:

• `POST /api/v1/projects/:projectId/planning-import/preview`
• `POST /api/v1/projects/:projectId/planning-import/apply`

## Orçamento 5D

O painel **Quantitativos por pavimento • memória de custos** apresenta o resumo completo da versão IFC vinculada ao cenário. As medições ausentes continuam sem valor; não são convertidas em zero. Pavimentos sem nome usam o identificador do IFC; elementos sem associação aparecem em **Sem pavimento**.

**Ver memória dos custos por serviço** detalha GlobalId, código, descrição, tabela, quantidade, unidade, preço efetivo e total. Um mesmo elemento pode ter vários serviços, portanto o número de vínculos é diferente da quantidade de elementos únicos. A tela pagina os serviços em blocos de 100.

**Exportar quantitativos e custos • XLSX** inclui quatro abas:

• Resumo • cenário, versão IFC, data UTC, cobertura e critério de cálculo.
• Quantitativos • todos os elementos e suas medições, independentemente da página da tela.
• Por pavimento • medições agrupadas por pavimento e tipo IFC.
• Memória de custos • todos os serviços vinculados, com quantidade × preço efetivo e total.

O preço efetivo considera sobrescrita quando existente. Cada vínculo é arredondado em duas casas com o mesmo critério HALF_UP da calculadora. O total soma esses vínculos. Valores decimais são exportados em texto para preservar precisão e medições ausentes ficam vazias. O total abrange apenas itens orçados, sem assumir cobertura completa da obra.

O relatório lê a versão IFC depois de obter o lock de custos do projeto, compartilhado com o preparo de modelos e edição de preços. Não altera preços, quantitativos, histórico ou avanço. A exportação aceita até 100 mil elementos e 100 mil vínculos; acima disso retorna erro explícito, sem truncar a planilha.

Rotas:

• `GET /api/v1/scenarios/:scenarioId/budget-report?offset=0`
• `GET /api/v1/scenarios/:scenarioId/budget-report.xlsx`

## Verificação

• 13 testes unitários de parsers e rotas • formatos válidos, dependências inválidas, XML truncado, fuso XER, permissões e identificação de recursos.
• 2 testes de integração 4D em PostgreSQL descartável • preservação de IDs/IFC/Kanban/avanço, organizações isoladas, duas importações concorrentes e edição manual bloqueada seguida de HTTP 409.
• 2 testes de integração 5D • 1.002 elementos, pavimento de ID zero, medições ausentes, dois serviços do mesmo elemento, arredondamento, exportação integral, isolamento de organização e recusa de versão IFC pertencente a outro projeto.
• 25 testes de interface das páginas 4D/5D, Kanban, importação e relatório.
• Typecheck de frontend e backend, build do frontend e lint dos componentes/serviços novos.
• Revisão independente dos contratos, concorrência e parsing; quatro problemas encontrados e corrigidos antes da publicação.

Prova de navegador: `deploy/bench/prove-import-reports.cjs`. A conta sintética e o estado do navegador ficam fora do Git; `ARXIS_ACCEPTANCE_PRIVATE_DIR` aponta para seu diretório privado. O roteiro usa o login oficial, cria um cenário exclusivo de teste, importa os três formatos, reimporta preservando vínculos e confere o XLSX baixado.

Publicado em 16/11/2026 e comprovado em `documentation/provas/importacoes-relatorios/`. O roteiro passou pelos três formatos e pelo erro de validação, preservou IDs e vínculos, recarregou os dados e conferiu as quatro abas do XLSX. O arquivo da conta sintética contém 82 elementos e 13 vínculos de custo, somando R$ 1.631,50. A prova foi repetida após melhorar a largura das tabelas no celular, com rolagem interna e sem overflow da página. API e frontend saudáveis, sem migração, com imagem e arquivos anteriores preservados para rollback.

## Continuidade do roadmap

Esta etapa não conclui a importação SINAPI na interface, curva acumulada de custos ou visualização de custos no 3D. Também permanecem as provas de precisão contra referência manual e desempenho com 50 mil elementos. O Kanban continua restrito à organização do planejamento, conforme a escolha do usuário.
