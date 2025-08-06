import React from 'react';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ModernButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const ModernButton = React.forwardRef<HTMLButtonElement, ModernButtonProps>(
  ({ 
    children, 
    className, 
    variant = 'primary', 
    size = 'md', 
    loading = false,
    icon,
    iconPosition = 'left',
    disabled,
    ...props 
  }, ref) => {
    const { designPattern, getButtonClasses } = useTheme();

    const getVariantClasses = () => {
      if (designPattern === 'neomorphism') {
        switch (variant) {
          case 'primary':
            return 'neo-button text-accent-blue hover:text-white hover:bg-accent-blue';
          case 'secondary':
            return 'neo-button text-theme-secondary';
          case 'outline':
            return 'neo-button border border-theme-muted text-theme-primary';
          case 'ghost':
            return 'neo-inset text-theme-primary hover:text-accent-blue';
          case 'destructive':
            return 'neo-button text-accent-red hover:text-white hover:bg-accent-red';
          default:
            return 'neo-button';
        }
      } else if (designPattern === 'glassmorphism') {
        switch (variant) {
          case 'primary':
            return 'glass text-white bg-accent-blue/80 hover:bg-accent-blue border border-accent-blue/30';
          case 'secondary':
            return 'glass text-theme-primary bg-theme-secondary/50 hover:bg-theme-secondary/70 border border-theme-muted/30';
          case 'outline':
            return 'glass text-theme-primary bg-transparent hover:bg-theme-secondary/30 border border-theme-muted/50';
          case 'ghost':
            return 'text-theme-primary hover:bg-theme-secondary/30 backdrop-blur-sm';
          case 'destructive':
            return 'glass text-white bg-accent-red/80 hover:bg-accent-red border border-accent-red/30';
          default:
            return 'glass';
        }
      } else {
        // Standard design
        switch (variant) {
          case 'primary':
            return 'bg-accent-blue text-white hover:bg-blue-600 shadow-sm';
          case 'secondary':
            return 'bg-theme-secondary text-theme-primary hover:bg-gray-100 border border-gray-300';
          case 'outline':
            return 'border border-gray-300 text-theme-primary hover:bg-gray-50';
          case 'ghost':
            return 'text-theme-primary hover:bg-gray-100';
          case 'destructive':
            return 'bg-accent-red text-white hover:bg-red-600 shadow-sm';
          default:
            return 'bg-accent-blue text-white hover:bg-blue-600';
        }
      }
    };

    const getSizeClasses = () => {
      switch (size) {
        case 'sm':
          return 'px-3 py-1.5 text-sm';
        case 'lg':
          return 'px-6 py-3 text-lg';
        case 'xl':
          return 'px-8 py-4 text-xl';
        default:
          return 'px-4 py-2 text-base';
      }
    };

    const getDisabledClasses = () => {
      if (disabled || loading) {
        return 'opacity-50 cursor-not-allowed pointer-events-none';
      }
      return 'cursor-pointer';
    };

    const renderIcon = () => {
      if (loading) {
        return <Loader2 className="w-4 h-4 animate-spin" />;
      }
      return icon;
    };

    const renderContent = () => {
      const iconElement = renderIcon();
      
      if (!iconElement) {
        return children;
      }

      if (iconPosition === 'right') {
        return (
          <>
            {children}
            {iconElement}
          </>
        );
      }

      return (
        <>
          {iconElement}
          {children}
        </>
      );
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-2',
          getVariantClasses(),
          getSizeClasses(),
          getDisabledClasses(),
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {renderContent()}
      </button>
    );
  }
);

ModernButton.displayName = 'ModernButton';

export { ModernButton };
