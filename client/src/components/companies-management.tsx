import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
// Removed Button import - using pattern-aware buttons
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardDescriptionText } from "@/components/ui/formatted-text";
import { useToast } from "@/hooks/use-toast";
import { CustomModal } from "@/components/ui/custom-modal";
import { useTheme } from "@/hooks/use-theme";
import { Building2, Plus, Edit, Trash2, Mail, Phone, Globe, FolderOpen, ChevronDown, ChevronUp } from "lucide-react";

interface CompanyFormData {
  name: string;
  description: string | null;
  type: "internal" | "client";
  email: string | null;
  phone: string | null;
  website: string | null;
}

interface Company {
  id: number;
  name: string;
  description?: string;
  type: "internal" | "client";
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  isActive: boolean;
  createdAt: string;
}

interface Project {
  id: number;
  name: string;
  description?: string;
  companyId?: number;
  status: string;
  priority: string;
  startDate?: string;
  endDate?: string;
  color: string;
}

export default function CompaniesManagement() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "client" as const,
    email: "",
    phone: "",
    website: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getCardClasses, getButtonClasses } = useTheme();

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      type: "client",
      email: "",
      phone: "",
      website: "",
    });
    setErrors({});
    setEditingCompany(null);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      resetForm();
    }, 300); // Wait for modal animation
  };

  // Fetch companies
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["/api/companies"],
  });

  // Fetch projects
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Helper function to get projects for a company
  const getCompanyProjects = (companyId: number): Project[] => {
    return projects.filter(project => project.companyId === companyId);
  };

  // Helper function to toggle company expansion
  const toggleCompanyExpansion = (companyId: number) => {
    const newExpanded = new Set(expandedCompanies);
    if (newExpanded.has(companyId)) {
      newExpanded.delete(companyId);
    } else {
      newExpanded.add(companyId);
    }
    setExpandedCompanies(newExpanded);
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome é obrigatório";
    }

    // Only validate email if it's not empty
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = "Email inválido";
    }

    // Only validate website if it's not empty
    if (formData.website.trim() && !/^https?:\/\/.+/.test(formData.website.trim())) {
      newErrors.website = "URL inválida";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Create company mutation
  const createCompanyMutation = useMutation({
    mutationFn: (data: any) => {
      console.log("Sending to API:", data);
      return apiRequest("POST", "/api/companies", data);
    },
    onSuccess: (result) => {
      console.log("Company created successfully:", result);
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({ title: "Empresa criada com sucesso!" });
      handleModalClose();
    },
    onError: (error) => {
      console.error("Create company error:", error);
      toast({ title: "Erro ao criar empresa", variant: "destructive" });
    },
  });

  // Update company mutation
  const updateCompanyMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => {
      console.log("Updating company:", id, data);
      return apiRequest("PATCH", `/api/companies/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({ title: "Empresa atualizada com sucesso!" });
      handleModalClose();
    },
    onError: (error) => {
      console.error("Update company error:", error);
      toast({ title: "Erro ao atualizar empresa", variant: "destructive" });
    },
  });

  // Delete company mutation
  const deleteCompanyMutation = useMutation({
    mutationFn: (id: number) => {
      console.log("Deleting company:", id);
      return apiRequest("DELETE", `/api/companies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({ title: "Empresa excluída com sucesso!" });
    },
    onError: (error: any) => {
      console.error("Delete company error:", error);

      // Check if it's a constraint error
      if (error.response?.status === 400 && error.response?.data?.details) {
        const details = error.response.data.details;
        if (details.includes('projects') || details.includes('users') || details.includes('appointments')) {
          toast({
            title: "Não é possível excluir esta empresa",
            description: "A empresa possui projetos, usuários ou agendamentos associados. Remova-os primeiro.",
            variant: "destructive"
          });
          return;
        }
      }

      toast({
        title: "Erro ao excluir empresa",
        description: "Verifique se a empresa não possui dados associados.",
        variant: "destructive"
      });
    },
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Prepare data with proper null values for empty optional fields
    const submitData = {
      name: formData.name.trim(),
      type: formData.type,
      description: formData.description.trim() || null,
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      website: formData.website.trim() || null,
    };

    console.log('Submitting company data:', submitData);

    if (editingCompany) {
      updateCompanyMutation.mutate({ id: editingCompany.id, data: submitData });
    } else {
      createCompanyMutation.mutate(submitData);
    }
  };

  // Handle input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  // Handle edit
  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      description: company.description || "",
      type: "client" as const,
      email: company.email || "",
      phone: company.phone || "",
      website: company.website || "",
    });
    setErrors({});
    setIsModalOpen(true);
  };

  // Handle delete
  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta empresa?")) {
      deleteCompanyMutation.mutate(id);
    }
  };

  // Handle new company
  const handleNewCompany = () => {
    resetForm();
    setIsModalOpen(true);
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Carregando empresas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-theme-primary">Gerenciar Empresas</h2>
          <p className="text-theme-secondary">Gerencie empresas internas e clientes</p>
        </div>
        <button
          onClick={handleNewCompany}
          className={`${getButtonClasses('primary')} flex items-center gap-2`}
        >
          <Plus className="w-4 h-4" />
          Nova Empresa
        </button>
      </div>

      {/* Custom Modal */}
      <CustomModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        title={editingCompany ? "Editar Empresa" : "Nova Empresa"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="company-name">Nome *</Label>
            <Input
              id="company-name"
              placeholder="Nome da empresa"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <Label htmlFor="company-type">Tipo *</Label>
            <select
              id="company-type"
              value={formData.type}
              onChange={(e) => handleInputChange("type", e.target.value as "internal" | "client")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="client">Cliente</option>
              <option value="internal">Interna</option>
            </select>
          </div>

          <div>
            <Label htmlFor="company-description">Descrição</Label>
            <Textarea
              id="company-description"
              placeholder="Descreva a empresa, seus serviços, área de atuação e outras informações relevantes..."
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              maxLength={1500}

              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="company-email">Email</Label>
            <Input
              id="company-email"
              type="email"
              placeholder="contato@empresa.com"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && (
              <p className="text-sm text-red-600 mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <Label htmlFor="company-phone">Telefone</Label>
            <Input
              id="company-phone"
              placeholder="(11) 99999-9999"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="company-website">Website</Label>
            <Input
              id="company-website"
              placeholder="https://empresa.com"
              value={formData.website}
              onChange={(e) => handleInputChange("website", e.target.value)}
              className={errors.website ? "border-red-500" : ""}
            />
            {errors.website && (
              <p className="text-sm text-red-600 mt-1">{errors.website}</p>
            )}
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
              disabled={createCompanyMutation.isPending || updateCompanyMutation.isPending}
              className={`${getButtonClasses('primary')} flex items-center justify-center`}
            >
              {editingCompany ? "Atualizar" : "Criar"}
            </button>
          </div>
        </form>
      </CustomModal>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(companies as Company[]).map((company: Company) => {
          const companyProjects = getCompanyProjects(company.id);
          const isExpanded = expandedCompanies.has(company.id);

          return (
            <Card key={company.id} className="hover:shadow-md transition-all duration-300 ease-in-out hover:-translate-y-0.5">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <CardTitle className="text-lg">{company.name}</CardTitle>
                  </div>
                  <Badge variant={company.type === "internal" ? "default" : "secondary"}>
                    {company.type === "internal" ? "Interna" : "Cliente"}
                  </Badge>
                </div>
                {company.description && (
                  <CardDescriptionText maxLines={2}>
                    {company.description}
                  </CardDescriptionText>
                )}

                {/* Projects Summary */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center space-x-2">
                    <FolderOpen className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {companyProjects.length} projeto{companyProjects.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {companyProjects.length > 0 && (
                    <button
                      onClick={() => toggleCompanyExpansion(company.id)}
                      className={`${getButtonClasses('ghost')} h-6 px-2 flex items-center justify-center`}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </CardHeader>
            <CardContent className="space-y-2">
              {/* Expanded Projects List */}
              {isExpanded && companyProjects.length > 0 && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Projetos:</h4>
                  <div className="space-y-2">
                    {companyProjects.map((project) => (
                      <div key={project.id} className="flex items-center justify-between p-2 bg-white rounded border">
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: project.color }}
                          />
                          <span className="text-sm font-medium">{project.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={project.status === 'active' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {project.status === 'active' ? 'Ativo' :
                             project.status === 'completed' ? 'Concluído' :
                             project.status === 'on_hold' ? 'Pausado' : 'Cancelado'}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              project.priority === 'urgent' ? 'border-red-500 text-red-700' :
                              project.priority === 'high' ? 'border-orange-500 text-orange-700' :
                              project.priority === 'medium' ? 'border-blue-500 text-blue-700' :
                              'border-gray-500 text-gray-700'
                            }`}
                          >
                            {project.priority === 'urgent' ? 'Urgente' :
                             project.priority === 'high' ? 'Alta' :
                             project.priority === 'medium' ? 'Média' : 'Baixa'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Company Contact Information */}
              {company.email && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>{company.email}</span>
                </div>
              )}
              {company.phone && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{company.phone}</span>
                </div>
              )}
              {company.website && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Globe className="w-4 h-4" />
                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="hover:underline transition-all duration-300 ease-in-out hover:text-theme-accent">
                    {company.website}
                  </a>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => handleEdit(company)}
                  title="Editar empresa"
                  className={`${getButtonClasses('outline')} px-3 py-1 text-sm flex items-center justify-center`}
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(company.id)}
                  title="Excluir empresa"
                  className={`${getButtonClasses('outline')} px-3 py-1 text-sm flex items-center justify-center text-red-600 hover:text-red-700 transition-all duration-300 ease-in-out`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>

      {(companies as Company[]).length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-theme-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-theme-primary mb-2">Nenhuma empresa cadastrada</h3>
          <p className="text-theme-secondary mb-4">Comece criando sua primeira empresa</p>
          <button
            onClick={handleNewCompany}
            className={`${getButtonClasses('primary')} flex items-center gap-2`}
          >
            <Plus className="w-4 h-4" />
            Criar Primeira Empresa
          </button>
        </div>
      )}
    </div>
  );
}
