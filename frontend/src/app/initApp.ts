import { mountSidebarPanels } from './mountPanels';
// Função principal de inicialização do ArxisVR App
import { ViewerHost } from '../viewer/ViewerHost';
// ...importações dos serviços e painéis

export async function initApp() {
  // Inicialização do viewer
  const canvasEl = document.getElementById('viewer-canvas');
  if (!canvasEl) {
    console.error('Canvas principal não encontrado!');
    return;
  }
  const viewerHost = new ViewerHost(canvasEl);
  window.__viewerHost = viewerHost;
  console.log('ViewerHost inicializado');


  // Montar painéis dinâmicos na sidebar
  mountSidebarPanels(viewerHost);

  // Exemplo: esconder loading e mostrar app
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'none';
  const app = document.getElementById('app');
  if (app) app.style.display = 'grid';

  // TODO: Migrar e conectar lógica dos painéis, interações e serviços
}
