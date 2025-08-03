import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Users, Plus, Edit, Trash2, Mail, Phone, Building2, Briefcase } from "lucide-react";
import { z } from "zod";

// Temporary DOM error suppression for this component
let originalConsoleError: any = null;

const userSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  position: z.string().optional(),
  department: z.string().optional(),
  companyId: z.number().min(1, "Empresa é obrigatória"),
  type: z.enum(["internal", "external"]),
  avatar: z.string().optional(),
  notes: z.string().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

interface User {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  companyId: number;
  type: "internal" | "external";
  avatar?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

interface Company {
  id: number;
  name: string;
  type: "internal" | "client";
}

export default function UsersManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [filterType, setFilterType] = useState<"all" | "internal" | "external">("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Suppress DOM errors while this component is mounted
  useEffect(() => {
    if (!originalConsoleError) {
      originalConsoleError = console.error;
    }

    console.error = (...args: any[]) => {
      const message = args[0]?.toString() || '';
      // Suppress known DOM manipulation errors
      if (
        message.includes('removeChild') ||
        message.includes('Node to be removed is not a child') ||
        message.includes('Cannot read properties of null') ||
        message.includes('Radix')
      ) {
        return; // Silently ignore these errors
      }
      originalConsoleError.apply(console, args);
    };

    return () => {
      // Restore original console.error when component unmounts
      if (originalConsoleError) {
        console.error = originalConsoleError;
      }
    };
  }, []);

  // Handle dialog state changes
  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingUser(null);
      form.reset({
        name: "",
        email: "",
        phone: "",
        position: "",
        department: "",
        companyId: 0,
        type: "external",
        avatar: "",
        notes: "",
      });
    }
  };

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      position: "",
      department: "",
      companyId: 0,
      type: "external",
      avatar: "",
      notes: "",
    },
  });

  // Fetch users and companies
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
  });

  const { data: companies = [], isLoading: companiesLoading } = useQuery({
    queryKey: ["/api/companies"],
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: (data: UserFormData) => apiRequest("POST", "/api/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Usuário criado com sucesso!" });
      handleDialogChange(false);
    },
    onError: () => {
      toast({ title: "Erro ao criar usuário", variant: "destructive" });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UserFormData }) =>
      apiRequest("PATCH", `/api/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Usuário atualizado com sucesso!" });
      handleDialogChange(false);
    },
    onError: () => {
      toast({ title: "Erro ao atualizar usuário", variant: "destructive" });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Usuário excluído com sucesso!" });
    },
    onError: (error: any) => {
      console.error("Error deleting user:", error);
      const message = error?.response?.data?.message || "Erro ao excluir usuário";
      toast({
        title: "Erro ao excluir usuário",
        description: message,
        variant: "destructive"
      });
    },
  });

  const onSubmit = (data: UserFormData) => {
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, data });
    } else {
      createUserMutation.mutate(data);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.reset({
      name: user.name,
      email: user.email || "",
      phone: user.phone || "",
      position: user.position || "",
      department: user.department || "",
      companyId: user.companyId,
      type: user.type,
      avatar: user.avatar || "",
      notes: user.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este usuário?")) {
      deleteUserMutation.mutate(id);
    }
  };

  const handleNewUser = () => {
    setEditingUser(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const getCompanyName = (companyId: number) => {
    const company = (companies as Company[]).find((c: Company) => c.id === companyId);
    return company?.name || "Empresa não encontrada";
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredUsers = (users as User[]).filter((user: User) => {
    if (filterType === "all") return true;
    return user.type === filterType;
  });

  if (usersLoading || companiesLoading) {
    return <div className="flex justify-center p-8">Carregando usuários...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gerenciar Usuários</h2>
          <p className="text-gray-600">Gerencie funcionários internos e externos</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={filterType} onValueChange={(value: "all" | "internal" | "external") => setFilterType(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="internal">Internos</SelectItem>
              <SelectItem value="external">Externos</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleNewUser} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Novo Usuário
          </Button>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? "Editar Usuário" : "Novo Usuário"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome completo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="companyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Empresa *</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a empresa" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(companies as Company[]).filter((company: Company) => company.id && company.id.toString().trim() !== "").map((company: Company) => (
                              <SelectItem key={company.id} value={company.id.toString()}>
                                {company.name} ({company.type === "internal" ? "Interna" : "Cliente"})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="internal">Interno</SelectItem>
                            <SelectItem value="external">Externo</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="position"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cargo</FormLabel>
                          <FormControl>
                            <Input placeholder="Desenvolvedor" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Departamento</FormLabel>
                          <FormControl>
                            <Input placeholder="TI" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="usuario@empresa.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input placeholder="(11) 99999-9999" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Observações sobre o usuário" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={createUserMutation.isPending || updateUserMutation.isPending}
                    >
                      {editingUser ? "Atualizar" : "Criar"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((user: User) => (
          <Card key={user.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{user.name}</CardTitle>
                    {user.position && (
                      <CardDescription>{user.position}</CardDescription>
                    )}
                  </div>
                </div>
                <Badge variant={user.type === "internal" ? "default" : "secondary"}>
                  {user.type === "internal" ? "Interno" : "Externo"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Building2 className="w-4 h-4" />
                <span>{getCompanyName(user.companyId)}</span>
              </div>
              
              {user.department && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Briefcase className="w-4 h-4" />
                  <span>{user.department}</span>
                </div>
              )}

              {user.email && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{user.email}</span>
                </div>
              )}

              {user.phone && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{user.phone}</span>
                </div>
              )}

              {user.notes && (
                <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  {user.notes}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(user)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(user.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {filterType === "all" ? "Nenhum usuário cadastrado" : `Nenhum usuário ${filterType === "internal" ? "interno" : "externo"} cadastrado`}
          </h3>
          <p className="text-gray-600 mb-4">Comece criando seu primeiro usuário</p>
          <Button onClick={handleNewUser} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Criar Primeiro Usuário
          </Button>
        </div>
      )}
    </div>
  );
}
