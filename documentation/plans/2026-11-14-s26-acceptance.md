# S26 • plano de aceite em produção

**Objetivo:** revalidar S12 e S18 e demonstrar S26 no ambiente publicado, com
cronogramas diferentes por cenário, efeito visual da data, delta de prazo e
persistência após recarga. Especificação: `../sprints/S26-RESULT.md` e
`../roadmap/ROADMAP.md`.

**Arquitetura:** exercitar React → API Fastify → PostgreSQL pelo fluxo oficial.
App e API ficam em `apps-noclient`; banco no `applications`; login no Auth oficial.
Não modificar contas humanas, permissões globais, MFA ou banco de outros produtos.
Os dados da prova pertencem exclusivamente a uma conta sintética identificada.

## Tarefas

- [x] Preparar conta sintética CLIENT no Auth e registrar credencial fora do Git.
  Iniciar sessão pela tela oficial, completar OIDC e comprovar identidade no app.
- [x] No navegador, criar projeto, enviar fixture IFC licenciada, criar dois
  cenários com câmeras e visibilidade diferentes. Recarregar e reaplicar.
- [x] Comparar os cenários visualmente, verificar sincronização e exportação.
- [x] Criar cronogramas e atividades por cenário, vincular categorias IFC,
  encadear predecessoras e alterar datas. Demonstrar propagação e delta de prazo.
- [x] Demonstrar régua de tempo com estados visuais distintos, comparação 4D,
  recarga e reabertura em viewport móvel. Guardar capturas e resultados sem tokens.
- [x] Se houver falha, reproduzi-la antes de alterar código, adicionar teste
  focado, corrigir a causa e executar as verificações pertinentes antes de publicar.
- [x] Reconciliar somente os estados comprovados no roadmap e nas pendências,
  documentar limitações e registrar os recursos sintéticos criados.

## Critérios que impedem um falso positivo

• Não aceitar API isolada ou sessão injetada como prova de fluxo de usuário.
• A e B precisam guardar estados distintos e recuperar os mesmos após reload.
• Cronogramas devem ter elementos vinculados e conclusão diferente; delta não nulo.
• A data deve alterar pixels do modelo, além dos rótulos de texto.
• Falha de carregamento ou autorização impede concluir o respectivo marco.
• Não alterar S30 nem declarar propriedades, custos ou recursos avançados concluídos.

## Progresso

Plano aprovado pela orientação do usuário de avançar a primeira prioridade.
Evidências desta execução ficam em `documentation/provas/s26/` e em artefatos
de trabalho externos ao repositório. Mudanças operacionais anteriores preservadas.

Concluído em 14/11/2026. A prova encontrou régua comprimida por `select` global
e sobreposição de controles no celular. Falhas reproduzidas antes da correção;
prévia aprovada, frontend publicado e fluxo temporal completo aprovado em produção.
Revisão final identificou a necessidade de exigir explicitamente `role=user`
nos scripts; a trava foi adicionada e o papel da conta foi conferido na API.
