# Documentação — ArxisVR

**Última atualização:** 11/06/2026

Toda documentação canônica do projeto vive nesta pasta.
Uma única fonte de verdade por assunto. Sem versões paralelas.

---

## Arquivos canônicos

| Arquivo | Propósito |
|---|---|
| [`vision.md`](vision.md) | Posicionamento, tese central, por que agora, mercado |
| [`business.md`](business.md) | Pricing, segmentos, competidores, vantagens, riscos |
| [`roadmap/ROADMAP.md`](roadmap/ROADMAP.md) | 32 sprints com critérios de aceite e marcos ★ |
| [`changelog.md`](changelog.md) | Registro de decisões com data e motivo |
| [`CI-CD-ESTRATEGIA.md`](CI-CD-ESTRATEGIA.md) | Pipeline, ambientes, como rodar localmente |
| [`CUIDADOS_BEFORE_GIT.md`](CUIDADOS_BEFORE_GIT.md) | Checklist pré-commit, regras de deploy |

---

## Pasta sprints/

`sprints/` recebe um arquivo por sprint concluído: `S01-RESULT.md`, `S02-RESULT.md`, etc.
Cada arquivo registra: objetivo, critérios atendidos, arquivos alterados, decisões arquiteturais, débitos técnicos.

---

## Regras

1. **Atualizar o arquivo existente** quando uma decisão mudar. Registrar a mudança em `changelog.md`.
2. **Não criar versões paralelas** (`roadmap_v2.md`, `vision_final.md`).
3. **Não manter informações conflitantes** entre arquivos.
4. **Sessões de trabalho e rascunhos** não vivem aqui — ficam no contexto da conversa.
