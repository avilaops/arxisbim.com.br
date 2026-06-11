# Cuidados Antes de Commit/Push — ArxisVR

**Última atualização:** 11/06/2026

> Qualquer push na `main` dispara deploy automático no Render.
> Só faça push se o sistema estiver estável.

---

## Checklist obrigatório

- [ ] Build passou sem erros (`npm run build` em backend e frontend)
- [ ] Testes passaram (`npm test` no backend)
- [ ] Lint passou sem erros
- [ ] Nenhum arquivo `.env`, `.env.local` ou similar no commit
- [ ] Sem `console.log`, `debugger` ou código temporário
- [ ] Sem arquivos de `dist/`, `node_modules/`, `.DS_Store`
- [ ] Lockfile consistente (`npm install` não gerou diff inesperado)
- [ ] Mensagem de commit clara (conventional commits: `feat:`, `fix:`, `docs:`, etc.)
- [ ] Sem regressões conhecidas nos testes anteriores

---

## Variáveis de ambiente — regra crítica

Nunca commitar:
- `.env`
- `.env.local`
- `.env.production`
- `.env.staging`
- Qualquer arquivo com chaves, tokens ou senhas

Verificar `.gitignore` antes de `git add .`.

---

## Render — atenção especial

`PUT /v1/services/{id}/env-vars` **apaga todas as variáveis existentes** e substitui pela lista enviada.

Antes de atualizar variáveis via API do Render:
1. Listar todas as variáveis atuais
2. Incluir todas na lista do PUT, não apenas as novas
3. Verificar health check após o deploy

---

## Mensagens de commit

Formato: `tipo(escopo): descrição`

| Tipo | Quando usar |
|---|---|
| `feat` | Nova feature |
| `fix` | Correção de bug |
| `docs` | Apenas documentação |
| `refactor` | Refatoração sem mudança de comportamento |
| `test` | Adição ou correção de testes |
| `chore` | Manutenção, deps, config |

Exemplo: `feat(ifc): add property extraction from IfcPropertySet`

---

## Definition of Done (sprints)

Todo sprint só é concluído quando:
- [ ] Build passa
- [ ] Lint passa
- [ ] Testes passam
- [ ] Sem regressões conhecidas em sprints anteriores
- [ ] Demo de até 5 minutos disponível
