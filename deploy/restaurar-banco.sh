#!/usr/bin/env bash
#
# Restaura um dump do banco do ArxisVR num banco de destino, terminando com o
# dono e os privilegios corretos SEM depender de alguem lembrar de rodar
# ALTER OWNER a mao.
#
# Existe por causa da migracao de 10/09/2026: um dump feito com --no-owner e
# restaurado pelo superusuario deixou as 77 tabelas pertencendo a `postgres`,
# e a API caiu no login com "permission denied for table users". O dump
# noturno (backup-todos-bancos.sh, pg_dump sem --no-owner) ja traz os
# `ALTER ... OWNER TO arxisvr`, entao normalmente o passo de ownership aqui
# nao muda nada; ele esta aqui para o caso em que o dump veio de outra
# origem, e para deixar a conferencia no fim, auditavel, em vez de na fe.
#
# Roda NO SERVIDOR (apps-noclient), como root, com o Postgres nativo.
#
# Uso:
#   deploy/restaurar-banco.sh <dump.sql.gz> <banco_destino> [papel_dono]
#
#   dump.sql.gz     dump do pg_dump (texto, gzip), local ou ja baixado do R2:
#                   rclone copy r2:avilaops-backups/apps-noclient/db/host-arxisvr-AAAAMMDD.sql.gz .
#   banco_destino   e CRIADO se nao existir; se existir, o script PARA (para
#                   nao sobrescrever producao por engano). Para um teste use
#                   um nome como arxisvr_restore_test_AAAAMMDD.
#   papel_dono      padrao arxisvr (o papel que a API usa no DATABASE_URL).
#
# Para voltar producao de verdade a partir de um dump: parar a API
# (docker stop arxisvr-api), renomear o banco atual (ALTER DATABASE arxisvr
# RENAME TO arxisvr_antes_AAAAMMDD), restaurar com este script em `arxisvr`,
# subir a API. O banco renomeado fica como rollback ate se decidir apaga-lo.
set -euo pipefail

DUMP="${1:?uso: $0 <dump.sql.gz> <banco_destino> [papel_dono]}"
DB="${2:?uso: $0 <dump.sql.gz> <banco_destino> [papel_dono]}"
DONO="${3:-arxisvr}"

[ -s "$DUMP" ] || { echo "dump nao encontrado ou vazio: $DUMP" >&2; exit 1; }
gunzip -t "$DUMP" || { echo "gzip corrompido: $DUMP" >&2; exit 1; }

psql_pg() { su - postgres -c "psql -v ON_ERROR_STOP=1 -qAt $*"; }

if [ "$(psql_pg -c "\"select 1 from pg_database where datname='$DB'\"")" = "1" ]; then
  echo "o banco '$DB' JA EXISTE. Este script nao sobrescreve; renomeie ou apague antes." >&2
  exit 1
fi
[ "$(psql_pg -c "\"select 1 from pg_roles where rolname='$DONO'\"")" = "1" ] \
  || { echo "o papel '$DONO' nao existe neste servidor; crie-o antes (com a senha do .env)" >&2; exit 1; }

echo "==> criando $DB (dono $DONO)"
psql_pg -c "\"CREATE DATABASE \\\"$DB\\\" OWNER \\\"$DONO\\\"\""

echo "==> restaurando $DUMP"
# ON_ERROR_STOP=0 de proposito: um dump inteiro tem linhas inofensivas que
# falham (set_config de extensao, por exemplo). Os erros sao contados e
# mostrados; a conferencia de baixo e o que decide.
erros="$(zcat "$DUMP" | su - postgres -c "psql -q -v ON_ERROR_STOP=0 -d \"$DB\"" 2>&1 | grep -ci 'error' || true)"
echo "    linhas com ERROR no restore: $erros"

echo "==> dono e privilegios (idempotente)"
su - postgres -c "psql -v ON_ERROR_STOP=1 -q -d \"$DB\"" <<SQL
ALTER SCHEMA public OWNER TO "$DONO";
DO \$\$ DECLARE r record; BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('ALTER TABLE public.%I OWNER TO %I', r.tablename, '$DONO'); END LOOP;
  FOR r IN SELECT sequencename FROM pg_sequences WHERE schemaname='public' LOOP
    EXECUTE format('ALTER SEQUENCE public.%I OWNER TO %I', r.sequencename, '$DONO'); END LOOP;
  FOR r IN SELECT viewname FROM pg_views WHERE schemaname='public' LOOP
    EXECUTE format('ALTER VIEW public.%I OWNER TO %I', r.viewname, '$DONO'); END LOOP;
  FOR r IN SELECT matviewname FROM pg_matviews WHERE schemaname='public' LOOP
    EXECUTE format('ALTER MATERIALIZED VIEW public.%I OWNER TO %I', r.matviewname, '$DONO'); END LOOP;
  FOR r IN SELECT p.proname, pg_get_function_identity_arguments(p.oid) a
           FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' LOOP
    EXECUTE format('ALTER FUNCTION public.%I(%s) OWNER TO %I', r.proname, r.a, '$DONO'); END LOOP;
  FOR r IN SELECT t.typname FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
           WHERE n.nspname='public' AND t.typtype IN ('e','d') LOOP  -- enums e domains; 'c' incluiria o row type de cada tabela
    EXECUTE format('ALTER TYPE public.%I OWNER TO %I', r.typname, '$DONO'); END LOOP;
END \$\$;
GRANT ALL ON SCHEMA public TO "$DONO";
GRANT ALL ON ALL TABLES IN SCHEMA public TO "$DONO";
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO "$DONO";
SQL

echo "==> conferindo (a prova, nao a fe)"
alheios="$(psql_pg -d "\"$DB\"" -c "\"select count(*) from pg_tables where schemaname='public' and tableowner<>'$DONO'\"")"
tabelas="$(psql_pg -d "\"$DB\"" -c "\"select count(*) from pg_tables where schemaname='public'\"")"
migr="$(psql_pg -d "\"$DB\"" -c "\"select count(*) from _migrations\"" 2>/dev/null || echo 0)"
echo "    tabelas: $tabelas · com dono errado: $alheios · migrations: $migr"
[ "$alheios" = "0" ] || { echo "AINDA ha tabelas com dono errado" >&2; exit 1; }
[ "$tabelas" -gt 0 ] || { echo "restore vazio" >&2; exit 1; }

# A prova que importa: o papel da aplicacao, sem ser superusuario, le e escreve.
if [ -f /opt/arxisvr/.env ]; then
  senha="$(grep -o '^DATABASE_URL=.*' /opt/arxisvr/.env | sed -E 's#^DATABASE_URL=postgres(ql)?://[^:]+:([^@]+)@.*#\2#')"
  PGPASSWORD="$senha" psql -h 127.0.0.1 -U "$DONO" -d "$DB" -v ON_ERROR_STOP=1 -qAt \
    -c "select 'conectou como '||current_user||' (superuser='||(select rolsuper from pg_roles where rolname=current_user)||')'" \
    -c "select 'le users: '||count(*) from users" \
    -c "create temp table _probe(id int); insert into _probe values (1); select 'escreve: ok'" \
    || { echo "o papel $DONO NAO consegue usar o banco restaurado" >&2; exit 1; }
fi
echo "==> restore de '$DB' concluido e provado"
