import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Save, Mail } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FollowUpSettings {
  id: number;
  companyId: number;
  companyName: string;
  enabled: boolean;
  emailFrequency: string;
  sendDay: number;
  sendTime: string;
  recipientEmails: string | null;
  customTemplate: string | null;
  includeBlockedPhases: boolean;
  includeProgressCharts: boolean;
  includeNextSteps: boolean;
  lastSentDate: string | null;
  isActive: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: FollowUpSettings | null;
}

export default function FollowUpSettingsDialog({ open, onOpenChange, settings }: Props) {
  const [formData, setFormData] = useState<Partial<FollowUpSettings>>({});
  const [emails, setEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize form data when settings change
  useEffect(() => {
    if (settings) {
      setFormData(settings);
      
      // Parse recipient emails
      if (settings.recipientEmails) {
        try {
          const parsedEmails = JSON.parse(settings.recipientEmails);
          setEmails(Array.isArray(parsedEmails) ? parsedEmails : []);
        } catch {
          setEmails([]);
        }
      } else {
        setEmails([]);
      }
    }
  }, [settings]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", `/api/follow-up-settings/${settings?.companyId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/follow-up-settings"] });
      toast({
        title: "Configurações salvas!",
        description: "As configurações de follow-up foram atualizadas com sucesso.",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar configurações",
        description: error.message || "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addEmail = () => {
    if (newEmail && !emails.includes(newEmail)) {
      setEmails(prev => [...prev, newEmail]);
      setNewEmail("");
    }
  };

  const removeEmail = (emailToRemove: string) => {
    setEmails(prev => prev.filter(email => email !== emailToRemove));
  };

  const handleSave = () => {
    const dataToSave = {
      ...formData,
      recipientEmails: emails.length > 0 ? JSON.stringify(emails) : null
    };
    updateSettingsMutation.mutate(dataToSave);
  };

  const frequencyOptions = [
    { value: "weekly", label: "Semanal" },
    { value: "biweekly", label: "Quinzenal" },
    { value: "monthly", label: "Mensal" }
  ];

  const dayOptions = [
    { value: 0, label: "Domingo" },
    { value: 1, label: "Segunda-feira" },
    { value: 2, label: "Terça-feira" },
    { value: 3, label: "Quarta-feira" },
    { value: 4, label: "Quinta-feira" },
    { value: 5, label: "Sexta-feira" },
    { value: 6, label: "Sábado" }
  ];

  if (!settings) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Mail className="w-5 h-5 mr-2" />
            Configurações de Follow-up
          </DialogTitle>
          <DialogDescription>
            Configure as preferências de follow-up para <strong>{settings.companyName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Enable/Disable */}
          <div className="flex items-center space-x-2">
            <Switch
              id="enabled"
              checked={formData.enabled || false}
              onCheckedChange={(checked) => handleInputChange("enabled", checked)}
            />
            <Label htmlFor="enabled">Habilitar follow-up automático</Label>
            {formData.enabled && (
              <Badge className="bg-green-100 text-green-800">Ativo</Badge>
            )}
          </div>

          {/* Frequency and Schedule */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequência</Label>
              <Select
                value={formData.emailFrequency || "weekly"}
                onValueChange={(value) => handleInputChange("emailFrequency", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a frequência" />
                </SelectTrigger>
                <SelectContent>
                  {frequencyOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sendDay">Dia da Semana</Label>
              <Select
                value={formData.sendDay?.toString() || "1"}
                onValueChange={(value) => handleInputChange("sendDay", parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o dia" />
                </SelectTrigger>
                <SelectContent>
                  {dayOptions.map(option => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sendTime">Horário</Label>
              <Input
                id="sendTime"
                type="time"
                value={formData.sendTime || "08:00"}
                onChange={(e) => handleInputChange("sendTime", e.target.value)}
              />
            </div>
          </div>

          {/* Email Recipients */}
          <div className="space-y-3">
            <Label>Destinatários de Email</Label>
            
            {/* Add new email */}
            <div className="flex space-x-2">
              <Input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Digite um email"
                type="email"
                className="flex-1"
                onKeyPress={(e) => e.key === 'Enter' && addEmail()}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addEmail}
                disabled={!newEmail}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Email list */}
            {emails.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Emails configurados:</p>
                <div className="flex flex-wrap gap-2">
                  {emails.map((email, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => removeEmail(email)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Report Options */}
          <div className="space-y-3">
            <Label>Opções do Relatório</Label>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="includeBlockedPhases"
                  checked={formData.includeBlockedPhases !== false}
                  onCheckedChange={(checked) => handleInputChange("includeBlockedPhases", checked)}
                />
                <Label htmlFor="includeBlockedPhases">Incluir fases bloqueadas</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="includeProgressCharts"
                  checked={formData.includeProgressCharts !== false}
                  onCheckedChange={(checked) => handleInputChange("includeProgressCharts", checked)}
                />
                <Label htmlFor="includeProgressCharts">Incluir gráficos de progresso</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="includeNextSteps"
                  checked={formData.includeNextSteps !== false}
                  onCheckedChange={(checked) => handleInputChange("includeNextSteps", checked)}
                />
                <Label htmlFor="includeNextSteps">Incluir próximos passos</Label>
              </div>
            </div>
          </div>

          {/* Custom Template */}
          <div className="space-y-2">
            <Label htmlFor="customTemplate">Template Personalizado (Opcional)</Label>
            <Textarea
              id="customTemplate"
              value={formData.customTemplate || ""}
              onChange={(e) => handleInputChange("customTemplate", e.target.value)}
              placeholder="HTML personalizado para o template de email (deixe em branco para usar o padrão)"
              rows={4}
            />
            <p className="text-sm text-gray-600">
              Use HTML personalizado para customizar o template de email. Deixe em branco para usar o template padrão.
            </p>
          </div>

          {/* Last Sent Info */}
          {formData.lastSentDate && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Último envio:</strong> {new Date(formData.lastSentDate).toLocaleDateString('pt-BR')}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateSettingsMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {updateSettingsMutation.isPending ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
