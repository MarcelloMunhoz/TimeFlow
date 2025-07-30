import React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface StableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface StableDialogContentProps {
  children: React.ReactNode;
  className?: string;
}

interface StableDialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface StableDialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface StableDialogTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export function StableDialog({ open, onOpenChange, children }: StableDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/80" 
        onClick={() => onOpenChange(false)}
      />
      
      {/* Content */}
      <div className="relative z-50">
        {children}
      </div>
    </div>
  );
}

export function StableDialogContent({ children, className }: StableDialogContentProps) {
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

export function StableDialogHeader({ children, className }: StableDialogHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col space-y-1.5 text-center sm:text-left",
        className
      )}
    >
      {children}
    </div>
  );
}

export function StableDialogTitle({ children, className }: StableDialogTitleProps) {
  return (
    <h3
      className={cn(
        "text-lg font-semibold leading-none tracking-tight",
        className
      )}
    >
      {children}
    </h3>
  );
}

export function StableDialogTrigger({ children }: StableDialogTriggerProps) {
  // This is just a passthrough for the trigger element
  return <>{children}</>;
}

// Compatibility exports
export const Dialog = StableDialog;
export const DialogContent = StableDialogContent;
export const DialogHeader = StableDialogHeader;
export const DialogTitle = StableDialogTitle;
export const DialogTrigger = StableDialogTrigger;
