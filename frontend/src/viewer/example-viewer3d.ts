// Exemplo mínimo de uso do ViewerHost
import { ViewerHost } from './ViewerHost';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('canvas3d');
  if (!container) {
    throw new Error('Elemento #canvas3d não encontrado');
  }
  // Inicializa o ViewerHost
  const viewer = new ViewerHost(container);
  // Exemplo: alternar modo de controle
  viewer.setControlMode('orbit');
  // Destruir viewer ao sair
  window.addEventListener('beforeunload', () => viewer.destroy());
});
