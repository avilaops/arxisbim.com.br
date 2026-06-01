# Central de Documentação ArxisVR

Toda documentação canônica do projeto vive nesta pasta. Documentação por sub-projeto
(ex.: `frontend/docs/`) **não é permitida** — qualquer doc nova entra aqui, na
categoria correta.

## Hierarquia

```
documentation/
├── README.md              ← este índice
├── ADR/                   ← decisões arquiteturais (1 arquivo = 1 decisão)
├── architecture/          ← visão estrutural do sistema
├── modules/               ← especificação por módulo (01-…33-)
├── operations/            ← estratégia e padrões operacionais (CI/CD, deploy, segurança)
├── runbooks/              ← procedimentos passo-a-passo (como rodar, como debugar)
├── roadmap/               ← planejamento de produto e técnico
└── sessions_archive/      ← histórico de sessões de trabalho (read-only)
```

## Pontos de entrada

| Quer | Vá para |
|------|---------|
| Entender a arquitetura | [`architecture/README.md`](architecture/README.md) |
| Decisões arquiteturais | [`ADR/README.md`](ADR/README.md) |
| Subir backend localmente | [`runbooks/ComoRodarBackendETestes.md`](runbooks/ComoRodarBackendETestes.md) |
| Entender CI/CD | [`operations/CI-CD-ESTRATEGIA.md`](operations/CI-CD-ESTRATEGIA.md) |
| Antes de commitar | [`operations/CUIDADOS_BEFORE_GIT.md`](operations/CUIDADOS_BEFORE_GIT.md) |
| Roadmap geral | [`roadmap/ROADMAP.md`](roadmap/ROADMAP.md) |
| Roadmap técnico frontend | [`roadmap/frontend.md`](roadmap/frontend.md) |
| Spec por módulo | [`modules/`](modules/) |

## Regras de escrita

- **1 doc = 1 propósito.** Não misture roadmap com runbook nem ADR com tutorial.
- **Sem cópias.** Se o conteúdo já existe em outro lugar, faça link, não duplique.
- **Sessões de trabalho** (`SESSÃO-XX`, `IMPLEMENTATION_SUMMARY-…`, `PASSOS_PARA_CONTINUAR`) vão direto para `sessions_archive/`. Não vivem na raiz da `documentation/`.
- **Renomear/mover qualquer doc** exige atualizar referências cruzadas no mesmo PR.

## Histórico

O nome anterior da pasta era `Docs/`. Foi renomeado para `documentation/` porque o `.gitignore`
da raiz contém `docs/`, que casava com `Docs/` em sistemas de arquivo case-insensitive
(Windows, macOS default) e fazia com que **nenhum** arquivo de doc fosse rastreado pelo Git.
