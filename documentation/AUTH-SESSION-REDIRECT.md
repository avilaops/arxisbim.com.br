# Sessão expirada • retorno ao Auth oficial

Correção publicada em 16/11/2026 após relato no Orçamento 5D. Antes, o cliente
BIM convertia 401 em mensagem, deixando a tela com aparência de sessão ativa.
As rotas React protegidas também não tinham um gate comum de expiração.

## Comportamento

• Sessão ausente, JWT expirado na entrada ou 401 de uma requisição protegida
  encaminham ao endpoint OIDC existente `/api/v1/auth/avilaops`.
• Token, refresh token e usuário rejeitados são removidos. Projeto e preferências
  não são apagados pela expiração.
• A página de retorno é guardada em sessionStorage da aba. Após o callback do
  Auth, o aplicativo retoma seu caminho/query internos; o fallback é `/dashboard`.
• Destinos externos, callback/login como retorno e credenciais na query são
  recusados/removidos. O fragmento não é guardado.
• 401 simultâneos geram uma única navegação. 403 e falhas de rede mantêm seu
  tratamento local; não são confundidos com expiração.
• O callback consome o retorno apenas uma vez, inclusive com React StrictMode.
  Falha ao confirmar a identidade no callback permanece como erro acionável,
  evitando reautenticação automática em ciclo.
• Logout explícito remove também o retorno pendente.

O estado visual reutiliza `core/auth/session.ts`. A assinatura e a autorização
continuam sendo verificadas no backend. Não foi ativado o cliente OAuth legado
nem alterado o Auth oficial ou o banco em `applications`.

`sessionFetch` centraliza o tratamento nas chamadas do frontend React ativo:
BIM/4D/5D e PDFs, viewer/downloads/comparação, dashboard, conta e administração.
O endpoint público de planos continua usando fetch comum. Não há interceptor
global nem alteração das chamadas de entrada/callback.

## Verificação

Oito testes novos cobrem ausência, concorrência, 403, rede, retorno seguro,
limpeza, rotas protegidas e callback em StrictMode/rejeitado. Com as regressões
de orçamento, planejamento, matriz e contexto, 32 testes focados passaram.
Checagem de tipos, build e lint dos arquivos centrais passaram sem erros;
o callback mantém avisos preexistentes de tipagem e dependência de efeito.

Prova: `deploy/bench/prove-session-redirect.cjs`, usando a conta sintética comum
e OIDC real. O teste altera somente seu próprio navegador: injeta um token de
teste deliberadamente expirado/inválido e intercepta respostas 401/403 para
reproduzir rejeição/permissão. Nenhum token artificial foi aceito como login;
o acesso recuperado depende do Auth oficial e da identidade real da fixture.

`provas/auth-session/resultado.json` registra quatro entradas oficiais: a
inicial, recuperação do token expirado, recuperação do 401 e sessão ausente no
planejamento. O 403 não acrescenta entrada. O orçamento retoma projeto/cenário/
modelo e o planejamento retoma o projeto. Imagens estão na mesma pasta.

Publicação somente do frontend, com saúde verificada e versão anterior
preservada para rollback. Credenciais e estado de navegador ficam fora do Git.
