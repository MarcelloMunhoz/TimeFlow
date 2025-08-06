import React from 'react';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';

interface ModernCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'inset' | 'glass';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
  pulse?: boolean;
}

interface ModernCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface ModernCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface ModernCardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

interface ModernCardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

const ModernCard = React.forwardRef<HTMLDivElement, ModernCardProps>(
  ({ 
    children, 
    className, 
    variant = 'default', 
    size = 'md', 
    hover = true, 
    pulse = false,
    ...props 
  }, ref) => {
    const { designPattern, getCardClasses } = useTheme();

    const getVariantClasses = () => {
      if (designPattern === 'neomorphism') {
        switch (variant) {
          case 'elevated':
            return 'neo-card'; // Usar neo-card para elevated no neomorfismo
          case 'inset':
            return 'neo-inset';
          case 'glass':
            return 'glass-card';
          default:
            return 'neo-card';
        }
      } else if (designPattern === 'glassmorphism') {
        return 'glass-card';
      } else {
        // Standard design
        switch (variant) {
          case 'elevated':
            return 'bg-theme-secondary border border-gray-200 shadow-lg';
          case 'inset':
            return 'bg-theme-tertiary border border-gray-300 shadow-inner';
          case 'glass':
            return 'bg-theme-secondary/80 backdrop-blur border border-gray-200/50';
          default:
            return 'bg-theme-secondary border border-gray-200 shadow-sm';
        }
      }
    };

    const getSizeClasses = () => {
      switch (size) {
        case 'sm':
          return 'p-3';
        case 'lg':
          return 'p-6';
        case 'xl':
          return 'p-8';
        default:
          return 'p-4';
      }
    };

    const getHoverClasses = () => {
      if (!hover) return '';
      
      if (designPattern === 'neomorphism') {
        return 'hover:shadow-lg hover:-translate-y-1';
      } else if (designPattern === 'glassmorphism') {
        return 'hover:bg-opacity-40 hover:-translate-y-1';
      } else {
        return 'hover:shadow-md hover:-translate-y-1';
      }
    };

    const getPulseClasses = () => {
      return pulse ? 'neo-pulse' : '';
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg transition-all duration-300 ease-in-out',
          getVariantClasses(),
          getSizeClasses(),
          getHoverClasses(),
          getPulseClasses(),
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

const ModernCardHeader = React.forwardRef<HTMLDivElement, ModernCardHeaderProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex flex-col space-y-1.5 pb-3', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

const ModernCardTitle = React.forwardRef<HTMLHeadingElement, ModernCardTitleProps>(
  ({ children, className, as: Component = 'h3', ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(
          'text-lg font-semibold leading-none tracking-tight text-theme-primary',
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

const ModernCardDescription = React.forwardRef<HTMLParagraphElement, ModernCardDescriptionProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn('text-sm text-theme-muted', className)}
        {...props}
      >
        {children}
      </p>
    );
  }
);

const ModernCardContent = React.forwardRef<HTMLDivElement, ModernCardContentProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('text-theme-primary', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ModernCard.displayName = 'ModernCard';
ModernCardHeader.displayName = 'ModernCardHeader';
ModernCardTitle.displayName = 'ModernCardTitle';
ModernCardDescription.displayName = 'ModernCardDescription';
ModernCardContent.displayName = 'ModernCardContent';

export {
  ModernCard,
  ModernCardHeader,
  ModernCardTitle,
  ModernCardDescription,
  ModernCardContent
};
