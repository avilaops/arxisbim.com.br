import React from 'react';

export interface PanelProps {
  title?: string;
  onClose?: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'glass' | 'elevated';
  children?: React.ReactNode;
  className?: string;
}

export const Panel: React.FC<PanelProps> = ({
  title,
  onClose,
  size = 'md',
  variant = 'default',
  children,
  className = '',
}) => {
  const sizeStyles = {
    sm: 'w-64 max-w-full',
    md: 'w-96 max-w-full',
    lg: 'w-[600px] max-w-full',
    xl: 'w-[800px] max-w-full',
  };
  
  const variantStyles = {
    default: 'bg-white border border-gray-200',
    glass: 'bg-white/80 backdrop-blur-md border border-white/20',
    elevated: 'bg-white shadow-lg border border-gray-200',
  };
  
  return (
    <div
      className={`rounded-lg shadow-md ${variantStyles[variant]} ${sizeStyles[size]} ${className} mx-auto sm:mx-0`}
      role="region"
      aria-labelledby={title ? 'panel-title' : undefined}
    >
      {title && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 id="panel-title" className="text-lg font-semibold text-gray-900">
            {title}
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-100"
              aria-label="Fechar painel"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}
      <div className="p-4 sm:p-6">
        {children}
      </div>
    </div>
  );
};

export default Panel;
