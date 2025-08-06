// Removed ModernCard imports - using direct CSS classes like personalization tab
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Clock, AlertTriangle, TrendingUp, BarChart3, Target, Zap, ArrowRight } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useLocation } from "wouter";

interface ProductivityStats {
  todayCompleted: number;
  scheduledHoursToday: string;
  slaExpired: number;
  slaCompliance: number;
  rescheduled: number;
  pomodorosToday: number;
  nextTask?: string;
}

export default function ProductivityMetrics() {
  const { designPattern } = useTheme();
  const [, setLocation] = useLocation();

  const { data: stats, isLoading } = useQuery<ProductivityStats>({
    queryKey: ['/api/stats/productivity'],
  });

  const { data: appointments = [] } = useQuery<any[]>({
    queryKey: ['/api/appointments'],
  });

  // Usar o mesmo padrão exato da aba de personalização
  const getCardClasses = () => {
    if (designPattern === 'neomorphism') {
      return 'neo-card';
    }
    if (designPattern === 'glassmorphism') {
      return 'glass-card';
    }
    return 'bg-theme-secondary border border-gray-200 shadow-sm';
  };

  const getButtonClasses = (variant: 'primary' | 'outline' | 'ghost' = 'primary') => {
    const baseClasses = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-2';

    if (designPattern === 'neomorphism') {
      switch (variant) {
        case 'primary':
          return `${baseClasses} neo-button text-accent-blue hover:text-white hover:bg-accent-blue px-4 py-2`;
        case 'outline':
          return `${baseClasses} neo-button border border-theme-muted text-theme-primary px-4 py-2`;
        case 'ghost':
          return `${baseClasses} neo-inset text-theme-primary hover:text-accent-blue px-4 py-2`;
        default:
          return `${baseClasses} neo-button px-4 py-2`;
      }
    } else if (designPattern === 'glassmorphism') {
      switch (variant) {
        case 'primary':
          return `${baseClasses} glass text-white bg-accent-blue/80 hover:bg-accent-blue border border-accent-blue/30 px-4 py-2`;
        case 'outline':
          return `${baseClasses} glass text-theme-primary bg-transparent hover:bg-theme-secondary/30 border border-theme-muted/50 px-4 py-2`;
        case 'ghost':
          return `${baseClasses} text-theme-primary hover:bg-theme-secondary/30 backdrop-blur-sm px-4 py-2`;
        default:
          return `${baseClasses} glass px-4 py-2`;
      }
    } else {
      switch (variant) {
        case 'primary':
          return `${baseClasses} bg-accent-blue text-white hover:bg-blue-600 shadow-sm px-4 py-2`;
        case 'outline':
          return `${baseClasses} border border-gray-300 text-theme-primary hover:bg-gray-50 px-4 py-2`;
        case 'ghost':
          return `${baseClasses} text-theme-primary hover:bg-gray-100 px-4 py-2`;
        default:
          return `${baseClasses} bg-accent-blue text-white hover:bg-blue-600 px-4 py-2`;
      }
    }
  };

  // Calculate next task
  const getNextTask = () => {
    if (!appointments.length) return "--:--";
    
    const now = new Date();
    
    const upcomingTasks = appointments
      .filter((apt: any) => {
        const taskDate = new Date(`${apt.date}T${apt.startTime}`);
        return taskDate > now && apt.status === 'scheduled' && !apt.isPomodoro;
      })
      .sort((a: any, b: any) => {
        const timeA = new Date(`${a.date}T${a.startTime}`).getTime();
        const timeB = new Date(`${b.date}T${b.startTime}`).getTime();
        return timeA - timeB;
      });
    
    return upcomingTasks.length > 0 ? upcomingTasks[0].startTime : "--:--";
  };

  if (isLoading) {
    return (
      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`${getCardClasses()} p-6 rounded-lg animate-pulse`}>
              <div className="h-4 bg-theme-tertiary rounded mb-2"></div>
              <div className="h-8 bg-theme-tertiary rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-theme-primary mb-2">Resumo de Produtividade</h2>
          <p className="text-theme-secondary">
            Acompanhe seu desempenho diário e métricas de produtividade em tempo real
          </p>
        </div>
        <button
          onClick={() => setLocation('/time-analysis')}
          className={`${getButtonClasses('outline')} flex items-center gap-2 px-3 py-1 text-sm`}
        >
          <BarChart3 className="w-4 h-4" />
          Análise de Tempo
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Main Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className={`${getCardClasses()} p-6 rounded-lg transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-theme-secondary">Concluídos Hoje</p>
              <p className="text-3xl font-bold text-theme-primary">{stats?.todayCompleted || 0}</p>
              <p className="text-xs text-theme-tertiary mt-1">tarefas finalizadas</p>
            </div>
            <CheckCircle className="text-theme-accent w-8 h-8 transition-all duration-300 ease-in-out" />
          </div>
        </div>

        <div className={`${getCardClasses()} p-6 rounded-lg transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-theme-secondary">Tempo Trabalhado</p>
              <p className="text-3xl font-bold text-theme-primary">{stats?.scheduledHoursToday || "0min"}</p>
              <p className="text-xs text-theme-tertiary mt-1">tempo real trabalhado</p>
            </div>
            <Clock className="text-theme-accent w-8 h-8 transition-all duration-300 ease-in-out" />
          </div>
        </div>

        <div className={`${getCardClasses()} p-6 rounded-lg transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-theme-secondary">Cumprimento SLA</p>
              <p className="text-3xl font-bold text-theme-primary">{stats?.slaCompliance || 100}%</p>
              <p className="text-xs text-theme-tertiary mt-1">dentro do prazo</p>
            </div>
            <Target className="text-theme-accent w-8 h-8 transition-all duration-300 ease-in-out" />
          </div>
        </div>

        <div className={`${getCardClasses()} p-6 rounded-lg transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-theme-secondary">Pomodoros</p>
              <p className="text-3xl font-bold text-theme-primary">{stats?.pomodorosToday || 0}</p>
              <p className="text-xs text-theme-tertiary mt-1">sessões hoje</p>
            </div>
            <Zap className="text-theme-accent w-8 h-8 transition-all duration-300 ease-in-out" />
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`${getCardClasses()} p-4 rounded-lg transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-theme-secondary">SLA Vencidos</p>
              <p className="text-2xl font-bold text-theme-primary">{stats?.slaExpired || 0}</p>
            </div>
            <AlertTriangle className="text-theme-accent w-6 h-6 transition-all duration-300 ease-in-out" />
          </div>
        </div>

        <div className={`${getCardClasses()} p-4 rounded-lg transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-theme-secondary">Reagendamentos</p>
              <p className="text-2xl font-bold text-theme-primary">{stats?.rescheduled || 0}</p>
            </div>
            <TrendingUp className="text-theme-accent w-6 h-6 transition-all duration-300 ease-in-out" />
          </div>
        </div>

        <div className={`${getCardClasses()} p-4 rounded-lg transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-theme-secondary">Próxima Tarefa</p>
              <p className="text-2xl font-bold text-theme-primary">{stats?.nextTask || getNextTask()}</p>
            </div>
            <BarChart3 className="text-theme-accent w-6 h-6 transition-all duration-300 ease-in-out" />
          </div>
        </div>
      </div>
    </div>
  );
}
