# Matriz financeira S30 • plano de implementação

**Objetivo:** comparar de 2 a 20 cenários do mesmo projeto em uma única matriz,
com referência explícita, custo, prazo, deltas, cobertura, ranking e PDF.
**Arquitetura:** manter React/Fastify/PostgreSQL e cálculo decimal existentes.
Rotas próprias por projeto; snapshot transacional consistente e lock de custos
por projeto. Sem migração, novos provedores ou mudança no Auth/banco.

## Decisões

• Evoluir a comparação financeira para N cenários fecha a lacuna explícita do
  S30. Propriedades do viewer e importações ficam para outra entrega.
• A referência começa no cenário aberto e pode ser trocada entre os selecionados.
• Cenários sem orçamento/preparo/atividades aparecem com pendências e ficam fora
  do ranking; ausência de dados nunca recebe custo/prazo zero como vantagem.
• Exibir elementos únicos orçados sobre elementos do modelo e contagem de
  vínculos. Não confundir cobertura física com completude financeira.
• Ranking usa 60% custo e 40% prazo entre cenários aptos. Empates permanecem
  empatados; não recomendar um vencedor arbitrário. Avisar cobertura diferente.
• Validar todo o conjunto antes de calcular e novamente na transação: tenant,
  projeto, cenários ativos, UUIDs, duplicações e referência incluída.
• PDF gerado no servidor a partir da mesma matriz, com tabela e limitações.
• Seleção/referência refletidas na URL para sobreviver a reload. Comparação
  explícita por botão; alteração de seleção limpa resultados/exportação antigos.

## Execução

- [x] 1 • Serviço/rotas/PDF e testes de conjunto, deltas, ranking, ausências,
  empates, precisão e autorização; contrato tipado compartilhado pelo cliente.
- [x] 2 • Componente React de matriz integrado no orçamento, seleção acessível,
  referência, avisos e download. Testes focados de comportamento.
- [x] 3 • Revisão, tipos, testes e builds. Publicar API/frontend com rollback.
- [x] 4 • Provar pelo Auth oficial com conta sintética e três cenários, incluindo
  um incompleto; reload, troca de referência, PDF e celular. Atualizar roadmap.

## Registro

Usuário autorizou continuar as implementações. Escopo escolhido pela lacuna do
roadmap atual. Implementação inline com revisão final independente conforme
`superpowers:executing-plans`. Dados humanos não são alterados pelas provas.

Concluído em 16/11/2026. Testes: sete unitários backend, integração PostgreSQL
real e 24 testes frontend/regressões. Revisão fechou preservação de query e
UUID canônico; a prova de navegador encontrou a disputa de carga inicial,
reproduzida por teste e corrigida antes da prova final. API/frontend publicados
com saúde verificada e rollback preservado. Evidências em
`documentation/provas/matriz-financeira`; exportação confere a revisão dos dados.
