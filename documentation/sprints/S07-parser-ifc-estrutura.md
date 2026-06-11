# S07 · Parser IFC — Estrutura Base

**Fase:** IFC Core  
**Status:** Pendente  
**Depende de:** S02 (storage para ler arquivo), S03 (model_version ID)  
**Bloqueia:** S08 (geometria), S11 (pipeline assíncrono), S13 (propriedades)

---

## Objetivo

Extrair a hierarquia espacial e o grafo de entidades de qualquer arquivo IFC. Sem geometria ainda — apenas estrutura e metadados.

---

## Por que importa a longo prazo

A escolha do parser IFC determina o teto de performance e a cobertura de esquemas para toda a vida do produto. `web-ifc` (WebAssembly, buildingSMART) é o padrão da indústria em 2026 e suporta IFC 2x3, IFC 4, IFC 4.3. Construir parser próprio seria meses de trabalho sem benefício.

A estrutura de dados retornada pelo parser precisa ser projetada para ser persistida no banco (S11) e indexada para busca (S15) e cálculo de quantitativos (S20). Retornar apenas o objeto bruto do web-ifc acopla todos os consumers ao formato interno do parser.

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Parser | `web-ifc` (WASM) | Padrão buildingSMART, suporta IFC 2x3/4/4.3 |
| Execução | Worker thread Node.js | Parser WASM é CPU-bound, não pode bloquear event loop |
| Formato de saída | DTO próprio `IFCStructure` | Desacopla consumers do formato interno do web-ifc |
| Hierarquia espacial | `IfcSite → IfcBuilding → IfcStorey → IfcSpace` | Árvore navegável para filtros e 4D |
| Persistência | `model_structure JSONB` na `model_versions` | Evita re-parse para operações de metadados |
| Identificador | `expressID` + `GlobalId` do IFC | expressID para lookup rápido, GlobalId para vínculo cross-model |

---

## DTO de saída

```typescript
interface IFCStructure {
  schema: 'IFC2X3' | 'IFC4' | 'IFC4X3'
  projectName: string
  units: { length: string; area: string; volume: string }
  spatialTree: SpatialNode[]  // Site → Building → Storey → Space
  elements: IFCElement[]
  stats: {
    totalElements: number
    byType: Record<string, number>  // { IfcWall: 423, IfcBeam: 88, ... }
    boundingBox: BoundingBox
  }
}

interface IFCElement {
  expressID: number
  globalId: string
  type: string        // 'IfcWall', 'IfcBeam', etc.
  name: string | null
  storeyId: number | null
  hasGeometry: boolean
}
```

---

## Arquivos principais

```
backend/src/modules/ifc/
  ifc-parser.worker.ts  ← Worker thread com web-ifc
  ifc-parser.service.ts ← spawna worker, retorna IFCStructure
  ifc-structure.dto.ts  ← tipos exportados

backend/src/modules/models/
  models.service.ts     ← chama parser após upload
```

---

## Riscos

| Risco | Mitigação |
|---|---|
| web-ifc crash em arquivo malformado | Try/catch no worker + status `failed` com mensagem |
| GlobalId duplicado em modelos mal exportados | Logar duplicatas, usar expressID como fallback |
| IFC 4.3 com entidades de infraestrutura não mapeadas | Ignorar entidades desconhecidas, logar para análise |
| Parsing de 200 MB > 60s em servidor entry-level | Benchmark antes de S11 para ajustar timeout |

---

## Modelos de referência para testes

Baixar da buildingSMART:
- `Duplex_A_20110907.ifc` (IFC 2x3, referência)
- `AC20-FZK-Haus.ifc` (IFC 4, estrutural)
- `rac_advanced_sample_project.ifc` (IFC 4, complexo)
- `Infrastructure-Bridge.ifc` (IFC 4.3, infraestrutura)
- Modelo próprio de test suite (pequeno, 50 elementos, controlado)

---

## Critérios de aceite

- [ ] Parser lê IFC 2x3 e IFC 4.x sem crash nos 5 modelos de referência
- [ ] Hierarquia espacial extraída corretamente (Site → Building → Storey)
- [ ] `byType` com contagem de cada tipo de elemento
- [ ] Parsing de 50 MB em < 10 segundos em servidor de produção
- [ ] GlobalId e expressID disponíveis para cada elemento
- [ ] Worker não bloqueia event loop durante parse
- [ ] Build e lint passam
- [ ] Demo em até 5 minutos
