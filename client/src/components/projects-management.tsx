import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
// Removed Button import - using pattern-aware buttons
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CardDescriptionText } from "@/components/ui/formatted-text";
import { useToast } from "@/hooks/use-toast";
import { CustomModal } from "@/components/ui/custom-modal";
import ProjectPhasesManagement from "@/components/project-phases-management";
import { useTheme } from "@/hooks/use-theme";
import { FolderOpen, Plus, Edit, Trash2, Calendar, Clock, Building2, RefreshCw, Timer, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePomodoroManualCheck } from "@/hooks/use-pomodoro-auto-completion";

interface ProjectFormData {
  name: string;
  description: string;
  companyId: number;
  status: "active" | "completed" | "paused" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  startDate: string;
  endDate: string;
  estimatedHours: number;
  color: string;
}

interface Project {
  id: number;
  name: string;
  description?: string;
  companyId: number;
  status: "active" | "completed" | "paused" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  startDate?: string;
  endDate?: string;
  estimatedHours?: number;
  actualHours: number;
  color: string;
  isActive: boolean;
  createdAt: string;
}

interface Company {
  id: number;
  name: string;
  type: "internal" | "client";
}

const statusLabels = {
  active: "Ativo",
  completed: "Concluído",
  paused: "Pausado",
  cancelled: "Cancelado",
};

const priorityLabels = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

const priorityColors = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

const statusColors = {
  active: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  paused: "bg-yellow-100 text-yellow-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function ProjectsManagement() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isPhasesModalOpen, setIsPhasesModalOpen] = useState(false);
  const [selectedProjectForPhases, setSelectedProjectForPhases] = useState<Project | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed" | "paused" | "cancelled">("all");
  const [formData, setFormData] = useState<ProjectFormData>({
    name: "",
    description: "",
    companyId: 0,
    status: "active",
    priority: "medium",
    startDate: "",
    endDate: "",
    estimatedHours: 0,
    color: "#3B82F6",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getCardClasses, getButtonClasses } = useTheme();

  // Pomodoro auto-completion manual check
  const { manualCheck: checkPomodoroTasks, isLoading: isPomodoroCheckLoading } = usePomodoroManualCheck();

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      companyId: 0,
      status: "active",
      priority: "medium",
      startDate: "",
      endDate: "",
      estimatedHours: 0,
      color: "#3B82F6",
    });
    setErrors({});
    setEditingProject(null);
  };

  // Handle modal close
  const handleModalClose = () => {
    resetForm();
    setIsModalOpen(false);
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome é obrigatório";
    }

    if (!formData.companyId || formData.companyId === 0) {
      newErrors.companyId = "Empresa é obrigatória";
    }

    if (!formData.color.trim()) {
      newErrors.color = "Cor é obrigatória";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const submitData = {
      ...formData,
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      estimatedHours: formData.estimatedHours || 0,
    };

    if (editingProject) {
      updateProjectMutation.mutate({ id: editingProject.id, data: { ...submitData, description: submitData.description || "" } });
    } else {
      createProjectMutation.mutate({ ...submitData, description: submitData.description || "" });
    }
  };

  // Handle input changes
  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  // Handle edit
  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || "",
      companyId: project.companyId,
      status: project.status,
      priority: project.priority,
      startDate: project.startDate || "",
      endDate: project.endDate || "",
      estimatedHours: project.estimatedHours || 0,
      color: project.color,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  // Handle delete
  const handleDelete = (id: number) => {
    const project = projects?.find(p => p.id === id);
    const projectName = project?.name || `ID ${id}`;

    const confirmMessage = `Tem certeza que deseja excluir o projeto "${projectName}"?\n\n⚠️ ATENÇÃO: Se este projeto possuir agendamentos, fases ou outras dependências, a exclusão será bloqueada.\n\nEsta ação não pode ser desfeita.`;

    if (confirm(confirmMessage)) {
      deleteProjectMutation.mutate(id);
    }
  };

  // Handle new project
  const handleNewProject = () => {
    resetForm();
    setIsModalOpen(true);
  };

  // Handle manage phases
  const handleManagePhases = (project: Project) => {
    setSelectedProjectForPhases(project);
    setIsPhasesModalOpen(true);
  };

  // Handle phases modal close
  const handlePhasesModalClose = () => {
    setSelectedProjectForPhases(null);
    setIsPhasesModalOpen(false);
  };

  // Fetch projects and companies
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: companies = [], isLoading: companiesLoading } = useQuery({
    queryKey: ["/api/companies"],
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: (data: ProjectFormData) => apiRequest("POST", "/api/projects", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Projeto criado com sucesso!" });
      handleModalClose();
    },
    onError: () => {
      toast({ title: "Erro ao criar projeto", variant: "destructive" });
    },
  });

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProjectFormData }) =>
      apiRequest("PATCH", `/api/projects/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Projeto atualizado com sucesso!" });
      handleModalClose();
    },
    onError: () => {
      toast({ title: "Erro ao atualizar projeto", variant: "destructive" });
    },
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Projeto excluído com sucesso!" });
    },
    onError: async (error: any) => {
      console.error("Delete project error:", error);

      try {
        // Try to get the error response
        const errorResponse = await error.response?.json();

        if (errorResponse?.type === "constraint_violation") {
          toast({
            title: "Não é possível excluir este projeto",
            description: errorResponse.details || "Este projeto possui dependências que impedem sua exclusão.",
            variant: "destructive",
            duration: 8000
          });
        } else {
          toast({
            title: "Erro ao excluir projeto",
            description: errorResponse?.message || "Erro desconhecido",
            variant: "destructive"
          });
        }
      } catch {
        toast({
          title: "Erro ao excluir projeto",
          description: "Verifique se o projeto não possui agendamentos ou outras dependências.",
          variant: "destructive"
        });
      }
    },
  });

  // Update all projects progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async () => {
      console.log("🔄 Starting update all progress mutation...");
      const response = await apiRequest("POST", "/api/projects/update-all-progress");
      const data = await response.json();
      console.log("✅ Update progress response:", data);
      return data;
    },
    onSuccess: (data: any) => {
      console.log("🎉 Update progress success:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Progresso atualizado!",
        description: `${data.updates.length} projetos atualizados com base no tempo dos timers.`
      });
    },
    onError: (error: any) => {
      console.error("❌ Update progress error:", error);
      toast({ title: "Erro ao atualizar progresso", variant: "destructive" });
    },
  });

  // Functions are defined above in the correct order

  const getCompanyName = (companyId: number) => {
    const company = (companies as Company[]).find((c: Company) => c.id === companyId);
    return company?.name || "Empresa não encontrada";
  };

  const calculateProgress = (project: Project) => {
    if (!project.estimatedHours || project.estimatedHours === 0) return 0;
    // Convert actualHours from minutes to hours for calculation
    const actualHoursConverted = (project.actualHours || 0) / 60;
    return Math.min((actualHoursConverted / project.estimatedHours) * 100, 100);
  };

  // Filter projects based on status
  const filteredProjects = (projects as Project[]).filter(project => {
    if (statusFilter === "all") return true;
    return project.status === statusFilter;
  });

  // Get project counts for filter badges
  const projectCounts = {
    all: (projects as Project[]).length,
    active: (projects as Project[]).filter(p => p.status === 'active').length,
    completed: (projects as Project[]).filter(p => p.status === 'completed').length,
    paused: (projects as Project[]).filter(p => p.status === 'paused').length,
    cancelled: (projects as Project[]).filter(p => p.status === 'cancelled').length,
  };

  // Handle update all progress
  const handleUpdateAllProgress = () => {
    console.log("🔘 Update progress button clicked");
    updateProgressMutation.mutate();
  };

  if (projectsLoading || companiesLoading) {
    return <div className="flex justify-center p-8">Carregando projetos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gerenciar Projetos</h2>
          <p className="text-gray-600">Gerencie projetos e acompanhe o progresso</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleUpdateAllProgress}
            disabled={updateProgressMutation.isPending}
            className={`${getButtonClasses('outline')} border-green-600 text-green-600 hover:bg-green-50 flex items-center gap-2 transition-all duration-300 ease-in-out`}
          >
            <RefreshCw className={cn("w-4 h-4", updateProgressMutation.isPending && "animate-spin")} />
            {updateProgressMutation.isPending ? "Atualizando..." : "Atualizar Progresso"}
          </button>
          <button
            onClick={() => checkPomodoroTasks()}
            disabled={isPomodoroCheckLoading}
            title="Verificar e concluir automaticamente tarefas Pomodoro atrasadas"
            className={`${getButtonClasses('outline')} border-orange-600 text-orange-600 hover:bg-orange-50 flex items-center gap-2 transition-all duration-300 ease-in-out`}
          >
            <Timer className={cn("w-4 h-4", isPomodoroCheckLoading && "animate-pulse")} />
            {isPomodoroCheckLoading ? "Verificando..." : "Verificar Pomodoros"}
          </button>
          <button
            onClick={handleNewProject}
            className={`${getButtonClasses('primary')} flex items-center gap-2`}
          >
            <Plus className="w-4 h-4" />
            Novo Projeto
          </button>
        </div>

      </div>

      {/* Status Filter */}
      <Card className="neo-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-blue-600" />
              Filtrar Projetos
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out ${
                  statusFilter === "all"
                    ? "neo-inset bg-blue-50 text-blue-700"
                    : "neo-elevated hover:neo-inset text-gray-600 hover:text-blue-600"
                }`}
              >
                Todos ({projectCounts.all})
              </button>
              <button
                onClick={() => setStatusFilter("active")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out ${
                  statusFilter === "active"
                    ? "neo-inset bg-green-50 text-green-700"
                    : "neo-elevated hover:neo-inset text-gray-600 hover:text-green-600"
                }`}
              >
                Ativos ({projectCounts.active})
              </button>
              <button
                onClick={() => setStatusFilter("completed")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out ${
                  statusFilter === "completed"
                    ? "neo-inset bg-emerald-50 text-emerald-700"
                    : "neo-elevated hover:neo-inset text-gray-600 hover:text-emerald-600"
                }`}
              >
                Concluídos ({projectCounts.completed})
              </button>
              {projectCounts.paused > 0 && (
                <button
                  onClick={() => setStatusFilter("paused")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out ${
                    statusFilter === "paused"
                      ? "neo-inset bg-yellow-50 text-yellow-700"
                      : "neo-elevated hover:neo-inset text-gray-600 hover:text-yellow-600"
                  }`}
                >
                  Pausados ({projectCounts.paused})
                </button>
              )}
              {projectCounts.cancelled > 0 && (
                <button
                  onClick={() => setStatusFilter("cancelled")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out ${
                    statusFilter === "cancelled"
                      ? "neo-inset bg-red-50 text-red-700"
                      : "neo-elevated hover:neo-inset text-gray-600 hover:text-red-600"
                  }`}
                >
                  Cancelados ({projectCounts.cancelled})
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Modal */}
      <CustomModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        title={editingProject ? "Editar Projeto" : "Novo Projeto"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="project-name">Nome *</Label>
            <Input
              id="project-name"
              placeholder="Nome do projeto"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <Label htmlFor="project-company">Empresa *</Label>
            <select
              id="project-company"
              value={formData.companyId}
              onChange={(e) => handleInputChange("companyId", parseInt(e.target.value))}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.companyId ? "border-red-500" : ""}`}
            >
              <option value={0}>Selecione a empresa</option>
              {(companies as Company[]).map((company: Company) => (
                <option key={company.id} value={company.id}>
                  {company.name} ({company.type === "internal" ? "Interna" : "Cliente"})
                </option>
              ))}
            </select>
            {errors.companyId && (
              <p className="text-sm text-red-600 mt-1">{errors.companyId}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="project-status">Status</Label>
              <select
                id="project-status"
                value={formData.status}
                onChange={(e) => handleInputChange("status", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="project-priority">Prioridade</Label>
              <select
                id="project-priority"
                value={formData.priority}
                onChange={(e) => handleInputChange("priority", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(priorityLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="project-description">Descrição</Label>
            <Textarea
              id="project-description"
              placeholder="Descreva o projeto, seus objetivos e detalhes importantes..."
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              maxLength={2000}

              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="project-start-date">Data Início</Label>
              <Input
                id="project-start-date"
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange("startDate", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="project-end-date">Data Fim</Label>
              <Input
                id="project-end-date"
                type="date"
                value={formData.endDate}
                onChange={(e) => handleInputChange("endDate", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="project-estimated-hours">Horas Estimadas</Label>
              <Input
                id="project-estimated-hours"
                type="number"
                min="0"
                placeholder="0"
                value={formData.estimatedHours}
                onChange={(e) => handleInputChange("estimatedHours", parseInt(e.target.value) || 0)}
              />
            </div>

            <div>
              <Label htmlFor="project-color">Cor *</Label>
              <Input
                id="project-color"
                type="color"
                value={formData.color}
                onChange={(e) => handleInputChange("color", e.target.value)}
                className={errors.color ? "border-red-500" : ""}
              />
              {errors.color && (
                <p className="text-sm text-red-600 mt-1">{errors.color}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={handleModalClose}
              className={`${getButtonClasses('outline')} flex items-center justify-center`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createProjectMutation.isPending || updateProjectMutation.isPending}
              className={`${getButtonClasses('primary')} flex items-center justify-center`}
            >
              {editingProject ? "Atualizar" : "Criar"}
            </button>
          </div>
        </form>
      </CustomModal>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.map((project: Project) => (
          <Card key={project.id} className="hover:shadow-md transition-all duration-300 ease-in-out hover:-translate-y-0.5">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: project.color }}
                  />
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                </div>
                <div className="flex space-x-1">
                  <Badge className={priorityColors[project.priority]}>
                    {priorityLabels[project.priority]}
                  </Badge>
                  <Badge className={statusColors[project.status]}>
                    {statusLabels[project.status]}
                  </Badge>
                </div>
              </div>
              {project.description && (
                <CardDescriptionText maxLines={3}>
                  {project.description}
                </CardDescriptionText>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Building2 className="w-4 h-4" />
                <span>{getCompanyName(project.companyId)}</span>
              </div>
              
              {project.estimatedHours && project.estimatedHours > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>Progresso</span>
                    </span>
                    <span>{Math.round((project.actualHours / 60) * 10) / 10}h / {project.estimatedHours}h</span>
                  </div>
                  <Progress value={calculateProgress(project)} className="h-2" />
                </div>
              )}

              {(project.startDate || project.endDate) && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {project.startDate && new Date(project.startDate).toLocaleDateString('pt-BR')}
                    {project.startDate && project.endDate && " - "}
                    {project.endDate && new Date(project.endDate).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => handleManagePhases(project)}
                  title="Gerenciar Fases"
                  className={`${getButtonClasses('outline')} px-3 py-1 text-sm flex items-center justify-center`}
                >
                  <Layers className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleEdit(project)}
                  title="Editar Projeto"
                  className={`${getButtonClasses('outline')} px-3 py-1 text-sm flex items-center justify-center`}
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(project.id)}
                  title="Excluir Projeto"
                  className={`${getButtonClasses('outline')} px-3 py-1 text-sm flex items-center justify-center text-red-600 hover:text-red-700 transition-all duration-300 ease-in-out`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProjects.length === 0 && (projects as Project[]).length === 0 && (
        <div className="text-center py-12">
          <FolderOpen className="w-12 h-12 text-theme-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-theme-primary mb-2">Nenhum projeto cadastrado</h3>
          <p className="text-theme-secondary mb-4">Comece criando seu primeiro projeto</p>
          <button
            onClick={handleNewProject}
            className={`${getButtonClasses('primary')} flex items-center gap-2`}
          >
            <Plus className="w-4 h-4" />
            Criar Primeiro Projeto
          </button>
        </div>
      )}

      {filteredProjects.length === 0 && (projects as Project[]).length > 0 && (
        <div className="text-center py-12">
          <FolderOpen className="w-12 h-12 text-theme-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-theme-primary mb-2">
            Nenhum projeto {statusFilter === "all" ? "" : statusLabels[statusFilter].toLowerCase()}
          </h3>
          <p className="text-theme-secondary mb-4">
            Tente alterar o filtro ou criar um novo projeto
          </p>
          <div className="flex justify-center space-x-2">
            <button
              onClick={() => setStatusFilter("all")}
              className={`${getButtonClasses('outline')} flex items-center gap-2`}
            >
              Ver Todos os Projetos
            </button>
            <button
              onClick={handleNewProject}
              className={`${getButtonClasses('primary')} flex items-center gap-2`}
            >
              <Plus className="w-4 h-4" />
              Novo Projeto
            </button>
          </div>
        </div>
      )}

      {/* Phases Management Modal */}
      <CustomModal
        isOpen={isPhasesModalOpen}
        onClose={handlePhasesModalClose}
        title={selectedProjectForPhases ? `Fases do Projeto: ${selectedProjectForPhases.name}` : "Gerenciar Fases"}
      >
        {selectedProjectForPhases && (
          <ProjectPhasesManagement
            projectId={selectedProjectForPhases.id}
            projectName={selectedProjectForPhases.name}
          />
        )}
      </CustomModal>
    </div>
  );
}
