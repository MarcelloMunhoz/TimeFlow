import React from 'react';
import { cn } from '@/lib/utils';

interface StableSelectProps {
  value: string | number;
  onValueChange: (value: string) => void;
  placeholder?: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

interface StableSelectItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function StableSelect({ 
  value, 
  onValueChange, 
  placeholder, 
  children, 
  className,
  disabled = false 
}: StableSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      disabled={disabled}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {children}
    </select>
  );
}

export function StableSelectItem({ value, children, className }: StableSelectItemProps) {
  return (
    <option value={value} className={className}>
      {children}
    </option>
  );
}

// Compatibility exports to match Radix UI API
export const StableSelectTrigger = StableSelect;
export const StableSelectContent = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const StableSelectValue = ({ placeholder }: { placeholder?: string }) => null; // Not needed for native select
