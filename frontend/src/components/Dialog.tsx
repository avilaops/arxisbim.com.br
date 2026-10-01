import React from 'react';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  children,
  size = 'md',
}) => {
  const sizeStyles = {
    sm: 'max-w-sm w-full',
    md: 'max-w-md w-full',
    lg: 'max-w-lg w-full',
    xl: 'max-w-xl w-full',
  };
  
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };
  
  // O `if (!open) return null` ficava ANTES deste efeito, então o hook só
  // rodava com o diálogo aberto e sumia ao fechar. React conta hooks por
  // posição: a contagem mudando entre renders é justamente o que dispara
  // "Rendered fewer hooks than expected". O efeito agora roda sempre e a
  // saída antecipada foi para depois dele, no return.
  React.useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;
  
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'dialog-title' : undefined}
    >
      <div
        className={`bg-white rounded-lg shadow-xl ${sizeStyles[size]} w-full mx-4`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200">
            <h2 id="dialog-title" className="text-base sm:text-lg font-semibold text-gray-900">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-100"
              aria-label="Fechar diálogo"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="px-4 py-3 sm:px-6 sm:py-4">
          {children}
        </div>
      </div>
    </div>
  );
};

export const DialogTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-lg font-semibold text-gray-900 mb-2">{children}</h3>
);

export const DialogContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-gray-600">{children}</div>
);

export const DialogActions: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
    {children}
  </div>
);

export default Dialog;
