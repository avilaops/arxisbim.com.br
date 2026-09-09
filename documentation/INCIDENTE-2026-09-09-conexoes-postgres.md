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
