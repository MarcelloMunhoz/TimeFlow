import { cn } from "@/lib/utils";
import { ReactNode } from "react";

// Enhanced spacing system
export const spacing = {
  xs: "0.25rem",
  sm: "0.5rem", 
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
  "2xl": "3rem",
} as const;

// Typography components
interface TypographyProps {
  children: ReactNode;
  className?: string;
}

export function PageTitle({ children, className }: TypographyProps) {
  return (
    <h1 className={cn("text-3xl lg:text-4xl font-bold tracking-tight text-foreground", className)}>
      {children}
    </h1>
  );
}

export function SectionTitle({ children, className }: TypographyProps) {
  return (
    <h2 className={cn("text-2xl lg:text-3xl font-semibold tracking-tight text-foreground", className)}>
      {children}
    </h2>
  );
}

export function BodyText({ children, className }: TypographyProps) {
  return (
    <p className={cn("text-base text-muted-foreground leading-relaxed", className)}>
      {children}
    </p>
  );
}

// Layout components
interface ContainerProps {
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

export function Container({ children, className, size = "xl" }: ContainerProps) {
  const sizeClasses = {
    sm: "max-w-2xl",
    md: "max-w-4xl", 
    lg: "max-w-6xl",
    xl: "max-w-7xl",
    full: "max-w-full"
  };

  return (
    <div className={cn("mx-auto px-4 sm:px-6 lg:px-8", sizeClasses[size], className)}>
      {children}
    </div>
  );
}

interface SectionProps {
  children: ReactNode;
  className?: string;
  spacing?: "tight" | "normal" | "loose";
}

export function Section({ children, className, spacing = "normal" }: SectionProps) {
  const spacingClasses = {
    tight: "py-4",
    normal: "py-8",
    loose: "py-12"
  };

  return (
    <section className={cn(spacingClasses[spacing], className)}>
      {children}
    </section>
  );
}

// Enhanced Card components
interface EnhancedCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "elevated" | "interactive" | "bordered";
  padding?: "sm" | "md" | "lg";
}

export function EnhancedCard({ 
  children, 
  className, 
  variant = "default",
  padding = "md" 
}: EnhancedCardProps) {
  const variantClasses = {
    default: "bg-card border shadow-sm",
    elevated: "bg-card border shadow-md hover:shadow-lg transition-shadow",
    interactive: "bg-card border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer",
    bordered: "bg-card border-2 border-border"
  };

  const paddingClasses = {
    sm: "p-4",
    md: "p-6", 
    lg: "p-8"
  };

  return (
    <div className={cn(
      "rounded-xl text-card-foreground",
      variantClasses[variant],
      paddingClasses[padding],
      className
    )}>
      {children}
    </div>
  );
}

// Grid system
interface GridProps {
  children: ReactNode;
  className?: string;
  cols?: 1 | 2 | 3 | 4 | 6;
  gap?: "sm" | "md" | "lg";
  responsive?: boolean;
}

export function Grid({ 
  children, 
  className, 
  cols = 1, 
  gap = "md",
  responsive = true 
}: GridProps) {
  const colClasses = responsive ? {
    1: "grid-cols-1",
    2: "grid-cols-1 lg:grid-cols-2", 
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
  } : {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3", 
    4: "grid-cols-4",
    6: "grid-cols-6"
  };

  const gapClasses = {
    sm: "gap-3",
    md: "gap-4",
    lg: "gap-6"
  };

  return (
    <div className={cn("grid", colClasses[cols], gapClasses[gap], className)}>
      {children}
    </div>
  );
}

// Animation wrapper
interface AnimatedProps {
  children: ReactNode;
  animation?: "fade" | "slide" | "scale";
  className?: string;
}

export function Animated({ children, animation = "fade", className }: AnimatedProps) {
  const animationClasses = {
    fade: "animate-fade-in",
    slide: "animate-slide-up", 
    scale: "animate-scale-in"
  };

  return (
    <div className={cn(animationClasses[animation], className)}>
      {children}
    </div>
  );
}

// Loading components
export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse bg-muted rounded", className)} />
  );
}
