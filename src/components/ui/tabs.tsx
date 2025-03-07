import * as React from "react"

export interface TabsProps {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  className?: string
  children: React.ReactNode
}

export interface TabsListProps {
  className?: string
  children: React.ReactNode
}

export interface TabsTriggerProps {
  value: string
  className?: string
  children: React.ReactNode
}

export interface TabsContentProps {
  value: string
  className?: string
  children: React.ReactNode
}

export const Tabs: React.FC<TabsProps> = ({
  defaultValue,
  value,
  onValueChange,
  className = "",
  children
}) => {
  const [selectedTab, setSelectedTab] = React.useState(value || defaultValue || "");

  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedTab(value);
    }
  }, [value]);

  const handleValueChange = (tabValue: string) => {
    if (value === undefined) {
      setSelectedTab(tabValue);
    }
    if (onValueChange) {
      onValueChange(tabValue);
    }
  };

  return (
    <div className={className} data-state={selectedTab ? "active" : "inactive"}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            selectedValue: selectedTab,
            onSelect: handleValueChange
          });
        }
        return child;
      })}
    </div>
  );
};

export const TabsList: React.FC<TabsListProps & { selectedValue?: string, onSelect?: (value: string) => void }> = ({
  className = "",
  children,
  selectedValue,
  onSelect
}) => {
  return (
    <div className={`flex gap-2 border-b ${className}`}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            selectedValue,
            onSelect
          });
        }
        return child;
      })}
    </div>
  );
};

export const TabsTrigger: React.FC<TabsTriggerProps & { selectedValue?: string, onSelect?: (value: string) => void }> = ({
  value,
  className = "",
  children,
  selectedValue,
  onSelect
}) => {
  const isSelected = selectedValue === value;
  
  return (
    <button
      className={`py-2 border-b-2 ${isSelected ? 'border-blue-500 text-blue-600 font-medium' : 'border-transparent text-gray-600 hover:text-gray-900'} ${className}`}
      data-state={isSelected ? "active" : "inactive"}
      onClick={() => onSelect && onSelect(value)}
      type="button"
    >
      {children}
    </button>
  );
};

export const TabsContent: React.FC<TabsContentProps & { selectedValue?: string }> = ({
  value,
  className = "",
  children,
  selectedValue
}) => {
  const isSelected = selectedValue === value;
  
  if (!isSelected) {
    return null;
  }
  
  return (
    <div
      className={`mt-4 ${className}`}
      data-state={isSelected ? "active" : "inactive"}
    >
      {children}
    </div>
  );
};