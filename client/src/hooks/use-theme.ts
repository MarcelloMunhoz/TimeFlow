import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark';
export type DesignPattern = 'neomorphism' | 'glassmorphism' | 'standard';

interface ThemeConfig {
  theme: Theme;
  designPattern: DesignPattern;
}

const THEME_STORAGE_KEY = 'timeflow-theme';
const DESIGN_PATTERN_STORAGE_KEY = 'timeflow-design-pattern';

export function useTheme() {
  // Inicializar com valores do localStorage ou padrões
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
      if (stored && ['light', 'dark'].includes(stored)) {
        return stored;
      }
      // Detectar preferência do sistema
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  const [designPattern, setDesignPattern] = useState<DesignPattern>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(DESIGN_PATTERN_STORAGE_KEY) as DesignPattern;
      if (stored && ['neomorphism', 'glassmorphism', 'standard'].includes(stored)) {
        return stored;
      }
    }
    return 'neomorphism';
  });

  // Aplicar tema ao documento
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      const body = document.body;

      // Aplicar atributo de tema ao HTML
      root.setAttribute('data-theme', theme);

      // Aplicar classe dark do Tailwind
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }

      // Aplicar classes de padrão de design
      root.classList.remove('pattern-neomorphism', 'pattern-glassmorphism', 'pattern-standard');
      root.classList.add(`pattern-${designPattern}`);

      // Aplicar classes temáticas ao body também para garantir aplicação
      body.classList.remove('theme-light', 'theme-dark');
      body.classList.add(`theme-${theme}`);

      body.classList.remove('pattern-neomorphism', 'pattern-glassmorphism', 'pattern-standard');
      body.classList.add(`pattern-${designPattern}`);

      // Forçar re-render das variáveis CSS
      root.style.setProperty('--current-theme', theme);
      root.style.setProperty('--current-pattern', designPattern);

      // Salvar no localStorage
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      localStorage.setItem(DESIGN_PATTERN_STORAGE_KEY, designPattern);

      console.log(`🎨 useTheme: Tema aplicado - ${theme}, Dark class: ${theme === 'dark' ? 'added' : 'removed'}`);
    }
  }, [theme, designPattern]);

  // Escutar mudanças na preferência do sistema
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = (e: MediaQueryListEvent) => {
        // Só aplicar se não houver preferência salva
        const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        if (!storedTheme) {
          setTheme(e.matches ? 'dark' : 'light');
        }
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setThemeMode = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  const setDesignMode = (newPattern: DesignPattern) => {
    setDesignPattern(newPattern);
  };

  const getThemeConfig = (): ThemeConfig => ({
    theme,
    designPattern
  });

  // Utilitários para classes CSS
  const getThemeClasses = () => {
    const baseClasses = [
      'bg-theme-primary',
      'text-theme-primary',
      'transition-all',
      'duration-300'
    ];

    switch (designPattern) {
      case 'neomorphism':
        return [...baseClasses, 'pattern-neo'];
      case 'glassmorphism':
        return [...baseClasses, 'pattern-glass'];
      default:
        return baseClasses;
    }
  };

  const getCardClasses = () => {
    switch (designPattern) {
      case 'neomorphism':
        return 'neo-card';
      case 'glassmorphism':
        return 'glass-card';
      default:
        return 'bg-theme-secondary border border-gray-200 rounded-lg shadow-sm';
    }
  };

  // Obter variante padrão baseada no padrão de design atual
  const getDefaultCardVariant = (): 'default' | 'elevated' | 'inset' | 'glass' => {
    if (designPattern === 'neomorphism') return 'elevated';
    if (designPattern === 'glassmorphism') return 'glass';
    return 'default';
  };

  const getDefaultButtonVariant = (): 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' => {
    if (designPattern === 'neomorphism') return 'secondary';
    if (designPattern === 'glassmorphism') return 'ghost';
    return 'primary';
  };

  const getButtonClasses = (variant: 'primary' | 'secondary' | 'outline' = 'primary') => {
    const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-300 ease-in-out';
    
    switch (designPattern) {
      case 'neomorphism':
        return `${baseClasses} neo-button`;
      case 'glassmorphism':
        if (variant === 'primary') {
          return `${baseClasses} glass px-4 py-2 text-theme-primary hover:bg-accent-blue hover:text-white`;
        }
        return `${baseClasses} glass px-4 py-2 text-theme-secondary`;
      default:
        if (variant === 'primary') {
          return `${baseClasses} bg-accent-blue text-white px-4 py-2 rounded-lg hover:bg-blue-600`;
        } else if (variant === 'outline') {
          return `${baseClasses} border border-gray-300 text-theme-primary px-4 py-2 rounded-lg hover:bg-gray-50`;
        }
        return `${baseClasses} bg-theme-secondary text-theme-primary px-4 py-2 rounded-lg hover:bg-gray-50`;
    }
  };

  const getInputClasses = () => {
    switch (designPattern) {
      case 'neomorphism':
        return 'neo-input';
      case 'glassmorphism':
        return 'glass px-3 py-2 text-theme-primary placeholder-theme-muted';
      default:
        return 'bg-theme-secondary border border-gray-300 rounded-lg px-3 py-2 text-theme-primary focus:ring-2 focus:ring-accent-blue focus:border-transparent';
    }
  };

  const getModalClasses = () => {
    switch (designPattern) {
      case 'glassmorphism':
        return 'glass-modal glass-animate-in';
      case 'neomorphism':
        return 'neo-card';
      default:
        return 'bg-theme-secondary rounded-lg shadow-xl';
    }
  };

  const getOverlayClasses = () => {
    switch (designPattern) {
      case 'glassmorphism':
        return 'glass-overlay';
      default:
        return 'bg-black bg-opacity-50';
    }
  };

  return {
    theme,
    designPattern,
    toggleTheme,
    setThemeMode,
    setDesignMode,
    getThemeConfig,
    getThemeClasses,
    getCardClasses,
    getButtonClasses,
    getDefaultCardVariant,
    getDefaultButtonVariant,
    getInputClasses,
    getModalClasses,
    getOverlayClasses,
    isDark: theme === 'dark',
    isNeomorphism: designPattern === 'neomorphism',
    isGlassmorphism: designPattern === 'glassmorphism'
  };
}
