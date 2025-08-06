// Removed ModernCard imports - using direct CSS classes like personalization tab
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Clock, AlertTriangle, TrendingUp, BarChart3, Target, Zap } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

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
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-theme-primary mb-2">Resumo de Produtividade</h2>
        <p className="text-theme-secondary">
          Acompanhe seu desempenho diário e métricas de produtividade em tempo real
        </p>
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
