import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CustomModal } from "@/components/ui/custom-modal";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { calculateEndTime, getTodayString } from "@/lib/date-utils";
import { Info, Save, AlertTriangle, Calendar, Clock, Users, Building2, FolderOpen } from "lucide-react";
import { z } from "zod";
import SmartTimePicker from "@/components/smart-time-picker";
import ConflictWarningDialog from "@/components/conflict-warning-dialog";
import { useConflictCheck } from "@/hooks/use-time-slot-availability";
import {
  SectionTitle,
  EnhancedCard,
  Animated
} from "@/components/ui/design-system";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  date: z.string().min(1, "Data é obrigatória"),
  startTime: z.string().min(1, "Hora de início é obrigatória"),
  durationValue: z.number().min(1, "Duração deve ser maior que 0"),
  durationUnit: z.enum(["minutes", "hours"]),
  slaValue: z.number().optional(),
  slaUnit: z.enum(["minutes", "hours"]).optional(),
  isPomodoro: z.boolean().default(false),
  // Assignment fields
  projectId: z.string().optional(),
  companyId: z.string().optional(),
  assignedUserId: z.string().optional(),
  // Recurring task fields
  isRecurring: z.boolean().default(false),
  recurrencePattern: z.enum(["daily", "weekly", "monthly", "yearly"]).optional(),
  recurrenceInterval: z.number().min(1).max(365).optional(),
  recurrenceEndType: z.enum(["date", "count"]).optional(),
  recurrenceEndDate: z.string().optional(),
  recurrenceEndCount: z.number().min(1).max(1000).optional(),
}).refine((data) => {
  // If recurring, must have pattern and end condition
  if (data.isRecurring) {
    return data.recurrencePattern && data.recurrenceEndType &&
           ((data.recurrenceEndType === "date" && data.recurrenceEndDate) ||
            (data.recurrenceEndType === "count" && data.recurrenceEndCount));
  }
  return true;
}, {
  message: "Tarefas recorrentes devem ter um padrão e condição de término",
});

interface AppointmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
  editingAppointment?: any;
}

export default function AppointmentForm({ open, onOpenChange, defaultDate, editingAppointment }: AppointmentFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [endTime, setEndTime] = useState("");
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState<any>(null);

  const isEditing = !!editingAppointment;

  // Fetch companies, projects, and users for assignment dropdowns
  const { data: companies = [] } = useQuery({
    queryKey: ["/api/companies"],
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: editingAppointment?.title || "",
      description: editingAppointment?.description || "",
      date: editingAppointment?.date || defaultDate || getTodayString(),
      startTime: editingAppointment?.startTime || "",
      durationValue: editingAppointment ? Math.round(editingAppointment.durationMinutes / (editingAppointment.durationMinutes >= 60 ? 60 : 1)) : 1,
      durationUnit: editingAppointment ? (editingAppointment.durationMinutes >= 60 ? "hours" : "minutes") : "hours",
      slaValue: editingAppointment?.slaMinutes ? Math.round(editingAppointment.slaMinutes / (editingAppointment.slaMinutes >= 60 ? 60 : 1)) : undefined,
      slaUnit: editingAppointment?.slaMinutes ? (editingAppointment.slaMinutes >= 60 ? "hours" : "minutes") : "hours",
      isPomodoro: editingAppointment?.isPomodoro || false,
      // Assignment fields
      projectId: editingAppointment?.projectId?.toString() || "",
      companyId: editingAppointment?.companyId?.toString() || "",
      assignedUserId: editingAppointment?.assignedUserId?.toString() || "",
      // Recurring task defaults
      isRecurring: editingAppointment?.isRecurring || false,
      recurrencePattern: editingAppointment?.recurrencePattern || "weekly",
      recurrenceInterval: editingAppointment?.recurrenceInterval || 1,
      recurrenceEndType: editingAppointment?.recurrenceEndDate ? "date" : "count",
      recurrenceEndDate: editingAppointment?.recurrenceEndDate || "",
      recurrenceEndCount: editingAppointment?.recurrenceEndCount || 10,
    },
  });

  // Watch the selected company to filter projects
  const selectedCompanyId = form.watch("companyId");

  // Filter projects based on selected company
  const filteredProjects = selectedCompanyId && selectedCompanyId !== "none"
    ? projects.filter((project: any) => project.companyId === parseInt(selectedCompanyId))
    : projects;

  // Effect to clear project selection when company changes and project doesn't belong to new company
  useEffect(() => {
    const currentProjectId = form.getValues("projectId");
    if (currentProjectId && currentProjectId !== "none") {
      if (selectedCompanyId && selectedCompanyId !== "none") {
        // Company is selected - check if current project belongs to it
        const currentProject = projects.find((project: any) => project.id === parseInt(currentProjectId));
        if (currentProject && currentProject.companyId !== parseInt(selectedCompanyId)) {
          // Clear project selection if it doesn't belong to the selected company
          form.setValue("projectId", "none");
        }
      }
      // If company is set to "none", keep the project selection (show all projects scenario)
    }
  }, [selectedCompanyId, projects, form]);

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEditing) {
        return apiRequest('PATCH', `/api/appointments/${editingAppointment.id}`, data);
      } else {
        // Check if it's a recurring appointment
        if (data.isRecurring) {
          console.log('🔄 Creating recurring appointment:', data);
          return apiRequest('POST', '/api/appointments/recurring', data);
        } else {
          return apiRequest('POST', '/api/appointments', data);
        }
      }
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/productivity'] });

      let successMessage = isEditing ? "Agendamento atualizado com sucesso!" : "Agendamento criado com sucesso!";

      // Special message for recurring appointments
      if (!isEditing && result?.instances) {
        successMessage = `Tarefa recorrente criada com sucesso! ${result.instances.length} instâncias foram agendadas.`;
      }

      toast({ title: successMessage });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      console.error("Error saving appointment:", error);
      console.error("Error details:", {
        response: error?.response,
        data: error?.response?.data,
        status: error?.response?.status
      });

      let message = isEditing ? "Erro ao atualizar agendamento" : "Erro ao criar agendamento";

      if (error?.response?.data?.message) {
        message = error.response.data.message;
      } else if (error?.response?.status === 409) {
        message = "Conflito de horário detectado. Já existe um agendamento neste período.";
      } else if (error?.response?.status === 400 && error?.response?.data?.errors) {
        message = "Dados inválidos para tarefa recorrente. Verifique os campos obrigatórios.";
      }

      toast({ title: message, variant: "destructive" });
    }
  });

  // Watch for changes to calculate end time
  const startTime = form.watch("startTime");
  const durationValue = form.watch("durationValue");
  const durationUnit = form.watch("durationUnit");
  const selectedDate = form.watch("date");

  // Calculate duration in minutes for conflict checking
  const durationMinutes = durationValue && durationUnit
    ? (durationUnit === "hours" ? durationValue * 60 : durationValue)
    : 0;

  // Check for conflicts
  const conflictCheck = useConflictCheck(
    selectedDate,
    startTime,
    durationMinutes,
    editingAppointment?.id
  );

  useEffect(() => {
    if (startTime && durationValue) {
      const durationMinutes = durationUnit === "hours" ? durationValue * 60 : durationValue;
      const calculatedEndTime = calculateEndTime(startTime, durationMinutes);
      setEndTime(calculatedEndTime);
    }
  }, [startTime, durationValue, durationUnit]);

  // Handle proceeding with overlap
  const handleProceedWithOverlap = () => {
    if (pendingSubmission) {
      // Submit the appointment with overlap
      submitAppointment(pendingSubmission);
      setPendingSubmission(null);
    }
  };

  // Handle selecting different time
  const handleSelectDifferentTime = () => {
    setPendingSubmission(null);
    // Focus back on time input - user can manually select different time
    // or use the smart time picker suggestions
  };

  // Extract submission logic to reusable function
  const submitAppointment = ({ values, durationMinutes, slaMinutes }: any) => {
    const appointmentData: any = {
      title: values.title,
      description: values.description || null,
      date: values.date,
      startTime: values.startTime,
      durationMinutes,
      peopleWith: null, // Manter compatibilidade com schema
      project: null, // Manter compatibilidade com schema
      company: null, // Manter compatibilidade com schema
      slaMinutes: slaMinutes || null,
      isPomodoro: values.isPomodoro || false,
      rescheduleCount: 0,
      // Assignment fields
      projectId: values.projectId && values.projectId !== "none" ? parseInt(values.projectId) : null,
      companyId: values.companyId && values.companyId !== "none" ? parseInt(values.companyId) : null,
      assignedUserId: values.assignedUserId && values.assignedUserId !== "none" ? parseInt(values.assignedUserId) : null,
    };

    // Add recurring fields if enabled
    if (values.isRecurring) {
      appointmentData.isRecurring = true;
      appointmentData.recurrencePattern = values.recurrencePattern;
      appointmentData.recurrenceInterval = values.recurrenceInterval || 1;

      if (values.recurrenceEndType === "date") {
        appointmentData.recurrenceEndDate = values.recurrenceEndDate;
      } else if (values.recurrenceEndType === "count") {
        appointmentData.recurrenceEndCount = values.recurrenceEndCount;
      }
    }

    console.log("Sending appointment data:", appointmentData);
    createAppointmentMutation.mutate(appointmentData);
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    console.log("Form submitted with values:", values);
    console.log("Form errors:", form.formState.errors);

    const durationMinutes = values.durationUnit === "hours" ? values.durationValue * 60 : values.durationValue;
    const slaMinutes = values.slaValue && values.slaUnit
      ? (values.slaUnit === "hours" ? values.slaValue * 60 : values.slaValue)
      : undefined;

    // Check for conflicts before submitting (using the already computed conflictCheck)
    if (conflictCheck.hasConflicts && !pendingSubmission) {
      // Show conflict dialog
      setPendingSubmission({ values, durationMinutes, slaMinutes });
      setShowConflictDialog(true);
      return;
    }

    // No conflicts or user has confirmed overlap, proceed with submission
    submitAppointment({ values, durationMinutes, slaMinutes });
  };

  return (
    <CustomModal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title={isEditing ? "Editar Agendamento" : "Novo Agendamento"}
    >
      <div className="max-h-[75vh] overflow-y-auto">
        {/* Enhanced Header */}
        <Animated animation="fade">
          <div className="flex items-start justify-between mb-6 p-4 bg-muted/20 rounded-lg border border-border/50">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  {isEditing ? "Editar Agendamento" : "Novo Agendamento"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isEditing ? "Atualize as informações do agendamento" : "Crie um novo agendamento com controle de SLA e Pomodoro automático"}
                </p>
              </div>
            </div>
            {isEditing && editingAppointment && (
              <div className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded border">
                ID: {editingAppointment.id}
              </div>
            )}
          </div>
        </Animated>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Basic Information Section */}
            <Animated animation="slide">
              <EnhancedCard variant="bordered" className="bg-card/50">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                    <Calendar className="w-4 h-4 text-primary" />
                    <h4 className="font-medium text-foreground">Informações Básicas</h4>
                  </div>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Título *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: Reunião com cliente"
                              className="bg-background"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Descrição</FormLabel>
                          <FormControl>
                            <Textarea
                              rows={3}
                              placeholder="Descreva os detalhes do agendamento..."
                              className="bg-background resize-none"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </EnhancedCard>
            </Animated>

            {/* Date and Time Section */}
            <Animated animation="slide">
              <EnhancedCard variant="bordered" className="bg-card/50">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                    <Clock className="w-4 h-4 text-primary" />
                    <h4 className="font-medium text-foreground">Data e Horário</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Data *</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              className="bg-background"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Hora de Início *</FormLabel>
                          <FormControl>
                            <SmartTimePicker
                              value={field.value}
                              onChange={field.onChange}
                              selectedDate={selectedDate}
                              durationMinutes={durationMinutes}
                              excludeAppointmentId={editingAppointment?.id}
                              showAvailabilityHints={true}
                              className="bg-background"
                            />
                          </FormControl>
                          <FormMessage />
                          {conflictCheck.hasConflicts && (
                            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-red-800">
                                    Conflito de horário detectado
                                  </p>
                                  <p className="text-xs text-red-600 mt-1">
                                    {conflictCheck.conflictingAppointments.length} agendamento(s) conflitante(s) neste horário
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </EnhancedCard>
            </Animated>

              <div>
                <Label>Duração Estimada *</Label>
                <div className="flex space-x-2">
                  <FormField
                    control={form.control}
                    name="durationValue"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="2"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="durationUnit"
                    render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hours">horas</SelectItem>
                            <SelectItem value="minutes">minutos</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {endTime && (
                  <p className="mt-1 text-xs text-gray-500">
                    Hora de término: {endTime}
                  </p>
                )}
              </div>

              <div>
                <Label>Tempo SLA</Label>
                <div className="flex space-x-2">
                  <FormField
                    control={form.control}
                    name="slaValue"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="3"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="slaUnit"
                    render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hours">horas</SelectItem>
                            <SelectItem value="minutes">minutos</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Prazo máximo para conclusão (opcional)
                </p>
              </div>
            {/* Assignment Section */}
            <Animated animation="slide">
              <EnhancedCard variant="bordered" className="bg-card/50">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                    <Users className="w-4 h-4 text-primary" />
                    <h4 className="font-medium text-foreground">Atribuições</h4>
                    <span className="text-xs text-muted-foreground">(Opcional)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="companyId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            Empresa
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Selecionar empresa..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Nenhuma</SelectItem>
                              {companies.map((company: any) => (
                                <SelectItem key={company.id} value={company.id.toString()}>
                                  {company.name}
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
                      name="projectId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium flex items-center gap-1">
                            <FolderOpen className="w-3 h-3" />
                            Projeto
                            {selectedCompanyId && selectedCompanyId !== "none" && (
                              <span className="text-xs text-muted-foreground font-normal">
                                (filtrado)
                              </span>
                            )}
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={selectedCompanyId && selectedCompanyId !== "none" && filteredProjects.length === 0}
                          >
                            <FormControl>
                              <SelectTrigger className="bg-background">
                                <SelectValue
                                  placeholder={
                                    selectedCompanyId && selectedCompanyId !== "none" && filteredProjects.length === 0
                                      ? "Nenhum projeto disponível"
                                      : "Selecionar projeto..."
                                  }
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Nenhum</SelectItem>
                            {selectedCompanyId && selectedCompanyId !== "none" ? (
                              // Show only projects from selected company
                              filteredProjects.map((project: any) => (
                                <SelectItem key={project.id} value={project.id.toString()}>
                                  {project.name}
                                </SelectItem>
                              ))
                            ) : (
                              // Show all projects with company information
                              projects.map((project: any) => {
                                const projectCompany = companies.find((company: any) => company.id === project.companyId);
                                return (
                                  <SelectItem key={project.id} value={project.id.toString()}>
                                    <div className="flex flex-col">
                                      <span>{project.name}</span>
                                      {projectCompany && (
                                        <span className="text-xs text-gray-500">
                                          {projectCompany.name}
                                        </span>
                                      )}
                                    </div>
                                  </SelectItem>
                                );
                              })
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                        {selectedCompanyId && selectedCompanyId !== "none" && filteredProjects.length === 0 && (
                          <p className="text-xs text-amber-600 mt-1">
                            Nenhum projeto encontrado para a empresa selecionada
                          </p>
                        )}
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="assignedUserId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Pessoa Responsável</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Selecionar pessoa..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Nenhuma</SelectItem>
                            {users.map((user: any) => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Vincule este agendamento a uma empresa, projeto ou pessoa específica.
                  {selectedCompanyId && selectedCompanyId !== "none" ? (
                    <span className="block mt-1 text-blue-600">
                      💡 Projetos filtrados pela empresa selecionada
                    </span>
                  ) : (
                    <span className="block mt-1">
                      💡 Selecione uma empresa para filtrar os projetos disponíveis
                    </span>
                  )}
                </p>
              </div>





            </div>

            {/* Recurring Task Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <FormField
                control={form.control}
                name="isRecurring"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium text-blue-800">
                        Tarefa Recorrente
                      </FormLabel>
                      <FormDescription className="text-xs text-blue-700">
                        Criar múltiplas instâncias desta tarefa automaticamente
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {form.watch("isRecurring") && (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="recurrencePattern"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Padrão</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Selecionar..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="daily">Diário</SelectItem>
                              <SelectItem value="weekly">Semanal</SelectItem>
                              <SelectItem value="monthly">Mensal</SelectItem>
                              <SelectItem value="yearly">Anual</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="recurrenceInterval"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Intervalo</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="365"
                              className="h-8 text-xs"
                              placeholder="1"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="recurrenceEndType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Terminar</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Selecionar..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="date">Em uma data específica</SelectItem>
                            <SelectItem value="count">Após um número de ocorrências</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch("recurrenceEndType") === "date" && (
                    <FormField
                      control={form.control}
                      name="recurrenceEndDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Data de Término</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              className="h-8 text-xs"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {form.watch("recurrenceEndType") === "count" && (
                    <FormField
                      control={form.control}
                      name="recurrenceEndCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Número de Ocorrências</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="1000"
                              className="h-8 text-xs"
                              placeholder="10"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 10)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="bg-blue-100 border border-blue-300 rounded p-3">
                    <p className="text-xs text-blue-800">
                      <strong>Nota:</strong> Tarefas recorrentes são agendadas apenas em dias úteis (segunda a sexta).
                      Se uma ocorrência cair em um fim de semana, será automaticamente reagendada para a segunda-feira seguinte.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Info className="text-yellow-600 mt-0.5 w-5 h-5" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">Pomodoro Automático</h4>
                  <p className="text-xs text-yellow-700 mt-1">
                    Um agendamento de Pomodoro (5 min) será criado automaticamente após o término desta tarefa.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createAppointmentMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {createAppointmentMutation.isPending ? (isEditing ? "Atualizando..." : "Criando...") : (isEditing ? "Atualizar Agendamento" : "Criar Agendamento")}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      {/* Conflict Warning Dialog */}
      <ConflictWarningDialog
        open={showConflictDialog}
        onOpenChange={setShowConflictDialog}
        conflictingAppointments={conflictCheck.conflictingAppointments}
        newAppointment={{
          title: form.getValues("title") || "Novo Agendamento",
          date: selectedDate,
          startTime: startTime || "00:00",
          durationMinutes: durationMinutes || 0
        }}
        onProceedWithOverlap={handleProceedWithOverlap}
        onSelectDifferentTime={handleSelectDifferentTime}
      />
    </CustomModal>
  );
}
