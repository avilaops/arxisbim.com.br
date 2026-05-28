/**
 * Application Initializer
 * Inicializa API client, autenticação e configurações globais
 */

import { createAPIClient, getAPIClient } from './api';
// Autenticação removida para uso anônimo

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Inicializa aplicação
 */
export async function initializeApp(): Promise<void> {
  console.log('[App] Initializing ArxisVR...');

  // 1. Criar API Client
  const apiClient = createAPIClient(API_BASE_URL);
  console.log('[App] API Client created:', API_BASE_URL);

  // Inicialização sempre em modo anônimo
  console.log('[App] Usuário anônimo, inicializando app em modo demonstração');
  startApplication();
}

/**
 * Mostra tela de login
 */
// showLoginScreen removido: login desabilitado

/**
 * Inicia aplicação principal
 */
function startApplication(): void {
  console.log('[App] Starting main application...');
  
  // Disparar evento customizado para outros módulos
  window.dispatchEvent(new CustomEvent('app:ready', {
    detail: {
      user: getAuthManager().getUser(),
      apiUrl: API_BASE_URL,
    }
  }));

  // TODO: Inicializar outros sistemas
  // - Engine 3D
  // - UI Components
  // - Project Manager
  // - Virtual Meetings
}

/**
 * Para aplicação (usado em logout)
 */
export function shutdownApp(): void {
  console.log('[App] Shutting down...');
  
  // Disparar evento de shutdown
  window.dispatchEvent(new Event('app:shutdown'));
  
  // Recarregar página
  setTimeout(() => {
    window.location.reload();
  }, 500);
}

// Auto-inicializar ao carregar módulo
if (typeof window !== 'undefined') {
  // Aguardar DOM carregar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeApp();
    });
  } else {
    initializeApp();
  }
}
