import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Edit, Plus, Save, X, Layers3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Phase {
  id: number;
  name: string;
  description?: string;
  color: string;
  createdAt: string;
}

interface Subphase {
  id: number;
  phaseId: number;
  name: string;
  description?: string;
  color?: string;
  orderIndex: number;
  estimatedDurationDays?: number;
  isRequired: boolean;
  prerequisites?: string;
  deliverables?: string;
  isActive: boolean;
  createdAt: string;
}

interface SubphaseFormData {
  phaseId: number;
  name: string;
  description: string;
  color: string;
  orderIndex: number;
  estimatedDurationDays: number;
  isRequired: boolean;
}

export default function SubphasesManagement() {
  const [editingSubphase, setEditingSubphase] = useState<Subphase | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>("");
  const [formData, setFormData] = useState<SubphaseFormData>({
    phaseId: 0,
    name: "",
    description: "",
    color: "#8B5CF6",
    orderIndex: 1,
    estimatedDurationDays: 1,
    isRequired: true
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch phases for dropdown
  const { data: phases = [] } = useQuery<Phase[]>({
    queryKey: ["/api/phases"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/phases");
      return response.json();
    },
  });

  // Fetch subphases for selected phase
  const { data: subphases = [], isLoading } = useQuery<Subphase[]>({
    queryKey: ["/api/phases", selectedPhaseId, "subphases"],
    queryFn: async () => {
      if (!selectedPhaseId) return [];
      const response = await apiRequest("GET", `/api/phases/${selectedPhaseId}/subphases`);
      return response.json();
    },
    enabled: !!selectedPhaseId,
  });

  // Create subphase mutation
  const createSubphaseMutation = useMutation({
    mutationFn: async (data: SubphaseFormData) => {
      const response = await apiRequest("POST", "/api/subphases", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/phases", selectedPhaseId, "subphases"] });
      queryClient.invalidateQueries({ queryKey: ['/api/subphases-count'] });
      setShowCreateForm(false);
      resetForm();
      toast({ title: "Subfase criada com sucesso!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao criar subfase", 
        description: error?.response?.data?.message || "Erro desconhecido",
        variant: "destructive" 
      });
    }
  });

  // Update subphase mutation
  const updateSubphaseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<SubphaseFormData> }) => {
      const response = await apiRequest("PATCH", `/api/subphases/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/phases", selectedPhaseId, "subphases"] });
      queryClient.invalidateQueries({ queryKey: ['/api/subphases-count'] });
      setEditingSubphase(null);
      resetForm();
      toast({ title: "Subfase atualizada com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar subfase",
        description: error?.message || error?.response?.data?.message || "Erro desconhecido",
        variant: "destructive"
      });
    }
  });

  // Delete subphase mutation
  const deleteSubphaseMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/subphases/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/phases", selectedPhaseId, "subphases"] });
      queryClient.invalidateQueries({ queryKey: ['/api/subphases-count'] });
      toast({ title: "Subfase excluída com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir subfase",
        description: error?.message || error?.response?.data?.message || "Erro desconhecido",
        variant: "destructive"
      });
    }
  });

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast({ title: "Nome da subfase é obrigatório", variant: "destructive" });
      return;
    }
    if (!formData.phaseId) {
      toast({ title: "Selecione uma fase", variant: "destructive" });
      return;
    }
    createSubphaseMutation.mutate(formData);
  };

  const handleEdit = (subphase: Subphase) => {
    setEditingSubphase(subphase);
    setFormData({
      phaseId: subphase.phaseId,
      name: subphase.name,
      description: subphase.description || "",
      color: subphase.color || "#8B5CF6",
      orderIndex: subphase.orderIndex,
      estimatedDurationDays: subphase.estimatedDurationDays || 1,
      isRequired: subphase.isRequired
    });
  };

  const handleUpdate = () => {
    if (!editingSubphase || !formData.name.trim()) {
      toast({ title: "Nome da subfase é obrigatório", variant: "destructive" });
      return;
    }
    updateSubphaseMutation.mutate({ id: editingSubphase.id, data: formData });
  };

  const handleDelete = (subphase: Subphase) => {
    if (confirm(`Tem certeza que deseja excluir a subfase "${subphase.name}"?`)) {
      deleteSubphaseMutation.mutate(subphase.id);
    }
  };

  const resetForm = () => {
    setFormData({
      phaseId: selectedPhaseId ? parseInt(selectedPhaseId) : 0,
      name: "",
      description: "",
      color: "#8B5CF6",
      orderIndex: 1,
      estimatedDurationDays: 1,
      isRequired: true
    });
    setEditingSubphase(null);
    setShowCreateForm(false);
  };

  const selectedPhase = phases.find(p => p.id.toString() === selectedPhaseId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gerenciamento de Subfases</h2>
          <p className="text-gray-600">Gerencie as subfases dentro de cada fase</p>
        </div>
      </div>

      {/* Phase Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Layers3 className="w-5 h-5" />
            <span>Selecionar Fase</span>
          </CardTitle>
          <CardDescription>
            Escolha uma fase para visualizar e gerenciar suas subfases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedPhaseId} onValueChange={setSelectedPhaseId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione uma fase" />
            </SelectTrigger>
            <SelectContent>
              {phases.map((phase) => (
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
        </CardContent>
      </Card>

      {/* Show content only when phase is selected */}
      {selectedPhaseId && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                Subfases de: {selectedPhase?.name}
              </h3>
              <p className="text-sm text-gray-600">
                {subphases.length} subfase(s) encontrada(s)
              </p>
            </div>
            <Button 
              onClick={() => {
                setFormData({ ...formData, phaseId: parseInt(selectedPhaseId) });
                setShowCreateForm(true);
              }}
              disabled={showCreateForm || editingSubphase}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Subfase
            </Button>
          </div>

          {/* Create/Edit Form */}
          {(showCreateForm || editingSubphase) && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingSubphase ? "Editar Subfase" : "Nova Subfase"}
                </CardTitle>
                <CardDescription>
                  {editingSubphase ? "Atualize as informações da subfase" : "Crie uma nova subfase para esta fase"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Nome *</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Análise de Requisitos"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Ordem</label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.orderIndex}
                      onChange={(e) => setFormData({ ...formData, orderIndex: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Descrição</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descreva o propósito desta subfase..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Duração Estimada (dias)</label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.estimatedDurationDays}
                      onChange={(e) => setFormData({ ...formData, estimatedDurationDays: parseInt(e.target.value) || 1 })}
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
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isRequired"
                    checked={formData.isRequired}
                    onCheckedChange={(checked) => setFormData({ ...formData, isRequired: !!checked })}
                  />
                  <label htmlFor="isRequired" className="text-sm font-medium">
                    Subfase obrigatória
                  </label>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    onClick={editingSubphase ? handleUpdate : handleCreate}
                    disabled={createSubphaseMutation.isPending || updateSubphaseMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editingSubphase ? "Atualizar" : "Criar"}
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Subphases List */}
          {isLoading ? (
            <div className="p-6">Carregando subfases...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subphases.map((subphase: Subphase) => (
                <Card key={subphase.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge 
                          style={{ backgroundColor: subphase.color || selectedPhase?.color, color: 'white' }}
                          className="text-xs"
                        >
                          #{subphase.orderIndex}
                        </Badge>
                        <span className="font-medium text-sm">{subphase.name}</span>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(subphase)}
                          disabled={editingSubphase?.id === subphase.id || showCreateForm}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(subphase)}
                          disabled={deleteSubphaseMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-2">
                      {subphase.description || "Sem descrição"}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{subphase.estimatedDurationDays || 1} dia(s)</span>
                      <span>{subphase.isRequired ? "Obrigatória" : "Opcional"}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {subphases.length === 0 && !isLoading && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">Nenhuma subfase encontrada</p>
                <p className="text-sm text-gray-400 mt-2">
                  Crie a primeira subfase para esta fase
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!selectedPhaseId && (
        <Card>
          <CardContent className="text-center py-8">
            <Layers3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Selecione uma fase para começar</p>
            <p className="text-sm text-gray-400 mt-2">
              Escolha uma fase acima para visualizar e gerenciar suas subfases
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
