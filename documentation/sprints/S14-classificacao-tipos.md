# S14 · Classificação e Tipos de Elementos

**Fase:** Metadados BIM  
**Status:** Pendente  
**Depende de:** S13 (propriedades extraídas)  
**Bloqueia:** S10 (filtros por disciplina usam taxonomia), S20 (quantitativos agrupam por tipo)

---

## Objetivo

Mapear tipos IFC para categorias construtivas do produto. Paleta de cores por tipo. Base de classificação para filtros, quantitativos e 4D.

> **Nota para o agente:** Este sprint define uma **taxonomia que vira contrato** para S10, S20, S25 e S30. Ela deve ser configuração (dado), nunca lógica hard-coded espalhada. Mudar a taxonomia depois que há dados de clientes não pode exigir migração de dados — só atualização de mapeamento.

---

## Fora de Escopo

Pertencem a sprints futuros — **não implementar aqui**:

- Filtros de visibilidade por disciplina (S10 consome esta taxonomia)
- Quantitativos agregados (S20)
- Custos por categoria (S22)
- Vínculo de atividades 4D por tipo (S25)
- Machine learning para classificação automática

---

## Por que importa a longo prazo

A taxonomia de classificação definida aqui é usada em quatro lugares downstream:
- **S10**: filtros de disciplina (`structural`, `mep`, etc.)
- **S20**: agrupamento de quantitativos por tipo
- **S25**: vínculo de atividades 4D por tipo
- **S30**: tabela comparativa de cenários agrupa por categoria

Se a taxonomia mudar depois que dados de clientes já existem no banco, todos esses sprints precisam de migração de dados. Investir em mapeamento configurável agora evita esse problema.

---

## Taxonomia padrão

```typescript
// Mapeamento IFC Type → Categoria do produto
export const DEFAULT_TYPE_MAP: Record<string, TypeCategory> = {
  // Estrutural
  IfcColumn:        { category: 'structural', label: 'Pilar',     color: '#8B7355' },
  IfcBeam:          { category: 'structural', label: 'Viga',      color: '#A0855B' },
  IfcSlab:          { category: 'structural', label: 'Laje',      color: '#B8A88A' },
  IfcFoundation:    { category: 'structural', label: 'Fundação',  color: '#6B5B45' },
  IfcWall:          { category: 'architectural', label: 'Parede', color: '#D4C5A9' },
  // Arquitetônico
  IfcDoor:          { category: 'architectural', label: 'Porta',  color: '#8B4513' },
  IfcWindow:        { category: 'architectural', label: 'Janela', color: '#87CEEB' },
  IfcStair:         { category: 'architectural', label: 'Escada', color: '#C8B99C' },
  // MEP
  IfcPipe:          { category: 'mep', label: 'Tubulação',        color: '#4169E1' },
  IfcDuct:          { category: 'mep', label: 'Duto',            color: '#20B2AA' },
  IfcCableCarrier:  { category: 'mep', label: 'Eletrocalha',     color: '#FFD700' },
  // Outros
  IfcFurnishingElement: { category: 'furniture', label: 'Mobiliário', color: '#DEB887' },
  IfcSite:          { category: 'site', label: 'Terreno',         color: '#228B22' },
}
```

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Mapeamento padrão | Embutido no backend como `DEFAULT_TYPE_MAP` | Funciona sem configuração |
| Override por projeto | `project_type_map JSONB` em `projects` | Cada projeto pode ter taxonomia diferente |
| Tipos não mapeados | Categoria `other`, cor cinza | Nunca ocultar elemento por falta de mapeamento |
| Versão da taxonomia | `type_map_version INT` no override do projeto | Migrar formato de mapeamento sem quebrar projetos antigos |
| Cor no viewer | Material Three.js por categoria | Aplicado em S10 para filtros visuais |

---

## Arquivos principais

```
backend/src/modules/ifc/
  ifc-type-map.ts         ← DEFAULT_TYPE_MAP + helpers

backend/src/modules/projects/
  projects.service.ts     ← getTypeMap(projectId) → merge default + override

frontend/src/viewer/
  TypeColorizer.ts        ← aplica cor por categoria ao carregar modelo
  TypeLegend.ts           ← legenda de cores no viewer
```

---

## Definition of Done (global)

Build · type-check · lint · testes passam · sem regressões conhecidas · documentação atualizada · demo executável em até 5 minutos.

---

## Critérios de aceite

- [ ] Modelo carregado exibe elementos coloridos por categoria automaticamente
- [ ] Legenda de cores visível no viewer
- [ ] Taxonomia exposta como configuração consumível pelo S10 (não hard-coded no viewer)
- [ ] Override por projeto: admin pode mudar mapeamento de `IfcWall` para `structural`
- [ ] Tipos não mapeados aparecem em cinza, nunca desaparecem
- [ ] Mapeamento customizado persiste entre sessões
- [ ] Build e lint passam
- [ ] Demo em até 5 minutos
