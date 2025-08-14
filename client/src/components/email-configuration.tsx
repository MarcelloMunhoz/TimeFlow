import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { 
  Mail, 
  Server, 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Send, 
  Settings, 
  Eye, 
  EyeOff,
  Loader2,
  TestTube,
  History,
  RefreshCw
} from "lucide-react";

const smtpConfigSchema = z.object({
  smtp_server: z.string().min(1, "Servidor SMTP é obrigatório"),
  smtp_port: z.number().min(1, "Porta deve ser maior que 0").max(65535, "Porta inválida"),
  smtp_user: z.string().email("E-mail inválido"),
  smtp_password: z.string().min(1, "Senha é obrigatória"),
  from_name: z.string().min(1, "Nome de origem é obrigatório"),
  ssl_enabled: z.boolean(),
  tls_enabled: z.boolean(),
});

type SMTPConfigForm = z.infer<typeof smtpConfigSchema>;

interface SMTPConfig {
  id: number;
  smtp_server: string;
  smtp_port: number;
  smtp_user: string;
  from_email: string;
  from_name: string;
  ssl_enabled: boolean;
  tls_enabled: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const SMTP_PRESETS = {
  gmail: {
    name: "Gmail",
    smtp_server: "smtp.gmail.com",
    smtp_port: 587,
    ssl_enabled: false,
    tls_enabled: true,
    description: "Use senha de app, não sua senha normal"
  },
  outlook: {
    name: "Outlook/Hotmail",
    smtp_server: "smtp-mail.outlook.com",
    smtp_port: 587,
    ssl_enabled: false,
    tls_enabled: true,
    description: "Funciona com contas @outlook.com e @hotmail.com"
  },
  yahoo: {
    name: "Yahoo Mail",
    smtp_server: "smtp.mail.yahoo.com",
    smtp_port: 587,
    ssl_enabled: false,
    tls_enabled: true,
    description: "Requer senha de app"
  },
  custom: {
    name: "Personalizado",
    smtp_server: "",
    smtp_port: 587,
    ssl_enabled: false,
    tls_enabled: true,
    description: "Configure manualmente seu provedor"
  }
};

export default function EmailConfiguration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof SMTP_PRESETS>("custom");

  // Fetch current SMTP configuration
  const { data: currentConfig, isLoading: configLoading } = useQuery<{ data: SMTPConfig | null }>({
    queryKey: ['/api/email/config'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const form = useForm<SMTPConfigForm>({
    resolver: zodResolver(smtpConfigSchema),
    defaultValues: {
      smtp_server: "",
      smtp_port: 587,
      smtp_user: "",
      smtp_password: "",
      from_name: "Equipe TimeFlow",
      ssl_enabled: false,
      tls_enabled: true,
    },
  });

  // Update form when config is loaded
  useEffect(() => {
    if (currentConfig?.data) {
      const config = currentConfig.data;
      form.reset({
        smtp_server: config.smtp_server,
        smtp_port: config.smtp_port,
        smtp_user: config.smtp_user,
        smtp_password: "", // Don't populate password for security
        from_name: config.from_name,
        ssl_enabled: config.ssl_enabled,
        tls_enabled: config.tls_enabled,
      });
    }
  }, [currentConfig, form]);

  // Save SMTP configuration
  const saveConfigMutation = useMutation({
    mutationFn: (data: SMTPConfigForm) => apiRequest('POST', '/api/email/config', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email/config'] });
      toast({
        title: "Configuração salva",
        description: "As configurações SMTP foram salvas com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    },
  });

  // Test SMTP connection
  const testConnectionMutation = useMutation({
    mutationFn: (email: string) => apiRequest('POST', '/api/email/test', { test_email: email }),
    onSuccess: () => {
      toast({
        title: "Teste realizado com sucesso",
        description: `E-mail de teste enviado para ${testEmail}`,
      });
      setTestEmail("");
    },
    onError: (error: any) => {
      toast({
        title: "Falha no teste",
        description: error.message || "Não foi possível enviar o e-mail de teste.",
        variant: "destructive",
      });
    },
  });

  const handlePresetChange = (preset: keyof typeof SMTP_PRESETS) => {
    setSelectedPreset(preset);
    const presetConfig = SMTP_PRESETS[preset];
    
    if (preset !== "custom") {
      form.setValue("smtp_server", presetConfig.smtp_server);
      form.setValue("smtp_port", presetConfig.smtp_port);
      form.setValue("ssl_enabled", presetConfig.ssl_enabled);
      form.setValue("tls_enabled", presetConfig.tls_enabled);
    }
  };

  const onSubmit = (data: SMTPConfigForm) => {
    saveConfigMutation.mutate(data);
  };

  const handleTestConnection = () => {
    if (!testEmail) {
      toast({
        title: "E-mail necessário",
        description: "Digite um e-mail para teste.",
        variant: "destructive",
      });
      return;
    }

    testConnectionMutation.mutate(testEmail);
  };

  const getPortDescription = (port: number) => {
    switch (port) {
      case 25: return "Porta padrão (não recomendada)";
      case 465: return "SSL/SMTPS (segura)";
      case 587: return "TLS/STARTTLS (recomendada)";
      case 2525: return "Alternativa (alguns provedores)";
      default: return "Porta personalizada";
    }
  };

  if (configLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Carregando configurações...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Configuração de E-mail
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configure o SMTP para envio automático de follow-ups
          </p>
        </div>
        {currentConfig?.data && (
          <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
            <CheckCircle className="w-4 h-4 mr-1" />
            Configurado
          </Badge>
        )}
      </div>

      <Tabs defaultValue="config" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configuração
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <TestTube className="w-4 h-4" />
            Teste
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          {/* Preset Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                Provedor de E-mail
              </CardTitle>
              <CardDescription>
                Selecione seu provedor ou configure manualmente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(SMTP_PRESETS).map(([key, preset]) => (
                  <Card 
                    key={key}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedPreset === key 
                        ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                    onClick={() => handlePresetChange(key as keyof typeof SMTP_PRESETS)}
                  >
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-sm">{preset.name}</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {preset.description}
                      </p>
                      {preset.smtp_server && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 font-mono">
                          {preset.smtp_server}:{preset.smtp_port}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* SMTP Configuration Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Configurações SMTP
              </CardTitle>
              <CardDescription>
                Configure os detalhes do servidor de e-mail
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="smtp_server"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Servidor SMTP *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="smtp.gmail.com" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="smtp_port"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Porta *</FormLabel>
                          <FormControl>
                            <Select 
                              value={field.value.toString()} 
                              onValueChange={(value) => field.onChange(parseInt(value))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="587">587 - TLS (Recomendada)</SelectItem>
                                <SelectItem value="465">465 - SSL</SelectItem>
                                <SelectItem value="25">25 - Padrão</SelectItem>
                                <SelectItem value="2525">2525 - Alternativa</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormDescription>
                            {getPortDescription(field.value)}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="smtp_user"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Usuário (E-mail) *</FormLabel>
                          <FormControl>
                            <Input 
                              type="email"
                              placeholder="seu-email@gmail.com" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            E-mail usado para autenticação SMTP
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="smtp_password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showPassword ? "text" : "password"}
                                placeholder="Senha ou senha de app" 
                                {...field} 
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormDescription>
                            Para Gmail/Yahoo, use senha de app
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="from_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Remetente *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Equipe TimeFlow" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Nome que aparecerá como remetente dos e-mails
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                      <Label className="text-sm font-medium">E-mail de Origem</Label>
                      <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded border">
                        <code className="text-sm">noreply@meudominio.com</code>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        E-mail fixo usado como remetente (não editável)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <FormField
                      control={form.control}
                      name="ssl_enabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between space-y-0">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm font-medium">SSL Habilitado</FormLabel>
                            <FormDescription className="text-xs">
                              Para porta 465
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

                    <FormField
                      control={form.control}
                      name="tls_enabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between space-y-0">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm font-medium">TLS Habilitado</FormLabel>
                            <FormDescription className="text-xs">
                              Para porta 587
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
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={saveConfigMutation.isPending}
                      className="min-w-[120px]"
                    >
                      {saveConfigMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Shield className="w-4 h-4 mr-2" />
                          Salvar Configurações
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-6">
          {/* Test Connection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                Testar Conexão SMTP
              </CardTitle>
              <CardDescription>
                Envie um e-mail de teste para verificar se as configurações estão funcionando
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!currentConfig?.data ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Configure o SMTP primeiro antes de testar a conexão.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="test-email">E-mail para Teste</Label>
                    <Input
                      id="test-email"
                      type="email"
                      placeholder="seu-email@exemplo.com"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                    />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Um e-mail de teste será enviado para este endereço
                    </p>
                  </div>

                  <Button 
                    onClick={handleTestConnection}
                    disabled={testConnectionMutation.isPending || !testEmail}
                    className="w-full"
                  >
                    {testConnectionMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando teste...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Enviar E-mail de Teste
                      </>
                    )}
                  </Button>

                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
                      Configuração Atual:
                    </h4>
                    <div className="space-y-1 text-sm text-blue-800 dark:text-blue-400">
                      <p><strong>Servidor:</strong> {currentConfig.data.smtp_server}</p>
                      <p><strong>Porta:</strong> {currentConfig.data.smtp_port}</p>
                      <p><strong>Usuário:</strong> {currentConfig.data.smtp_user}</p>
                      <p><strong>SSL/TLS:</strong> {currentConfig.data.ssl_enabled ? 'SSL' : 'TLS'}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          {/* Email Logs will be implemented in the next component */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Histórico de E-mails
              </CardTitle>
              <CardDescription>
                Visualize o histórico de envios e status dos e-mails
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                Componente de logs será implementado em seguida...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
