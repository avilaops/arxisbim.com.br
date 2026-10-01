# Módulos Ávila para n8n

Camada própria da instância `n8n.avilaops.com`, sem alterar o core ou tentar
desbloquear recursos pagos do n8n.

O escopo completo, os limites de licença e a ordem de desenvolvimento estão em
[`docs/BLUEPRINT-MODULOS-AVILA.md`](docs/BLUEPRINT-MODULOS-AVILA.md).

## Módulos

- **Ávila Insights**: execuções de produção, sucesso/falha, duração média,
  série diária e ranking de workflows com maior taxa de falha. Abre no item
  `Insights` e ocupa a área central da interface nativa do n8n. Workflows e
  execuções são investigáveis: a tela mostra o nó afetado, a mensagem real da
  API pública do n8n, um link para a execução nativa e orientação de correção
  sem expor os payloads executados.
- **Ávila Configurações**: configurações persistidas no PostgreSQL, com tipos,
  JSON Schema, escopos, herança, expiração, histórico, rollback e mascaramento
  por classificação. Segredos são recusados e pertencem ao futuro Ávila Cofre.
  O endpoint interno é reservado para o nó próprio de leitura.
- **Ávila Espaços**: organização própria de workflows e credenciais, sem usar
  nem tentar desbloquear Projects do n8n. A API do conector valida cada recurso
  na API pública antes de atribuí-lo a um espaço.
- **Ávila Permissões**: identidade efetiva, capacidades autorizadas no backend
  e trilha append-only com verificação de integridade por hash encadeado.
- **Identidade de credenciais**: SVGs e classificação visual mantidos no
  override do editor do n8n.

Os módulos não possuem uma segunda navegação. `Projects`, `Roles`,
`External secrets`, `Environments`, `SSO`, `LDAP`, `Log streaming` e
`AI Assistant` permanecem nos pontos originais do menu, marcados como Ávila,
e carregam a implementação própria dentro da área central. A rota `/avila/`
existe apenas como superfície embutida e redireciona para o n8n quando aberta
diretamente.

## Segurança

As rotas de leitura e escrita validam a sessão corporativa da Ávila ou, como
compatibilidade, o cookie e o identificador seguro do navegador no n8n. Nenhum
segredo de credencial passa para o navegador. O serviço escuta
apenas em `127.0.0.1:5679`, atrás do Caddy, e usa o PostgreSQL do n8n com
usuário já existente.

A fundação versionada expõe `/api/v1/me`, `/api/v1/audit`,
`/api/v1/audit/verify` e `/api/v1/openapi.json`. O procedimento operacional e o
rollback estão em [`docs/FOUNDATION-OPERATIONS.md`](docs/FOUNDATION-OPERATIONS.md).

O conector MCP usa `/mcp/v1/config` e `/mcp/v1/spaces`, atrás do caminho público
`/avila-api/`. Essas rotas exigem `N8N_API_KEY` válida e nunca recebem cookie do
navegador.

## Operação

```bash
docker compose -f docker-compose.yml -f docker-compose.avila.yml up -d --build avila-modules
curl http://127.0.0.1:5679/health
```

O código do módulo fica montado no servidor em `/opt/n8n/modules`; a fonte
versionada está neste diretório.
