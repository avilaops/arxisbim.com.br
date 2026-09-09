#!/bin/bash
#
# Vigia do ArxisVR no servidor de aplicacoes. Roda no cron a cada 2 minutos.
#
# Existe por causa do incidente de 09/09/2026: o /health da API dizia
# `database: down` por 8 minutos e ninguem viu, porque nada olhava para ele.
# A causa (pool por requisicao) foi corrigida, mas o sinal continua valendo.
#
# O que faz:
#   1. Le /health da API e a raiz do site.
#   2. Se a API responde mas diz `database: down` em DUAS checagens seguidas,
#      reinicia o container da API (foi exatamente o remedio do incidente: o
#      pool vazado morre junto com o processo). Uma checagem so nao basta:
#      um restart do Postgres para manutencao daria falso positivo.
#   3. Avisa por e-mail NA BORDA (uma vez quando cai, uma vez quando volta),
#      pelo nosso SMTP (no-reply@avilaops.com, STARTTLS; `--insecure` porque
#      o certificado e de mail.avilaops.com e a conexao vai pelo IP da bridge
#      Docker, 172.17.0.1, na mesma maquina), lendo as credenciais do
#      /opt/arxisvr/.env em tempo de execucao. Nada de chave aqui: este
#      arquivo e versionado.
#
# Estado em /var/lib/arxisvr_health_state (ok | api | db | web), log em
# /var/log/arxisvr_health.log. O destinatario vem de /etc/avila-alerts.env
# (ALERT_EMAIL), o mesmo dos outros vigias da maquina.

set -uo pipefail

API_URL=https://api.arxisvr.avilaops.com/health
WEB_URL=https://arxisvr.avilaops.com/
CONTAINER=arxisvr-api
STATE_FILE=/var/lib/arxisvr_health_state
DB_STRIKES_FILE=/var/lib/arxisvr_health_db_strikes
LOG=/var/log/arxisvr_health.log
ALERTS_ENV=/etc/avila-alerts.env
API_ENV=/opt/arxisvr/.env

log() { echo "$(date -Is) $*" >> "$LOG"; }

ALERT_EMAIL=""
# shellcheck source=/dev/null
[ -f "$ALERTS_ENV" ] && . "$ALERTS_ENV"

avisar() {
  local assunto="$1" corpo="$2"
  [ -z "${ALERT_EMAIL:-}" ] && { log "sem ALERT_EMAIL em $ALERTS_ENV: alerta nao enviado"; return; }
  [ -f "$API_ENV" ] || { log "sem $API_ENV: alerta nao enviado"; return; }
  local host port user pass from
  host=$(grep -o '^SMTP_HOST=.*' "$API_ENV" | cut -d= -f2- | tr -d '"')
  port=$(grep -o '^SMTP_PORT=.*' "$API_ENV" | cut -d= -f2- | tr -d '"')
  user=$(grep -o '^SMTP_USER=.*' "$API_ENV" | cut -d= -f2- | tr -d '"')
  pass=$(grep -o '^SMTP_PASSWORD=.*' "$API_ENV" | cut -d= -f2- | tr -d '"')
  from=$(grep -o '^EMAIL_FROM=.*' "$API_ENV" | cut -d= -f2- | tr -d '"')
  [ -z "$host" ] || [ -z "$user" ] && { log "SMTP incompleto em $API_ENV: alerta nao enviado"; return; }
  printf 'From: ArxisVR vigia <%s>\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n%s\r\n' \
    "$from" "$ALERT_EMAIL" "$assunto" "$corpo" \
    | curl -s --max-time 20 --url "smtp://${host}:${port:-587}" --ssl-reqd --insecure \
        --mail-from "$from" --mail-rcpt "$ALERT_EMAIL" \
        --user "${user}:${pass}" -T - > /dev/null 2>&1 \
    || log "falha ao enviar o e-mail de alerta"
}

# ---- medir ----
estado=ok
motivo=""

corpo_api=$(curl -s --max-time 10 "$API_URL" || true)
codigo_web=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$WEB_URL" || echo 000)

if [ -z "$corpo_api" ]; then
  estado=api; motivo="API nao respondeu em $API_URL"
elif ! echo "$corpo_api" | grep -q '"database":"up"'; then
  estado=db; motivo="API responde mas o banco esta fora: $(echo "$corpo_api" | head -c 160)"
elif [ "$codigo_web" != "200" ]; then
  estado=web; motivo="site respondeu HTTP $codigo_web"
fi

anterior=ok
[ -f "$STATE_FILE" ] && anterior=$(cat "$STATE_FILE")

# ---- auto-reparo do caso conhecido: banco fora visto pela API ----
strikes=0
[ -f "$DB_STRIKES_FILE" ] && strikes=$(cat "$DB_STRIKES_FILE")
if [ "$estado" = "db" ]; then
  strikes=$((strikes + 1))
  echo "$strikes" > "$DB_STRIKES_FILE"
  if [ "$strikes" -ge 2 ]; then
    log "banco fora em $strikes checagens: reiniciando $CONTAINER"
    docker restart "$CONTAINER" > /dev/null 2>&1 && log "restart de $CONTAINER ok" || log "restart de $CONTAINER FALHOU"
    echo 0 > "$DB_STRIKES_FILE"
    motivo="$motivo. Container $CONTAINER reiniciado automaticamente."
  fi
else
  echo 0 > "$DB_STRIKES_FILE"
fi

# ---- avisar na borda ----
if [ "$estado" != "ok" ]; then
  log "PROBLEMA ($estado): $motivo"
  [ "$anterior" = "ok" ] && avisar "ArxisVR com problema: $estado" "$motivo ($(date -Is))"
else
  [ "$anterior" != "ok" ] && { log "VOLTOU (antes: $anterior)"; avisar "ArxisVR voltou" "API e site respondendo, banco up ($(date -Is)). Antes: $anterior."; }
fi
echo "$estado" > "$STATE_FILE"
