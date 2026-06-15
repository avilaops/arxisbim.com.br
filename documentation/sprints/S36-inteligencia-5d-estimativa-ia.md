# S36 · Intelligent 5D: AI-Powered Budgeting & Automatic SINAPI Mapping

**Fase:** Orçamentação e Inteligência (Utopia 5D)  
**Status:** Pendente  
**Depende de:** S35 (Motor 4D Avançado)  
**Bloqueia:** Nenhum (Última sprint da trilha de utopia)

---

## Objetivo

Alcançar a "utopia 5D" através da automatização por Inteligência Artificial. Desenvolver um orquestrador de orçamento inteligente que utiliza modelos de linguagem de larga escala (LLM via Groq/DeepSeek) combinados a bancos de dados de custos (SINAPI/TCPO) para mapear e classificar composições de preço em elementos do modelo BIM de forma automática. Implementar regras de cálculo dinâmicas baseadas em fórmulas matemáticas interpretadas e um Painel de Auditoria Visual no Visualizador 3D, indicando visualmente o nível de confiança (Confidence Score) de cada associação financeira.

---

## Fora de Escopo

- Emissão de notas fiscais, faturamento financeiro e ERP de pagamentos.
- Negociação direta com fornecedores de insumos ou cotação em tempo real de preços fora das tabelas oficiais.

---

## Por que importa a longo prazo

O levantamento manual de quantitativos e a associação de tabelas de custos como a SINAPI a cada parede, pilar ou tomada de um projeto de construção é uma das tarefas mais demoradas e suscetíveis a erros na engenharia civil. Ao automatizar a associação de custos usando IA que analisa as propriedades físicas e metadados do elemento IFC (ex: classificar uma "parede externa de bloco cerâmico" na composição SINAPI correta), reduzimos o tempo de orçamentação de semanas para minutos, permitindo a análise de viabilidade financeira instantânea de novos projetos.

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Motor de Classificação | RAG (Retrieval-Augmented Generation) com Embeddings vetoriais sobre a tabela SINAPI/Insumos locais | Garante precisão contextual associando o texto das propriedades IFC à descrição correta das composições SINAPI |
| Modelo de IA | DeepSeek-V3 ou Llama-3-70B via API de alta velocidade (Groq) | Modelos altamente competentes em estruturação de dados JSON com baixa latência e custo reduzido |
| Fórmulas Dinâmicas | Parser matemático seguro (ex: `expr-eval` no Node/Rust) | Permite ao usuário criar fórmulas complexas de conversão baseadas em variáveis do modelo (ex: `volume * 1.05 * densidade_concreto`) |
| Auditoria Visual | Filtro de cor por Nível de Confiança no visualizador 3D | Verde (>90% confiança), Amarelo (50-90% - exige revisão), Vermelho (<50% ou não mapeado) |
| Feedback Loop | Aprendizado contínuo (Fine-Tuning ou Few-Shot local) | Ajusta as sugestões futuras da IA quando o orçamentista corrige ou aprova uma associação manual |

---

## Estrutura de dados

```typescript
interface AICostMappingSuggestion {
  element_express_id: number;
  ifc_type: string;
  suggested_composition_code: string;
  suggested_composition_description: string;
  confidence_score: number;       // 0.00 a 1.00
  reasoning: string;              // Explicação da IA para a escolha
}

interface DynamicFormula {
  id: string;
  name: string;
  expression: string;             // ex: "width * height * 1.05"
  variables_needed: string[];     // ["width", "height"]
  unit: string;
}

interface CostAuditSummary {
  total_elements: number;
  mapped_elements: number;
  unmapped_elements: number;
  estimated_cost: number;
  average_confidence: number;
}
```

---

## Arquivos principais

```
backend/src/modules/ai-estimator/
  ai-cost-mapper.service.ts    ← Conecta com a API Groq/DeepSeek e faz RAG sobre o banco de dados SINAPI
  formula-parser.service.ts    ← Executa fórmulas matemáticas dinâmicas de forma segura
  ai-estimator.routes.ts       &larr; POST /projects/:id/estimate (dispara mapeamento por IA)

frontend/src/viewer/costs-ai/
  CostAuditLayer.ts            ← Shader/Filtro visual de cores por confiança (Verde/Amarelo/Vermelho)
  AISuggestionPanel.tsx        ← Sidebar de aprovação de estimativas de IA com botão "Aprovar tudo"
  FormulaManager.tsx           ← Editor gráfico de fórmulas matemáticas para insumos e custos
```

---

## Riscos

| Risco | Mitigação |
|---|---|
| Alucinações da IA associando custos incorretos e gerando orçamentos errados | **Nunca fechar orçamentos automaticamente**: Todas as sugestões da IA abaixo de 95% de confiança requerem revisão humana e aprovação visual |
| Custo alto de tokens de API da IA para modelos gigantescos | Otimizar o prompt enviando grupos de elementos semelhantes (ex: todas as portas internas de mesma dimensão) em uma única chamada de lote |
| Geometria incompleta (elementos sem dimensões cadastradas no IFC) | Fallback automático calculando estimativas aproximadas com base no volume geral ou na área construída do pavimento |

---

## Definition of Done (global)

Build · type-check · lint · testes passam · sem regressões conhecidas · documentação atualizada · demo executável em até 5 minutos.

---

## Critérios de aceite

- [ ] Motor de IA gera sugestões de mapeamento SINAPI para elementos estruturais com tempo médio < 200ms por elemento
- [ ] Interface visual 3D exibindo o modelo colorido por Nível de Confiança da IA (Audit Color Layer)
- [ ] Orçamentista aprova ou rejeita sugestões da IA na interface com atualização em tempo real do orçamento total
- [ ] Editor de fórmulas calcula com sucesso insumos customizados usando parâmetros geométricos dinâmicos
- [ ] Export do orçamento completo para PDF ou XLSX contendo as referências e justificativas do mapeamento da IA
