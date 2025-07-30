// DOM-safe replacements for problematic Radix UI components
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

// Safe Dialog replacement
interface SafeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function SafeDialog({ open, onOpenChange, children }: SafeDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-black/80" 
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-50">
        {children}
      </div>
    </div>
  );
}

export function SafeDialogContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

export function SafeDialogHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}>
      {children}
    </div>
  );
}

export function SafeDialogTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn("text-lg font-semibold leading-none tracking-tight", className)}>
      {children}
    </h3>
  );
}

export function SafeDialogTrigger({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// Safe Select replacement
interface SafeSelectProps {
  value: string | number;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function SafeSelect({ value, onValueChange, children, className, disabled }: SafeSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      disabled={disabled}
    >
      {children}
    </select>
  );
}

export function SafeSelectTrigger({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function SafeSelectContent({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function SafeSelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  return <option value={value}>{children}</option>;
}

export function SafeSelectValue({ placeholder }: { placeholder?: string }) {
  return null; // Not needed for native select
}

// Safe Form components (simplified)
export function SafeForm({ children, ...props }: { children: React.ReactNode; [key: string]: any }) {
  return <div {...props}>{children}</div>;
}

export function SafeFormField({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function SafeFormItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("space-y-2", className)}>{children}</div>;
}

export function SafeFormLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)}>{children}</label>;
}

export function SafeFormControl({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function SafeFormMessage({ children, className }: { children?: React.ReactNode; className?: string }) {
  if (!children) return null;
  return <p className={cn("text-sm font-medium text-destructive", className)}>{children}</p>;
}
