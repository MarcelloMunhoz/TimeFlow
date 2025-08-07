import { useState, useEffect, useMemo } from "react";
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
import { Info, Save, AlertTriangle } from "lucide-react";
import { z } from "zod";
import SmartTimePicker from "@/components/smart-time-picker";
import ConflictWarningDialog from "@/components/conflict-warning-dialog";
import WeekendConfirmationDialog from "@/components/weekend-confirmation-dialog";
import PomodoroConfirmationDialog from "@/components/pomodoro-confirmation-dialog";
import { useConflictCheck } from "@/hooks/use-time-slot-availability";

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
  phaseId: z.string().optional(),
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
  const [showWeekendDialog, setShowWeekendDialog] = useState(false);
  const [weekendConfirmationData, setWeekendConfirmationData] = useState<any>(null);
  const [pendingSubmission, setPendingSubmission] = useState<any>(null);

  // Pomodoro confirmation states
  const [showPomodoroDialog, setShowPomodoroDialog] = useState(false);
  const [pomodoroConfirmationData, setPomodoroConfirmationData] = useState<{
    appointmentId: string;
    appointmentTitle: string;
    appointmentEndTime: string;
  } | null>(null);

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

  // Memoize initial values to prevent re-creation on every render
  const initialValues = useMemo(() => {
    if (editingAppointment) {
      return {
        title: editingAppointment.title || "",
        description: editingAppointment.description || "",
        date: editingAppointment.date || defaultDate || getTodayString(),
        startTime: editingAppointment.startTime || "",
        durationValue: editingAppointment ? Math.round(editingAppointment.durationMinutes / (editingAppointment.durationMinutes >= 60 ? 60 : 1)) : 1,
        durationUnit: editingAppointment ? (editingAppointment.durationMinutes >= 60 ? "hours" : "minutes") : "hours",
        slaValue: editingAppointment?.slaMinutes ? Math.round(editingAppointment.slaMinutes / (editingAppointment.slaMinutes >= 60 ? 60 : 1)) : undefined,
        slaUnit: editingAppointment?.slaMinutes ? (editingAppointment.slaMinutes >= 60 ? "hours" : "minutes") : "hours",
        isPomodoro: editingAppointment.isPomodoro || false,
        // Assignment fields
        projectId: editingAppointment.projectId?.toString() || "",
        companyId: editingAppointment.companyId?.toString() || "",
        assignedUserId: editingAppointment.assignedUserId?.toString() || "",
        phaseId: editingAppointment.phaseId?.toString() || "",
        // Recurring task defaults
        isRecurring: editingAppointment.isRecurring || false,
        recurrencePattern: editingAppointment.recurrencePattern || "weekly",
        recurrenceInterval: editingAppointment.recurrenceInterval || 1,
        recurrenceEndType: editingAppointment.recurrenceEndDate ? "date" : "count",
        recurrenceEndDate: editingAppointment.recurrenceEndDate || "",
        recurrenceEndCount: editingAppointment.recurrenceEndCount || 10,
      };
    }

    return {
      title: "",
      description: "",
      date: defaultDate || getTodayString(),
      startTime: "",
      durationValue: 1,
      durationUnit: "hours",
      slaValue: undefined,
      slaUnit: "hours",
      isPomodoro: false,
      projectId: "",
      companyId: "",
      assignedUserId: "",
      phaseId: "",
      isRecurring: false,
      recurrencePattern: "weekly",
      recurrenceInterval: 1,
      recurrenceEndType: "count",
      recurrenceEndDate: "",
      recurrenceEndCount: 10,
    };
  }, [editingAppointment?.id, defaultDate]); // Only depend on appointment ID and defaultDate

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues,
  });

  // Reset form when editingAppointment changes, but only once per appointment
  useEffect(() => {
    if (open && editingAppointment) {
      // Only reset if this is a different appointment
      const currentAppointmentId = form.getValues().title === editingAppointment.title ? editingAppointment.id : null;
      if (currentAppointmentId !== editingAppointment.id) {
        form.reset(initialValues);
      }
    } else if (open && !editingAppointment) {
      // Reset for new appointment
      form.reset(initialValues);
    }
  }, [editingAppointment?.id, open]); // Only depend on appointment ID and modal open state

  // Watch the selected company to filter projects
  const selectedCompanyId = form.watch("companyId");
  const selectedProjectId = form.watch("projectId");

  // Filter projects based on selected company
  const filteredProjects = selectedCompanyId && selectedCompanyId !== "none"
    ? (projects as any[]).filter((project: any) => project.companyId === parseInt(selectedCompanyId))
    : projects;

  // Fetch phases for the selected project
  const { data: projectPhases = [] } = useQuery({
    queryKey: [`/api/projects/${selectedProjectId}/phases`],
    queryFn: async () => {
      if (!selectedProjectId || selectedProjectId === "none") return [];
      const response = await apiRequest("GET", `/api/projects/${selectedProjectId}/phases`);
      return response.json();
    },
    enabled: !!(selectedProjectId && selectedProjectId !== "none"),
  });

  // Effect to clear project selection when company changes and project doesn't belong to new company
  useEffect(() => {
    const currentProjectId = form.getValues("projectId");
    if (currentProjectId && currentProjectId !== "none") {
      if (selectedCompanyId && selectedCompanyId !== "none") {
        // Company is selected - check if current project belongs to it
        const currentProject = (projects as any[]).find((project: any) => project.id === parseInt(currentProjectId));
        if (currentProject && currentProject.companyId !== parseInt(selectedCompanyId)) {
          // Clear project selection if it doesn't belong to the selected company
          form.setValue("projectId", "none");
        }
      }
      // If company is set to "none", keep the project selection (show all projects scenario)
    }
  }, [selectedCompanyId, projects]); // Removed 'form' to prevent infinite loops

  // Effect to clear phase selection when project changes
  useEffect(() => {
    const currentPhaseId = form.getValues("phaseId");
    if (currentPhaseId && currentPhaseId !== "none") {
      // Check if current phase is still available for the selected project
      const isPhaseAvailable = projectPhases.some((pp: any) => pp.phaseId === parseInt(currentPhaseId));
      if (!isPhaseAvailable) {
        form.setValue("phaseId", "none");
      }
    }
  }, [selectedProjectId, projectPhases]); // Removed 'form' to prevent infinite loops

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

      // Show Pomodoro confirmation dialog for new appointments (not Pomodoros themselves)
      if (!isEditing && result && !result.isPomodoro) {
        const formValues = form.getValues();
        const durationMinutes = formValues.durationUnit === "hours" ? formValues.durationValue * 60 : formValues.durationValue;
        const endTime = calculateEndTime(formValues.startTime, durationMinutes);

        setPomodoroConfirmationData({
          appointmentId: result.id,
          appointmentTitle: result.title,
          appointmentEndTime: endTime
        });
        setShowPomodoroDialog(true);
      }

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

      // Handle weekend confirmation needed (status 422)
      if (error?.response?.status === 422 && error?.response?.data?.code === "WEEKEND_CONFIRMATION_NEEDED") {
        console.log("🎯 Weekend confirmation needed, showing dialog");
        console.log("🎯 Error response data:", error.response.data);
        const formValues = form.getValues();
        console.log("🎯 Form values:", formValues);
        setWeekendConfirmationData({
          message: error.response.data.message,
          dayType: error.response.data.dayType,
          pendingData: formValues
        });
        setShowWeekendDialog(true);
        console.log("🎯 Weekend dialog state set to true");
        return;
      }

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

  // Watch for changes to calculate end time (optimized to prevent excessive re-renders)
  const watchedValues = form.watch(["startTime", "durationValue", "durationUnit", "date"]);
  const [startTime, durationValue, durationUnit, selectedDate] = watchedValues;

  // Calculate duration in minutes for conflict checking
  const durationMinutes = durationValue && durationUnit
    ? (durationUnit === "hours" ? durationValue * 60 : durationValue)
    : 0;

  // Check for conflicts (memoized to prevent unnecessary recalculations)
  const conflictCheck = useConflictCheck(
    selectedDate || "",
    startTime || "",
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
      // Submit the appointment with overlap allowed
      submitAppointment({ ...pendingSubmission, allowOverlap: true });
      setPendingSubmission(null);
    }
  };

  // Handle selecting different time
  const handleSelectDifferentTime = () => {
    setPendingSubmission(null);
    // Focus back on time input - user can manually select different time
    // or use the smart time picker suggestions
  };

  // Handle weekend confirmation
  const handleProceedWithWeekend = () => {
    console.log("🎯 handleProceedWithWeekend called");
    console.log("🎯 weekendConfirmationData:", weekendConfirmationData);

    if (weekendConfirmationData?.pendingData) {
      const values = weekendConfirmationData.pendingData;
      console.log("🎯 Pending data values:", values);

      const durationMinutes = values.durationUnit === "hours" ? values.durationValue * 60 : values.durationValue;
      const slaMinutes = values.slaValue && values.slaUnit
        ? (values.slaUnit === "hours" ? values.slaValue * 60 : values.slaValue)
        : undefined;

      console.log("🎯 Calculated durationMinutes:", durationMinutes);
      console.log("🎯 Calculated slaMinutes:", slaMinutes);
      console.log("🎯 About to call submitAppointment with allowWeekendOverride: true");

      // Submit with weekend override allowed
      submitAppointment({ values, durationMinutes, slaMinutes, allowWeekendOverride: true });
      setWeekendConfirmationData(null);
      setShowWeekendDialog(false);
    } else {
      console.log("🎯 ERROR: No pending data found in weekendConfirmationData");
    }
  };

  // Handle canceling weekend appointment
  const handleCancelWeekend = () => {
    setShowWeekendDialog(false);
    setWeekendConfirmationData(null);
  };

  // Handle Pomodoro confirmation
  const handleConfirmPomodoro = async () => {
    if (pomodoroConfirmationData) {
      try {
        await apiRequest('POST', `/api/appointments/${pomodoroConfirmationData.appointmentId}/pomodoro`, {});
        toast({ title: "Pausa Pomodoro agendada com sucesso!" });
        queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      } catch (error) {
        console.error("Error creating Pomodoro:", error);
        toast({
          title: "Erro ao agendar pausa Pomodoro",
          description: "O agendamento principal foi criado com sucesso.",
          variant: "destructive"
        });
      }
    }
    setShowPomodoroDialog(false);
    setPomodoroConfirmationData(null);
  };

  // Handle skipping Pomodoro
  const handleSkipPomodoro = () => {
    setShowPomodoroDialog(false);
    setPomodoroConfirmationData(null);
  };

  // Extract submission logic to reusable function
  const submitAppointment = ({ values, durationMinutes, slaMinutes, allowOverlap = false, allowWeekendOverride = false }: any) => {
    console.log("🎯 submitAppointment called with:");
    console.log("🎯 - values:", values);
    console.log("🎯 - durationMinutes:", durationMinutes);
    console.log("🎯 - slaMinutes:", slaMinutes);
    console.log("🎯 - allowOverlap:", allowOverlap);
    console.log("🎯 - allowWeekendOverride:", allowWeekendOverride);

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
      allowOverlap, // Add allowOverlap parameter
      allowWeekendOverride, // Add allowWeekendOverride parameter
      // Assignment fields
      projectId: values.projectId && values.projectId !== "none" ? parseInt(values.projectId) : null,
      companyId: values.companyId && values.companyId !== "none" ? parseInt(values.companyId) : null,
      assignedUserId: values.assignedUserId && values.assignedUserId !== "none" ? parseInt(values.assignedUserId) : null,
      phaseId: values.phaseId && values.phaseId !== "none" ? parseInt(values.phaseId) : null,
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

    console.log("🎯 Final appointment data being sent:", appointmentData);
    console.log("🎯 About to call createAppointmentMutation.mutate");
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
    // For editing, always allow overlap to prevent blocking legitimate updates
    submitAppointment({ values, durationMinutes, slaMinutes, allowOverlap: isEditing });
  };

  return (
    <CustomModal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title={isEditing ? "Editar Agendamento" : "Novo Agendamento"}
    >
      {/* Removed the inner div with overflow-y-auto to prevent double scrollbars */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
            {isEditing ? "Atualize as informações do agendamento" : "Crie um novo agendamento com controle de SLA e Pomodoro automático"}
          </p>
          {isEditing && editingAppointment && (
            <span className="text-xs text-gray-400 dark:text-gray-500 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded flex-shrink-0 ml-4">
              ID: {editingAppointment.id}
            </span>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Reunião com cliente" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="Descreva os detalhes do agendamento, objetivos e informações importantes..."
                          maxLength={1000}

                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
                    <FormLabel>Hora de Início *</FormLabel>
                    <FormControl>
                      <SmartTimePicker
                        value={field.value}
                        onChange={field.onChange}
                        selectedDate={selectedDate}
                        durationMinutes={durationMinutes}
                        excludeAppointmentId={editingAppointment?.id}
                        showAvailabilityHints={true}
                      />
                    </FormControl>
                    <FormMessage />
                    {conflictCheck.hasConflicts && (
                      <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-md">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-red-800 dark:text-red-300">
                              Conflito de horário detectado
                            </p>
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                              {conflictCheck.conflictingAppointments.length} agendamento(s) conflitante(s) neste horário
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </FormItem>
                )}
              />

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
              {/* Assignment Fields */}
              <div className="md:col-span-2 border-t pt-4 mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Atribuições (Opcional)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                  <FormField
                    control={form.control}
                    name="companyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Empresa</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Selecionar empresa..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Nenhuma</SelectItem>
                            {(companies as any[]).filter((company: any) => company.id && company.id.toString().trim() !== "").map((company: any) => (
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
                        <FormLabel className="text-xs">
                          Projeto
                          {selectedCompanyId && selectedCompanyId !== "none" && (
                            <span className="text-gray-500 font-normal ml-1">
                              (filtrado por empresa)
                            </span>
                          )}
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!!(selectedCompanyId && selectedCompanyId !== "none" && (filteredProjects as any[]).length === 0)}
                        >
                          <FormControl>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue
                                placeholder={
                                  selectedCompanyId && selectedCompanyId !== "none" && (filteredProjects as any[]).length === 0
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
                              (filteredProjects as any[]).filter((project: any) => project.id && project.id.toString().trim() !== "").map((project: any) => (
                                <SelectItem key={project.id} value={project.id.toString()}>
                                  {project.name}
                                </SelectItem>
                              ))
                            ) : (
                              // Show all projects with company information
                              (projects as any[]).filter((project: any) => project.id && project.id.toString().trim() !== "").map((project: any) => {
                                const projectCompany = (companies as any[]).find((company: any) => company.id === project.companyId);
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
                        {selectedCompanyId && selectedCompanyId !== "none" && (filteredProjects as any[]).length === 0 && (
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
                            {(users as any[]).filter((user: any) => user.id && user.id.toString().trim() !== "").map((user: any) => (
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

                  <FormField
                    control={form.control}
                    name="phaseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          Fase
                          {selectedProjectId && selectedProjectId !== "none" && (
                            <span className="text-gray-500 font-normal ml-1">
                              (do projeto selecionado)
                            </span>
                          )}
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!selectedProjectId || selectedProjectId === "none" || projectPhases.length === 0}
                        >
                          <FormControl>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue
                                placeholder={
                                  !selectedProjectId || selectedProjectId === "none"
                                    ? "Selecione um projeto primeiro"
                                    : projectPhases.length === 0
                                    ? "Nenhuma fase disponível"
                                    : "Selecionar fase..."
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Nenhuma</SelectItem>
                            {projectPhases.filter((projectPhase: any) => projectPhase.phaseId && projectPhase.phaseId.toString().trim() !== "").map((projectPhase: any) => (
                              <SelectItem key={projectPhase.phaseId} value={projectPhase.phaseId.toString()}>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                    #{projectPhase.phase.orderIndex || 1}
                                  </span>
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: projectPhase.phase.color }}
                                  />
                                  <span>{projectPhase.phase.name}</span>
                                  {projectPhase.deadline && (
                                    <span className="text-xs text-gray-500">
                                      (até {new Date(projectPhase.deadline).toLocaleDateString('pt-BR')})
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                        {selectedProjectId && selectedProjectId !== "none" && projectPhases.length === 0 && (
                          <p className="text-xs text-amber-600 mt-1">
                            Este projeto não possui fases configuradas
                          </p>
                        )}
                      </FormItem>
                    )}
                  />

                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Vincule este agendamento a uma empresa, projeto, fase ou pessoa específica.
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
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg p-4">
              <FormField
                control={form.control}
                name="isRecurring"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium text-blue-800 dark:text-blue-300">
                        Tarefa Recorrente
                      </FormLabel>
                      <FormDescription className="text-xs text-blue-700 dark:text-blue-400">
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

                  <div className="bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700/50 rounded p-3">
                    <p className="text-xs text-blue-800 dark:text-blue-300">
                      <strong>Nota:</strong> Tarefas recorrentes são agendadas apenas em dias úteis (segunda a sexta).
                      Se uma ocorrência cair em um fim de semana, será automaticamente reagendada para a segunda-feira seguinte.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Info className="text-yellow-600 dark:text-yellow-400 mt-0.5 w-5 h-5" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Pomodoro Automático</h4>
                  <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                    Um agendamento de Pomodoro (5 min) será criado automaticamente após o término desta tarefa.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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

      {/* Weekend Confirmation Dialog */}
      {weekendConfirmationData && (
        <WeekendConfirmationDialog
          open={showWeekendDialog}
          onOpenChange={setShowWeekendDialog}
          message={weekendConfirmationData.message}
          dayType={weekendConfirmationData.dayType}
          appointmentData={{
            title: form.getValues("title") || "Novo Agendamento",
            date: selectedDate,
            startTime: startTime || "00:00",
            durationValue: durationValue || 1,
            durationUnit: durationUnit || "hours"
          }}
          onProceedWithWeekend={handleProceedWithWeekend}
          onCancel={handleCancelWeekend}
        />
      )}

      {/* Pomodoro Confirmation Dialog */}
      {pomodoroConfirmationData && (
        <PomodoroConfirmationDialog
          open={showPomodoroDialog}
          onOpenChange={setShowPomodoroDialog}
          appointmentTitle={pomodoroConfirmationData.appointmentTitle}
          appointmentEndTime={pomodoroConfirmationData.appointmentEndTime}
          onConfirm={handleConfirmPomodoro}
          onSkip={handleSkipPomodoro}
        />
      )}

      {/* Debug log for weekend confirmation data */}
      {console.log("🎯 Render - weekendConfirmationData:", weekendConfirmationData)}
      {console.log("🎯 Render - showWeekendDialog:", showWeekendDialog)}
    </CustomModal>
  );
}
