import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Save, X, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Phase {
  id: number;
  name: string;
  description?: string;
  color: string;
}

interface ProjectPhase {
  id: number;
  projectId: number;
  phaseId: number;
  deadline?: string;
  createdAt: string;
  phase: Phase;
}

interface ProjectPhasesManagementProps {
  projectId: number;
  projectName: string;
}

// Helper function to format date for display without timezone issues
const formatDateForDisplay = (dateString: string | null | undefined): string => {
  if (!dateString || typeof dateString !== 'string') return '';

  try {
    // Parse the date as local date (avoid timezone conversion)
    const [year, month, day] = dateString.split('-');

    if (!year || !month || !day) return '';

    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

    // Check if date is valid
    if (isNaN(date.getTime())) return '';

    return date.toLocaleDateString('pt-BR');
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

export default function ProjectPhasesManagement({ projectId, projectName }: ProjectPhasesManagementProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>("");
  const [deadline, setDeadline] = useState<string>("");
  const [editingPhase, setEditingPhase] = useState<ProjectPhase | null>(null);



  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all phases
  const { data: allPhases = [] } = useQuery<Phase[]>({
    queryKey: ["/api/phases"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/phases");
      return response.json();
    },
  });

  // Fetch project phases
  const { data: projectPhases = [], isLoading } = useQuery<ProjectPhase[]>({
    queryKey: [`/api/projects/${projectId}/phases`],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/projects/${projectId}/phases`);
      return response.json();
    },
  });

  // Add phase to project mutation
  const addPhaseMutation = useMutation({
    mutationFn: async (data: { phaseId: number; endDate?: string }) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/phases`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/phases`] });
      setShowAddForm(false);
      setSelectedPhaseId("");
      setDeadline("");
      toast({ title: "Fase adicionada ao projeto com sucesso!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao adicionar fase", 
        description: error?.response?.data?.message || "Erro desconhecido",
        variant: "destructive" 
      });
    }
  });

  // Update project phase mutation
  const updatePhaseMutation = useMutation({
    mutationFn: async ({ phaseId, data }: { phaseId: number; data: { endDate?: string } }) => {
      const response = await apiRequest("PATCH", `/api/projects/${projectId}/phases/${phaseId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/phases`] });
      setEditingPhase(null);
      setDeadline("");
      toast({ title: "Prazo da fase atualizado com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar fase",
        description: error?.message || error?.response?.data?.message || "Erro desconhecido",
        variant: "destructive"
      });
    }
  });

  // Remove phase from project mutation
  const removePhaseMutation = useMutation({
    mutationFn: async (phaseId: number) => {
      const response = await apiRequest("DELETE", `/api/projects/${projectId}/phases/${phaseId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/phases`] });
      toast({ title: "Fase removida do projeto com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover fase",
        description: error?.message || error?.response?.data?.message || "Erro desconhecido",
        variant: "destructive"
      });
    }
  });

  // Get available phases (not already assigned to project)
  const availablePhases = allPhases.filter(
    phase => !projectPhases.some(pp => pp.phaseId === phase.id)
  );

  const handleAddPhase = () => {
    if (!selectedPhaseId) {
      toast({ title: "Selecione uma fase", variant: "destructive" });
      return;
    }
    
    addPhaseMutation.mutate({
      phaseId: parseInt(selectedPhaseId),
      endDate: deadline || undefined
    });
  };

  const handleEditDeadline = (projectPhase: ProjectPhase) => {
    console.log("🔧 handleEditDeadline called with:", projectPhase);
    setEditingPhase(projectPhase);
    setDeadline(projectPhase.deadline || "");
    console.log("✅ editingPhase set, deadline set to:", projectPhase.deadline || "");
  };

  const handleUpdateDeadline = () => {
    if (!editingPhase) return;

    updatePhaseMutation.mutate({
      phaseId: editingPhase.phaseId,
      data: { endDate: deadline || undefined }
    });
  };

  const handleRemovePhase = (projectPhase: ProjectPhase) => {
    if (confirm(`Tem certeza que deseja remover a fase "${projectPhase.phase.name}" deste projeto?`)) {
      removePhaseMutation.mutate(projectPhase.phaseId);
    }
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingPhase(null);
    setSelectedPhaseId("");
    setDeadline("");
  };

  if (isLoading) {
    return <div className="p-4">Carregando fases do projeto...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Fases do Projeto</h3>
          <p className="text-sm text-gray-600">{projectName}</p>
        </div>
        <Button 
          onClick={() => setShowAddForm(true)}
          disabled={!!(showAddForm || editingPhase || availablePhases.length === 0)}
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Fase
        </Button>
      </div>

      {/* Add Phase Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Adicionar Fase ao Projeto</CardTitle>
            <CardDescription>
              Selecione uma fase e defina um prazo específico para este projeto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Fase *</label>
              <Select value={selectedPhaseId} onValueChange={setSelectedPhaseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma fase" />
                </SelectTrigger>
                <SelectContent>
                  {availablePhases.filter((phase) => phase.id && phase.id.toString().trim() !== "").map((phase) => (
                    <SelectItem key={phase.id} value={phase.id.toString()}>
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: phase.color }}
                        />
                        <span>{phase.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Prazo (opcional)</label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            <div className="flex space-x-2">
              <Button 
                onClick={handleAddPhase}
                disabled={addPhaseMutation.isPending}
                size="sm"
              >
                <Save className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
              <Button variant="outline" onClick={resetForm} size="sm">
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Deadline Form */}
      {editingPhase && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Editar Prazo da Fase</CardTitle>
            <CardDescription>
              Atualize o prazo da fase "{editingPhase.phase.name}"
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Prazo</label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            <div className="flex space-x-2">
              <Button 
                onClick={handleUpdateDeadline}
                disabled={updatePhaseMutation.isPending}
                size="sm"
              >
                <Save className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
              <Button variant="outline" onClick={resetForm} size="sm">
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project Phases List */}
      <div className="space-y-3">
        {projectPhases.map((projectPhase, index) => (
          <Card key={projectPhase.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    #{(projectPhase.phase as any).orderIndex || index + 1}
                  </span>
                  <Badge
                    style={{ backgroundColor: projectPhase.phase.color, color: 'white' }}
                    className="text-xs"
                  >
                    {projectPhase.phase.name}
                  </Badge>
                  {projectPhase.deadline && (
                    <div className="flex items-center space-x-1 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDateForDisplay(projectPhase.deadline)}</span>
                    </div>
                  )}
                  {!projectPhase.deadline && (
                    <span className="text-sm text-gray-400">Sem prazo definido</span>
                  )}
                </div>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditDeadline(projectPhase)}
                    disabled={editingPhase?.phaseId === projectPhase.phaseId || showAddForm || updatePhaseMutation.isPending}
                    title="Editar prazo da fase"
                  >
                    <Calendar className={`w-4 h-4 ${updatePhaseMutation.isPending && editingPhase?.phaseId === projectPhase.phaseId ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePhase(projectPhase)}
                    disabled={removePhaseMutation.isPending || updatePhaseMutation.isPending || showAddForm}
                    title="Remover fase do projeto"
                  >
                    <Trash2 className={`w-4 h-4 ${removePhaseMutation.isPending ? 'animate-pulse' : ''}`} />
                  </Button>
                </div>
              </div>
              {projectPhase.phase.description && (
                <p className="text-sm text-gray-600 mt-2">
                  {projectPhase.phase.description}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {projectPhases.length === 0 && (
        <Card>
          <CardContent className="text-center py-6">
            <p className="text-gray-500">Nenhuma fase atribuída a este projeto</p>
            <p className="text-sm text-gray-400 mt-1">
              Adicione fases para organizar o trabalho em etapas
            </p>
          </CardContent>
        </Card>
      )}

      {availablePhases.length === 0 && projectPhases.length > 0 && !showAddForm && (
        <Card>
          <CardContent className="text-center py-4">
            <p className="text-sm text-gray-500">
              Todas as fases disponíveis já foram atribuídas a este projeto
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
