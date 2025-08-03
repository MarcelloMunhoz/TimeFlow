import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CompaniesManagement from "@/components/companies-management";
import ProjectsManagement from "@/components/projects-management";
import UsersManagement from "@/components/users-management";
import PhasesManagement from "@/components/phases-management";
import SubphasesManagement from "@/components/subphases-management";
import ProjectKPIsDashboard from "@/components/project-kpis-dashboard";
import { Building2, FolderOpen, Users, Settings, ArrowLeft, Home, Layers, Layers3, BarChart3 } from "lucide-react";

export default function ManagementPage() {
  const [activeTab, setActiveTab] = useState("kpis");
  const [, setLocation] = useLocation();

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

  // Show loading state
  if (companiesLoading || projectsLoading || usersLoading || phasesLoading) {
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
  if (companiesError || projectsError || usersError || phasesError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erro ao carregar dados</h1>
          <p className="text-gray-600 mb-4">
            {companiesError?.message || projectsError?.message || usersError?.message || phasesError?.message}
          </p>
          <Button onClick={() => window.location.reload()}>Tentar novamente</Button>
        </div>
      </div>
    );
  }

  const subphasesCount = 0; // Simplified for now

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={handleGoHome}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar ao Dashboard</span>
              </Button>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gerenciamento</h1>
          <p className="text-gray-600">
            Gerencie empresas, projetos e usuários do sistema TimeFlow
          </p>
        </div>

        {/* Quick Stats Cards */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-2 text-blue-800">
                <Building2 className="w-5 h-5" />
                <span>Empresas</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900 mb-1">
                {companies.length}
              </div>
              <p className="text-sm text-blue-700">Total de empresas cadastradas</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-2 text-green-800">
                <FolderOpen className="w-5 h-5" />
                <span>Projetos</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900 mb-1">
                {projects.length}
              </div>
              <p className="text-sm text-green-700">Projetos ativos</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-2 text-purple-800">
                <Users className="w-5 h-5" />
                <span>Usuários</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900 mb-1">
                {users.length}
              </div>
              <p className="text-sm text-purple-700">Usuários cadastrados</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-indigo-50 to-indigo-100 border-indigo-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-2 text-indigo-800">
                <Layers className="w-5 h-5" />
                <span>Fases</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-900 mb-1">
                {phases.length}
              </div>
              <p className="text-sm text-indigo-700">Fases disponíveis</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-violet-50 to-violet-100 border-violet-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-2 text-violet-800">
                <Layers3 className="w-5 h-5" />
                <span>Subfases</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-violet-900 mb-1">
                {subphasesCount}
              </div>
              <p className="text-sm text-violet-700">Subfases configuradas</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:grid-cols-6">
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
          </TabsList>

          <TabsContent value="kpis" className="space-y-6">
            <ProjectKPIsDashboard />
          </TabsContent>

          <TabsContent value="companies" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <span>Empresas</span>
                </CardTitle>
                <CardDescription>
                  Gerencie empresas internas e clientes. As empresas são usadas para organizar projetos e usuários.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CompaniesManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FolderOpen className="w-5 h-5 text-green-600" />
                  <span>Projetos</span>
                </CardTitle>
                <CardDescription>
                  Gerencie projetos e acompanhe o progresso. Os projetos podem ser associados a empresas e agendamentos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProjectsManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  <span>Usuários</span>
                </CardTitle>
                <CardDescription>
                  Gerencie funcionários internos e externos. Os usuários podem ser atribuídos a agendamentos e reuniões.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UsersManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="phases" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  <span>Fases</span>
                </CardTitle>
                <CardDescription>
                  Gerencie as fases dos projetos. As fases ajudam a organizar o trabalho em etapas bem definidas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PhasesManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subphases" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Layers3 className="w-5 h-5 text-violet-600" />
                  <span>Subfases</span>
                </CardTitle>
                <CardDescription>
                  Gerencie as subfases dentro de cada fase. As subfases permitem um controle mais granular do progresso.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SubphasesManagement />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Help Section */}
        <Card className="mt-8 bg-gray-50 border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-gray-800">
              <Settings className="w-5 h-5" />
              <span>Como usar o Gerenciamento</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span>1. Empresas</span>
                </h4>
                <p className="text-gray-600">
                  Comece cadastrando sua empresa (tipo "Interna") e as empresas clientes (tipo "Cliente"). 
                  Isso ajudará a organizar projetos e usuários.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                  <FolderOpen className="w-4 h-4 text-green-600" />
                  <span>2. Projetos</span>
                </h4>
                <p className="text-gray-600">
                  Crie projetos associados às empresas. Defina prioridades, prazos e cores para 
                  melhor organização visual nos agendamentos.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span>3. Usuários</span>
                </h4>
                <p className="text-gray-600">
                  Cadastre funcionários internos e externos. Eles poderão ser atribuídos aos
                  agendamentos para facilitar o controle de reuniões e tarefas.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>4. Fases</span>
                </h4>
                <p className="text-gray-600">
                  Crie fases para organizar o trabalho em etapas. Exemplos: Análise, Desenvolvimento,
                  Testes. As fases podem ser atribuídas aos projetos e tarefas.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                  <Layers3 className="w-4 h-4 text-violet-600" />
                  <span>5. Subfases</span>
                </h4>
                <p className="text-gray-600">
                  Subdivida as fases em subfases menores para controle mais granular. Cada subfase
                  pode ter duração estimada, pré-requisitos e entregáveis específicos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
