import React, { useEffect, useState } from 'react';

export interface ToastProps {
  id?: string;
  title?: string;
  message: string;
  variant?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  id,
  title,
  message,
  variant = 'info',
  duration = 5000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose?.(), 300);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const variantStyles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const iconMap = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  if (!isVisible) return null;

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg border shadow-lg
        transition-all duration-300 ease-in-out
        ${variantStyles[variant]}
      `}
      role="alert"
      aria-live="polite"
    >
      <span className="text-lg" aria-hidden="true">
        {iconMap[variant]}
      </span>
      <div className="flex-1">
        {title && <h4 className="font-semibold mb-1">{title}</h4>}
        <p className="text-sm">{message}</p>
      </div>
      {onClose && (
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onClose(), 300);
          }}
          className="text-current opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Fechar notificação"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

export interface ToastContainerProps {
  toasts: ToastProps[];
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  position = 'top-right',
}) => {
  const positionStyles = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  };

  return (
    <div
      className={`fixed z-50 flex flex-col gap-2 max-w-sm w-full ${positionStyles[position]}`}
      role="region"
      aria-label="Notificações"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} />
      ))}
    </div>
  );
};

export default Toast;
