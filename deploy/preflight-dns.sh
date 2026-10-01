#!/usr/bin/env bash
#
# Pre-flight antes de dar um hostname novo ao Caddy: o DNS publico ja aponta
# para ESTE servidor?
#
# Existe por causa de 10/09/2026: o bloco de alobarbeiro.com entrou no
# Caddyfile antes de o A propagar, o Caddy pediu certificado cinco vezes para
# um IP que nao era o dele, e a Let's Encrypt fechou a porta por uma hora
# ("too many failed authorizations"). So saiu porque o `email` nas opcoes
# globais deixou o Caddy cair para a ZeroSSL.
#
# Regra: DNS resolve para este servidor -> ai sim o bloco entra e o Caddy emite.
# Enquanto nao resolver, o bloco NAO entra (ou entra com `auto_https off`).
#
# Uso (no servidor ou de fora):
#   deploy/preflight-dns.sh <hostname> [<hostname> ...]
#   IP_ESPERADO=204.168.249.111 deploy/preflight-dns.sh crm.avilaops.com
#
# Sai 0 se todos resolvem para o IP esperado (ou para a Cloudflare, quando
# proxied: nesse caso o certificado vem pela borda e o desafio HTTP passa por
# ela). Sai 1 se algum nao resolve ou resolve para outro lugar.
set -uo pipefail

IP_ESPERADO="${IP_ESPERADO:-$(curl -s --max-time 5 https://api.ipify.org || true)}"
[ -n "$IP_ESPERADO" ] || { echo "nao sei o IP deste servidor; passe IP_ESPERADO=" >&2; exit 1; }
[ $# -ge 1 ] || { echo "uso: $0 <hostname> [...]" >&2; exit 1; }

# faixas IPv4 da Cloudflare (mesma lista do trusted_proxies do Caddyfile)
CF='^(173\.245\.|103\.21\.24[4-7]\.|103\.22\.20[0-3]\.|103\.31\.[4-7]\.|141\.101\.(6[4-9]|[7-9][0-9]|1[0-2][0-7])\.|108\.162\.(19[2-9]|2[0-5][0-9])\.|190\.93\.24[0-9]\.|188\.114\.9[6-9]\.|188\.114\.1[01][0-9]\.|197\.234\.24[0-3]\.|198\.41\.(1[2-9][0-9]|2[0-5][0-9])\.|162\.15[89]\.|104\.(1[6-9]|2[0-9]|3[01])\.|131\.0\.7[2-5]\.)'

falhou=0
for h in "$@"; do
  # 1.1.1.1 e 8.8.8.8: o que a Let's Encrypt ve, nao o cache local
  ips="$(for r in 1.1.1.1 8.8.8.8; do dig +short +time=3 +tries=1 A "$h" @"$r" 2>/dev/null; done | grep -E '^[0-9.]+$' | sort -u | tr '\n' ' ')"
  if [ -z "$ips" ]; then
    printf '  %-32s NAO RESOLVE ainda\n' "$h"; falhou=1; continue
  fi
  if echo " $ips" | grep -q " $IP_ESPERADO "; then
    printf '  %-32s ok, aponta para %s\n' "$h" "$IP_ESPERADO"
  elif echo "$ips" | tr ' ' '\n' | grep -Eq "$CF"; then
    printf '  %-32s ok, proxied pela Cloudflare (%s)\n' "$h" "$ips"
  else
    printf '  %-32s aponta para OUTRO lugar: %s (esperado %s)\n' "$h" "$ips" "$IP_ESPERADO"; falhou=1
  fi
done

if [ "$falhou" = 0 ]; then
  echo "DNS pronto: pode entrar no Caddyfile e recarregar (systemctl reload caddy)."
else
  echo "NAO ponha o hostname no Caddyfile ainda: o Caddy pediria certificado para um IP que nao e o dele e a Let's Encrypt limita 5 falhas por hora." >&2
fi
exit $falhou
