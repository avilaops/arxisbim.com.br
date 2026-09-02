# S07 · Parser IFC: Estrutura Base

**Fase:** IFC Core  
**Status:** ✅ Entregue (chega ao usuário)  
**Backend:** sim · **Interface:** sim  
**Verificado em:** 02/09/2026 — Parser usado pelo upload.
**Depende de:** S02 (storage para ler arquivo), S03 (model_version ID)  
**Bloqueia:** S08 (geometria), S11 (pipeline assíncrono), S13 (propriedades)

---

## Objetivo

Extrair a hierarquia espacial e o grafo de entidades de qualquer arquivo IFC. Sem geometria ainda, apenas estrutura e metadados.

> **Nota para o agente:** Este sprint **não existe para visualizar modelos.** Ele existe para transformar um arquivo IFC em um modelo de domínio estável do ArxisVR. Toda decisão deve favorecer consistência, extensibilidade e independência do parser subjacente antes de favorecer conveniência de implementação.

---

## Fora de Escopo

O objetivo é **entender a estrutura, não desenhar o modelo.** Pertencem a sprints futuros, **não implementar aqui**:

- Renderização / meshes / materiais / texturas (S08)
- Quantitativos (S20)
- Custos (S19, S22)
- Cronogramas (S25)
- Extração completa de property sets IFC (S13)

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
| Persistência | `model_structure JSONB` como **cache do parse** | Evita re-parse; fonte de verdade continua sendo o IFC original |
| Normalização futura | JSONB hoje, schema permite migrar para `ifc_elements`/`ifc_storeys`/`ifc_properties` | Consultar JSONB gigante fica caro em S15/S19/S22 |
| Identificador | `expressID` (técnico) + `GlobalId` (lógico) | Nenhuma operação crítica depende **exclusivamente** de GlobalId |
| Versionamento do DTO | `version: 1` na raiz do `IFCStructure` | Adicionar campos em S13/S19 sem quebrar compatibilidade |
| Bounding box | **Obrigatório** na saída | Alimenta câmera (S08), navegação (S09), cortes (S10), comparação (S18), Presentation (S31) |

---

## DTO de saída

```typescript
interface IFCStructure {
  version: 1                  // versão do DTO, protege compat. futura (S13, S19)
  schema: 'IFC2X3' | 'IFC4' | 'IFC4X3'
  projectName: string
  units: { length: string; area: string; volume: string }
  spatialTree: SpatialNode[]  // Site → Building → Storey → Space
  elements: IFCElement[]
  stats: {
    totalElements: number
    byType: Record<string, number>        // { IfcWall: 423, IfcBeam: 88 ... }
    byDiscipline: Record<string, number>  // { architecture: 1200, structure: 840, mep: 620 } - heurística inicial
    boundingBox: BoundingBox              // OBRIGATÓRIO
  }
}

interface IFCElement {
  expressID: number
  globalId: string
  type: string                  // 'IfcWall', 'IfcBeam', etc.
  name: string | null
  storeyId: number | null
  parentExpressID: number | null // navega Parede → Pavimento → Edifício sem recalcular a árvore
  hasGeometry: boolean
}
```

> O JSONB persistido é **cache do parse**. A fonte de verdade é sempre o IFC original no storage, em caso de divergência, re-parse a partir do arquivo.

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

## Logs obrigatórios (reusa padrão do S06)

Sucesso:
```json
{ "req_id": "...", "model_version_id": "...", "schema": "IFC4",
  "file_size_mb": 52, "elements": 18422, "duration_ms": 4230, "status": "success" }
```
Falha:
```json
{ "req_id": "...", "model_version_id": "...", "status": "failed", "error_type": "IFC_PARSE_ERROR" }
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
- [ ] `byDiscipline` populado (heurística inicial aceitável)
- [ ] `boundingBox` presente em toda saída
- [ ] DTO carrega `version: 1` e `parentExpressID` por elemento
- [ ] Parsing de 50 MB em < 10 segundos em servidor de produção
- [ ] Uso de memória durante parse não excede 3× o tamanho do arquivo
- [ ] GlobalId e expressID disponíveis para cada elemento
- [ ] Logs de sucesso e falha emitidos no formato do S06 (com `error_type` em falha)
- [ ] Worker não bloqueia event loop durante parse
- [ ] Build e lint passam
- [ ] Demo em até 5 minutos
