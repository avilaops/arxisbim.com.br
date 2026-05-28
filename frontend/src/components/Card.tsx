import React from 'react';

export interface CardProps {
  children?: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  // Render prop pattern for custom content rendering
  renderHeader?: () => React.ReactNode;
  renderFooter?: () => React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  renderHeader,
  renderFooter,
}) => {
  const variantStyles = {
    default: 'bg-white border border-gray-200',
    elevated: 'bg-white shadow-md border border-gray-200',
    outlined: 'bg-white border-2 border-gray-300',
  };

  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <div
      className={`rounded-lg ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
    >
      {renderHeader && <div className="mb-4">{renderHeader()}</div>}
      {children}
      {renderFooter && <div className="mt-4 pt-4 border-t border-gray-200">{renderFooter()}</div>}
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`mb-4 ${className}`}>
    {children}
  </div>
);

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>
    {children}
  </h3>
);

export const CardDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <p className={`text-sm text-gray-600 mt-1 ${className}`}>
    {children}
  </p>
);

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={className}>
    {children}
  </div>
);

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`mt-4 pt-4 border-t border-gray-200 ${className}`}>
    {children}
  </div>
);

export default Card;
