# S30 • Matriz financeira de cenários

Publicado em 16/11/2026 no módulo Orçamento 5D. A matriz compara de 2 a 20
cenários do mesmo projeto, com referência explícita, custo, duração, conclusão,
diferenças de custo/prazo, cobertura física e posição. A comparação A/B anterior
permanece disponível.

## Fluxo

Abra `/orcamento`, selecione o projeto e use **Matriz de custo e prazo**.
Marque os cenários, escolha a referência e clique **Comparar matriz**. A seleção
e a referência ficam na URL, preservando projeto/cenário/modelo e sobrevivendo
à recarga. Alterar a seleção limpa o resultado e a exportação anteriores.

Cenários sem modelo preparado, preços ou cronograma com atividades mostram
pendências e ficam fora do ranking. Os deltas desconhecidos são indicados como
pendentes, sem substituir ausências por zero. Com pelo menos duas alternativas
aptas, o ranking usa 60% custo e 40% prazo. Empates na pontuação, calculada com
duas casas, permanecem empatados.

Cobertura significa elementos únicos com preço sobre elementos do modelo;
vários serviços sobre o mesmo elemento contam como vários vínculos. Isso não
comprova completude financeira. A matriz avisa sobre cobertura parcial ou
diferente e identifica a recomendação como relativa aos itens orçados.

## API e consistência

• `POST /api/v1/projects/:projectId/financial-matrix`
  recebe `{scenarioIds:string[],baselineId:string}`.
• A resposta contém as linhas, avisos, recomendação, pesos, horário e `revision`.
• `POST /api/v1/projects/:projectId/financial-matrix/pdf`
  recebe o mesmo conjunto mais `revision`. Se os dados mudaram, retorna 409
  solicitando nova comparação; não exporta silenciosamente valores diferentes.

UUIDs são normalizados antes da deduplicação. Todo o conjunto precisa ser do
tenant/projeto autorizado e estar ativo; nenhum resultado parcial é devolvido
quando há um membro fora do escopo. A transação utiliza snapshot repetível,
lock de custos por projeto e cálculo decimal existente. Um conflito de escrita
é repetido uma vez e, se persistir, resulta em 409. Não houve migração de banco.

A matriz só fica disponível depois da carga inicial do orçamento. Isso impede
que o término dessa carga remonte o componente e descarte uma comparação já
solicitada. Revisões posteriores dos preços limpam a matriz anterior.

## Verificação

• Sete testes unitários de cálculo, ausência de dados, empate, cobertura,
  precisão, entradas, PDF real, revisão desatualizada e UUID maiúsculo.
• Integração PostgreSQL descartável: três cenários, valores/deltas/CPM reais,
  estabilidade da revisão, troca de referência/preço e rejeição de outro tenant,
  outro projeto e cenário excluído. Fixtures identificadas por UUID e removidas
  ao final; nenhuma limpeza global ou acesso ao banco de produção nos testes.
• Vinte e quatro testes frontend focados/regressões, incluindo URL, contexto,
  seleção/referência, pendências, falhas, preços e espera da carga inicial.
• Checagens de tipos, lint dos arquivos alterados e builds. A imagem da API
  também executou a checagem de tipos antes da publicação.
• Revisão independente identificou conflito de parâmetros da URL e UUIDs em
  maiúsculas; ambos foram reproduzidos por testes e corrigidos.

Prova publicada em `provas/matriz-financeira/resultado.json`: entrada pelo Auth
oficial com conta sintética comum; A R$ 1.631,50/14 dias, B R$ 2.281,50/24 dias,
delta R$ 650,00/dez dias; C incompleto excluído do ranking. Referência B e seleção
preservadas após reload. PDF conferido por extração de texto e renderização;
celular de 390 px com rolagem interna da tabela e acesso à exportação. Sem
erros de página ou requisições nessa prova.

Reprodução: `deploy/bench/prove-financial-matrix.cjs`, com
`ARXIS_ACCEPTANCE_PRIVATE_DIR` e, quando necessário, `ARXIS_PLAYWRIGHT_MODULE`.
Os arquivos privados de credenciais/estado permanecem fora do Git. A criação
do terceiro cenário é preparação da fixture sintética; a comparação, seleção,
troca de referência e download acontecem pela interface.

API/frontend continuam em `apps-noclient`, banco em `applications` e login no
Auth oficial da Avila. Imagem e frontend anteriores foram preservados para
rollback. Propriedades no viewer, importação MS Project/Primavera, branching
completo e Presentation Studio continuam fora desta entrega.
