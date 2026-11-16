# SINAPI e curva S • Orçamento 5D

## Consulta e seleção SINAPI

Em **Orçamento 5D**, crie ou selecione a tabela de preços do cenário. Pesquise
por código ou descrição, com filtros opcionais por UF e mês de referência.
Escolha preço com ou sem desoneração e adicione o serviço.

O catálogo é compartilhado e abastecido por administradores pela importação
XLSX existente. Esta tela é somente leitura para o catálogo. Cada item adicionado
à tabela copia código, descrição, unidade, preço escolhido e guarda `sinapi_item_id`.
As notas do item registram UF, mês e base de preço. Alterações no catálogo não
atualizam silenciosamente os preços do cenário; edite o item da tabela se quiser
ajustá-lo. A mesma referência não pode ser adicionada duas vezes à mesma tabela.

Rotas usadas:

- `GET /api/v1/sinapi/versions`
- `GET /api/v1/sinapi/search?q=...&state=SP&month=AAAA-MM-DD`
- `POST /api/v1/scenarios/:scenarioId/sinapi-items`

O backend valida organização, projeto, cenário e tabela antes de persistir o
snapshot, e serializa a criação com as demais mutações de custo do projeto.
Medidas IFC só podem ser precificadas quando as unidades forem compatíveis.

## Curva S de custo planejado

A curva S aparece no Orçamento 5D para o cenário ativo. O servidor associa os
custos dos elementos às atividades do cronograma pelo GlobalId do IFC e calcula
o calendário CPM existente. Cada custo ligado a uma atividade é dividido em
parcelas iguais pelos dias planejados da atividade. Quando um elemento está
ligado a mais de uma atividade, seu custo é dividido igualmente entre elas.
Custos sem atividade correspondente são distribuídos linearmente entre o início
e o término do cronograma. Os valores diários são agregados por mês e somados
acumuladamente.

Os centavos restantes do arredondamento são atribuídos aos meses com maior
fração decimal, de forma determinística, para que o último acumulado feche com
o valor total dos serviços precificados.

O gráfico e a tabela mensal são uma projeção financeira planejada. Não registram
avanço físico, custo realizado, produtividade, responsáveis, feriados ou
calendários de turno. Sem cronograma, atividades ou custos vinculados, a tela
explica o que precisa ser preenchido. A exportação financeira continua separada.

## Verificação da implementação

Checagens estáticas e builds de produção de backend e frontend foram executados
na implementação. A compilação conserva avisos preexistentes de CSS `:global` na
landing page e do tamanho dos bundles do visualizador.
