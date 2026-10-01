# ArxisVR migrado para o servidor de aplicações

**Data:** 08/09/2026
**De:** orquestrador `23.88.60.193` (reconstruído, IP novo e VPN, sem acesso)
**Para:** `178.105.82.48`, junto dos clientes
**Estado:** **no ar.** `arxisvr.avilaops.com`, `/app`, `/validador` e a API em 200.

---

## Como ficou

| Peça | Antes (orquestrador) | Agora (aplicações) |
|---|---|---|
| Banco | container `postgres:18.6` | **PostgreSQL 18.6 nativo do host** |
| API | build no servidor | imagem construída aqui, enviada pronta |
| TLS | Caddy do stack de observabilidade | Caddy nativo do host |
| Portas | nenhuma publicada | `127.0.0.1:3101` (api) e `:3102` (web) |
| Rede | `arxisvr_default` (automática) | **`172.16.50.0/24`, fixa** |

**Sem container de banco** porque o host já roda a mesma versão que validamos, e
um segundo Postgres custaria ~60 MB numa máquina com menos de 800 MB livres.

**Imagem construída localmente** (`docker save | ssh docker load`) porque o build
é o pico de consumo de RAM: compilar no servidor arriscava derrubar cliente
pagante.

## Conferido depois

- **59/59 migrations, zero falhas.** 84 tabelas, 856 colunas, 325 índices, 19
  policies RLS — os mesmos números do orquestrador.
- `database: up`, billing worker rodando.
- S12 no bundle publicado (`Salvar posição atual` presente).
- Clientes intactos: lojas, vedashow, brilhax, saudepet, comandeiro.
- ArxisVR consome **155 MB** (api 137 + web 18).

## Os três tropeços, e o que ensinam

### 1. `CONNECT_TIMEOUT` no Postgres do host

A API subiu e não conectava. `host.docker.internal` resolvia para `172.17.0.1`
(a bridge padrão), o Postgres escutava lá, e mesmo assim dava timeout.

A causa era o **firewall**: `ufw` libera a 5432 só para `172.16.0.0/12`, e o
Docker tinha escolhido `192.168.48.0/24` para a rede do ArxisVR — fora da faixa.

Corrigido **fixando a sub-rede no compose**, não afrouxando o firewall.

### 2. A faixa 172.x estava quase toda tomada

`172.23.0.0/16` deu `Pool overlaps with other one`. De `172.17` a `172.30`, todos
os `/16` já pertencem a outros projetos desta máquina. A saída foi uma `/24`
dentro de `172.16`, onde só existe a rede `edge` (`172.16.0.0/24`).

**Ao criar o próximo serviço aqui, escolha uma `/24` livre em `172.16.x`.**

### 3. Sete migrations falharam em cascata

A 033 (`rls_multitenant`) falhou com **"permission denied to create role"**, e as
outras seis caíram atrás dela (`function current_tenant_id() does not exist`,
`relation "model_versions" does not exist`).

Uma causa só: o usuário `arxisvr` não tinha `CREATEROLE`. Concedido, reiniciada a
API, e as 59 aplicaram.

**Isto é um risco do runner:** ele registra a falha e **segue em frente**, então
o boot termina "com sucesso" com o schema pela metade. Sem olhar o log, o defeito
só apareceria quando alguém usasse a funcionalidade. Confira sempre
`select count(*) from _migrations` depois de um banco novo.

## DNS

Os dois registros A (`arxisvr` e `api.arxisvr`) apontavam para o IP morto e
foram atualizados para `178.105.82.48` pela API do Cloudflare, com a Global Key.
Seguem **dns-only** (sem proxy laranja), que é o que o Caddy precisa para o
HTTP-01.

## O e-mail estava mudo (corrigido no mesmo dia)

O Nicolas se registrou pela tela e caiu em **"Token de verificação não
encontrado"**. A causa era minha: no `.env` da migração eu tinha posto
`EMAIL_PROVIDER=log`, e sem `SMTP_*` o `EmailService` cai no modo log, que só
escreve no log do container. **O e-mail nunca saía**, então a conta nascia presa
em `EMAIL_NOT_VERIFIED` sem caminho de volta pela tela.

Detalhe: `EMAIL_PROVIDER` **nem é lido** pelo código. A escolha é por presença —
`RESEND_API_KEY` primeiro, depois `SMTP_HOST/USER/PASSWORD`, senão log.

Corrigido apontando para o **mail da própria casa**, que roda nesta mesma
máquina (`172.17.0.1:587`, banner `mail.avilaops.com`), com a caixa
`no-reply@avilaops.com`. Sem Resend, por decisão do Nicolas.

**A armadilha do scrypt:** o hash tem `$` como separador (`$scrypt$N=32768...`),
e passar isso por interpolação de shell **come os cifrões**. Gravei um hash
corrompido (`=32768,r=8...`) e a autenticação recusava sem dizer por quê. A
saída foi gerar o hash com o próprio `dist/lib/password.js` do mail e gravar via
arquivo `.sql` com dollar-quoting, sem o shell no meio.

Provado ponta a ponta depois: registro → e-mail sai por SMTP → `verify-email`
com o token real → login devolve token. O campo do corpo é `verificationToken`,
não `token`.

## O que NÃO veio junto

**Os dados.** O banco anterior ficou no orquestrador inacessível, e o dump de
02/09 está lá dentro. O ArxisVR aqui começou **vazio**: sem os 3 tenants, sem a
conta do Nicolas, sem cenários.

Se o acesso àquela máquina voltar, o dump em `/opt/arxisvr/backups/` pode ser
restaurado por cima. Enquanto isso, o produto funciona, mas para contas novas.
