# Incidente: orquestrador 23.88.60.193 fora do ar

**Detectado:** 08/09/2026, ao revalidar o S12 antes de seguir para o S18.
**Estado:** **não resolvido**. Depende de acesso ao painel da Hetzner.

---

## O que está fora

O servidor **orquestrador** (`23.88.60.193`) não responde a nada:

| Verificação | Resultado |
|---|---|
| `ping` | 100% de perda (2 de 2) |
| Porta 22 (SSH) | fechada — `Connection timed out` |
| Porta 80 | fechada |
| Porta 443 | fechada |

Não é serviço travado nem container caído: **a máquina não responde no nível de
rede.** Container parado deixaria o SSH de pé.

## O que isso derruba

Tudo o que vive nesse servidor, não só o ArxisVR:

- `arxisvr.avilaops.com`, `api.arxisvr.avilaops.com` (000)
- `n8n.avilaops.com` (000) — **todos os fluxos de automação da casa**
- Grafana, Loki, Prometheus, Alertmanager, blackbox (observabilidade inteira)

## O que NÃO está fora

O problema é isolado a essa máquina:

- Minha rede local funciona: `github.com` responde 200.
- O **outro** servidor Hetzner (`178.105.82.48`, produção) está de pé:
  responde a ping, e `lojas.avilaops.com` devolve 200.

Ou seja: não é a Hetzner inteira, nem DNS, nem Cloudflare. É esta máquina.

## Ironia registrada

A observabilidade que avisaria da queda **mora na máquina que caiu**. O
Alertmanager, o Prometheus e o blackbox_exporter estão todos em
`/opt/observabilidade`, no mesmo host. Não há como esse conjunto alertar sobre a
própria morte.

Vale considerar um monitor externo (uptime de terceiro, ou um check no
`178.105.82.48` apontando para cá), porque hoje a queda só é descoberta por
alguém tentando usar o sistema.

## O que fazer

1. Abrir o **painel da Hetzner** e ver o estado da máquina. As causas prováveis,
   em ordem: servidor desligado/reiniciando, disco cheio travando o boot, ou
   bloqueio por billing.
2. Se estiver de pé no painel, usar o **console** (KVM/rescue) — sem SSH é o
   único caminho.
3. Ao voltar, conferir que os containers subiram sozinhos: todos são
   `restart: unless-stopped`, então devem voltar sem intervenção. Conferir
   `arxisvr-db`, `arxisvr-api`, `arxisvr-web` e o `observabilidade-caddy-1`.
4. **Atenção ao Postgres 18:** se a queda foi por falta de energia/disco, vale
   olhar o log do `arxisvr-db` antes de confiar no banco. O volume do PG16
   (`arxisvr_db-data-pg16-rollback`) e o dump de 02/09 em
   `/opt/arxisvr/backups/` continuam lá como rede de segurança.

## Consequência para o roadmap

**O S18 não pode começar** e o S12 não pode ser revalidado enquanto isso durar:
os dois exigem prova em browser na aplicação publicada, e não há aplicação
publicada agora.

O S12 ★ **permanece atingido**: foi provado em 03/09 em browser real, com as
capturas versionadas em `documentation/provas/s12/` e o relato em
`S12-PROVA-BROWSER.md`. Esta queda é de infraestrutura e não invalida aquela
prova, mas convém repetir a verificação quando o servidor voltar.
