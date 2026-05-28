/**
 * Advanced Selection Module
 * 
 * Sistema completo de seleção avançada com filtros, conjuntos salvos e API simplificada
 */

export { 
  SelectionFilters,
  selectionFilters,
  FilterType,
  FilterOperator,
  type SelectionFilter,
  type FilterableElement,
  type FilterResult
} from './SelectionFilters';

export {
  SelectionSets,
  selectionSets,
  type SelectionSet,
  type ElementIdentifier,
  type SelectionSetStats
} from './SelectionSets';

export {
  AdvancedSelectionTool,
  SelectionMode,
  createAdvancedSelectionTool,
  getAdvancedSelectionTool,
  type AdvancedSelectionEvent
} from './AdvancedSelectionTool';
