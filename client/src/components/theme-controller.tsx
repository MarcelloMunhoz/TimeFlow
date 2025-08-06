import { useState } from 'react';
import { useTheme, type Theme, type DesignPattern } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Sun, 
  Moon, 
  Palette, 
  Settings, 
  Eye,
  Sparkles,
  Square,
  X
} from 'lucide-react';

interface ThemeControllerProps {
  className?: string;
  showFullControls?: boolean;
}

export default function ThemeController({ 
  className = '', 
  showFullControls = false 
}: ThemeControllerProps) {
  const {
    theme,
    designPattern,
    toggleTheme,
    setThemeMode,
    setDesignMode,
    getButtonClasses,
    getCardClasses,
    isDark,
    isNeomorphism,
    isGlassmorphism
  } = useTheme();

  const [showControls, setShowControls] = useState(false);

  if (!showFullControls) {
    // Versão compacta - apenas toggle de tema
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Button
          onClick={toggleTheme}
          className={getButtonClasses('outline')}
          size="sm"
          title={`Alternar para tema ${isDark ? 'claro' : 'escuro'}`}
        >
          {isDark ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </Button>
        
        <Button
          onClick={() => setShowControls(!showControls)}
          className={getButtonClasses('outline')}
          size="sm"
          title="Configurações de tema"
        >
          <Settings className="w-4 h-4" />
        </Button>

        {showControls && (
          <div className="absolute top-12 right-0 z-50">
            <Card className={`${getCardClasses()} w-80 shadow-lg`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    Personalização
                  </CardTitle>
                  <Button
                    onClick={() => setShowControls(false)}
                    className={getButtonClasses('outline')}
                    size="sm"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ThemeControls
                  theme={theme}
                  designPattern={designPattern}
                  setThemeMode={setThemeMode}
                  setDesignMode={setDesignMode}
                  getButtonClasses={getButtonClasses}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // Versão completa
  return (
    <Card className={`${getCardClasses()} ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Personalização do Tema
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ThemeControls
          theme={theme}
          designPattern={designPattern}
          setThemeMode={setThemeMode}
          setDesignMode={setDesignMode}
          getButtonClasses={getButtonClasses}
        />
      </CardContent>
    </Card>
  );
}

interface ThemeControlsProps {
  theme: Theme;
  designPattern: DesignPattern;
  setThemeMode: (theme: Theme) => void;
  setDesignMode: (pattern: DesignPattern) => void;
  getButtonClasses: (variant?: 'primary' | 'secondary' | 'outline') => string;
}

function ThemeControls({
  theme,
  designPattern,
  setThemeMode,
  setDesignMode,
  getButtonClasses
}: ThemeControlsProps) {
  return (
    <div className="space-y-6">
      {/* Seleção de Tema */}
      <div>
        <h4 className="text-sm font-medium text-theme-primary mb-3 flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Modo de Cor
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => {
              console.log('🌞 Mudando para tema claro');
              setThemeMode('light');
            }}
            className={`${getButtonClasses(theme === 'light' ? 'primary' : 'outline')} justify-start`}
          >
            <Sun className="w-4 h-4 mr-2" />
            Claro
          </Button>
          <Button
            onClick={() => {
              console.log('🌙 Mudando para tema escuro');
              setThemeMode('dark');
            }}
            className={`${getButtonClasses(theme === 'dark' ? 'primary' : 'outline')} justify-start`}
          >
            <Moon className="w-4 h-4 mr-2" />
            Escuro
          </Button>
        </div>
      </div>

      {/* Seleção de Padrão de Design */}
      <div>
        <h4 className="text-sm font-medium text-theme-primary mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Estilo Visual
        </h4>
        <div className="space-y-2">
          <Button
            onClick={() => {
              console.log('🎨 Mudando para Neomorfismo');
              setDesignMode('neomorphism');
            }}
            className={`${getButtonClasses(designPattern === 'neomorphism' ? 'primary' : 'outline')} w-full justify-start`}
          >
            <div className="w-4 h-4 mr-2 rounded bg-gradient-to-br from-gray-200 to-gray-300 shadow-inner"></div>
            Neomorfismo
            <span className="ml-auto text-xs text-theme-muted">Suave</span>
          </Button>

          <Button
            onClick={() => {
              console.log('🌟 Mudando para Glassmorfismo');
              setDesignMode('glassmorphism');
            }}
            className={`${getButtonClasses(designPattern === 'glassmorphism' ? 'primary' : 'outline')} w-full justify-start`}
          >
            <div className="w-4 h-4 mr-2 rounded bg-gradient-to-br from-blue-200/50 to-purple-200/50 backdrop-blur border border-white/20"></div>
            Glassmorfismo
            <span className="ml-auto text-xs text-theme-muted">Vidro</span>
          </Button>

          <Button
            onClick={() => {
              console.log('📋 Mudando para Padrão');
              setDesignMode('standard');
            }}
            className={`${getButtonClasses(designPattern === 'standard' ? 'primary' : 'outline')} w-full justify-start`}
          >
            <Square className="w-4 h-4 mr-2" />
            Padrão
            <span className="ml-auto text-xs text-theme-muted">Clássico</span>
          </Button>
        </div>
      </div>

      {/* Preview do Estilo Atual */}
      <div>
        <h4 className="text-sm font-medium text-theme-primary mb-3">
          Prévia do Estilo
        </h4>
        <div className="space-y-3">
          {/* Preview Card */}
          <div className={`p-4 rounded-lg ${
            designPattern === 'neomorphism' ? 'neo-card' :
            designPattern === 'glassmorphism' ? 'glass-card' :
            'bg-theme-secondary border border-gray-200 shadow-sm'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-medium text-theme-primary">Card de Exemplo</h5>
                <p className="text-sm text-theme-muted">Prévia do estilo selecionado</p>
              </div>
              <div className={`w-8 h-8 rounded-full ${
                designPattern === 'neomorphism' ? 'neo-elevated' :
                designPattern === 'glassmorphism' ? 'glass' :
                'bg-accent-blue'
              }`}></div>
            </div>
          </div>

          {/* Preview Button */}
          <div className="flex gap-2">
            <button className={`px-3 py-1 text-sm ${
              designPattern === 'neomorphism' ? 'neo-button' :
              designPattern === 'glassmorphism' ? 'glass px-3 py-1 rounded' :
              'bg-accent-blue text-white rounded'
            }`}>
              Botão
            </button>
            <div className={`px-3 py-1 text-sm rounded ${
              designPattern === 'neomorphism' ? 'neo-input' :
              designPattern === 'glassmorphism' ? 'glass' :
              'bg-theme-secondary border border-gray-300'
            }`}>
              Input
            </div>
          </div>
        </div>
      </div>

      {/* Informações sobre o estilo */}
      <div className="text-xs text-theme-muted space-y-1">
        <p><strong>Atual:</strong> {theme === 'dark' ? 'Tema Escuro' : 'Tema Claro'} + {
          designPattern === 'neomorphism' ? 'Neomorfismo' :
          designPattern === 'glassmorphism' ? 'Glassmorfismo' :
          'Padrão'
        }</p>
        <p>
          {designPattern === 'neomorphism' && 'Elementos suaves com sombras sutis que criam profundidade.'}
          {designPattern === 'glassmorphism' && 'Efeito de vidro fosco com transparência e desfoque.'}
          {designPattern === 'standard' && 'Design limpo e clássico com bordas definidas.'}
        </p>
      </div>
    </div>
  );
}
