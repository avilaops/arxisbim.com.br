/**
 * Panels v2 - Registry para lazy loading
 * 
 * Apenas exporta o panelRegistry.
 * Para importar panels específicos, importe diretamente do arquivo:
 * import { IFCPropertyPanel } from './panels-v2/IFCPropertyPanel';
 */

/**
 * Registry de panels para lazy loading
 * dock: 'left' | 'right' | 'bottom'
 */
export const panelRegistry = {
  // Property & Explorer (right)
  'IFCPropertyPanel': { factory: () => import('./IFCPropertyPanel').then(m => m.IFCPropertyPanel), dock: 'right' as const },
  'ProjectExplorer': { factory: () => import('./ProjectExplorer').then(m => m.ProjectExplorer), dock: 'left' as const },
  
  // Visual Controls (right)
  'LayersPanel': { factory: () => import('./LayersPanel').then(m => m.LayersPanel), dock: 'right' as const },
  'MaterialEditor': { factory: () => import('./MaterialEditor').then(m => m.MaterialEditor), dock: 'right' as const },
  'LightingPanel': { factory: () => import('./LightingPanel').then(m => m.LightingPanel), dock: 'right' as const },
  'CameraPresetsPanel': { factory: () => import('./CameraPresetsPanel').then(m => m.CameraPresetsPanel), dock: 'right' as const },
  'TransparencyControl': { factory: () => import('./TransparencyControl').then(m => m.TransparencyControl), dock: 'right' as const },
  
  // Tools (right)
  'MeasurementPanel': { factory: () => import('./MeasurementPanel').then(m => m.MeasurementPanel), dock: 'right' as const },
  'SectionBoxTool': { factory: () => import('./SectionBoxTool').then(m => m.SectionBoxTool), dock: 'right' as const },
  'ClippingPlanesEditor': { factory: () => import('./ClippingPlanesEditor').then(m => m.ClippingPlanesEditor), dock: 'right' as const },
  'ExplodeViewPanel': { factory: () => import('./ExplodeViewPanel').then(m => m.ExplodeViewPanel), dock: 'right' as const },
  
  // Timeline & Schedule (bottom)
  'TimelinePanel': { factory: () => import('./TimelinePanel').then(m => m.TimelinePanel), dock: 'bottom' as const },
  'SchedulePanel': { factory: () => import('./SchedulePanel').then(m => m.SchedulePanel), dock: 'bottom' as const },
  
  // Cost & Quantities (right)
  'CostDashboard': { factory: () => import('./CostDashboard').then(m => m.CostDashboard), dock: 'right' as const },
  'QuantitiesPanel': { factory: () => import('./QuantitiesPanel').then(m => m.QuantitiesPanel), dock: 'right' as const },
  
  // Facility & Maintenance (right)
  'FacilityPanel': { factory: () => import('./FacilityPanel').then(m => m.FacilityPanel), dock: 'right' as const },
  'MaintenancePanel': { factory: () => import('./MaintenancePanel').then(m => m.MaintenancePanel), dock: 'right' as const },
  
  // Collaboration (right)
  'ChatPanel': { factory: () => import('./ChatPanel').then(m => m.ChatPanel), dock: 'right' as const },
  'AnnotationsPanel': { factory: () => import('./AnnotationsPanel').then(m => m.AnnotationsPanel), dock: 'right' as const },
  'IssuesPanel': { factory: () => import('./IssuesPanel').then(m => m.IssuesPanel), dock: 'right' as const },
  'UserPresenceWidget': { factory: () => import('./UserPresenceWidget').then(m => m.UserPresenceWidget), dock: 'right' as const },
  'ActivityFeed': { factory: () => import('./ActivityFeed').then(m => m.ActivityFeed), dock: 'right' as const },
  
  // Search & Filter (left)
  'AdvancedSearchPanel': { factory: () => import('./AdvancedSearchPanel').then(m => m.AdvancedSearchPanel), dock: 'left' as const },
  'FilterBuilder': { factory: () => import('./FilterBuilder').then(m => m.FilterBuilder), dock: 'left' as const },
  'SavedFiltersPanel': { factory: () => import('./SavedFiltersPanel').then(m => m.SavedFiltersPanel), dock: 'left' as const },
  'SelectionSetsPanel': { factory: () => import('./SelectionSetsPanel').then(m => m.SelectionSetsPanel), dock: 'left' as const },
  'FileBrowser': { factory: () => import('./FileBrowser').then(m => m.FileBrowser), dock: 'left' as const },
};
