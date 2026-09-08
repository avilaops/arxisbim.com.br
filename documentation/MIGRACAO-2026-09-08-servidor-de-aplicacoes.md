# Abrindo espaço no servidor de aplicações para o ArxisVR

**Data:** 08/09/2026
**Motivo:** o orquestrador foi reconstruído (IP novo, atrás de VPN) e não temos
mais acesso por chave. O ArxisVR precisa morar no `178.105.82.48`.
**Decisão do Nicolas:** remover o PartsAgrícola (fica só no GitHub) e os três
Odoos, incluindo `erp.avilaops.com` e `erp.brilhax.com`.

---

## Resultado

| Recurso | Antes | Depois |
|---|---|---|
| Disco raiz | 34 G de 38 G (**92%**) | 23 G de 38 G (**63%**) |
| Disco Docker | 40 G de 79 G | 28 G de 79 G (**37%**) |
| RAM disponível | 785 MB | 769 MB |
| Containers | 38 | 35 |

**O disco era o problema, e foi resolvido: de 3,1 G para 14 G livres.** A RAM
praticamente não mudou, porque os Odoos consumiam pouco (50 MB cada).

## O que foi removido

1. **`.next` do agricola-storefront (6,6 G)** — cache de build de um site que
   não tinha processo servindo. O `partsagricola.com.br` apontava para a porta
   3006, onde nada escutava: respondia 307 para o vazio, quebrado havia tempo.
   `node_modules` foi junto. Ambos se reconstroem do GitHub.
2. **Os três tenants Odoo** (`avilaops`, `partsagricola`, `recorte`) e o stack
   `/opt/odoo-avilaops`.
3. **Quatro bancos**: `partsagricola` (233 MB), `agricola_medusa` (319 MB),
   `avilaops` (137 MB), `brilhax` (72 MB).
4. **Rotas mortas do Caddy**: `partsagricola.com.br`, `www.`, e
   `erp.partsagricola.com.br`. O `erp.avilaops.com` ficou comentado, com o
   caminho do dump ao lado.

## O que foi preservado

Tudo com dump antes de apagar, e conferido:

| Arquivo | Tamanho | Conteúdo |
|---|---|---|
| `/opt/backups/partsagricola-final-20260908/partsagricola.dump` | 20 M | 405 tabelas com dados |
| `.../agricola_medusa.dump` | 30 M | 145 tabelas com dados |
| `/opt/backups/odoo-final-20260908/avilaops.dump` | 14 M | ERP da casa |
| `.../brilhax.dump` | 11 M | ERP da Brilhax (já desativado em 19/08) |
| `.../docker-compose.yml` | 5 K | o stack, para reconstruir |
| `/opt/backups/agricola-storefront-20260908/` | — | `.env`, `server.js`, `package.json` |
| `/opt/backups/Caddyfile.bak-20260908-odoo` | — | Caddyfile antes da edição |

O `.env` do storefront importa: tem credenciais e **não** está no GitHub.

## O erro que cometi, e como foi corrigido

O `docker compose down` em `/opt/odoo-avilaops` derrubou **os três** tenants de
uma vez, não só o PartsAgrícola: o compose é um serviço por tenant, no mesmo
arquivo. Isso tirou `erp.avilaops.com` do ar por alguns minutos, sem intenção.

Religuei `avilaops` e `recorte` na hora (`docker compose up -d avilaops
recorte`) e confirmei que voltaram (303 e 301). Só depois, com a decisão do
Nicolas de remover os três, é que desceram de vez.

**Lição:** `docker compose down` derruba o arquivo inteiro. Para um serviço só,
`docker compose stop <servico> && docker compose rm -f <servico>`.

## Pendência menor

O volume `odoo-avilaops_avilaops-data` não pôde ser removido: `device or
resource busy`, por causa de um bind-mount do host
(`/mnt/HC_Volume_106542212/...`). Não forcei, porque o ganho é pequeno e mexer
em mount ativo não vale o risco. Some num próximo reboot, ou com `umount` antes.

## Estado dos clientes, conferido depois

Nenhum foi afetado:

| Serviço | Código |
|---|---|
| `lojas.avilaops.com` | 200 |
| `vedashow.lojas.avilaops.com` | 200 |
| `app.brilhax.com` | 302 |
| `saudepet.app.br` | 200 |
| `comandeiro.com.br` | 200 |

## Próximo passo

Subir o ArxisVR aqui. O disco comporta. A RAM (**769 MB disponíveis**, swap em
3,1 G) é o ponto de atenção: o `deploy.sh` compila a API **no servidor**, e o
build é o pico de consumo. Vale construir a imagem localmente e enviar pronta,
em vez de compilar lá.
