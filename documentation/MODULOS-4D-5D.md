# Planejamento 4D e Orçamento 5D

Entrega de 14/11/2026 • módulos próprios no menu e atalhos no dashboard.

Publicado em `https://app.arxisbim.com.br/planejamento` e
`https://app.arxisbim.com.br/orcamento`. API e frontend em `apps-noclient`, banco
em `applications` via WireGuard e entrada pelo Auth oficial da Avila.

## Uso

1. Crie um projeto no visualizador, envie um IFC e salve os cenários.
2. Em `/planejamento`, selecione projeto, cenário e modelo. Crie o cronograma,
   cadastre atividades e predecessoras. O Gantt utiliza as datas calculadas pelo
   CPM. O acesso à simulação abre o modelo e o cenário selecionados; vincule
   elementos às atividades no visualizador para usar a régua temporal.
3. Em `/orcamento`, prepare os quantitativos do IFC. A extração ocorre no
   servidor e registra a versão usada pelo cenário. Confira áreas, volumes,
   comprimentos e contagem por categoria.
4. Crie a tabela do cenário, cadastre serviços com unidade e preço e aplique
   cada serviço à categoria IFC correspondente. Medidas ausentes são informadas
   e não recebem quantidades inventadas. `un` utiliza uma unidade por elemento.
5. Precifique outra alternativa e compare os custos e os prazos. Os dois
   cenários precisam de preços e cronogramas com atividades. Exporte o PDF.

Os preços são fornecidos pelo usuário. Esta entrega não importa uma tabela
SINAPI oficial. O total corresponde aos vínculos efetivamente orçados e não
representa automaticamente o custo completo da obra. Um elemento pode receber
vários serviços; por isso o indicador conta vínculos de custo.

## Persistência e consistência

O preparo liga os uploads antigos de `ifc_models` à hierarquia versionada
`models` → `model_versions` → `element_properties`. Repetir o preparo não duplica
elementos. Versões prontas são reutilizadas, incluindo registros antigos com
prefixo de storage; preparar uma versão histórica preserva a versão corrente
do modelo. GUIDs vazios ou repetidos são recusados para evitar cobrança ambígua.

Os quantitativos retornam `modelVersionId` e `ifcModelId`. A tela informa origem
divergente e exige preparar o IFC selecionado antes de aplicar preços.
Trocar a versão do cenário remove vínculos medidos na versão anterior e invalida
seus totais; a interface pede confirmação quando já existem preços vinculados.

Preços e quantidades são strings decimais. O cálculo usa `Decimal` com
arredondamento monetário `ROUND_HALF_UP`. Cálculo, histórico e publicação do
cache compartilham transação e lock por projeto com as mutações de custos e o
preparo IFC. Alterar uma tabela compartilhada invalida os cenários do projeto
na mesma transação. Leitura de arquivo e processamento WASM ocorrem em workers
antes do lock de persistência.

As rotas verificam tenant e a relação projeto/cenário/modelo/tabela/item. O
arquivo é lido pelo storage existente, com chave restrita; o cliente não fornece
URL externa ou caminho do servidor.

## Verificação

• Frontend: 26 testes dos módulos/contexto/preços e 16 testes de estado 4D.
• Custos: 12 testes, incluindo PostgreSQL descartável, isolamento, cache,
  idempotência, identidade IFC e concorrência observada por `pg_locks`.
• IFC: 9 testes unitários e 10 de integração com banco descartável e fixture
  IFC4 real de 82 elementos.
• Checagem de tipos de frontend e backend e builds de produção.
• Revisão independente dos contratos, isolamento, versões e totais.

As suítes PostgreSQL não carregam `.env`. Exigem um banco de teste descartável
explicitamente selecionado: `COSTS_5D_TEST_DATABASE_URL` para custos e
`TEST_DATABASE_URL` para integração IFC. Execute `node build.mjs` antes dos
testes IFC para gerar os workers em `dist`.

Prova reproduzível do navegador: `deploy/bench/prove-modules-4d-5d.cjs`, com
`ARXIS_ACCEPTANCE_PRIVATE_DIR` apontando para a conta sintética e seu manifesto
de recursos. O script entra pelo OIDC oficial, sem injetar tokens, e altera
somente os recursos dessa conta. Credenciais e estado do navegador ficam fora
do Git. Resultados e imagens são gravados em `documentation/provas/modulos-4d-5d`.

A prova publicada utilizou a fixture IFC4 de 82 elementos. Os dois cenários
orçaram 13 paredes em `un`, a R$ 125,50 e R$ 175,50: totais de R$ 1.631,50 e
R$ 2.281,50, preservados após reload. A comparação mostrou delta de R$ 650,00 e
dez dias, com recomendação e PDF baixado. Áreas, volumes e comprimentos reais
também aparecem na tabela de quantitativos; os preços desta prova são
exclusivamente demonstrativos da conta sintética.

Publicação com checagem de tipos dentro da imagem, saúde de API/banco e
preservação da imagem e do frontend anteriores para rollback. A checagem de
saúde da atualização de layout precisou aguardar o Caddy terminar de iniciar;
a primeira tentativa retornou automaticamente ao frontend anterior, e a
segunda foi validada após a espera. Nenhuma migração nova foi necessária.

## Limites desta entrega

Desde 16/11/2026, a [matriz S30](MATRIZ-FINANCEIRA-S30.md) compara de 2 a 20
alternativas, além da comparação A/B anterior; pesos de 60% para custo e
40% para prazo. A cobertura dos itens orçados precisa ser considerada antes de
usar a recomendação. Importação MS Project/Primavera, histórico completo de
branching, Presentation Studio e critérios de carga/SLA do release continuam
fora desta entrega. O painel de propriedades do visualizador não foi concluído
por estes módulos.
