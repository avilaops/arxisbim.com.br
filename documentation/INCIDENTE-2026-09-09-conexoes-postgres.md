# Incidente 09/09/2026: Postgres sem slots, todos os apps do servidor fora

**Quando:** 18:16 a 18:24 UTC (8 minutos).
**Onde:** 178.105.82.48 (servidor de aplicações), Postgres 18 nativo, `max_connections = 100`.
**Efeito:** `FATAL: remaining connection slots are reserved for roles with the
SUPERUSER attribute` para `arxisvr`, `outline@notas` e quem mais tentasse
conectar. O `/health` da API do ArxisVR marcou `database: down`.
**Como foi visto:** a prova do S18 parou de listar cenários no meio da rodada.

## Causa

`pg_stat_activity` mostrava **57 conexões ociosas do usuário `arxisvr`**, todas
da API. Nove controladores (`scenarios`, `ifc-models`, `model-elements`,
`scheduling`, `schedule-tasks`, `tenants/notifications`, `task-element-links`,
`timeline-simulations`, `webhooks`) tinham este padrão:

```ts
function getDb() {
  const client = postgres(process.env.DATABASE_URL);   // pool NOVO
  return drizzle(client, { schema });
}
export async function handler() { const db = getDb(); ... }   // a cada requisição
```

Cada requisição abria um pool que nunca era fechado; a conexão ficava ociosa
até o Postgres esgotar. As baterias de prova (listar cenários, baixar IFC,
salvar) só aceleraram o que qualquer uso faria. Por cima disso, o
`AuthService` era instanciado três vezes, cada uma com pool de 10.

## Ação

1. `docker restart arxisvr-api` às 18:24: liberou os slots na hora.
2. Correção na causa (commit `5725fdb`): um pool por módulo, criado na primeira
   chamada, `max: 4`; `AuthService` com pool compartilhado; demais pools com
   `max: 3`. Deploy da API com o portão de tipos.
3. Medição depois de uma bateria completa do S18 em produção: **9 conexões**
   de `arxisvr`, estáveis.

## O que fica

- O `/health` já dizia `database: down` e ninguém olhava: não há alerta. Fica
  como pendência de operação (um ping do n8n no `/health` resolve).
- Os outros apps da máquina somam ~40 conexões ociosas em repouso
  (`avila_mail` 10, `lojas` 8, `app_avila` 6...). Com 100 de teto, o próximo
  vazamento de qualquer app derruba todos de novo. Vale revisar os pools ou
  subir `max_connections` com pgbouncer na frente.

## Feito em seguida (09/09, 19:00 UTC)

1. **Teto de conexões por papel** no Postgres do host (`ALTER ROLE ...
   CONNECTION LIMIT`): `arxisvr` 20, `avila_mail` e `lojas` 25, `app_avila` e
   `app_avilaops` 20, `auth_avila`/`saudepet`/`ia`/`outline`/`n8n`/`sms`/
   `migdolus` 15, `despolarizamed`/`sorroche_app`/`wabusiness` 10, `agricola` e
   os quatro `odoo_*` 5. O próximo vazamento de qualquer app dá erro só naquele
   app, não derruba o servidor. Script aplicado: `/root/limites-conexoes-2026-09-09.sql`.
2. **Vigia do ArxisVR** (`deploy/health-watch.sh`, instalado em
   `/opt/arxisvr/health-watch.sh`, cron `/etc/cron.d/arxisvr-health` a cada 2
   min): lê `/health` da API e a raiz do site; com `database: down` em duas
   checagens seguidas reinicia `arxisvr-api` (o remédio do incidente); avisa
   por e-mail na borda, pelo nosso SMTP com STARTTLS, credenciais lidas do
   `/opt/arxisvr/.env` em tempo de execução, destinatário de
   `/etc/avila-alerts.env`. Provado: borda forçada gerou "ArxisVR voltou" na
   caixa `nicolas@avilaops.com` às 19:07 UTC.

Decisão registrada: **sem container de Postgres dedicado por enquanto**. A
máquina tem 3,8 GB com 3,6 GB de swap em uso e o banco do ArxisVR tem 19 MB;
o isolamento que um container daria já vem do teto por papel, sem custo de
RAM. Volta a valer quando o ArxisVR precisar de versão, extensão ou tuning
próprios, ou sair desta máquina.
