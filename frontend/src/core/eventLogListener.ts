// Listener global para eventos críticos via EventBus
import { on } from './eventBus.simple';

on('event:log', (evt) => {
  // Aqui pode ser integrado com Sentry, Datadog, etc.
  console.log('[event:log]', evt);
  // Exemplo: window.Sentry?.captureMessage(JSON.stringify(evt));
});
