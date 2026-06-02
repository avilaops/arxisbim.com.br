# BIM Query Language - Implementação Completa

## 📊 Overview

Query language SQL-like para consultas semânticas avançadas em modelos BIM/IFC. Suporta queries por tipo, propriedade, espaciais, relacionais e agregações.

---

## 🎯 Features Implementadas

### Backend
- ✅ Parser SQL-like → BIMQuery object
- ✅ Query Engine (filtros, agregações, ordenação)
- ✅ Queries por tipo IFC (IFCWALL, IFCBEAM, etc)
- ✅ Queries por propriedade (Level, LoadBearing, FireRating, etc)
- ✅ Queries espaciais (WITHIN_BOX, NEAR_POINT, ON_LEVEL)
- ✅ Queries relacionais (CONNECTED_TO, PARENT_OF, CHILD_OF)
- ✅ Agregações (COUNT, SUM, AVG, MIN, MAX, GROUP BY)
- ✅ Cache de resultados (TTL configurável)
- ✅ API REST completa

### Frontend
- ✅ BIMQueryAPIService (comunicação com backend)
- ✅ QueryPanel híbrido (local + backend)
- ✅ Toggle local/backend engine
- ✅ Integração com SelectionService
- ✅ Exibição de resultados

---

## 🔌 API Endpoints

### POST `/api/v1/projects/:projectId/models/:modelId/query`
Execute query BIM no modelo

**Body:**
```json
{
  "query": {
    "type": "IfcWall",
    "filters": [
      { "property": "Level", "operator": "=", "value": "2" }
    ],
    "limit": 50
  }
}
```

ou

```json
{
  "queryString": "SELECT * FROM IfcWall WHERE Level = '2' LIMIT 50"
}
```

**Response:**
```json
{
  "elements": [
    {
      "expressId": 1234,
      "type": "IFCWALL",
      "globalId": "2O2Fr$t4X7Zf8NOew3FLOH",
      "properties": {
        "Name": "Wall-001",
        "Level": "2",
        "LoadBearing": true
      }
    }
  ],
  "totalCount": 42,
  "executionTime": 45.2,
  "cached": false,
  "query": {...}
}
```

### GET `/api/v1/projects/:projectId/models/:modelId/query/type/:type`
Shortcut para query por tipo

**Example:** `/api/v1/projects/abc/models/xyz/query/type/IfcWall?limit=100`

### GET `/api/v1/projects/:projectId/models/:modelId/query/property`
Shortcut para query por propriedade

**Example:** `/api/v1/projects/abc/models/xyz/query/property?property=Level&value=2&operator==`

### POST `/api/v1/bim-query/parse`
Parse query string SQL-like (utility)

**Body:**
```json
{
  "queryString": "SELECT COUNT(*) FROM IfcWall GROUP BY Level"
}
```

**Response:**
```json
{
  "query": {
    "type": "IfcWall",
    "aggregation": {
      "operation": "COUNT",
      "groupBy": ["Level"]
    }
  },
  "sql": "SELECT COUNT(*) FROM IfcWall GROUP BY Level"
}
```

### DELETE `/api/v1/projects/:projectId/models/:modelId/query/cache`
Limpar cache de queries

---

## 📝 Query Syntax Examples

### Queries Simples
```sql
-- Todas as paredes
SELECT * FROM IfcWall LIMIT 100

-- Paredes estruturais
SELECT * FROM IfcWall WHERE LoadBearing = true

-- Vigas no pavimento 2
SELECT * FROM IfcBeam WHERE Level = '2'

-- Elementos com resistência ao fogo
SELECT * FROM IfcWall WHERE FireRating LIKE 'EI%'
```

### Queries com AND/OR
```sql
-- Paredes estruturais no pavimento 2
SELECT * FROM IfcWall WHERE Level = '2' AND LoadBearing = true

-- Paredes ou vigas
SELECT * FROM IfcWall WHERE type = 'IfcWall' OR type = 'IfcBeam'
```

### Agregações
```sql
-- Contar paredes por pavimento
SELECT COUNT(*) FROM IfcWall GROUP BY Level

-- Volume total de concreto
SELECT SUM(Volume) FROM IfcWall WHERE Material = 'Concrete'

-- Média de altura das paredes
SELECT AVG(Height) FROM IfcWall

-- Menor e maior área
SELECT MIN(Area), MAX(Area) FROM IfcSlab
```

### Ordenação e Paginação
```sql
-- Ordenar por nome
SELECT * FROM IfcWall ORDER BY Name ASC

-- Top 10 maiores áreas
SELECT * FROM IfcSlab ORDER BY Area DESC LIMIT 10

-- Paginação
SELECT * FROM IfcWall LIMIT 50 OFFSET 100
```

---

## 💻 Frontend Usage

### Usando o QueryPanel (Híbrido)

```typescript
import { QueryPanel } from './shared/components/ui/panels/QueryPanel';

// Com backend API (recomendado)
const panel = new QueryPanel(container, {
  getObjects: () => scene.children,
  projectId: 'project-123',
  modelId: 'model-456',
  useBackend: true // Força uso do backend
});

// Apenas local (sem backend)
const panel = new QueryPanel(container, {
  getObjects: () => scene.children
});
```

### Usando o BIMQueryAPIService diretamente

```typescript
import { BIMQueryAPIService } from './api/v1/services/bim-query.service';

// Query por string SQL-like
const result = await BIMQueryAPIService.executeQueryString(
  projectId,
  modelId,
  'SELECT * FROM IfcWall WHERE Level = "2"'
);

// Query por objeto
const result = await BIMQueryAPIService.executeQuery(projectId, modelId, {
  type: 'IfcWall',
  filters: [
    { property: 'Level', operator: '=', value: '2' }
  ],
  limit: 50
});

// Shortcut por tipo
const walls = await BIMQueryAPIService.queryByType(
  projectId,
  modelId,
  'IfcWall',
  { limit: 100 }
);

// Shortcut por propriedade
const level2Elements = await BIMQueryAPIService.queryByProperty(
  projectId,
  modelId,
  'Level',
  '2',
  '='
);
```

---

## 🧪 Testing

### Backend
```bash
cd backend
npm run build
npm start

# Test endpoints
curl -X POST http://localhost:3001/api/v1/projects/test/models/test/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"queryString":"SELECT * FROM IfcWall LIMIT 10"}'
```

### Frontend
```bash
cd frontend
npm run build

# Verify no errors
# QueryPanel will auto-detect backend availability
```

---

## 🔧 Advanced Features

### Custom Operators (Extensibilidade)

```typescript
// Backend
BIMQueryService.registerOperator({
  name: 'IS_STRUCTURAL',
  handler: (element, params) => {
    return element.properties.LoadBearing === true;
  }
});
```

### Spatial Queries

```typescript
// Query elementos dentro de uma caixa
const query = {
  filters: [
    {
      operator: 'WITHIN_BOX',
      params: {
        min: [0, 0, 0],
        max: [10, 5, 10]
      }
    }
  ]
};

// Query elementos próximos de um ponto
const query = {
  filters: [
    {
      operator: 'NEAR_POINT',
      params: {
        center: [5, 2.5, 5],
        radius: 3.0
      }
    }
  ]
};
```

### Relational Queries

```typescript
// Query elementos conectados a uma parede específica
const query = {
  filters: [
    {
      operator: 'CONNECTED_TO',
      targetExpressId: 1234
    }
  ]
};
```

---

## 📈 Performance

- **Cache:** Resultados cacheados por 5min (default, configurável)
- **Paginação:** Use `LIMIT` e `OFFSET` para grandes datasets
- **Índices:** Backend usa índices no `modelElements.expressId` e `modelElements.type`
- **Streaming:** Suporte futuro para queries assíncronas

---

## 🚀 Próximos Passos

- [ ] Testes E2E para queries complexas
- [ ] UI Query Builder visual (drag-and-drop)
- [ ] Saved Queries (favoritos, templates)
- [ ] Query History
- [ ] Export results (CSV, Excel, JSON)
- [ ] Advanced spatial queries (INTERSECTS, topologia)
- [ ] Full-text search em propriedades
- [ ] Query profiling e otimização

---

## 📚 References

- [Backend Types](../backend/src/modules/bim-query/bim-query.types.ts)
- [Backend Service](../backend/src/modules/bim-query/bim-query.service.ts)
- [Backend Routes](../backend/src/modules/bim-query/bim-query.routes.ts)
- [Frontend Service](../frontend/src/api/v1/services/bim-query.service.ts)
- [Frontend Types](../frontend/src/api/v1/services/bim-query.types.ts)
- [QueryPanel](../frontend/src/shared/components/ui/panels/QueryPanel.ts)
