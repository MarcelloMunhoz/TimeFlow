import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, Settings, TestTube, CheckCircle, XCircle, 
  Eye, EyeOff, Save, RefreshCw, AlertTriangle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EmailSettings {
  id: number;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpSecure: boolean;
  fromEmail: string;
  fromName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function EmailSettingsConfig() {
  const [formData, setFormData] = useState<Partial<EmailSettings>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch email settings
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["/api/email-settings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/email-settings");
      return response.json();
    },
  });

  // Update form data when settings are loaded
  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", "/api/email-settings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-settings"] });
      toast({
        title: "Configurações salvas!",
        description: "As configurações de email foram atualizadas com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar configurações",
        description: error.message || "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/email-settings/test-connection");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Conexão bem-sucedida!",
          description: "A conexão SMTP foi testada com sucesso.",
        });
      } else {
        toast({
          title: "Falha na conexão",
          description: data.error || "Não foi possível conectar ao servidor SMTP.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro no teste de conexão",
        description: error.message || "Não foi possível testar a conexão.",
        variant: "destructive",
      });
    },
  });

  // Send test email mutation
  const sendTestEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("POST", "/api/email-settings/send-test", { to: email });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Email de teste enviado!",
          description: `Email enviado com sucesso para ${testEmail}`,
        });
        setTestEmail("");
      } else {
        toast({
          title: "Falha no envio",
          description: data.error || "Não foi possível enviar o email de teste.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro no envio do email",
        description: error.message || "Não foi possível enviar o email de teste.",
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

  const handleSave = () => {
    const dataToSave: any = { ...formData };
    if (password) {
      dataToSave.smtpPassword = password;
    }
    updateSettingsMutation.mutate(dataToSave);
  };

  const handleTestConnection = () => {
    testConnectionMutation.mutate();
  };

  const handleSendTestEmail = () => {
    if (!testEmail) {
      toast({
        title: "Email obrigatório",
        description: "Digite um endereço de email para enviar o teste.",
        variant: "destructive",
      });
      return;
    }
    sendTestEmailMutation.mutate(testEmail);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            Carregando configurações...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Erro ao carregar configurações
            </h3>
            <p className="text-gray-600">
              Não foi possível carregar as configurações de email.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* SMTP Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Configurações SMTP
          </CardTitle>
          <CardDescription>
            Configure as credenciais do servidor SMTP para envio de emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtpHost">Servidor SMTP</Label>
              <Input
                id="smtpHost"
                value={formData.smtpHost || ""}
                onChange={(e) => handleInputChange("smtpHost", e.target.value)}
                placeholder="smtp.gmail.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpPort">Porta</Label>
              <Input
                id="smtpPort"
                type="number"
                value={formData.smtpPort || ""}
                onChange={(e) => handleInputChange("smtpPort", parseInt(e.target.value))}
                placeholder="587"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtpUser">Usuário</Label>
              <Input
                id="smtpUser"
                value={formData.smtpUser || ""}
                onChange={(e) => handleInputChange("smtpUser", e.target.value)}
                placeholder="seu-email@gmail.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpPassword">Senha</Label>
              <div className="relative">
                <Input
                  id="smtpPassword"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite a senha ou deixe em branco para manter atual"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fromEmail">Email de Origem</Label>
              <Input
                id="fromEmail"
                value={formData.fromEmail || ""}
                onChange={(e) => handleInputChange("fromEmail", e.target.value)}
                placeholder="noreply@timeflow.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromName">Nome de Origem</Label>
              <Input
                id="fromName"
                value={formData.fromName || ""}
                onChange={(e) => handleInputChange("fromName", e.target.value)}
                placeholder="TimeFlow - Sistema de Gestão"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="smtpSecure"
              checked={formData.smtpSecure || false}
              onCheckedChange={(checked) => handleInputChange("smtpSecure", checked)}
            />
            <Label htmlFor="smtpSecure">Usar SSL/TLS</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive || false}
              onCheckedChange={(checked) => handleInputChange("isActive", checked)}
            />
            <Label htmlFor="isActive">Configuração Ativa</Label>
            {formData.isActive && (
              <Badge className="bg-green-100 text-green-800">Ativo</Badge>
            )}
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={updateSettingsMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {updateSettingsMutation.isPending ? "Salvando..." : "Salvar Configurações"}
            </Button>
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={testConnectionMutation.isPending}
            >
              <TestTube className="w-4 h-4 mr-2" />
              {testConnectionMutation.isPending ? "Testando..." : "Testar Conexão"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="w-5 h-5 mr-2" />
            Teste de Email
          </CardTitle>
          <CardDescription>
            Envie um email de teste para verificar se as configurações estão funcionando
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-3">
            <Input
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Digite um email para teste"
              type="email"
              className="flex-1"
            />
            <Button
              onClick={handleSendTestEmail}
              disabled={sendTestEmailMutation.isPending || !testEmail}
            >
              <Mail className="w-4 h-4 mr-2" />
              {sendTestEmailMutation.isPending ? "Enviando..." : "Enviar Teste"}
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            O email de teste incluirá informações sobre a configuração e confirmará que o sistema está funcionando.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
