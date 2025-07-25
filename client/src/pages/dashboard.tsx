import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarCheck, Plus, Search, Download, List, Calendar as CalendarIcon, User } from "lucide-react";
import ProductivitySidebar from "@/components/productivity-sidebar";
import CalendarView from "@/components/calendar-view";
import TaskList from "@/components/task-list";
import AppointmentForm from "@/components/appointment-form";
import { getTodayString } from "@/lib/date-utils";

type ViewMode = "month" | "week" | "day";

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [filters, setFilters] = useState({});

  const handleFilterChange = (newFilters: any) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 fixed w-full top-0 z-40">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <CalendarCheck className="text-blue-600 text-2xl w-8 h-8" />
            <h1 className="text-xl font-semibold text-gray-900">Sistema de Agendamento</h1>
          </div>
          <div className="flex items-center space-x-4">
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

      <div className="flex pt-16">
        {/* Sidebar */}
        <ProductivitySidebar onFilterChange={handleFilterChange} />

        {/* Main Content */}
        <main className="flex-1 p-6">
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
            <TaskList selectedDate={selectedDate} filters={filters} />
            
            {/* Right Panel - Quick Actions & Summary */}
            <div className="space-y-6">
              {/* Quick Create would go here if needed */}
              
              {/* Recent Activity */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Atividade Recente</h3>
                <div className="space-y-3">
                  <div className="text-center py-4 text-gray-500 text-sm">
                    Atividades aparecerão aqui conforme você usar o sistema
                  </div>
                </div>
              </div>

              {/* Weekly Overview */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Visão Semanal</h3>
                <div className="space-y-3">
                  <div className="text-center py-4 text-gray-500 text-sm">
                    Visão semanal será calculada automaticamente
                  </div>
                </div>
              </div>
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
