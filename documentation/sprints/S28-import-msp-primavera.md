# S28 · Importação MS Project / Primavera P6

**Fase:** 4D BIM  
**Status:** Pendente  
**Depende de:** S25 (schema de atividades)  
**Bloqueia:** S29 (branching usa cronogramas importados como base)

---

## Objetivo

Parser de `.mpp` (MS Project) e `.xer`/`.xml` (Primavera P6) que mapeia atividades, predecessores e datas para o schema interno. Import via upload com relatório de erros linha a linha.

> **Nota para o agente:** 100% dos cronogramas de obra no Brasil estão em MS Project ou Primavera. Sem import nativo, o usuário re-digita, fator de abandono imediato. O ponto crítico é o **mapeamento de predecessores** (FS/FF/SS/SF + lag) e **detecção de ciclo**. Reusa o motor de seleção do S15 para mapear atividades a conjuntos de elementos. Import pesado roda no pipeline do S11, nunca síncrono.

---

## Fora de Escopo

Pertencem a sprints futuros, **não implementar aqui**:

- Branching de cenários a partir do cronograma importado (S29)
- Comparação financeira (S30)
- Edição do cronograma dentro do produto (apenas import)
- Sincronização bidirecional (export de volta para MSP/P6)
- Nivelamento de recursos

---

## Por que importa a longo prazo

100% dos cronogramas de obra no Brasil existem em MS Project ou Primavera. Sem import nativo, o usuário precisa re-digitar ou converter para CSV, fator de abandono imediato.

O mapeamento de predecessores é a parte crítica: MS Project usa vínculos FS/FF/SS/SF com lag em dias. Primavera P6 usa XER (ASCII proprietário) com estrutura diferente. Ambos podem ter ciclos (atividade A depende de B que depende de A), o import precisa detectar e rejeitar ciclos com mensagem clara.

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Parser MSP | `mpp-parser` (npm) para `.mpp` binário | Alternativa: exportar para XML no MSP antes do upload |
| Parser Primavera | Parser próprio do XER (ASCII delimitado por tabulação) | Não existe lib npm madura para XER |
| Fallback MSP | Aceitar XML exportado pelo MSP 2003/2007/2019 | Todos os MSP suportam export XML |
| Detecção de ciclo | DFS com coloração (branco/cinza/preto) antes de inserir | Padrão de detecção de ciclo em grafos |
| Relatório de erros | Array de `{ row, field, message }` retornado na resposta | Usuário vê linha exata do problema |
| WBS | Importar código WBS como `wbs_code` para ordenação | Exibição hierárquica no painel 4D |

---

## Formato XER (Primavera P6)

```
%T TASK
%F task_id\ttask_code\ttask_name\tstart_date\tend_date\tduration
%R 1001\tA0010\tFundações\t2024-01-15\t2024-03-20\t64
...
%T TASKPRED
%F task_id\tpred_task_id\tpred_type\tlag_days
%R 1002\t1001\tFS\t0
```

---

## Arquivos principais

```
backend/src/modules/scheduling/
  import/
    msp-xml-parser.ts       ← parser XML do MS Project
    xer-parser.ts           ← parser XER do Primavera P6
    cycle-detector.ts       ← DFS para detecção de ciclos
    import-validator.ts     ← valida datas, WBS, vínculos
  schedule-import.routes.ts ← POST /projects/:id/schedules/import
```

---

## Riscos

| Risco | Mitigação |
|---|---|
| Arquivo `.mpp` binário incompatível com versão antiga do MSP | Instruir usuário a exportar como XML antes de upload |
| XER com encoding Windows-1252 (comum em obras) | Detectar BOM e encoding no início do arquivo |
| Cronograma com 5.000+ atividades sobrecarregando o backend | Processar import em BullMQ worker, não em request síncrono |
| WBS sem código definido em algumas atividades | WBS opcional, fallback para sort_order sequencial |

---

## Definition of Done (global)

Build · type-check · lint · testes passam · sem regressões conhecidas · documentação atualizada · demo executável em até 5 minutos.

---

## Critérios de aceite

- [ ] Upload de `.xml` exportado pelo MS Project 2007, 2016 e 2019 funciona
- [ ] Upload de `.xer` do Primavera P6 (versão 8+) funciona
- [ ] Predecessores FS/FF/SS/SF com lag em dias importados corretamente
- [ ] Ciclo em predecessores retorna 422 com descrição do ciclo
- [ ] Arquivo com encoding Windows-1252 importado sem corrupção de caracteres
- [ ] Relatório de erros lista linha exata de cada problema
- [ ] Import assíncrono com status via polling para arquivos > 1MB
- [ ] Build e lint passam
- [ ] Demo em até 5 minutos
