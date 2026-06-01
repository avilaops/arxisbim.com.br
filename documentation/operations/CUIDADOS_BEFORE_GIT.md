# Cuidados Antes de Commit/Push (Deploy Automático Render)

Antes de realizar qualquer commit/push ao seguir tarefas da pasta Docs, siga rigorosamente estas orientações para evitar deploys problemáticos no Render:

1. **Validação de Build**
   - Sempre rode o build completo do frontend e backend localmente (`pnpm run build`, `pnpm run build:frontend`, `pnpm run build:backend`).
   - Certifique-se de que não há erros de build ou warnings críticos.

2. **Testes Automatizados**
   - Execute todos os testes automatizados disponíveis (`pnpm test`, `pnpm run test:frontend`, `pnpm run test:backend`).
   - Não faça push se houver testes falhando.

3. **Verificação de Variáveis de Ambiente**
   - Confirme que nenhuma variável sensível (senhas, tokens, chaves) foi exposta em arquivos versionados.
   - Não faça commit de .env, `env.local` ou arquivos similares.

4. **Revisão de Dependências**
   - Verifique se não houve atualização acidental de dependências no package.json ou pnpm-lock.yaml sem necessidade.
   - Rode `pnpm install` para garantir que o lockfile está consistente.

5. **Checagem de Arquivos Temporários**
   - Não faça commit de arquivos temporários, de build, logs ou pastas como `dist/`, node_modules, `.DS_Store`, etc.

6. **Revisão de Código**
   - Faça uma revisão final do código alterado, especialmente em arquivos críticos para produção.
   - Garanta que não há console.log, debugger ou código de teste temporário.

7. **Documentação**
   - Se alterar a documentação, garanta que ela está clara, atualizada e sem informações sensíveis.

8. **Mensagem de Commit**
   - Escreva mensagens de commit claras, explicando o que foi feito e por quê.

9. **Deploy Automático**
   - Lembre-se: qualquer push na branch principal (main) dispara deploy automático no Render.
   - Só faça push se tiver certeza de que o sistema está estável.

10. **Checklist Final**
    - [ ] Build passou sem erros
    - [ ] Testes passaram
    - [ ] Sem arquivos sensíveis/temporários
    - [ ] Lockfile consistente
    - [ ] Código revisado
    - [ ] Documentação revisada
    - [ ] Mensagem de commit clara
