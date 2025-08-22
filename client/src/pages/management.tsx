import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// Removed Button import - using pattern-aware buttons
import CompaniesManagement from "@/components/companies-management";
import ProjectsManagement from "@/components/projects-management";
import UsersManagement from "@/components/users-management";
import PhasesManagement from "@/components/phases-management";
import SubphasesManagement from "@/components/subphases-management";
import ProjectSubphasesDates from "@/components/project-subphases-dates";
import ProjectKPIsDashboard from "@/components/project-kpis-dashboard";
import FollowUpDashboard from "@/components/follow-up-dashboard";
import ThemeController from "@/components/theme-controller";
import { useTheme } from "@/hooks/use-theme";
import { Building2, FolderOpen, Users, Settings, ArrowLeft, Home, Layers, Layers3, BarChart3, Mail, CalendarDays } from "lucide-react";

export default function ManagementPage() {
  const [activeTab, setActiveTab] = useState("kpis");
  const [, setLocation] = useLocation();
  const { getThemeClasses, getCardClasses, getButtonClasses, designPattern } = useTheme();

  // Background classes similar to dashboard
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

  // Header classes similar to dashboard
  const getHeaderClasses = () => {
    if (designPattern === 'neomorphism') {
      return 'neo-card mb-8';
    }
    if (designPattern === 'glassmorphism') {
      return 'glass-card mb-8';
    }
    return 'bg-theme-secondary border-b border-theme-muted mb-8';
  };

  // Test simple data loading
  const { data: companies = [], isLoading: companiesLoading, error: companiesError } = useQuery<any[]>({
    queryKey: ['/api/companies'],
    queryFn: async () => {
      const response = await fetch('/api/companies');
      if (!response.ok) throw new Error('Failed to fetch companies');
      return response.json();
    }
  });

  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useQuery<any[]>({
    queryKey: ['/api/projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      return response.json();
    }
  });

  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery<any[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    }
  });

  const { data: phases = [], isLoading: phasesLoading, error: phasesError } = useQuery<any[]>({
    queryKey: ['/api/phases'],
    queryFn: async () => {
      const response = await fetch('/api/phases');
      if (!response.ok) throw new Error('Failed to fetch phases');
      return response.json();
    }
  });

  const { data: subphases = [], isLoading: subphasesLoading, error: subphasesError } = useQuery<any[]>({
    queryKey: ['/api/subphases'],
    queryFn: async () => {
      const response = await fetch('/api/subphases');
      if (!response.ok) throw new Error('Failed to fetch subphases');
      return response.json();
    }
  });

  // Show loading state
  if (companiesLoading || projectsLoading || usersLoading || phasesLoading || subphasesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (companiesError || projectsError || usersError || phasesError || subphasesError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erro ao carregar dados</h1>
          <p className="text-gray-600 mb-4">
            {companiesError?.message || projectsError?.message || usersError?.message || phasesError?.message || subphasesError?.message}
          </p>
          <Button onClick={() => window.location.reload()}>Tentar novamente</Button>
        </div>
      </div>
    );
  }

  // Use the actual subphases count from the API
  const subphasesCount = subphases.length;

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className={getBackgroundClasses()}>
      {/* Header */}
      <header className={getHeaderClasses()}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleGoHome}
                className={`${getButtonClasses('outline')} flex items-center gap-2`}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar ao Dashboard</span>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-theme-primary">Gerenciamento</h1>
                <p className="text-theme-secondary text-sm">
                  Gerencie empresas, projetos e usuários do sistema TimeFlow
                </p>
              </div>
            </div>
            <ThemeController />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">

        {/* Quick Stats Cards */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className={`${getCardClasses()} p-6`}>
            <div className="flex items-center space-x-3 mb-4">
              <Building2 className="w-6 h-6 text-accent-blue" />
              <h3 className="text-lg font-semibold text-theme-primary">Empresas</h3>
            </div>
            <div className="text-3xl font-bold text-accent-blue mb-2">
              {companies.length}
            </div>
            <p className="text-sm text-theme-secondary">Total de empresas cadastradas</p>
          </div>

          <div className={`${getCardClasses()} p-6`}>
            <div className="flex items-center space-x-3 mb-4">
              <FolderOpen className="w-6 h-6 text-accent-green" />
              <h3 className="text-lg font-semibold text-theme-primary">Projetos</h3>
            </div>
            <div className="text-3xl font-bold text-accent-green mb-2">
              {projects.length}
            </div>
            <p className="text-sm text-theme-secondary">Projetos ativos</p>
          </div>

          <div className={`${getCardClasses()} p-6`}>
            <div className="flex items-center space-x-3 mb-4">
              <Users className="w-6 h-6 text-accent-purple" />
              <h3 className="text-lg font-semibold text-theme-primary">Usuários</h3>
            </div>
            <div className="text-3xl font-bold text-accent-purple mb-2">
              {users.length}
            </div>
            <p className="text-sm text-theme-secondary">Usuários cadastrados</p>
          </div>

          <div className={`${getCardClasses()} p-6`}>
            <div className="flex items-center space-x-3 mb-4">
              <Layers className="w-6 h-6 text-accent-indigo" />
              <h3 className="text-lg font-semibold text-theme-primary">Fases</h3>
            </div>
            <div className="text-3xl font-bold text-accent-indigo mb-2">
              {phases.length}
            </div>
            <p className="text-sm text-theme-secondary">Fases disponíveis</p>
          </div>

          <div className={`${getCardClasses()} p-6`}>
            <div className="flex items-center space-x-3 mb-4">
              <Layers3 className="w-6 h-6 text-accent-violet" />
              <h3 className="text-lg font-semibold text-theme-primary">Subfases</h3>
            </div>
            <div className="text-3xl font-bold text-accent-violet mb-2">
              {subphasesCount}
            </div>
            <p className="text-sm text-theme-secondary">Subfases configuradas</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-8 lg:w-auto lg:grid-cols-8">
            <TabsTrigger value="kpis" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>KPIs</span>
            </TabsTrigger>
            <TabsTrigger value="companies" className="flex items-center space-x-2">
              <Building2 className="w-4 h-4" />
              <span>Empresas</span>
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center space-x-2">
              <FolderOpen className="w-4 h-4" />
              <span>Projetos</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Usuários</span>
            </TabsTrigger>
            <TabsTrigger value="phases" className="flex items-center space-x-2">
              <Layers className="w-4 h-4" />
              <span>Fases</span>
            </TabsTrigger>
            <TabsTrigger value="subphases" className="flex items-center space-x-2">
              <Layers3 className="w-4 h-4" />
              <span>Subfases</span>
            </TabsTrigger>
            <TabsTrigger value="subphases-dates" className="flex items-center space-x-2">
              <CalendarDays className="w-4 h-4" />
              <span>Datas</span>
            </TabsTrigger>
            <TabsTrigger value="follow-up" className="flex items-center space-x-2">
              <Mail className="w-4 h-4" />
              <span>Follow-up</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kpis" className="space-y-6">
            <ProjectKPIsDashboard />
          </TabsContent>

          <TabsContent value="companies" className="space-y-6">
            <div className={`${getCardClasses()} p-6`}>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-theme-primary flex items-center gap-3 mb-2">
                  <Building2 className="w-6 h-6 text-accent-blue" />
                  Empresas
                </h2>
                <p className="text-theme-secondary">
                  Gerencie empresas internas e clientes. As empresas são usadas para organizar projetos e usuários.
                </p>
              </div>
              <CompaniesManagement />
            </div>
          </TabsContent>

          <TabsContent value="projects" className="space-y-6">
            <div className={`${getCardClasses()} p-6`}>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-theme-primary flex items-center gap-3 mb-2">
                  <FolderOpen className="w-6 h-6 text-accent-green" />
                  Projetos
                </h2>
                <p className="text-theme-secondary">
                  Gerencie projetos e acompanhe o progresso. Os projetos podem ser associados a empresas e agendamentos.
                </p>
              </div>
              <ProjectsManagement />
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div className={`${getCardClasses()} p-6`}>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-theme-primary flex items-center gap-3 mb-2">
                  <Users className="w-6 h-6 text-accent-purple" />
                  Usuários
                </h2>
                <p className="text-theme-secondary">
                  Gerencie funcionários internos e externos. Os usuários podem ser atribuídos a agendamentos e reuniões.
                </p>
              </div>
              <UsersManagement />
            </div>
          </TabsContent>

          <TabsContent value="phases" className="space-y-6">
            <div className={`${getCardClasses()} p-6`}>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-theme-primary flex items-center gap-3 mb-2">
                  <Layers className="w-6 h-6 text-accent-indigo" />
                  Fases
                </h2>
                <p className="text-theme-secondary">
                  Gerencie as fases dos projetos. As fases ajudam a organizar o trabalho em etapas bem definidas.
                </p>
              </div>
              <PhasesManagement />
            </div>
          </TabsContent>

          <TabsContent value="subphases" className="space-y-6">
            <div className={`${getCardClasses()} p-6`}>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-theme-primary flex items-center gap-3 mb-2">
                  <Layers3 className="w-6 h-6 text-accent-violet" />
                  Subfases
                </h2>
                <p className="text-theme-secondary">
                  Gerencie as subfases dentro de cada fase. As subfases permitem um controle mais granular do progresso.
                </p>
              </div>
              <SubphasesManagement />
            </div>
          </TabsContent>

          <TabsContent value="subphases-dates" className="space-y-6">
            <div className={`${getCardClasses()} p-6`}>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-theme-primary flex items-center gap-3 mb-2">
                  <CalendarDays className="w-6 h-6 text-accent-blue" />
                  Datas das Subfases
                </h2>
                <p className="text-theme-secondary">
                  Defina datas de início e conclusão para as subfases dos projetos. 
                  Ao definir uma data de conclusão, um agendamento automático será criado.
                </p>
              </div>
              <ProjectSubphasesDates />
            </div>
          </TabsContent>

          <TabsContent value="follow-up" className="space-y-6">
            <FollowUpDashboard />
          </TabsContent>
        </Tabs>

        {/* Help Section */}
        <div className={`${getCardClasses()} p-6 mt-8`}>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-theme-primary flex items-center gap-3 mb-2">
              <Settings className="w-6 h-6 text-theme-secondary" />
              Como usar o Gerenciamento
            </h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium text-theme-primary flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-accent-blue" />
                  <span>1. Empresas</span>
                </h4>
                <p className="text-theme-secondary">
                  Comece cadastrando sua empresa (tipo "Interna") e as empresas clientes (tipo "Cliente").
                  Isso ajudará a organizar projetos e usuários.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-theme-primary flex items-center space-x-2">
                  <FolderOpen className="w-4 h-4 text-accent-green" />
                  <span>2. Projetos</span>
                </h4>
                <p className="text-theme-secondary">
                  Crie projetos associados às empresas. Defina prioridades, prazos e cores para
                  melhor organização visual nos agendamentos.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-theme-primary flex items-center space-x-2">
                  <Users className="w-4 h-4 text-accent-purple" />
                  <span>3. Usuários</span>
                </h4>
                <p className="text-theme-secondary">
                  Cadastre funcionários internos e externos. Eles poderão ser atribuídos aos
                  agendamentos para facilitar o controle de reuniões e tarefas.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-theme-primary flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-accent-indigo" />
                  <span>4. Fases</span>
                </h4>
                <p className="text-theme-secondary">
                  Crie fases para organizar o trabalho em etapas. Exemplos: Análise, Desenvolvimento,
                  Testes. As fases podem ser atribuídas aos projetos e tarefas.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-theme-primary flex items-center space-x-2">
                  <Layers3 className="w-4 h-4 text-accent-violet" />
                  <span>5. Subfases</span>
                </h4>
                <p className="text-theme-secondary">
                  Subdivida as fases em subfases menores para controle mais granular. Cada subfase
                  pode ter duração estimada, pré-requisitos e entregáveis específicos.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
