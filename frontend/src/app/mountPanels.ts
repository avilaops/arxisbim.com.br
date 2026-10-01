// Funções utilitárias para montar painéis dinâmicos na Sidebar
// Exemplo: ScenariosPanel, SectionsPanel, MeasurementsPanel, etc.

import { ViewerHost } from '../viewer/ViewerHost';

export function mountSidebarPanels(viewerHost: ViewerHost) {
  // Monta painéis nos elementos correspondentes
  // Exemplo: montar painel de cenários
  const scenariosMount = document.getElementById('scenarios-panel-mount');
  if (scenariosMount) {
    // @ts-expect-error - Supondo que ScenariosPanel já está disponível globalmente ou importado
    new window.ScenariosPanel(scenariosMount, { viewerHost });
  }
  // TODO: Montar demais painéis (SectionsPanel, MeasurementsPanel, etc)
}
