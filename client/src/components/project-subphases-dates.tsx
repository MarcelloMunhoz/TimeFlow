import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, CheckCircle, AlertTriangle, Target, CalendarDays, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTheme } from "@/hooks/use-theme";

interface Project {
  id: number;
  name: string;
  description?: string;
  status: string;
  startDate?: string;
  endDate?: string;
}

interface Phase {
  id: number;
  name: string;
  color: string;
}

interface ProjectPhase {
  id: number;
  projectId: number;
  phaseId: number;
  startDate?: string;
  endDate?: string;
  status: string;
  progressPercentage: number;
  phase: Phase;
}

interface ProjectSubphase {
  id: number;
  projectPhaseId: number;
  subphaseId: number;
  startDate?: string;
  endDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  status: string;
  progressPercentage: number;
  assignedUserId?: number;
  priority: string;
  estimatedHours?: number;
  actualHours: number;
  qualityScore?: number;
  notes?: string;
  subphase: {
    id: number;
    name: string;
    description?: string;
    estimatedDurationDays?: number;
  };
}

interface User {
  id: number;
  name: string;
  email: string;
  type: string;
}

export default function ProjectSubphasesDates() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [editingSubphase, setEditingSubphase] = useState<ProjectSubphase | null>(null);
  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    assignedUserId: "",
    priority: "medium",
    estimatedHours: "",
    notes: ""
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getCardClasses, getButtonClasses } = useTheme();

  // Fetch projects
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/projects");
      return response.json();
    },
  });

  // Fetch users for assignment
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/users");
      return response.json();
    },
  });

  // Fetch project phases and subphases
  const { data: projectPhases = [], isLoading } = useQuery<ProjectPhase[]>({
    queryKey: ["/api/projects", selectedProjectId, "phases"],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const response = await apiRequest("GET", `/api/projects/${selectedProjectId}/phases`);
      return response.json();
    },
    enabled: !!selectedProjectId,
  });

  // Fetch project subphases
  const { data: projectSubphases = [] } = useQuery<ProjectSubphase[]>({
    queryKey: ["/api/projects", selectedProjectId, "subphases"],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const response = await apiRequest("GET", `/api/projects/${selectedProjectId}/subphases`);
      return response.json();
    },
    enabled: !!selectedProjectId,
  });

  // Update subphase mutation
  const updateSubphaseMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/project-subphases/${id}`, updates);
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProjectId, "subphases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] }); // Refresh appointments if auto-created
      setEditingSubphase(null);
      resetForm();
      
      // Show success message with information about automatic appointment
      if (variables.updates.endDate) {
        toast({ 
          title: "Subfase atualizada com sucesso!", 
          description: "Se uma data de conclusão foi definida, um agendamento automático foi criado para esta data."
        });
      } else {
        toast({ title: "Subfase atualizada com sucesso!" });
      }
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao atualizar subfase", 
        description: error.message || "Ocorreu um erro inesperado" 
      });
    },
  });

  const resetForm = () => {
    setFormData({
      startDate: "",
      endDate: "",
      assignedUserId: "",
      priority: "medium",
      estimatedHours: "",
      notes: ""
    });
  };

  const handleEdit = (subphase: ProjectSubphase) => {
    setEditingSubphase(subphase);
    setFormData({
      startDate: subphase.startDate || "",
      endDate: subphase.endDate || "",
      assignedUserId: subphase.assignedUserId?.toString() || "",
      priority: subphase.priority || "medium",
      estimatedHours: subphase.estimatedHours?.toString() || "",
      notes: subphase.notes || ""
    });
  };

  const handleSave = () => {
    if (!editingSubphase) return;

    const updates: any = {};
    
    if (formData.startDate !== (editingSubphase.startDate || "")) {
      updates.startDate = formData.startDate || null;
    }
    if (formData.endDate !== (editingSubphase.endDate || "")) {
      updates.endDate = formData.endDate || null;
    }
    if (formData.assignedUserId !== (editingSubphase.assignedUserId?.toString() || "")) {
      updates.assignedUserId = formData.assignedUserId ? parseInt(formData.assignedUserId) : null;
    }
    if (formData.priority !== editingSubphase.priority) {
      updates.priority = formData.priority;
    }
    if (formData.estimatedHours !== (editingSubphase.estimatedHours?.toString() || "")) {
      updates.estimatedHours = formData.estimatedHours ? parseInt(formData.estimatedHours) : null;
    }
    if (formData.notes !== (editingSubphase.notes || "")) {
      updates.notes = formData.notes || null;
    }

    if (Object.keys(updates).length > 0) {
      updateSubphaseMutation.mutate({ id: editingSubphase.id, updates });
    } else {
      setEditingSubphase(null);
      resetForm();
    }
  };

  const handleCancel = () => {
    setEditingSubphase(null);
    resetForm();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'on_hold': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default: return <Target className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Não definida";
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-theme-primary mb-2 flex items-center gap-3">
          <CalendarDays className="w-7 h-7 text-accent-blue" />
          Gerenciamento de Datas das Subfases
        </h2>
        <p className="text-theme-secondary">
          Defina datas de início e conclusão para as subfases dos projetos. 
          <span className="font-medium text-accent-blue"> Ao definir uma data de conclusão, um agendamento automático será criado.</span>
        </p>
      </div>

      {/* Project Selection */}
      <div className={`${getCardClasses()} p-6`}>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-theme-primary mb-2">Selecionar Projeto</h3>
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Escolha um projeto..." />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id.toString()}>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(project.status)} variant="outline">
                      {project.status}
                    </Badge>
                    {project.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Project Subphases */}
      {selectedProjectId && (
        <div className="space-y-4">
          {isLoading ? (
            <div className={`${getCardClasses()} p-6`}>
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-theme-tertiary rounded w-1/4"></div>
                <div className="h-4 bg-theme-tertiary rounded w-3/4"></div>
                <div className="h-4 bg-theme-tertiary rounded w-1/2"></div>
              </div>
            </div>
          ) : projectPhases.length === 0 ? (
            <div className={`${getCardClasses()} p-6`}>
              <p className="text-theme-secondary text-center">
                Nenhuma fase encontrada para este projeto.
              </p>
            </div>
          ) : (
            projectPhases.map((phase) => {
              const phaseSubphases = projectSubphases.filter(
                (ps) => ps.projectPhaseId === phase.id
              );

              return (
                <div key={phase.id} className={`${getCardClasses()} p-6`}>
                  <div className="mb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: phase.phase.color }}
                      />
                      <h3 className="text-lg font-semibold text-theme-primary">
                        {phase.phase.name}
                      </h3>
                      <Badge className={getStatusColor(phase.status)} variant="outline">
                        {phase.status}
                      </Badge>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {phase.progressPercentage}% concluído
                      </Badge>
                    </div>
                    {(phase.startDate || phase.endDate) && (
                      <div className="flex items-center gap-4 text-sm text-theme-secondary">
                        {phase.startDate && (
                          <span>📅 Início: {formatDate(phase.startDate)}</span>
                        )}
                        {phase.endDate && (
                          <span>🏁 Fim: {formatDate(phase.endDate)}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {phaseSubphases.length === 0 ? (
                    <p className="text-theme-muted text-sm">
                      Nenhuma subfase encontrada para esta fase.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {phaseSubphases.map((subphase) => (
                        <div
                          key={subphase.id}
                          className={`border rounded-lg p-4 ${
                            editingSubphase?.id === subphase.id
                              ? 'border-accent-blue bg-blue-50/50 dark:bg-blue-900/20'
                              : 'border-theme-muted bg-theme-tertiary'
                          } transition-all duration-200`}
                        >
                          {editingSubphase?.id === subphase.id ? (
                            // Edit Form
                            <div className="space-y-4">
                              <div className="flex items-center gap-2 mb-3">
                                <h4 className="font-medium text-theme-primary">
                                  Editando: {subphase.subphase.name}
                                </h4>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-theme-primary mb-1">
                                    Data de Início
                                  </label>
                                  <Input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                                    className="w-full"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-theme-primary mb-1">
                                    Data de Conclusão
                                    <span className="text-accent-blue text-xs ml-1">
                                      (criará agendamento automático)
                                    </span>
                                  </label>
                                  <Input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                                    className="w-full"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-theme-primary mb-1">
                                    Responsável
                                  </label>
                                  <Select
                                    value={formData.assignedUserId}
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, assignedUserId: value }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecionar usuário..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="">Nenhum</SelectItem>
                                      {users.map((user) => (
                                        <SelectItem key={user.id} value={user.id.toString()}>
                                          {user.name} ({user.email})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-theme-primary mb-1">
                                    Prioridade
                                  </label>
                                  <Select
                                    value={formData.priority}
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="low">Baixa</SelectItem>
                                      <SelectItem value="medium">Média</SelectItem>
                                      <SelectItem value="high">Alta</SelectItem>
                                      <SelectItem value="urgent">Urgente</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-theme-primary mb-1">
                                    Horas Estimadas
                                  </label>
                                  <Input
                                    type="number"
                                    value={formData.estimatedHours}
                                    onChange={(e) => setFormData(prev => ({ ...prev, estimatedHours: e.target.value }))}
                                    placeholder="Ex: 8"
                                    min="0"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-theme-primary mb-1">
                                  Observações
                                </label>
                                <textarea
                                  value={formData.notes}
                                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                  className="w-full px-3 py-2 border border-theme-muted rounded-lg bg-theme-secondary text-theme-primary resize-none"
                                  rows={3}
                                  placeholder="Observações sobre esta subfase..."
                                />
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  onClick={handleSave}
                                  disabled={updateSubphaseMutation.isPending}
                                  className={`${getButtonClasses('primary')} flex items-center gap-2`}
                                >
                                  <Save className="w-4 h-4" />
                                  {updateSubphaseMutation.isPending ? 'Salvando...' : 'Salvar'}
                                </Button>
                                <Button
                                  onClick={handleCancel}
                                  variant="outline"
                                  className={`${getButtonClasses('outline')} flex items-center gap-2`}
                                >
                                  <X className="w-4 h-4" />
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            // Display View
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {getStatusIcon(subphase.status)}
                                  <h4 className="font-medium text-theme-primary">
                                    {subphase.subphase.name}
                                  </h4>
                                  <Badge className={getStatusColor(subphase.status)} variant="outline">
                                    {subphase.status}
                                  </Badge>
                                  <Badge className={getPriorityColor(subphase.priority)} variant="outline">
                                    {subphase.priority}
                                  </Badge>
                                </div>
                                <Button
                                  onClick={() => handleEdit(subphase)}
                                  variant="outline"
                                  size="sm"
                                  className={`${getButtonClasses('outline')} flex items-center gap-2`}
                                >
                                  <Calendar className="w-4 h-4" />
                                  Editar Datas
                                </Button>
                              </div>

                              {subphase.subphase.description && (
                                <p className="text-sm text-theme-secondary">
                                  {subphase.subphase.description}
                                </p>
                              )}

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-theme-muted">Data Início:</span>
                                  <div className="font-medium text-theme-primary">
                                    {formatDate(subphase.startDate)}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-theme-muted">Data Conclusão:</span>
                                  <div className="font-medium text-theme-primary">
                                    {formatDate(subphase.endDate)}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-theme-muted">Progresso:</span>
                                  <div className="font-medium text-theme-primary">
                                    {subphase.progressPercentage}%
                                  </div>
                                </div>
                                <div>
                                  <span className="text-theme-muted">Horas:</span>
                                  <div className="font-medium text-theme-primary">
                                    {subphase.actualHours}h / {subphase.estimatedHours || 0}h
                                  </div>
                                </div>
                              </div>

                              {subphase.notes && (
                                <div className="pt-2 border-t border-theme-muted">
                                  <span className="text-theme-muted text-sm">Observações:</span>
                                  <p className="text-sm text-theme-secondary mt-1">
                                    {subphase.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Info Card */}
      {selectedProjectId && (
        <div className={`${getCardClasses()} p-6 border-accent-blue/20 bg-blue-50/50 dark:bg-blue-900/20`}>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-accent-blue" />
            </div>
            <div>
              <h4 className="font-medium text-theme-primary mb-2">
                Agendamento Automático
              </h4>
              <p className="text-sm text-theme-secondary">
                Quando você definir uma <strong>data de conclusão</strong> para uma subfase, 
                o sistema criará automaticamente um agendamento de 1 hora com SLA de 2 horas 
                para essa data. O agendamento será criado dentro do horário comercial 
                (8h às 18h, excluindo 12h às 13h) e será marcado como "encaixe" se houver conflitos.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


