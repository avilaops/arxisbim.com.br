# S23 · Performance e Cache 5D

**Fase:** 5D BIM  
**Status:** 🟠 Backend pronto, **não chega ao usuário**  
**Backend:** sim · **Interface:** nao  
**Verificado em:** 02/09/2026 — Cache existe (estava marcado Pendente).
**Depende de:** S22 (engine de cálculo existente para otimizar)  
**Bloqueia:** S24 (painel de custos precisa de performance aceitável para heatmap)

---

## Objetivo

Cálculo de custo em modelo de 50.000 elementos em < 10s. Cache que não fica stale. Viewer sem regressão de FPS durante cálculo em background.

> **Nota para o agente:** Este sprint **não adiciona feature visível**, adiciona a fundação de performance que faz S24, S26 e S30 funcionarem em modelos reais (30k–150k elementos). A regra inviolável herdada do S22: cache **nunca stale**, a chave inclui versão (`scenario_id + cost_table_version_hash`) e qualquer mutação invalida explicitamente.

---

## Fora de Escopo

Pertencem a sprints futuros, **não implementar aqui**:

- Novas features de custo (apenas otimiza o que existe no S22)
- Painel/heatmap (S24 consome esta performance)
- Comparação financeira (S30)
- Cache distribuído multi-região

---

## Por que importa a longo prazo

Modelos IFC de obras reais têm entre 30.000 e 150.000 elementos. Sem otimização, o cálculo 5D pode levar minutos e travar o browser. O heatmap de custo do S24 exige recálculo parcial em tempo real ao mudar filtros (ex.: "mostrar só o custo do 3° pavimento").

Este sprint não adiciona features visíveis ao usuário. Adiciona a fundação de performance que permite que o S24, S26 e S30 funcionem bem em modelos reais.

---

## Estratégias de otimização

### 1. Cálculo incremental
```
Ao invés de recalcular todos os elementos:
- Manter hash de cada element_cost_link
- Recalcular apenas linhas onde hash mudou
- Atualizar totais por incremento, não por soma completa
```

### 2. Cache em camadas
```
L1: In-memory (Map) por request, evita query repetida no mesmo request
L2: Redis com TTL 1h, compartilhado entre usuários do mesmo tenant
L3: Postgres view materializada, fallback sem Redis
Cache key: scenario_id + cost_table_version_hash
```

### 3. Heatmap pre-computado
```
Pre-computar custo por expressID ao rodar cálculo completo
Armazenar em Redis: Map<expressID, normalized_cost>
normalized_cost = 0.0 a 1.0 (para cor do heatmap)
Heatmap no viewer lê diretamente do Map sem nova query
```

### 4. Web Worker para cálculo no frontend
```
Cálculo de normalização de cores para heatmap → Web Worker
Não bloqueia render thread do Three.js
```

---

## Arquivos principais

```
backend/src/modules/costs/
  cost-calculator.service.ts   ← adicionar cálculo incremental + L2 cache
  cost-heatmap.service.ts      ← pre-computa normalização por expressID

backend/src/shared/
  cache.service.ts             ← adicionar suporte a L1 (Map) em memória

frontend/src/
  workers/costWorker.ts        ← normalização de cores em Web Worker
  viewer/CostHeatmap.ts        ← lê do worker, aplica material
```

---

## Benchmarks alvo

| Operação | Modelo 10k elem | Modelo 50k elem |
|---|---|---|
| Cálculo completo (cold) | < 2s | < 10s |
| Recálculo após mudança de preço | < 500ms | < 2s |
| Render heatmap no viewer | FPS > 30 | FPS > 25 |
| Query de breakdown por pavimento | < 200ms | < 500ms |

---

## Definition of Done (global)

Build · type-check · lint · testes passam · sem regressões conhecidas · documentação atualizada · demo executável em até 5 minutos.

---

## Critérios de aceite

- [ ] Cálculo completo de modelo 50k elementos em < 10s (medido sem cache)
- [ ] Cache Redis invalida corretamente em mutação de preço
- [ ] FPS do viewer não cai durante cálculo em background (< 5% de diferença)
- [ ] Heatmap de custo renderiza sem rebuild de materiais a cada frame
- [ ] Build e lint passam
- [ ] Demo em até 5 minutos
