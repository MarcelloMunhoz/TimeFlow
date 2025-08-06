// Removed ModernCard imports - using direct CSS classes like personalization tab
// Removed Button import - using pattern-aware buttons
import { useQuery } from "@tanstack/react-query";
import { Clock, TrendingUp, TrendingDown, Timer, ArrowRight, BarChart3 } from "lucide-react";
import { useLocation } from "wouter";
import { useTheme } from "@/hooks/use-theme";

interface TimeAnalysisSummary {
  totalTasks: number;
  totalEstimated: number;
  totalActual: number;
  totalDifference: number;
  tasksOverEstimate: number;
  tasksUnderEstimate: number;
  tasksOnTime: number;
}

export default function TimeAnalysisDashboard() {
  const [, setLocation] = useLocation();
  const { designPattern, getButtonClasses } = useTheme();

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

  const { data: appointments = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/appointments'],
  });

  // Process data for time analysis summary
  const processTimeAnalysis = (): TimeAnalysisSummary => {
    const today = new Date().toISOString().split('T')[0];
    const completedToday = appointments.filter(apt =>
      apt.date === today &&
      apt.status === 'completed' &&
      !apt.isPomodoro
    );

    const tasks = completedToday.map(apt => {
      const estimated = apt.durationMinutes || 0;
      const actual = apt.actualTimeMinutes || apt.durationMinutes || 0;
      const difference = actual - estimated;

      return {
        estimatedMinutes: estimated,
        actualMinutes: actual,
        difference
      };
    });

    return {
      totalTasks: tasks.length,
      totalEstimated: tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0),
      totalActual: tasks.reduce((sum, task) => sum + task.actualMinutes, 0),
      totalDifference: tasks.reduce((sum, task) => sum + task.difference, 0),
      tasksOverEstimate: tasks.filter(task => task.difference > 0).length,
      tasksUnderEstimate: tasks.filter(task => task.difference < 0).length,
      tasksOnTime: tasks.filter(task => task.difference === 0).length
    };
  };

  const formatTime = (minutes: number): string => {
    if (minutes === 0) return "0min";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h${mins}min`;
  };

  const formatDifference = (minutes: number): string => {
    const sign = minutes > 0 ? "+" : "";
    return `${sign}${formatTime(Math.abs(minutes))}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const summary = processTimeAnalysis();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-theme-primary">Análise de Tempo: Resumo</h2>
          <p className="text-sm text-theme-secondary">
            Comparação entre tempo estimado e real trabalhado hoje
          </p>
        </div>
        <button
          onClick={() => setLocation('/time-analysis')}
          className={`${getButtonClasses('outline')} flex items-center gap-2 px-3 py-1 text-sm`}
        >
          <BarChart3 className="w-4 h-4" />
          Ver Detalhes
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`${getCardClasses()} p-4 rounded-lg transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-theme-secondary font-medium">Total Estimado</p>
              <p className="text-2xl font-bold text-theme-primary">{formatTime(summary.totalEstimated)}</p>
            </div>
            <Clock className="text-theme-accent w-8 h-8 transition-all duration-300 ease-in-out" />
          </div>
        </div>

        <div className={`${getCardClasses()} p-4 rounded-lg transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-theme-secondary font-medium">Total Real</p>
              <p className="text-2xl font-bold text-theme-primary">{formatTime(summary.totalActual)}</p>
            </div>
            <Timer className="text-theme-accent w-8 h-8 transition-all duration-300 ease-in-out" />
          </div>
        </div>

        <div className={`${getCardClasses()} p-4 rounded-lg transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-theme-secondary">
                Diferença Total
              </p>
              <p className="text-2xl font-bold text-theme-primary">
                {formatDifference(summary.totalDifference)}
              </p>
            </div>
            {summary.totalDifference >= 0 ?
              <TrendingUp className="text-theme-accent w-8 h-8 transition-all duration-300 ease-in-out" /> :
              <TrendingDown className="text-theme-accent w-8 h-8 transition-all duration-300 ease-in-out" />
            }
          </div>
        </div>

        <div className={`${getCardClasses()} p-4 rounded-lg transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-theme-secondary font-medium">Tarefas Analisadas</p>
              <p className="text-2xl font-bold text-theme-primary">{summary.totalTasks}</p>
            </div>
            <BarChart3 className="text-theme-accent w-8 h-8 transition-all duration-300 ease-in-out" />
          </div>
        </div>
      </div>

      {/* Quick Summary */}
      {summary.totalTasks > 0 && (
        <div className={`${getCardClasses()} p-4 rounded-lg transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1`}>
          <div className="flex items-center justify-between">
            <div className="grid grid-cols-3 gap-6 flex-1">
              <div className="text-center">
                <p className="text-xl font-bold text-theme-primary">{summary.tasksOverEstimate}</p>
                <p className="text-xs text-theme-secondary">Acima do estimado</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-theme-primary">{summary.tasksOnTime}</p>
                <p className="text-xs text-theme-secondary">No tempo certo</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-theme-primary">{summary.tasksUnderEstimate}</p>
                <p className="text-xs text-theme-secondary">Abaixo do estimado</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-theme-tertiary">Clique em "Ver Detalhes" para análise completa</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
