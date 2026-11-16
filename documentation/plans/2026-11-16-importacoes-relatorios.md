# Importações 4D e relatórios 5D • plano de implementação

**Objetivo:** continuar os módulos autorizados com importação acessível e relatórios auditáveis, preservando o planejamento publicado.

**Arquitetura:** React consome novas rotas Fastify com isolamento por organização. PostgreSQL mantém atividades por ID externo, sem migração. XLSX é gerado no servidor com a biblioteca existente.

**Escopo:** importar CSV, XML do MS Project e XER do Primavera; apresentar prévia antes da aplicação; reimportar no cronograma corrente preservando IDs, vínculos IFC, Kanban e progresso existente. Atividades ausentes no arquivo são mantidas. Novas atividades começam sem avanço real. Alterações de nome, datas e predecessoras só são aplicadas após confirmação. Adicionar resumo de quantitativos por pavimento e XLSX com medições e memória de custos.

**Escolhas de implementação:** XML com parser dedicado e validação completa de sintaxe; reutilizar a leitura XER com validação e preservação das datas civis; CSV com aspas e separador detectado. Prévia sem persistência, aplicação transacional com comparação da revisão do cronograma. Limites explícitos de 1 MB e 4.000 atividades. Não inferir identidade por nome de atividade. Exportar todas as medições da versão do cenário, sem limitar à página da tela.

## Restrições e revisão

• Preservar auth oficial Ávila, banco em Applications e implantação existente.
• Leitor não pode aplicar importação; organização estrangeira recebe 404.
• Data impossível, IDs duplicados, dependência inválida ou ciclo impedem salvar.
• Revisão desatualizada recebe 409, sem aplicação parcial.
• Quantidade ausente não vira zero; custos e medições conservam precisão decimal.
• Exportação identifica cenário e versão IFC e distingue vínculo de custo de elemento único.

## Tarefas

- [x] 1. Importação 4D • testes de parser e banco, rotas de prévia/aplicação e componente com confirmação e erros por linha.
- [x] 2. Relatórios 5D • resumo por pavimento, memória por serviço/elemento e XLSX completo com testes de conteúdo e isolamento.
- [x] 3. Integração • testes de interface, tipos/builds, revisão independente, prova no navegador, publicação com rollback e documentação.

## Registro

• Início em 16/11/2026 • branch derivado da entrega Kanban `2d922ec`.
• A continuação do usuário autoriza executar as pendências apresentadas; implementação nativa nesta sessão, revisão independente ao final.
• SINAPI, curva acumulada e visualização de custos no 3D seguem como tarefas seguintes; este plano não os declara concluídos.
• Revisão • substituído o parser XML permissivo por fast-xml-parser 5.12.1 com validação; XER preserva datas civis e valida destinos de dependências. Bloqueios de linhas garantem revisão após edição manual concorrente.
• Verificação • 42 testes focados aprovados, incluindo quatro testes PostgreSQL; tipos/build/lint aprovados. Publicação com rollback e prova completa de navegador concluídas em 16/11/2026, repetida após ajuste de largura das tabelas no celular.
• Escopo do relatório • a versão IFC deve pertencer ao mesmo projeto do cenário, seguindo a regra das demais rotas de custos; teste de associação divergente retorna 404.
