import React, { useState } from 'react';

export interface TabsProps {
  defaultValue?: string;
  children?: React.ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ defaultValue, children, className = '' }) => {
  const [activeTab, setActiveTab] = useState(defaultValue || '');

  return (
    <div className={className}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            activeTab,
            setActiveTab,
          });
        }
        return child;
      })}
    </div>
  );
};

export interface TabsListProps {
  children?: React.ReactNode;
  activeTab?: string;
  setActiveTab?: (value: string) => void;
  className?: string;
}

export const TabsList: React.FC<TabsListProps> = ({ children, activeTab, setActiveTab, className = '' }) => (
  <div
    className={`flex border-b border-gray-200 ${className}`}
    role="tablist"
  >
    {React.Children.map(children, (child) => {
      if (React.isValidElement(child)) {
        return React.cloneElement(child as React.ReactElement<any>, {
          activeTab,
          setActiveTab,
        });
      }
      return child;
    })}
  </div>
);

export interface TabTriggerProps {
  value: string;
  children: React.ReactNode;
  activeTab?: string;
  setActiveTab?: (value: string) => void;
  disabled?: boolean;
}

export const TabTrigger: React.FC<TabTriggerProps> = ({
  value,
  children,
  activeTab,
  setActiveTab,
  disabled = false,
}) => {
  const isActive = activeTab === value;

  return (
    <button
      onClick={() => !disabled && setActiveTab?.(value)}
      disabled={disabled}
      className={`
        px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px
        ${isActive
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      role="tab"
      aria-selected={isActive}
      aria-disabled={disabled}
    >
      {children}
    </button>
  );
};

export interface TabContentProps {
  value: string;
  children: React.ReactNode;
  activeTab?: string;
}

export const TabContent: React.FC<TabContentProps> = ({ value, children, activeTab }) => {
  if (activeTab !== value) return null;

  return (
    <div className="py-4" role="tabpanel">
      {children}
    </div>
  );
};

export default Tabs;
