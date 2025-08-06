import React from 'react';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';

interface ModernInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  variant?: 'default' | 'filled' | 'outline';
}

interface ModernTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  variant?: 'default' | 'filled' | 'outline';
}

const ModernInput = React.forwardRef<HTMLInputElement, ModernInputProps>(
  ({ 
    className,
    type = 'text',
    label,
    error,
    hint,
    icon,
    iconPosition = 'left',
    variant = 'default',
    id,
    ...props 
  }, ref) => {
    const { designPattern, getInputClasses } = useTheme();
    const [showPassword, setShowPassword] = React.useState(false);
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    const getVariantClasses = () => {
      if (designPattern === 'neomorphism') {
        switch (variant) {
          case 'filled':
            return 'neo-inset bg-theme-tertiary';
          case 'outline':
            return 'neo-input border border-theme-muted';
          default:
            return 'neo-input';
        }
      } else if (designPattern === 'glassmorphism') {
        switch (variant) {
          case 'filled':
            return 'glass bg-theme-secondary/30';
          case 'outline':
            return 'glass border border-theme-muted/50';
          default:
            return 'glass';
        }
      } else {
        // Standard design
        switch (variant) {
          case 'filled':
            return 'bg-theme-tertiary border border-transparent focus:border-accent-blue';
          case 'outline':
            return 'bg-transparent border border-theme-muted focus:border-accent-blue';
          default:
            return 'bg-theme-secondary border border-theme-muted focus:border-accent-blue';
        }
      }
    };

    const getErrorClasses = () => {
      if (error) {
        return 'border-accent-red focus:border-accent-red focus:ring-accent-red';
      }
      return '';
    };

    const inputType = type === 'password' && showPassword ? 'text' : type;

    const renderPasswordToggle = () => {
      if (type !== 'password') return null;

      return (
        <button
          type="button"
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-theme-muted hover:text-theme-primary transition-colors"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
      );
    };

    const renderIcon = () => {
      if (!icon) return null;

      const iconClasses = "absolute top-1/2 transform -translate-y-1/2 text-theme-muted w-4 h-4";
      
      if (iconPosition === 'right') {
        return (
          <div className={cn(iconClasses, "right-3")}>
            {icon}
          </div>
        );
      }

      return (
        <div className={cn(iconClasses, "left-3")}>
          {icon}
        </div>
      );
    };

    const getInputPadding = () => {
      const hasLeftIcon = icon && iconPosition === 'left';
      const hasRightIcon = (icon && iconPosition === 'right') || type === 'password';
      
      if (hasLeftIcon && hasRightIcon) {
        return 'pl-10 pr-10';
      } else if (hasLeftIcon) {
        return 'pl-10 pr-3';
      } else if (hasRightIcon) {
        return 'pl-3 pr-10';
      }
      return 'px-3';
    };

    return (
      <div className="space-y-2">
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-theme-primary"
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          {renderIcon()}
          
          <input
            ref={ref}
            type={inputType}
            id={inputId}
            className={cn(
              'w-full py-2 text-theme-primary placeholder-theme-muted rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-1',
              getVariantClasses(),
              getErrorClasses(),
              getInputPadding(),
              className
            )}
            {...props}
          />
          
          {renderPasswordToggle()}
        </div>

        {error && (
          <p className="text-sm text-accent-red">
            {error}
          </p>
        )}

        {hint && !error && (
          <p className="text-sm text-theme-muted">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

const ModernTextarea = React.forwardRef<HTMLTextAreaElement, ModernTextareaProps>(
  ({ 
    className,
    label,
    error,
    hint,
    variant = 'default',
    id,
    rows = 3,
    ...props 
  }, ref) => {
    const { designPattern } = useTheme();
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

    const getVariantClasses = () => {
      if (designPattern === 'neomorphism') {
        switch (variant) {
          case 'filled':
            return 'neo-inset bg-theme-tertiary';
          case 'outline':
            return 'neo-input border border-theme-muted';
          default:
            return 'neo-input';
        }
      } else if (designPattern === 'glassmorphism') {
        switch (variant) {
          case 'filled':
            return 'glass bg-theme-secondary/30';
          case 'outline':
            return 'glass border border-theme-muted/50';
          default:
            return 'glass';
        }
      } else {
        // Standard design
        switch (variant) {
          case 'filled':
            return 'bg-theme-tertiary border border-transparent focus:border-accent-blue';
          case 'outline':
            return 'bg-transparent border border-theme-muted focus:border-accent-blue';
          default:
            return 'bg-theme-secondary border border-theme-muted focus:border-accent-blue';
        }
      }
    };

    const getErrorClasses = () => {
      if (error) {
        return 'border-accent-red focus:border-accent-red focus:ring-accent-red';
      }
      return '';
    };

    return (
      <div className="space-y-2">
        {label && (
          <label 
            htmlFor={textareaId}
            className="block text-sm font-medium text-theme-primary"
          >
            {label}
          </label>
        )}
        
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={cn(
            'w-full px-3 py-2 text-theme-primary placeholder-theme-muted rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-1 resize-vertical',
            getVariantClasses(),
            getErrorClasses(),
            className
          )}
          {...props}
        />

        {error && (
          <p className="text-sm text-accent-red">
            {error}
          </p>
        )}

        {hint && !error && (
          <p className="text-sm text-theme-muted">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

ModernInput.displayName = 'ModernInput';
ModernTextarea.displayName = 'ModernTextarea';

export { ModernInput, ModernTextarea };
