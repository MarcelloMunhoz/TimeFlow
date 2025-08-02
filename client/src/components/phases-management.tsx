import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Plus, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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
}

export default function PhasesManagement() {
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
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
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir fase",
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
    createPhaseMutation.mutate(formData);
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

  const handleDelete = (phase: Phase) => {
    if (confirm(`Tem certeza que deseja excluir a fase "${phase.name}"?`)) {
      deletePhaseMutation.mutate(phase.id);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", description: "", color: "#8B5CF6" });
    setEditingPhase(null);
    setShowCreateForm(false);
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
          disabled={showCreateForm || editingPhase}
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
                placeholder="Descreva o propósito desta fase..."
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

      {/* Phases List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {phases.map((phase: Phase) => (
          <Card key={phase.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge 
                  style={{ backgroundColor: phase.color, color: 'white' }}
                  className="text-xs"
                >
                  {phase.name}
                </Badge>
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
              <p className="text-sm text-gray-600">
                {phase.description || "Sem descrição"}
              </p>
            </CardContent>
          </Card>
        ))}
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
