import { initializeAPI } from '../../api/v1/client';
import { resolveApiBaseUrl } from '../../config/apiBaseUrl';
import { SharedViewer } from '../../viewer/SharedViewer';

async function bootstrap() {
  console.log('[SharedMain] Bootstrapping shared viewer...');

  // Initialize API client
  const apiBaseUrl = resolveApiBaseUrl();
  initializeAPI({ baseURL: apiBaseUrl });
  console.log('[SharedMain] API client initialized with baseURL:', apiBaseUrl);

  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  if (!token) {
    showError('Token não fornecido', 'Por favor, acesse o link completo contendo o token de compartilhamento.');
    return;
  }

  try {
    const container = document.querySelector('.shared-container') as HTMLElement;
    const canvas = document.getElementById('viewer-canvas') as HTMLCanvasElement;
    
    if (!container || !canvas) {
      throw new Error('Container do visualizador não encontrado no DOM');
    }

    const viewer = new SharedViewer(container, canvas);
    await viewer.initialize(token);
  } catch (err: any) {
    console.error('[SharedMain] Error during bootstrap:', err);
    showError('Erro ao carregar visualizador', err.message || 'Ocorreu um erro desconhecido.');
  }
}

function showError(title: string, desc: string) {
  // Remove loading overlay
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'none';

  const overlay = document.createElement('div');
  overlay.className = 'error-overlay';
  overlay.innerHTML = `
    <div class="error-card">
      <div class="error-icon">⚠️</div>
      <h2 class="error-title">${title}</h2>
      <p class="error-desc">${desc}</p>
    </div>
  `;
  document.body.appendChild(overlay);
}

// Start application
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
