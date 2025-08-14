import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw, 
  Search, 
  Filter,
  ChevronLeft,
  ChevronRight,
  Mail,
  AlertTriangle,
  Calendar,
  User,
  Building
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EmailLog {
  id: number;
  recipient_email: string;
  recipient_name?: string;
  subject: string;
  status: 'pending' | 'sent' | 'failed' | 'retry';
  error_message?: string;
  attempts: number;
  max_attempts: number;
  smtp_server?: string;
  project_name?: string;
  company_name?: string;
  scheduled_at?: string;
  sent_at?: string;
  created_at: string;
  updated_at: string;
}

interface EmailLogsResponse {
  logs: EmailLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function EmailLogs() {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    status: '',
    recipient: '',
    start_date: '',
    end_date: ''
  });

  // Fetch email logs
  const { data: logsData, isLoading, refetch } = useQuery<{ data: EmailLogsResponse }>({
    queryKey: ['/api/email/logs', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });
      return apiRequest('GET', `/api/email/logs?${params.toString()}`);
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  const logs = logsData?.data?.logs || [];
  const pagination = logsData?.data?.pagination;

  const getStatusBadge = (status: string, attempts: number, maxAttempts: number) => {
    switch (status) {
      case 'sent':
        return (
          <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700/50">
            <CheckCircle className="w-3 h-3 mr-1" />
            Enviado
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="outline" className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700/50">
            <XCircle className="w-3 h-3 mr-1" />
            Falhou
          </Badge>
        );
      case 'retry':
        return (
          <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700/50">
            <RefreshCw className="w-3 h-3 mr-1" />
            Tentando ({attempts}/{maxAttempts})
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700/50">
            <Clock className="w-3 h-3 mr-1" />
            Pendente
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filtering
    }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
      status: '',
      recipient: '',
      start_date: '',
      end_date: ''
    });
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
          <CardDescription>
            Filtre os logs por status, destinatário ou período
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os status</SelectItem>
                  <SelectItem value="sent">Enviado</SelectItem>
                  <SelectItem value="failed">Falhou</SelectItem>
                  <SelectItem value="retry">Tentando</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Destinatário</Label>
              <Input
                placeholder="E-mail do destinatário"
                value={filters.recipient}
                onChange={(e) => handleFilterChange('recipient', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Input
                type="date"
                value={filters.start_date}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Data Final</Label>
              <Input
                type="date"
                value={filters.end_date}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <Button variant="outline" onClick={clearFilters}>
              Limpar Filtros
            </Button>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Histórico de E-mails
            {pagination && (
              <Badge variant="outline" className="ml-2">
                {pagination.total} registros
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Histórico completo de envios de e-mail com status e detalhes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              Carregando logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Nenhum log de e-mail encontrado
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Os logs aparecerão aqui após o primeiro envio
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Destinatário</TableHead>
                      <TableHead>Assunto</TableHead>
                      <TableHead>Projeto/Empresa</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Tentativas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {getStatusBadge(log.status, log.attempts, log.max_attempts)}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <User className="w-3 h-3 text-gray-400" />
                              <span className="font-medium">{log.recipient_name || 'N/A'}</span>
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {log.recipient_email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="font-medium truncate" title={log.subject}>
                              {log.subject}
                            </p>
                            {log.error_message && (
                              <div className="flex items-center gap-1 mt-1">
                                <AlertTriangle className="w-3 h-3 text-red-500" />
                                <p className="text-xs text-red-600 dark:text-red-400 truncate" title={log.error_message}>
                                  {log.error_message}
                                </p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {log.project_name && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-gray-400" />
                                <span className="text-sm">{log.project_name}</span>
                              </div>
                            )}
                            {log.company_name && (
                              <div className="flex items-center gap-1">
                                <Building className="w-3 h-3 text-gray-400" />
                                <span className="text-sm text-gray-500 dark:text-gray-400">{log.company_name}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Criado:</span>
                              <br />
                              {formatDate(log.created_at)}
                            </div>
                            {log.sent_at && (
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Enviado:</span>
                                <br />
                                {formatDate(log.sent_at)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-center">
                            <span className={`font-mono text-sm ${
                              log.attempts >= log.max_attempts && log.status === 'failed' 
                                ? 'text-red-600 dark:text-red-400' 
                                : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              {log.attempts}/{log.max_attempts}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination && pagination.pages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Mostrando {((pagination.page - 1) * pagination.limit) + 1} a{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
                    {pagination.total} registros
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Anterior
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                        const pageNum = Math.max(1, pagination.page - 2) + i;
                        if (pageNum > pagination.pages) return null;
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === pagination.page ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.pages}
                    >
                      Próxima
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
