# Kanban do planejamento • plano

Usuário escolheu organização do planejamento em etapas, sem execução real.

• Alternar Gantt/Kanban no mesmo cronograma, com preferência na URL.
• Etapas iniciais: Sem etapa, Preparação, Fundações, Estrutura e Acabamentos.
  Permitir adicionar, renomear, ordenar e remover etapas (máximo 12).
• Mover cartões por arraste ou seletor acessível. Remover etapa devolve cartões
  para Sem etapa. Não alterar percentuais/datas reais, CPM ou vínculos IFC.
• Persistir somente configuração/distribuição em metadata do cenário, por
  scheduleId. Reutilizar JSONB existente, sem migração. Ignorar atividades
  excluídas e impedir vínculos de outro cronograma/tenant/projeto.
• Revisão otimista e lock transacional do cenário evitam sobrescrever mudanças
  simultâneas. Metadados de câmera/visibilidade e demais cronogramas preservados.
• Viewer não pode editar; 403 é permissão, 409 pede recarga do quadro.

- [x] Serviço, rotas e testes de persistência/isolamento/conflitos.
- [x] Componente acessível, integração Gantt e testes de interação.
- [x] Tipos/builds/revisão e publicação com rollback.
- [x] Prova OIDC com fixture sintética, movimento/reload/etapas/celular e docs.

Execução inline; revisão independente final. Preços/SINAPI/execução real são
outras frentes, não fazem parte deste quadro de planejamento.

Concluído em 16/11/2026. Revisão e 20 testes focados passaram; prova publicada
sem mudança no cronograma retornado pela API. Controller genérico de cenário
protege o recurso dedicado contra metadata antiga. Detalhes e pendências dos
módulos em `documentation/KANBAN-PLANEJAMENTO.md`.
