import React from 'react';

export interface ListProps {
  children?: React.ReactNode;
  className?: string;
}

export const List: React.FC<ListProps> = ({ children, className = '' }) => (
  <ul className={`divide-y divide-gray-200 ${className}`} role="list">
    {children}
  </ul>
);

export interface ListItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  className?: string;
}

export const ListItem: React.FC<ListItemProps> = ({
  children,
  onClick,
  selected = false,
  disabled = false,
  className = '',
}) => (
  <li
    onClick={!disabled ? onClick : undefined}
    className={`
      px-4 py-3 transition-colors
      ${selected ? 'bg-blue-50' : 'hover:bg-gray-50'}
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      ${className}
    `}
    role="listitem"
    aria-selected={selected}
    aria-disabled={disabled}
  >
    {children}
  </li>
);

export const ListHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`px-4 py-2 bg-gray-50 font-medium text-sm text-gray-700 ${className}`}>
    {children}
  </div>
);

export const ListEmpty: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <li className={`px-4 py-8 text-center text-gray-500 ${className}`}>
    {children}
  </li>
);

export default List;
