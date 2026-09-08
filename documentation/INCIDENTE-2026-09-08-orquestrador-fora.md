# Incidente: orquestrador inacessível (IP mudou + VPN)

**Detectado:** 08/09/2026, ao revalidar o S12 antes de seguir para o S18.
**Causa encontrada:** o servidor **não caiu**. Ele foi reconstruído: mudou de IP
e passou a exigir VPN. As credenciais que eu tinha deixaram de valer.
**Estado:** **bloqueado**, depende de uma chave SSH que só o Nicolas pode dar.

---

## O que aconteceu

O que parecia queda era outra coisa. O painel da Hetzner mostra os dois
servidores **verdes**, e o orquestrador com **IP novo**:

| Servidor | IP no painel | IP que eu usava |
|---|---|---|
| orchestrator | **62.238.119.61** | ~~23.88.60.193~~ (morto) |
| aplications | 178.105.82.48 | 178.105.82.48 (ok) |

O IP antigo não responde a nada, o que explica o diagnóstico inicial de "máquina
fora do ar". Ela não está fora: **é outra máquina**.

## Como se chega nele agora

O acesso público foi fechado. Em `62.238.119.61` as portas 22, 80 e 443 estão
**fechadas** — só o WireGuard (51820) atende.

A configuração está em `C:/Users/nicol/.wireguard/orchestrator.conf`:

```
Address    = 10.66.0.1/24        (esta máquina, no túnel)
Endpoint   = 62.238.119.61:51820
AllowedIPs = 10.66.0.10/32       (o servidor, no túnel)
```

**O túnel está ativo** e funciona: `10.66.0.10` responde a ping, e as portas 22,
80 e 443 estão abertas por ali. Ou seja, o servidor está vivo e servindo.

## O que bloqueia

**Nenhuma chave que eu tenho é aceita.** Testadas em `root`, `avila` e `deploy`,
todas com `Permission denied (publickey)`:

- `~/.ssh/hetzner_avilaops` — a que funcionava no servidor antigo
- `C:/Users/nicol/Downloads/Avila_Ops.pem`

Como a máquina foi reconstruída, ela tem um par de chaves novo, e a minha
pública não está no `authorized_keys` dela.

## O que o Nicolas precisa fazer

Uma das duas, e é rápido:

1. **Autorizar a chave que já existe** — colar o conteúdo de
   `C:/Users/nicol/.ssh/hetzner_avilaops.pub` no `/root/.ssh/authorized_keys` do
   servidor (pelo console da Hetzner, ou de onde já houver acesso).
2. **Ou passar a chave nova**, dizendo o caminho dela e o usuário certo.

## O que muda no diagnóstico anterior

A versão anterior deste documento dizia "servidor fora do ar" e sugeria olhar
power/billing no painel. Estava errado no motivo, embora certo no efeito. Fica o
aprendizado: **`ping` que falha não prova que a máquina morreu** — pode ser que
o endereço tenha deixado de ser dela.

Também some a ironia registrada antes (a observabilidade não avisou porque
morreu junto): ela não morreu, mudou de endereço com o resto.

## Sobre apagar a observabilidade

Decidido em 08/09: **apagar Grafana, Loki, Prometheus e Alertmanager**, porque
com 5 clientes ativos é custo sem retorno. Não dá para executar agora, por falta
de acesso. Quando houver, some junto o consumo de RAM daquele conjunto, que era
o argumento contra hospedar mais coisa ali.

No servidor de aplicações (`178.105.82.48`) só há um `node_exporter` (12 MB),
que não vale o trabalho de remover.

## Consequência para o roadmap

**O S18 não começa** e o S12 não é revalidado enquanto durar: os dois exigem
prova em browser na aplicação publicada, e `arxisvr.avilaops.com` responde 000.

O S12 ★ **permanece atingido**: provado em 03/09 em browser real, com capturas
em `documentation/provas/s12/` e relato em `S12-PROVA-BROWSER.md`. Esta
indisponibilidade é de infraestrutura e não invalida aquela prova.
