import React from 'react';
import ReactDOM from 'react-dom/client';
import { initializeAPI } from '../../api/v1/client';
import { resolveApiBaseUrl } from '../../config/apiBaseUrl';
import { isAuthenticated } from '../../core/auth/session';
import Dashboard from '../pages/Dashboard';

function enforceAuthOrRedirect(): boolean {
  if (isAuthenticated()) return true;
  window.location.replace('/login.html?next=/dashboard.html');
  return false;
}

async function init() {
  if (!enforceAuthOrRedirect()) return;

  initializeAPI({ baseURL: resolveApiBaseUrl() });

  document.getElementById('loading')?.remove();
  document.getElementById('app')?.classList.add('ready');

  const root = document.getElementById('dashboard-root');
  if (root) {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <Dashboard />
      </React.StrictMode>
    );
  }
}

init();
