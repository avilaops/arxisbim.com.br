/**
 * Badge Component
 * Displays a small badge with count or status
 */

import React from 'react';

export interface BadgeProps {
  children?: React.ReactNode;
  count?: number;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  count,
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
}) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-full font-medium';
  
  const variantStyles = {
    default: 'bg-gray-500 text-white',
    primary: 'bg-blue-500 text-white',
    success: 'bg-green-500 text-white',
    warning: 'bg-yellow-500 text-white',
    danger: 'bg-red-500 text-white',
  };
  
  const sizeStyles = {
    sm: 'text-xs px-1.5 py-0.5 min-w-[1.25rem]',
    md: 'text-sm px-2 py-0.5 min-w-[1.5rem]',
    lg: 'text-base px-2.5 py-1 min-w-[1.75rem]',
  };
  
  const dotSizeStyles = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  };

  if (dot) {
    return (
      <span
        className={`${dotSizeStyles[size]} ${variantStyles[variant]} rounded-full ${className}`}
        aria-label="Status indicator"
      />
    );
  }

  return (
    <span
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      aria-label={count !== undefined ? `${count} items` : 'Badge'}
    >
      {count !== undefined ? count : children}
    </span>
  );
};

export default Badge;
