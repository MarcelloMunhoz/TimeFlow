import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarCheck, Plus, Search, Download, List, Calendar as CalendarIcon, User, Settings, TrendingUp, AlertTriangle, Target, Clock } from "lucide-react";
import ProductivityMetrics from "@/components/productivity-metrics";
import CalendarView from "@/components/calendar-view";
import TaskList from "@/components/task-list";
import AppointmentForm from "@/components/appointment-form";
import { getTodayString } from "@/lib/date-utils";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

type ViewMode = "month" | "week" | "day";

// Project Status Card Component
function ProjectStatusCard() {
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
        Status dos Projetos
      </h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Projetos Ativos</span>
          <span className="text-lg font-semibold text-blue-600">{activeProjects.length}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Concluídos</span>
          <span className="text-lg font-semibold text-green-600">{completedProjects.length}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-1 text-orange-500" />
            Em Risco
          </span>
          <span className="text-lg font-semibold text-orange-600">{atRiskProjects.length}</span>
        </div>
        {activeProjects.length > 0 && (
          <div className="pt-2 border-t">
            <div className="text-xs text-gray-500 mb-2">Progresso Médio</div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.max(0, Math.min(100, activeProjects.reduce((acc: number, p: any) => acc + (p.progressPercentage || 0), 0) / activeProjects.length))}%`
                }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {Math.round(activeProjects.reduce((acc: number, p: any) => acc + (p.progressPercentage || 0), 0) / activeProjects.length)}% concluído
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Quick Actions Card Component
function QuickActionsCard() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Target className="w-5 h-5 mr-2 text-green-600" />
        Ações Rápidas
      </h3>
      <div className="space-y-3">
        <Link href="/management">
          <Button variant="outline" className="w-full justify-start">
            <Plus className="w-4 h-4 mr-2" />
            Novo Projeto BI
          </Button>
        </Link>
        <Link href="/management">
          <Button variant="outline" className="w-full justify-start">
            <TrendingUp className="w-4 h-4 mr-2" />
            Ver KPIs
          </Button>
        </Link>
        <Link href="/management">
          <Button variant="outline" className="w-full justify-start">
            <Settings className="w-4 h-4 mr-2" />
            Configurações
          </Button>
        </Link>
        <div className="pt-2 border-t">
          <div className="text-xs text-gray-500 mb-2 flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            Próximos Prazos
          </div>
          <div className="text-sm text-gray-600">
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
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 fixed w-full top-0 z-40">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <CalendarCheck className="text-blue-600 text-2xl w-8 h-8" />
            <h1 className="text-xl font-semibold text-gray-900">TimeFlow - Gestão de Projetos BI</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/management">
              <Button variant="outline" className="border-gray-300 hover:bg-gray-50">
                <Settings className="w-4 h-4 mr-2" />
                Gerenciar
              </Button>
            </Link>
            <Button
              onClick={() => setShowAppointmentForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Agendamento
            </Button>
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-gray-600" />
            </div>
          </div>
        </div>
      </header>

      <div className="pt-16">
        {/* Main Content */}
        <main className="p-6">
          {/* Productivity Metrics */}
          <ProductivityMetrics />

          {/* View Toggle and Search */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              {/* Calendar/List Toggle */}
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                <Button
                  variant={view === 'calendar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('calendar')}
                  className={view === 'calendar' ? 'bg-white text-blue-600 shadow-sm' : ''}
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Calendário
                </Button>
                <Button
                  variant={view === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('list')}
                  className={view === 'list' ? 'bg-white text-blue-600 shadow-sm' : ''}
                >
                  <List className="w-4 h-4 mr-2" />
                  Lista
                </Button>
              </div>

              {/* View Mode Toggle (only show when calendar view is active) */}
              {view === 'calendar' && (
                <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                  <Button
                    variant={viewMode === 'month' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('month')}
                    className={viewMode === 'month' ? 'bg-white text-yellow-600 shadow-sm' : ''}
                  >
                    Mês
                  </Button>
                  <Button
                    variant={viewMode === 'week' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('week')}
                    className={viewMode === 'week' ? 'bg-white text-yellow-600 shadow-sm' : ''}
                  >
                    Semana
                  </Button>
                  <Button
                    variant={viewMode === 'day' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('day')}
                    className={viewMode === 'day' ? 'bg-white text-yellow-600 shadow-sm' : ''}
                  >
                    Dia
                  </Button>
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
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
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
              <QuickActionsCard />
            </div>
          </div>
        </main>
      </div>

      {/* Floating Action Button */}
      <Button
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg hover:scale-105 transition-all bg-blue-600 hover:bg-blue-700"
        onClick={() => setShowAppointmentForm(true)}
      >
        <Plus className="w-6 h-6" />
      </Button>

      {/* Appointment Form Modal */}
      <AppointmentForm
        open={showAppointmentForm}
        onOpenChange={setShowAppointmentForm}
        defaultDate={selectedDate}
      />
    </div>
  );
}
