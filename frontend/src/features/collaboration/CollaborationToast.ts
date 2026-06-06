/**
 * CollaborationToast — notificações animadas de entrada/saída de participantes
 *
 * Uso:
 *   CollaborationToast.show('👤 João entrou', 'join')
 *   CollaborationToast.show('👋 Maria saiu',  'leave')
 *   CollaborationToast.show('📍 Seguindo X',  'info')
 */

type ToastType = 'join' | 'leave' | 'info';

const TYPE_COLORS: Record<ToastType, string> = {
  join:  '#34d399',  // verde
  leave: '#f87171',  // vermelho suave
  info:  '#60a5fa',  // azul
};

let container: HTMLDivElement | null = null;

function getContainer(): HTMLDivElement {
  if (container && document.body.contains(container)) return container;

  container = document.createElement('div');
  container.id = 'collab-toast-container';
  container.style.cssText = `
    position: fixed;
    top: 72px;
    right: 16px;
    z-index: 99999;
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: none;
  `;
  document.body.appendChild(container);
  return container;
}

export class CollaborationToast {
  static show(message: string, type: ToastType = 'info', durationMs = 3500): void {
    const c = getContainer();
    const color = TYPE_COLORS[type];

    const toast = document.createElement('div');
    toast.style.cssText = `
      background: rgba(15,23,42,0.93);
      border: 1px solid ${color};
      border-left: 3px solid ${color};
      color: #f1f5f9;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      font-family: Inter, system-ui, sans-serif;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      backdrop-filter: blur(8px);
      opacity: 0;
      transform: translateX(20px);
      transition: opacity 0.25s ease, transform 0.25s ease;
      max-width: 280px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
    toast.textContent = message;
    c.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
      });
    });

    // Animate out and remove
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      setTimeout(() => toast.remove(), 300);
    }, durationMs);
  }
}
