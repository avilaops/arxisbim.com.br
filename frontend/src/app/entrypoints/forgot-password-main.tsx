import '../../i18n';
import React from 'react';
import ReactDOM from 'react-dom/client';
import ForgotPasswordPage from '../../features/auth/pages/ForgotPasswordPage';
import { initializeAPI } from '../../api/v1';
import { resolveApiBaseUrl } from '../../config/apiBaseUrl';
import '../../styles/tokens.css';
import '../../styles/login.css';

initializeAPI({
  baseURL: resolveApiBaseUrl(),
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ForgotPasswordPage />
  </React.StrictMode>
);
