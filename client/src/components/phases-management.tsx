import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DescriptionText } from "@/components/ui/formatted-text";
import { Trash2, Edit, Plus, Save, X, GripVertical, CheckSquare, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Phase {
  id: number;
  name: string;
  description?: string;
  color: string;
  createdAt: string;
}

interface PhaseFormData {
  name: string;
  description: string;
  color: string;
  orderIndex?: number;
}

export default function PhasesManagement() {
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedPhases, setSelectedPhases] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState<PhaseFormData>({
    name: "",
    description: "",
    color: "#8B5CF6"
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch phases
  const { data: phases = [], isLoading } = useQuery({
    queryKey: ["/api/phases"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/phases");
      return response.json();
    },
  });

  // Create phase mutation
  const createPhaseMutation = useMutation({
    mutationFn: async (data: PhaseFormData) => {
      const response = await apiRequest("POST", "/api/phases", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/phases"] });
      setShowCreateForm(false);
      setFormData({ name: "", description: "", color: "#8B5CF6" });
      toast({ title: "Fase criada com sucesso!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao criar fase", 
        description: error?.response?.data?.message || "Erro desconhecido",
        variant: "destructive" 
      });
    }
  });

  // Update phase mutation
  const updatePhaseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<PhaseFormData> }) => {
      const response = await apiRequest("PATCH", `/api/phases/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/phases"] });
      setEditingPhase(null);
      resetForm();
      toast({ title: "Fase atualizada com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar fase",
        description: error?.message || error?.response?.data?.message || "Erro desconhecido",
        variant: "destructive"
      });
    }
  });

  // Force delete function (declared early to be used in mutation)
  const handleForceDelete = (phase: Phase) => {
    const confirmed = confirm(
      `A fase "${phase.name}" está sendo usada em projetos.\n\n` +
      `Deseja FORÇAR a exclusão?\n` +
      `⚠️ ATENÇÃO: Isso irá:\n` +
      `• Remover esta fase de TODOS os projetos\n` +
      `• Excluir todas as subfases relacionadas\n` +
      `• Esta ação NÃO pode ser desfeita!\n\n` +
      `Digite "CONFIRMAR" para prosseguir:`
    );

    if (confirmed) {
      const doubleConfirm = prompt(
        `Digite "CONFIRMAR" para excluir permanentemente a fase "${phase.name}":`
      );

      if (doubleConfirm === "CONFIRMAR") {
        forceDeletePhaseMutation.mutate(phase.id);
      } else {
        toast({
          title: "Exclusão cancelada",
          description: "A fase não foi excluída.",
        });
      }
    }
  };

  // Delete phase mutation
  const deletePhaseMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/phases/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/phases"] });
      toast({ title: "Fase excluída com sucesso!" });
    },
    onError: (error: any, phaseId: number) => {
      console.error("💥 Frontend: Delete error:", error);

      const errorMessage = error?.message || error?.response?.data?.message || "Erro desconhecido";

      // Check if error is about phase being assigned to projects
      if (errorMessage.includes("assigned to projects") || errorMessage.includes("Cannot delete phase")) {
        const phase = (phases as any[]).find((p: any) => p.id === phaseId);
        if (phase) {
          const forceDelete = confirm(
            `❌ Não foi possível excluir a fase "${phase.name}" porque ela está sendo usada em projetos.\n\n` +
            `Deseja FORÇAR a exclusão?\n\n` +
            `⚠️ ATENÇÃO: Isso irá:\n` +
            `• Remover esta fase de TODOS os projetos\n` +
            `• Excluir todas as subfases relacionadas\n` +
            `• Esta ação NÃO pode ser desfeita!\n\n` +
            `Clique OK para continuar ou Cancelar para abortar.`
          );

          if (forceDelete) {
            handleForceDelete(phase);
            return; // Don't show the error toast
          }
        }
      }

      toast({
        title: "Erro ao excluir fase",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  // Force delete phase mutation
  const forceDeletePhaseMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/phases/${id}/force`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/phases"] });
      toast({ title: "Fase removida de todos os projetos e excluída com sucesso!" });
    },
    onError: (error: any) => {
      console.error("💥 Frontend: Force delete error:", error);
      toast({
        title: "Erro ao excluir fase forçadamente",
        description: error?.message || error?.response?.data?.message || "Erro desconhecido",
        variant: "destructive"
      });
    }
  });

  // Reorder phases mutation
  const reorderPhasesMutation = useMutation({
    mutationFn: async (phaseOrders: { id: number; orderIndex: number }[]) => {
      console.log("🔄 Frontend: Sending reorder request with:", phaseOrders);
      const response = await apiRequest("PATCH", "/api/phases/reorder", { phaseOrders });
      console.log("✅ Frontend: Reorder response:", response.status);
      return response.json();
    },
    onSuccess: () => {
      console.log("✅ Frontend: Reorder successful, invalidating queries");
      queryClient.invalidateQueries({ queryKey: ["/api/phases"] });
      toast({ title: "Ordem das fases atualizada com sucesso!" });
    },
    onError: (error: any) => {
      console.error("💥 Frontend: Reorder error:", error);
      toast({
        title: "Erro ao reordenar fases",
        description: error?.message || error?.response?.data?.message || "Erro desconhecido",
        variant: "destructive"
      });
    }
  });

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast({ title: "Nome da fase é obrigatório", variant: "destructive" });
      return;
    }

    // Calculate the next order index
    const maxOrder = Math.max(...(phases as any[]).map((p: any) => p.orderIndex || 0), 0);
    const phaseData = {
      ...formData,
      orderIndex: maxOrder + 1
    };

    createPhaseMutation.mutate(phaseData);
  };

  const handleEdit = (phase: Phase) => {
    setEditingPhase(phase);
    setFormData({
      name: phase.name,
      description: phase.description || "",
      color: phase.color
    });
  };

  const handleUpdate = () => {
    if (!editingPhase || !formData.name.trim()) {
      toast({ title: "Nome da fase é obrigatório", variant: "destructive" });
      return;
    }
    updatePhaseMutation.mutate({ id: editingPhase.id, data: formData });
  };

  const handleDelete = async (phase: Phase) => {
    // First try normal delete
    try {
      const confirmed = confirm(`Tem certeza que deseja excluir a fase "${phase.name}"?`);
      if (!confirmed) return;

      deletePhaseMutation.mutate(phase.id);
    } catch (error) {
      // If normal delete fails, we'll handle it in the mutation error
    }
  };

  // Multiple selection functions
  const handleSelectPhase = (phaseId: number) => {
    const newSelected = new Set(selectedPhases);
    if (newSelected.has(phaseId)) {
      newSelected.delete(phaseId);
    } else {
      newSelected.add(phaseId);
    }
    setSelectedPhases(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedPhases.size === phases?.length) {
      setSelectedPhases(new Set());
    } else {
      setSelectedPhases(new Set(phases?.map((p: Phase) => p.id) || []));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedPhases.size === 0) return;

    const selectedPhasesList = phases?.filter((p: Phase) => selectedPhases.has(p.id)) || [];
    const phaseNames = selectedPhasesList.map(p => p.name).join(', ');

    const confirmed = confirm(
      `Tem certeza que deseja excluir ${selectedPhases.size} fase(s)?\n\n` +
      `Fases selecionadas: ${phaseNames}`
    );

    if (!confirmed) return;

    // Delete phases in parallel
    try {
      const deletePromises = Array.from(selectedPhases).map(async (phaseId) => {
        const response = await apiRequest("DELETE", `/api/phases/${phaseId}`);
        return response.json();
      });

      await Promise.all(deletePromises);

      toast({
        title: "Fases excluídas com sucesso",
        description: `${selectedPhases.size} fase(s) foram excluídas.`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/phases"] });
      setSelectedPhases(new Set());
    } catch (error: any) {
      console.error("Erro ao excluir fases:", error);
      toast({
        title: "Erro ao excluir fases",
        description: error?.message || "Algumas fases podem não ter sido excluídas.",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({ name: "", description: "", color: "#8B5CF6" });
    setEditingPhase(null);
    setShowCreateForm(false);
  };

  // Drag & Drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    console.log("🎯 Frontend: Drag ended", { activeId: active.id, overId: over?.id, activeType: typeof active.id, overType: typeof over?.id });

    if (active.id !== over?.id) {
      // Convert IDs to numbers if they're strings
      const activeId = typeof active.id === 'string' ? parseInt(active.id) : active.id;
      const overId = typeof over?.id === 'string' ? parseInt(over.id) : over?.id;

      const oldIndex = (phases as any[]).findIndex((phase: any) => phase.id === activeId);
      const newIndex = (phases as any[]).findIndex((phase: any) => phase.id === overId);

      console.log("📊 Frontend: Moving from index", oldIndex, "to", newIndex);

      if (oldIndex === -1 || newIndex === -1) {
        console.error("❌ Frontend: Could not find phase indices", { activeId, overId, oldIndex, newIndex });
        return;
      }

      const reorderedPhases = arrayMove(phases, oldIndex, newIndex);

      // Create the new order mapping
      const phaseOrders = reorderedPhases.map((phase, index) => ({
        id: (phase as any).id,
        orderIndex: index + 1
      }));

      console.log("📝 Frontend: New phase orders:", phaseOrders);

      // Update the order in the backend
      reorderPhasesMutation.mutate(phaseOrders);
    }
  };

  // Sortable Phase Item Component
  const SortablePhaseItem = ({ phase, index }: { phase: Phase; index: number }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: phase.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <Card
        ref={setNodeRef}
        style={style}
        className={`relative ${isDragging ? 'opacity-50' : ''} ${editingPhase?.id === phase.id ? 'ring-2 ring-blue-500' : ''}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSelectPhase(phase.id)}
                className="p-1 h-auto"
                title={selectedPhases.has(phase.id) ? "Desmarcar fase" : "Selecionar fase"}
              >
                {selectedPhases.has(phase.id) ? (
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                ) : (
                  <Square className="w-4 h-4 text-gray-400" />
                )}
              </Button>
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
                title="Arrastar para reordenar"
              >
                <GripVertical className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  #{index + 1}
                </span>
                <Badge
                  style={{ backgroundColor: phase.color, color: 'white' }}
                  className="text-xs"
                >
                  {phase.name}
                </Badge>
              </div>
            </div>
            <div className="flex space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(phase)}
                disabled={editingPhase?.id === phase.id || showCreateForm}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(phase)}
                disabled={deletePhaseMutation.isPending}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DescriptionText>
            {phase.description || "Sem descrição"}
          </DescriptionText>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return <div className="p-6">Carregando fases...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gerenciamento de Fases</h2>
          <p className="text-gray-600">Gerencie as fases dos seus projetos</p>
        </div>
        <Button 
          onClick={() => setShowCreateForm(true)}
          disabled={!!(showCreateForm || editingPhase)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Fase
        </Button>
      </div>

      {/* Create/Edit Form */}
      {(showCreateForm || editingPhase) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingPhase ? "Editar Fase" : "Nova Fase"}
            </CardTitle>
            <CardDescription>
              {editingPhase ? "Atualize as informações da fase" : "Crie uma nova fase para seus projetos"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nome *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Fase de Implementação"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Descrição</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o propósito desta fase, suas atividades principais e objetivos..."
                maxLength={1000}

                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Cor</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-12 h-10 rounded border border-gray-300"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#8B5CF6"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <Button 
                onClick={editingPhase ? handleUpdate : handleCreate}
                disabled={createPhaseMutation.isPending || updatePhaseMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {editingPhase ? "Atualizar" : "Criar"}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phases List with Drag & Drop */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-medium">Fases do Projeto</h3>
            {phases && phases.length > 0 && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="text-xs"
                >
                  {selectedPhases.size === phases.length ? (
                    <>
                      <CheckSquare className="w-3 h-3 mr-1" />
                      Desmarcar Todos
                    </>
                  ) : (
                    <>
                      <Square className="w-3 h-3 mr-1" />
                      Selecionar Todos
                    </>
                  )}
                </Button>
                {selectedPhases.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteSelected}
                    disabled={deletePhaseMutation.isPending}
                    className="text-xs"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Excluir {selectedPhases.size} Selecionada{selectedPhases.size > 1 ? 's' : ''}
                  </Button>
                )}
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500">
            Arraste as fases para reordená-las conforme a sequência do seu processo
          </p>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={(phases as any[]).map((p: any) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {phases.map((phase: Phase, index: number) => (
                <SortablePhaseItem
                  key={phase.id}
                  phase={phase}
                  index={index}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {phases.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">Nenhuma fase encontrada</p>
            <p className="text-sm text-gray-400 mt-2">
              Crie sua primeira fase para começar a organizar seus projetos
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
