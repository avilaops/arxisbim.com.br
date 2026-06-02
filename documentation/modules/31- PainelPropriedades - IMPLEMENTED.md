# Painel de Propriedades - Implementação Completa

## 🏷️ Overview

Sistema de exibição, edição e gerenciamento de propriedades de elementos BIM/IFC com suporte a validação, histórico, layout customizável e extensibilidade.

---

## 🎯 Features Implementadas

### Frontend
- ✅ Exibição de propriedades IFC (property sets)
- ✅ Edição de propriedades editáveis
- ✅ Validação de propriedades (required, min/max, pattern, custom)
- ✅ Layout customizável (grupos, tabs, flat)
- ✅ Organização por grupos (General, Geometry, Material, Structural, Cost)
- ✅ Histórico de alterações
- ✅ Undo/Redo
- ✅ Sistema de eventos (onChange, onSelectionChange)
- ✅ Extensibilidade (custom property types)
- ✅ Cache local de propriedades

---

## 💻 Usage

### Exibição Básica de Propriedades

```typescript
import { PropertiesPanelService } from './shared/components/ui/panels/properties-panel.service';
import type { PropertySet } from './shared/components/ui/panels/properties-panel.types';

// Definir propriedades de um elemento
const propertySets: PropertySet[] = [
  {
    name: 'Pset_WallCommon',
    properties: [
      { name: 'Name', value: 'Wall-001', type: 'string' },
      { name: 'LoadBearing', value: true, type: 'boolean' },
      { name: 'FireRating', value: 'EI60', type: 'string', editable: true }
    ]
  },
  {
    name: 'BaseQuantities',
    properties: [
      { name: 'Volume', value: 12.5, type: 'measure', unit: 'm³' },
      { name: 'Area', value: 25.0, type: 'measure', unit: 'm²' }
    ]
  }
];

// Armazenar propriedades
PropertiesPanelService.setProperties(
  1234, // expressId
  'IFCWALL',
  propertySets,
  { globalId: '0abc123...', name: 'Wall-001' }
);

// Obter propriedades
const props = await PropertiesPanelService.getProperties(1234);
console.log('Property Sets:', props);
```

### Edição de Propriedades

```typescript
// Atualizar propriedade
await PropertiesPanelService.updateProperty(1234, {
  name: 'FireRating',
  value: 'EI90',
  type: 'string',
  psetName: 'Pset_WallCommon'
});

// Validação automática
const validation = {
  required: true,
  minLength: 2,
  maxLength: 10,
  pattern: '^EI\\d+$'
};

// Validar antes de atualizar
const result = PropertiesPanelService.validateProperty('EI90', validation);
if (result.valid) {
  await PropertiesPanelService.updateProperty(1234, {
    name: 'FireRating',
    value: 'EI90',
    type: 'string'
  });
} else {
  console.error('Validation errors:', result.errors);
}
```

### Validação Customizada

```typescript
import type { PropertyUpdate } from './properties-panel.types';

// Validação numérica
const update: PropertyUpdate = {
  name: 'Height',
  value: 3.5,
  type: 'number'
};

const validation = {
  min: 2.0,
  max: 5.0,
  custom: (value: number) => {
    if (value % 0.5 !== 0) {
      return 'Height must be multiple of 0.5';
    }
    return true;
  }
};

const result = PropertiesPanelService.validateProperty(update.value, validation);
if (!result.valid) {
  console.error('Validation failed:', result.errors);
}
```

### Layout Customizado

```typescript
import type { PropertyLayout, PropertyGroup } from './properties-panel.types';

// Layout com grupos customizados
const layout: PropertyLayout = {
  type: 'grouped',
  groups: [
    {
      name: 'identification',
      label: 'Identificação',
      properties: ['Name', 'Tag', 'GlobalId'],
      order: 1,
      collapsed: false
    },
    {
      name: 'dimensions',
      label: 'Dimensões',
      properties: ['Height', 'Width', 'Length', 'Volume'],
      order: 2,
      collapsed: true
    },
    {
      name: 'safety',
      label: 'Segurança',
      properties: ['FireRating', 'LoadBearing'],
      order: 3
    }
  ],
  sortBy: 'group'
};

PropertiesPanelService.setLayout(layout);
```

### Layout com Tabs

```typescript
import type { PropertyTab } from './properties-panel.types';

const layoutTabs: PropertyLayout = {
  type: 'tabs',
  tabs: [
    {
      name: 'general',
      label: 'Geral',
      groups: [
        {
          name: 'info',
          label: 'Informações',
          properties: ['Name', 'Description', 'Tag']
        }
      ],
      order: 1
    },
    {
      name: 'quantities',
      label: 'Quantitativos',
      groups: [
        {
          name: 'geometry',
          label: 'Geometria',
          properties: ['Volume', 'Area', 'Length']
        },
        {
          name: 'cost',
          label: 'Custos',
          properties: ['UnitCost', 'TotalCost']
        }
      ],
      order: 2
    }
  ]
};

PropertiesPanelService.setLayout(layoutTabs);
```

### Organização por Grupos

```typescript
// Obter propriedades e organizar por grupos
const props = await PropertiesPanelService.getProperties(1234);
const grouped = PropertiesPanelService.organizeByGroups(props);

// Iterar sobre grupos
for (const [groupName, properties] of grouped) {
  console.log(`\n--- ${groupName} ---`);
  properties.forEach(prop => {
    console.log(`  ${prop.name}: ${prop.value} ${prop.unit || ''}`);
  });
}
```

### Histórico e Undo/Redo

```typescript
// Fazer alterações
await PropertiesPanelService.updateProperty(1234, {
  name: 'FireRating',
  value: 'EI60',
  type: 'string'
});

await PropertiesPanelService.updateProperty(1234, {
  name: 'FireRating',
  value: 'EI90',
  type: 'string'
});

// Ver histórico
const history = PropertiesPanelService.getPropertyHistory(1234);
history.forEach(change => {
  console.log(`${change.timestamp}: ${change.propertyName} changed from ${change.oldValue} to ${change.newValue}`);
});

// Desfazer última alteração
await PropertiesPanelService.undoPropertyChange(1234);

// Verificar valor
const props = await PropertiesPanelService.getProperties(1234);
// FireRating agora é 'EI60' novamente
```

### Eventos

```typescript
// Listener de mudanças de propriedade
const unsubProps = PropertiesPanelService.onPropertiesChange((expressId, properties) => {
  console.log(`Properties changed for element ${expressId}`);
  
  // Atualizar UI
  updatePropertiesPanel(properties);
});

// Listener de mudança de seleção
const unsubSel = PropertiesPanelService.onSelectionChange((expressIds) => {
  console.log('Selection changed:', expressIds);
  
  if (expressIds.length === 1) {
    // Carregar propriedades do elemento selecionado
    PropertiesPanelService.getProperties(expressIds[0]);
  } else if (expressIds.length > 1) {
    // Exibir propriedades comuns de múltiplos elementos
    console.log('Multiple elements selected');
  } else {
    // Limpar painel
    console.log('No elements selected');
  }
});

// Cleanup
unsubProps();
unsubSel();
```

### Property Type Handlers Customizados

```typescript
import type { PropertyTypeHandler } from './properties-panel.types';

// Handler para tipo "measure"
const measureHandler: PropertyTypeHandler = (property) => {
  const div = document.createElement('div');
  div.className = 'property-measure';
  
  const value = document.createElement('span');
  value.textContent = property.value.toString();
  value.className = 'value';
  
  const unit = document.createElement('span');
  unit.textContent = property.unit || '';
  unit.className = 'unit';
  
  div.appendChild(value);
  div.appendChild(unit);
  
  return div;
};

// Registrar handler
PropertiesPanelService.registerPropertyType('measure', measureHandler);

// Handler para tipo "enum"
const enumHandler: PropertyTypeHandler = (property) => {
  const select = document.createElement('select');
  select.className = 'property-enum';
  
  if (property.options) {
    property.options.forEach(option => {
      const opt = document.createElement('option');
      opt.value = option;
      opt.textContent = option;
      opt.selected = option === property.value;
      select.appendChild(opt);
    });
  }
  
  return select;
};

PropertiesPanelService.registerPropertyType('enum', enumHandler);
```

### Integração com SelectionService

```typescript
import { SelectionService } from './selection.service';

// Conectar SelectionService com PropertiesPanel
SelectionService.onSelectionChange((selection) => {
  // Emitir evento para PropertiesPanel
  PropertiesPanelService.emitSelectionChange(selection.expressIds);
  
  // Carregar propriedades do primeiro elemento
  if (selection.expressIds.length > 0) {
    const expressId = selection.expressIds[0];
    PropertiesPanelService.getProperties(expressId).then(props => {
      console.log('Loaded properties:', props);
    });
  }
});
```

### Cache Management

```typescript
// Limpar cache de um elemento específico
PropertiesPanelService.clearCache(1234);

// Limpar todo o cache
PropertiesPanelService.clearCache();
```

---

## 🔧 Tipos de Propriedade

| Tipo | Descrição | Exemplo |
|------|-----------|---------|
| `string` | Texto | "Wall-001" |
| `number` | Numérico | 3.5 |
| `boolean` | Booleano | true |
| `enum` | Enumeração | "EI60" \| "EI90" \| "EI120" |
| `measure` | Medida com unidade | 12.5 m³ |
| `date` | Data | 2026-06-01 |
| `reference` | Referência a outro elemento | GlobalId |

---

## 📋 Grupos de Propriedades Padrão

| Grupo | Propriedades |
|-------|--------------|
| General | Name, Description, Tag, ObjectType |
| Geometry | Volume, Area, Length, Width, Height, Depth |
| Material | Material, Finish, Color |
| Structural | LoadBearing, FireRating, ThermalTransmittance |
| Cost | UnitCost, TotalCost, Currency |

---

## 🧪 Testing

```typescript
// Unit test
describe('PropertiesPanelService', () => {
  beforeEach(() => {
    PropertiesPanelService.clearCache();
  });

  test('setProperties stores properties', async () => {
    const props: PropertySet[] = [
      {
        name: 'TestPset',
        properties: [
          { name: 'TestProp', value: 'test', type: 'string' }
        ]
      }
    ];

    PropertiesPanelService.setProperties(1, 'IFCWALL', props);
    const result = await PropertiesPanelService.getProperties(1);
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('TestPset');
  });

  test('updateProperty updates value', async () => {
    const props: PropertySet[] = [
      {
        name: 'TestPset',
        properties: [
          { name: 'TestProp', value: 'old', type: 'string' }
        ]
      }
    ];

    PropertiesPanelService.setProperties(1, 'IFCWALL', props);
    
    await PropertiesPanelService.updateProperty(1, {
      name: 'TestProp',
      value: 'new',
      type: 'string'
    });

    const result = await PropertiesPanelService.getProperties(1);
    expect(result[0].properties[0].value).toBe('new');
  });

  test('validateProperty validates required', () => {
    const result = PropertiesPanelService.validateProperty(null, { required: true });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Property is required');
  });
});
```

---

## 🚀 Próximos Passos

- [ ] Componente UI completo (React ou Vanilla JS)
- [ ] Integração com backend para persistência
- [ ] Edição em lote (múltiplos elementos)
- [ ] Propriedades computadas/calculadas
- [ ] Templates por tipo de elemento (IFCWALL, IFCBEAM, etc)
- [ ] Importação/exportação de propriedades (CSV, Excel)
- [ ] Auditoria completa com LoggingService
- [ ] Propriedades federadas (cross-model)
- [ ] Sincronização real-time
- [ ] API de pesquisa/filtros avançados

---

## 📚 References

- [Frontend Types](../frontend/src/shared/components/ui/panels/properties-panel.types.ts)
- [Frontend Service](../frontend/src/shared/components/ui/panels/properties-panel.service.ts)
- [IFC Property Sets](https://standards.buildingsmart.org/IFC/RELEASE/IFC4/ADD2_TC1/HTML/)
- [BuildingSMART Data Dictionary](https://www.buildingsmart.org/users/services/buildingsmart-data-dictionary/)
