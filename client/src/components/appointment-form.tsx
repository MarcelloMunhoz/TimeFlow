import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAppointmentSchema } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { calculateEndTime, getTodayString } from "@/lib/date-utils";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { Info, Save } from "lucide-react";

const formSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  date: z.string().min(1, "Data é obrigatória"),
  startTime: z.string().min(1, "Hora de início é obrigatória"),
  durationValue: z.number().min(1, "Duração deve ser maior que 0"),
  durationUnit: z.enum(["minutes", "hours"]),
  peopleWith: z.string().optional(),
  project: z.string().optional(),
  company: z.string().optional(),
  slaValue: z.number().optional(),
  slaUnit: z.enum(["minutes", "hours"]).optional(),
  isPomodoro: z.boolean().default(false),
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

  const isEditing = !!editingAppointment;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: editingAppointment?.title || "",
      description: editingAppointment?.description || "",
      date: editingAppointment?.date || defaultDate || getTodayString(),
      startTime: editingAppointment?.startTime || "",
      durationValue: editingAppointment ? Math.round(editingAppointment.durationMinutes / (editingAppointment.durationMinutes >= 60 ? 60 : 1)) : 1,
      durationUnit: editingAppointment ? (editingAppointment.durationMinutes >= 60 ? "hours" : "minutes") : "hours",
      peopleWith: editingAppointment?.peopleWith || "",
      project: editingAppointment?.project || "",
      company: editingAppointment?.company || "",
      slaValue: editingAppointment?.slaMinutes ? Math.round(editingAppointment.slaMinutes / (editingAppointment.slaMinutes >= 60 ? 60 : 1)) : undefined,
      slaUnit: editingAppointment?.slaMinutes ? (editingAppointment.slaMinutes >= 60 ? "hours" : "minutes") : "hours",
      isPomodoro: editingAppointment?.isPomodoro || false,
    },
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEditing) {
        return apiRequest('PATCH', `/api/appointments/${editingAppointment.id}`, data);
      } else {
        return apiRequest('POST', '/api/appointments', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/productivity'] });
      toast({ title: isEditing ? "Agendamento atualizado com sucesso!" : "Agendamento criado com sucesso!" });
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
      }
      
      toast({ title: message, variant: "destructive" });
    }
  });

  // Watch for changes to calculate end time
  const startTime = form.watch("startTime");
  const durationValue = form.watch("durationValue");
  const durationUnit = form.watch("durationUnit");

  useEffect(() => {
    if (startTime && durationValue) {
      const durationMinutes = durationUnit === "hours" ? durationValue * 60 : durationValue;
      const calculatedEndTime = calculateEndTime(startTime, durationMinutes);
      setEndTime(calculatedEndTime);
    }
  }, [startTime, durationValue, durationUnit]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    console.log("Form submitted with values:", values);
    console.log("Form errors:", form.formState.errors);
    
    const durationMinutes = values.durationUnit === "hours" ? values.durationValue * 60 : values.durationValue;
    const slaMinutes = values.slaValue && values.slaUnit 
      ? (values.slaUnit === "hours" ? values.slaValue * 60 : values.slaValue)
      : undefined;

    const appointmentData = {
      title: values.title,
      description: values.description || null,
      date: values.date,
      startTime: values.startTime,
      durationMinutes,
      peopleWith: values.peopleWith || null,
      project: values.project || null,
      company: values.company || null,
      slaMinutes: slaMinutes || null,
      isPomodoro: false,
    };

    console.log("Sending appointment data:", appointmentData);
    createAppointmentMutation.mutate(appointmentData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              {isEditing ? "Editar Agendamento" : "Novo Agendamento"}
            </DialogTitle>
            {isEditing && editingAppointment && (
              <span className="text-sm text-gray-400 font-mono bg-gray-100 px-2 py-1 rounded">
                ID: {editingAppointment.id}
              </span>
            )}
          </div>
          <DialogDescription>
            {isEditing ? "Atualize as informações do agendamento" : "Crie um novo agendamento com controle de SLA e Pomodoro automático"}
          </DialogDescription>
        </DialogHeader>

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
                          placeholder="Descreva os detalhes do agendamento..." 
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
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
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

              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="peopleWith"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quem estará comigo</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: João Silva, Maria Santos" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="project"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Projeto</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do projeto" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome da empresa" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
      </DialogContent>
    </Dialog>
  );
}
