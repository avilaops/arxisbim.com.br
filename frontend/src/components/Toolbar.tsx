import React from 'react';

export interface ToolbarProps {
  children?: React.ReactNode;
  variant?: 'default' | 'elevated' | 'glass';
  className?: string;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  children,
  variant = 'default',
  className = '',
}) => {
  const variantStyles = {
    default: 'bg-white border border-gray-200',
    elevated: 'bg-white shadow-md border border-gray-200',
    glass: 'bg-white/80 backdrop-blur-md border border-white/20',
  };
  
  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-md ${variantStyles[variant]} ${className}`}
      role="toolbar"
      aria-label="Barra de ferramentas"
    >
      {children}
    </div>
  );
};

export const ToolbarSeparator: React.FC = () => (
  <div className="w-px h-6 bg-gray-300 mx-1" role="separator" aria-orientation="vertical" />
);

export const ToolbarGroup: React.FC<{ children: React.ReactNode; label?: string }> = ({ 
  children, 
  label 
}) => (
  <div className="flex items-center gap-2" role="group" aria-label={label}>
    {children}
  </div>
);

export default Toolbar;
