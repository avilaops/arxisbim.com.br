# Plano • SINAPI e curva S no orçamento 5D

## Objetivo

Integrar a consulta ao catálogo SINAPI no fluxo de preços do cenário, mantendo no item criado a origem, UF, mês e base de preço. Mostrar a curva S acumulada do cronograma e custos vinculados como uma projeção de planejamento, sem registrar execução real.

## Escopo

1. Expor versões e busca SINAPI com ambas as bases de preço e metadados da referência.
2. Permitir adicionar item SINAPI à tabela ativa do cenário com cópia imutável do preço escolhido e vínculo `sinapi_item_id`, validando tenant, projeto, cenário e tabela.
3. Apresentar curva mensal e acumulada no Orçamento 5D a partir do cálculo existente, esclarecendo rateio linear por duração, divisão entre atividades vinculadas e distribuição de custos sem vínculo ao longo do cronograma.
4. Acrescentar testes focados, documentação da metodologia e atualizar roadmap apenas para esta entrega.

## Verificação

- Typecheck e build de backend e frontend.
- Revisão do fluxo de autenticação, escopo de tenant/projeto/cenário e renderização da curva.

## Restrições

- O catálogo é global e sua carga continua restrita à administração; a interface de obra somente consulta.
- A curva é planejada, não mede avanço, custo realizado, mão de obra nem calendário de feriados.
- Não recalcular o preço SINAPI automaticamente após a cópia; o item do orçamento guarda um snapshot editável.
