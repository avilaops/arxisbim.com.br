import '../../i18n';
import React from 'react';
import ReactDOM from 'react-dom/client';
import LoginPage from '../../features/auth/pages/LoginPage';
import { initializeAPI } from '../../api/v1';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '../../styles/tokens.css';
import '../../styles/login.css';

initializeAPI({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LoginPage />
  </React.StrictMode>
);
