import { useState } from "react";
// Removed Button import - using pattern-aware buttons
import { Input } from "@/components/ui/input";
import { CalendarCheck, Plus, Search, Download, List, Calendar as CalendarIcon, User, Settings, TrendingUp, AlertTriangle, Target, Clock } from "lucide-react";
import ProductivityMetrics from "@/components/productivity-metrics";
import CalendarView from "@/components/calendar-view";
import TaskList from "@/components/task-list";
import AppointmentForm from "@/components/appointment-form";
import TimeAnalysisDashboard from "@/components/time-analysis-dashboard";
import DailyScheduleExport from "@/components/daily-schedule-export";
import WeeklySummaryExport from "@/components/weekly-summary-export";

import ThemeController from "@/components/theme-controller";
import { getTodayString } from "@/lib/date-utils";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTheme } from "@/hooks/use-theme";

type ViewMode = "week" | "day";

// Project Status Card Component
function ProjectStatusCard() {
  const { getCardClasses } = useTheme();
  const { data: projects } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/projects");
      return response.json();
    }
  });

  const activeProjects = projects?.filter((p: any) => p.status === 'active') || [];
  const completedProjects = projects?.filter((p: any) => p.status === 'completed') || [];
  const atRiskProjects = activeProjects.filter((p: any) => {
    const isOverdue = p.endDate && new Date(p.endDate) < new Date();
    return isOverdue || p.riskLevel === 'high';
  });

  return (
    <div className={`${getCardClasses()} p-6`}>
      <h3 className="text-lg font-semibold text-theme-primary mb-4 flex items-center">
        <TrendingUp className="w-5 h-5 mr-2 text-accent-blue" />
        Status dos Projetos
      </h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-theme-secondary">Projetos Ativos</span>
          <span className="text-lg font-semibold text-accent-blue">{activeProjects.length}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-theme-secondary">Concluídos</span>
          <span className="text-lg font-semibold text-accent-green">{completedProjects.length}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-theme-secondary flex items-center">
            <AlertTriangle className="w-4 h-4 mr-1 text-accent-orange" />
            Em Risco
          </span>
          <span className="text-lg font-semibold text-accent-orange">{atRiskProjects.length}</span>
        </div>
        {activeProjects.length > 0 && (
          <div className="pt-2 border-t border-theme-muted">
            <div className="text-xs text-theme-muted mb-2">Progresso Médio</div>
            <div className="w-full bg-theme-tertiary rounded-full h-2">
              <div
                className="bg-accent-blue h-2 rounded-full transition-all duration-300 ease-in-out"
                style={{
                  width: `${Math.max(0, Math.min(100, activeProjects.reduce((acc: number, p: any) => acc + (p.progressPercentage || 0), 0) / activeProjects.length))}%`
                }}
              />
            </div>
            <div className="text-xs text-theme-muted mt-1">
              {Math.round(activeProjects.reduce((acc: number, p: any) => acc + (p.progressPercentage || 0), 0) / activeProjects.length)}% concluído
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Quick Actions Card Component
function QuickActionsCard({ selectedDate }: { selectedDate: string }) {
  const { getCardClasses, getButtonClasses } = useTheme();
  return (
    <div className={`${getCardClasses()} p-6`}>
      <h3 className="text-lg font-semibold text-theme-primary mb-4 flex items-center">
        <Target className="w-5 h-5 mr-2 text-accent-green" />
        Ações Rápidas
      </h3>
      <div className="space-y-3">
        <Link href="/management">
          <button className={`${getButtonClasses('outline')} w-full justify-start flex items-center gap-2`}>
            <Plus className="w-4 h-4" />
            Novo Projeto BI
          </button>
        </Link>
        <Link href="/management">
          <button className={`${getButtonClasses('outline')} w-full justify-start flex items-center gap-2`}>
            <TrendingUp className="w-4 h-4" />
            Ver KPIs
          </button>
        </Link>
        <Link href="/management">
          <button className={`${getButtonClasses('outline')} w-full justify-start flex items-center gap-2`}>
            <Settings className="w-4 h-4" />
            Configurações
          </button>
        </Link>
        <DailyScheduleExport 
          selectedDate={selectedDate} 
          showTriggerButton={false}
          triggerElement={
            <button className={`${getButtonClasses('outline')} w-full justify-start flex items-center gap-2`}>
              <Download className="w-4 h-4" />
              Exportar Cronograma
            </button>
          }
        />
        <WeeklySummaryExport 
          showTriggerButton={false}
          triggerElement={
            <button className={`${getButtonClasses('outline')} w-full justify-start flex items-center gap-2`}>
              <TrendingUp className="w-4 h-4" />
              Resumo Semanal
            </button>
          }
        />
        <div className="pt-2 border-t border-theme-muted">
          <div className="text-xs text-theme-muted mb-2 flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            Próximos Prazos
          </div>
          <div className="text-sm text-theme-secondary">
            Verifique os prazos das fases em andamento
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const { getThemeClasses, getCardClasses, getButtonClasses, designPattern } = useTheme();


  // Usar o mesmo padrão exato da aba de personalização
  const getBackgroundClasses = () => {
    const base = 'min-h-screen transition-all duration-300 ease-in-out';
    if (designPattern === 'glassmorphism') {
      return `${base} bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900`;
    }
    if (designPattern === 'neomorphism') {
      return `${base} ${getThemeClasses().join(' ')}`;
    }
    return `${base} ${getThemeClasses().join(' ')}`;
  };

  const getHeaderClasses = () => {
    const base = 'fixed w-full top-0 z-40';
    if (designPattern === 'neomorphism') {
      return `neo-card shadow-lg border-b border-theme-muted ${base}`;
    }
    if (designPattern === 'glassmorphism') {
      return `glass-card shadow-lg border-b border-white/20 ${base}`;
    }
    return `bg-theme-secondary shadow-sm border-b border-theme-muted ${base}`;
  };

  return (
    <div className={getBackgroundClasses()}>
      {/* Header */}
      <header className={getHeaderClasses()}>
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <CalendarCheck className="text-accent-blue text-2xl w-8 h-8" />
            <h1 className="text-xl font-semibold text-theme-primary">TimeFlow - Gestão de Projetos BI</h1>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeController />
            <Link href="/management">
              <button className={`${getButtonClasses('outline')} flex items-center gap-2`}>
                <Settings className="w-4 h-4" />
                Gerenciar
              </button>
            </Link>
            <button
              onClick={() => setShowAppointmentForm(true)}
              className={`${getButtonClasses('primary')} flex items-center gap-2`}
            >
              <Plus className="w-4 h-4" />
              Novo Agendamento
            </button>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              designPattern === 'neomorphism' ? 'neo-card' :
              designPattern === 'glassmorphism' ? 'glass' :
              'bg-theme-tertiary'
            }`}>
              <User className="w-4 h-4 text-theme-primary" />
            </div>
          </div>
        </div>
      </header>

      <div className="pt-16">
        {/* Main Content */}
        <main className={`p-6 ${designPattern === 'glassmorphism' ? 'backdrop-blur-sm' : ''}`}>
          {/* Productivity Metrics */}
          <ProductivityMetrics />

          {/* Time Analysis Dashboard */}
          <TimeAnalysisDashboard />

          {/* View Toggle and Search */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              {/* Calendar/List Toggle */}
              <div className="flex items-center space-x-1 bg-theme-tertiary rounded-lg p-1">
                <button
                  onClick={() => setView('calendar')}
                  className={`${getButtonClasses(view === 'calendar' ? 'primary' : 'outline')} px-3 py-1 text-sm flex items-center gap-2 ${view === 'calendar' ? 'bg-accent-blue text-white shadow-sm' : ''}`}
                >
                  <CalendarIcon className="w-4 h-4" />
                  Calendário
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`${getButtonClasses(view === 'list' ? 'primary' : 'outline')} px-3 py-1 text-sm flex items-center gap-2 ${view === 'list' ? 'bg-accent-blue text-white shadow-sm' : ''}`}
                >
                  <List className="w-4 h-4" />
                  Lista
                </button>
              </div>

              {/* View Mode Toggle (only show when calendar view is active) */}
              {view === 'calendar' && (
                <div className="flex items-center space-x-1 bg-theme-tertiary rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('week')}
                    className={`${getButtonClasses(viewMode === 'week' ? 'primary' : 'outline')} px-3 py-1 text-sm ${viewMode === 'week' ? 'bg-accent-blue text-white shadow-sm' : ''}`}
                  >
                    Semana
                  </button>
                  <button
                    onClick={() => setViewMode('day')}
                    className={`${getButtonClasses(viewMode === 'day' ? 'primary' : 'outline')} px-3 py-1 text-sm ${viewMode === 'day' ? 'bg-accent-blue text-white shadow-sm' : ''}`}
                  >
                    Dia
                  </button>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input 
                  placeholder="Buscar agendamentos..." 
                  className="pl-10 w-80"
                />
              </div>
              <div className="flex items-center space-x-2">
                <DailyScheduleExport selectedDate={selectedDate} />
                <WeeklySummaryExport />
              </div>
            </div>
          </div>

          {/* Calendar View */}
          {view === 'calendar' && (
            <CalendarView 
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              viewMode={viewMode}
            />
          )}

          {/* Today's Schedule */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TaskList selectedDate={selectedDate} filters={{}} />
            
            {/* Right Panel - Quick Actions & Summary */}
            <div className="space-y-6">
              {/* Quick Create would go here if needed */}
              
              {/* Project Status Overview */}
              <ProjectStatusCard />

              {/* Quick Actions */}
              <QuickActionsCard selectedDate={selectedDate} />
            </div>
          </div>
        </main>
      </div>

      {/* Floating Action Button */}
      <button
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg hover:scale-105 transition-all duration-300 ease-in-out ${getButtonClasses('primary')} flex items-center justify-center`}
        onClick={() => setShowAppointmentForm(true)}
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Appointment Form Modal */}
      <AppointmentForm
        open={showAppointmentForm}
        onOpenChange={setShowAppointmentForm}
        defaultDate={selectedDate}
      />
    </div>
  );
}
