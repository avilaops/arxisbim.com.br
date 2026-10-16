# Contexto verificavel

- Identificador: `avila-arxisbim-com-br`.
- Origem: raiz deste checkout; nao depende de um caminho absoluto.
- Fontes encontradas: `README.md`, `package.json`, `AGENTS.md`.
- Gerenciador declarado: "npm@11.16.0".

## Estrutura observada

- `assets/`
- `backend/`
- `deploy/`
- `documentation/`
- `frontend/`
- `observability/`
- `revit-plugin/`
- `scripts/`
- `signaling-server/`
- `tests/`

## Scripts de verificacao declarados

- `test`: `npm run test:backend`
- `test:backend`: `cd backend && npm test`
- `lint`: `cd frontend && npm run lint`
- `type-check`: `cd backend && npm run type-check`

Esta lista e um retrato de 15/10/2026, nao uma prova de que os comandos passaram.
Confirme os comandos e seus efeitos antes de executa-los. Alguns testes dependem de servicos externos.
Nao execute deploy, migracao ou envio como parte de uma consulta de status.
