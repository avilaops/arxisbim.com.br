# Reativação • 14/11/2026

Solicitação: reativar `app.arxisbim.com.br` com o Auth oficial da Avila.

## Diagnóstico

O Caddy de `apps-noclient` (`204.168.249.111`) respondia HTTP 410 com
`Servico desativado.` nos hosts do app e da API. Os containers haviam sido
removidos; `/opt/arxisvr/.env`, o frontend compilado, o banco `arxisvr` e os
volumes continuavam presentes.

O cliente OIDC `arxis` já estava ativo no Auth oficial, associado à aplicação
`arxis`, com retorno exato
`https://api.arxisbim.com.br/api/v1/auth/avilaops/callback`. A credencial do
servidor foi comparada ao hash cadastrado e corresponde. Nenhum segredo foi
alterado. A aplicação estava com login habilitado e situação `no_ar`.

## Execução

• Backup prévio do banco: `/tmp/arxisvr-before-reactivation-20261114.dump`,
  formato custom do PostgreSQL, aproximadamente 6,2 MB.
• API reconstruída a partir do checkout `7f02acd`, com o Dockerfile existente.
  A checagem de tipos e a compilação passaram. O primeiro limite de heap de
  512 MB foi insuficiente; o build passou com 1024 MB.
• Containers `arxisvr-api` e `arxisvr-web` recriados pelo compose existente em
  `/opt/arxisvr`, mantendo banco, volumes e configuração de produção.
• Somente os blocos dos hosts `app.arxisbim.com.br` e `api.arxisbim.com.br`
  foram restaurados para os proxies locais `3102` e `3101`.
  A configuração inteira do Caddy foi validada antes do reload e recebeu
  backup com prefixo `Caddyfile.bak-arxis-`.
• `AUTH_SSO_ONLY=true` preservado. Não foi necessário alterar código do produto,
  cadastro no Auth ou DNS. O site comercial no domínio raiz está fora desta demanda.

## Evidências

Verificações públicas realizadas em 14/11/2026, aproximadamente 17h46 UTC:

• `GET https://app.arxisbim.com.br/login`: HTTP 200, tela renderizada.
• `GET https://api.arxisbim.com.br/health`: `healthy`, banco `up`.
• Container da API reportando `healthy`.
• Navegador: clique em “Entrar com a conta Ávila Ops” abre
  `https://auth.avilaops.com/login`, preservando a autorização OIDC do cliente
  `arxis`, callback cadastrado e PKCE `S256`. Sem erros JavaScript.
• `POST /api/v1/auth/login`: HTTP 410 com orientação para o Auth oficial.
• Callback com código/state inválidos: redirecionamento de erro para o app,
  sem abertura de sessão.

Scripts e capturas estão no diretório `../artifacts/` do workspace, com
prefixo `arxis-` e data `20261114`. Não foi realizado login com senha de uma
pessoa nem concluída uma sessão autenticada nesta verificação.

## Correção de topologia • banco no applications

Após a reativação, o usuário determinou que o banco fique no servidor
`applications`. A configuração restaurada inicialmente ainda usava o PostgreSQL
local de `apps-noclient`; essa conexão foi substituída.

• App e API continuam em `apps-noclient`, `204.168.249.111`.
• Banco `arxisvr` passa a residir no PostgreSQL 18 de `applications`,
  `178.105.82.48`, alcançado exclusivamente em `10.10.0.2:5432` pela rede
  WireGuard. O endereço privado de origem é `10.10.0.4`.
• A credencial antiga `arxisvr` do destino foi preservada. O app usa o usuário
  exclusivo `arxisvr_service`, proprietário do novo banco e dos objetos
  restaurados; a senha do app foi preservada sem exposição.
• A API foi pausada para o dump final. A restauração conferiu contagens
  individuais de 77 tabelas, totalizando 196.388 registros antes da retomada.
• A primeira tentativa retornou automaticamente à conexão anterior porque a
  validação usava a representação textual do tipo `inet`, que inclui a máscara.
  A checagem passou a usar `host(inet_server_addr())`. Foi feita nova cópia
  consistente antes da troca definitiva.
• Na API em execução, `current_database()` retornou `arxisvr` e
  `host(inet_server_addr())` retornou `10.10.0.2`. O endpoint público de saúde
  retornou `healthy` e banco `up`, aproximadamente 18h06 UTC de 14/11/2026.
• A cópia anterior no PostgreSQL de `apps-noclient` foi preservada para
  recuperação; a API deixou de utilizá-la. Dumps e contagens foram preservados
  nos diretórios privados de migração dos dois servidores.

O Auth oficial continua publicado no Render em `auth.avilaops.com`.
Esta alteração moveu o banco do app; não migrou o serviço central de identidade.
