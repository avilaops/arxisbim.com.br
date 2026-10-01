# Saída do Docker: os números, antes de executar

**Levantado em:** 02/09/2026, no servidor orquestrador `23.88.60.193`.
**Motivo:** a migração estava aprovada para execução. Antes de derrubar o que
funciona, medi o que ela custa e o que ela devolve.

---

## O que a migração propõe

Tirar API e Postgres do Docker: Postgres 18 como serviço systemd, Node 24 + PM2
nativos, sobrando só o Caddy do frontend em container.

## Os números medidos

| Medida | Valor |
|---|---|
| RAM dos 3 containers do ArxisVR | **206 MB** (api 133, db 59, web 14) |
| RAM do daemon Docker | **357 MB** (dockerd 311 + containerd 46) |
| RAM total da máquina | 3.814 MB, com **1.444 MB disponíveis** |
| Swap | **0** |
| Disco | 18 G usados de 38 G (51%) |
| Tamanho do banco | **16 MB** |
| Dados reais | 3 tenants, 1 usuário, **0 projetos, 0 modelos** |

## O que a migração devolve

O ganho **não** é os 206 MB dos containers: esses processos continuam existindo,
só que fora do Docker. O ganho real é o overhead do daemon, **357 MB**, e só se o
Docker sair **inteiro** da máquina.

E ele não sai. Na mesma máquina rodam n8n, Postgres do n8n, Grafana, Loki,
Prometheus, Alertmanager, promtail, node_exporter, blackbox_exporter e o Caddy,
que **continuam em Docker**. A própria migração mantém o Caddy do frontend em
container.

**Portanto o ganho de RAM é aproximadamente zero.** O daemon fica de pé de
qualquer jeito.

## O que a migração custa

1. **Pré-requisitos ausentes**: sem PM2, sem `psql`, sem Postgres nativo, e
   Node **22** onde o `ecosystem.config.js` novo exige 24 (`--env-file` e
   `--env-file-if-exists`). São três instalações numa máquina com 1,4 GB livres
   e **zero swap** — instalar Node 24 e PG18 com o n8n e o stack de
   observabilidade rodando é justamente onde falta memória.

2. **Migração de dados**: o volume `arxisvr_db-data` precisa ir para o Postgres
   do host. São 16 MB, então é barato, mas é um passo com risco de perda.

3. **A janela perigosa do Caddy**: o Caddy de `/opt/observabilidade` faz
   `reverse_proxy arxisvr-api:3001` **pelo nome do serviço docker**, e está nas
   redes `arxisvr_default`, `n8n_default` e `observabilidade_default`. Esse nome
   deixa de existir. O Caddyfile tem de apontar para o host antes de derrubar o
   container, e é o mesmo Caddy que serve o n8n e o Grafana: um erro ali derruba
   **mais que o ArxisVR**.

4. **PM2 é um supervisor a mais.** O `restart: unless-stopped` do compose já faz
   o que o PM2 faria, e o PM2 traz `pm2 save`, `pm2 startup` e o estado dele
   próprio para manter.

## Recomendação: não fazer agora

Custo alto e concreto, ganho aproximadamente zero. A migração troca um supervisor
que funciona por outro, numa máquina sem swap, com uma janela em que um erro
derruba n8n e Grafana junto.

**O que fazer com o trabalho já escrito:** ele não é lixo. Fica na árvore,
documentado aqui e em `arxisvr-saida-do-docker-inacabada`, para o dia em que
existir um motivo de verdade. Motivos que justificariam:

- o ArxisVR ganhar um servidor só dele (aí o Docker sai inteiro e os 357 MB
  aparecem de fato);
- o Postgres precisar de extensão ou tuning que a imagem não dá;
- o Docker virar o gargalo medido, e não o suposto.

**O que fazer agora, que é barato e tem ganho real:** o PG18 está aprovado
(59/59 migrations, schema idêntico). Subir a imagem do `arxisvr-db` de
`postgres:16-alpine` para `postgres:18.6` **dentro do Docker** entrega a versão
nova sem tocar em PM2, sem instalar nada no host e sem a janela do Caddy. Com 16
MB de banco, o dump e restore é de segundos, e o rollback é trocar a tag de volta.

## Rollback, se a migração for feita mesmo assim

1. `docker compose up -d db api` com o compose commitado (o de HEAD, não o da
   árvore).
2. Devolver o `reverse_proxy arxisvr-api:3001` no Caddyfile de
   `/opt/observabilidade` e recarregar o Caddy.
3. O volume `arxisvr_db-data` **não** é apagado pela migração: continua no Docker
   até alguém removê-lo à mão. É a rede de segurança, não a remova.
