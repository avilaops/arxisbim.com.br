import React, { useState, useRef, useEffect } from 'react';

export interface MenuProps {
  trigger: React.ReactNode;
  children?: React.ReactNode;
  align?: 'left' | 'right';
}

export const Menu: React.FC<MenuProps> = ({ trigger, children, align = 'left' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const alignStyles = {
    left: 'left-0',
    right: 'right-0',
  };

  return (
    <div className="relative inline-block">
      <div ref={triggerRef} onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      {isOpen && (
        <div
          ref={menuRef}
          className={`absolute top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-50 min-w-[160px] ${alignStyles[align]}`}
          role="menu"
        >
          {children}
        </div>
      )}
    </div>
  );
};

export const MenuItem: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
}> = ({ children, onClick, disabled = false, danger = false }) => (
  <button
    onClick={() => {
      if (!disabled && onClick) {
        onClick();
      }
    }}
    disabled={disabled}
    className={`
      w-full text-left px-4 py-2 text-sm transition-colors
      ${disabled 
        ? 'text-gray-400 cursor-not-allowed' 
        : danger 
          ? 'text-red-600 hover:bg-red-50' 
          : 'text-gray-700 hover:bg-gray-100'
      }
    `}
    role="menuitem"
  >
    {children}
  </button>
);

export const MenuSeparator: React.FC = () => (
  <div className="my-1 border-t border-gray-200" role="separator" />
);

export default Menu;
