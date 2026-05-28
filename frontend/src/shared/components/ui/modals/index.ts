/**
 * UI Modals - Registry para lazy loading
 * 
 * Apenas exporta o modalRegistry.
 * Para importar modals específicos, importe diretamente do arquivo:
 * import { LoadFileModal } from './modals/LoadFileModal';
 */

/**
 * Registry de modals para lazy loading
 * Retorna factory que cria instância do modal
 */
export const modalRegistry: Record<string, () => Promise<any>> = {
  'AboutModal': () => import('./AboutModal').then(m => new m.AboutModal()),
  'LoadFileModal': () => import('./LoadFileModal-v2').then(m => new m.LoadFileModal()),
  'SettingsModal': () => import('./SettingsModal').then(m => new m.SettingsModal()),
  'ShortcutsModal': () => import('./ShortcutsModal').then(m => new m.ShortcutsModal()),
  'ShareModal': () => import('./ShareModal').then(m => new m.ShareModal()),
  'ExportModal': () => import('./ExportModal').then(m => new m.ExportModal()),
  'ThemeSelectorModal': () => import('./ThemeSelectorModal').then(m => new m.ThemeSelectorModal()),
  'NetworkConnectModal': () => import('./NetworkConnectModal').then(m => new m.NetworkConnectModal()),
  'VersionCompareModal': () => import('./VersionCompareModal').then(m => new m.VersionCompareModal()),
  'ConflictDetectionModal': () => import('./ConflictDetectionModal').then(m => new m.ConflictDetectionModal()),
  'ReportGeneratorModal': () => import('./ReportGeneratorModal').then(m => new m.ReportGeneratorModal())
};


