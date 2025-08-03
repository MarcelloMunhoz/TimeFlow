import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  AlertTriangle, 
  Clock, 
  Calendar, 
  Building2, 
  FolderOpen, 
  User,
  ArrowRight,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateEndTime } from '@/lib/date-utils';

interface ConflictWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflictingAppointments: any[];
  newAppointment: {
    title: string;
    date: string;
    startTime: string;
    durationMinutes: number;
  };
  onProceedWithOverlap: () => void;
  onSelectDifferentTime: () => void;
  suggestedTimes?: string[];
}

export default function ConflictWarningDialog({
  open,
  onOpenChange,
  conflictingAppointments,
  newAppointment,
  onProceedWithOverlap,
  onSelectDifferentTime,
  suggestedTimes = []
}: ConflictWarningDialogProps) {
  const [acknowledgeOverlap, setAcknowledgeOverlap] = useState(false);

  const handleClose = () => {
    setAcknowledgeOverlap(false);
    onOpenChange(false);
  };

  const handleProceedWithOverlap = () => {
    onProceedWithOverlap();
    handleClose();
  };

  const handleSelectDifferentTime = () => {
    onSelectDifferentTime();
    handleClose();
  };

  const newEndTime = calculateEndTime(newAppointment.startTime, newAppointment.durationMinutes);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'delayed':
        return 'bg-red-100 text-red-800';
      case 'rescheduled':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluído';
      case 'scheduled':
        return 'Agendado';
      case 'delayed':
        return 'Atrasado';
      case 'rescheduled':
        return 'Reagendado';
      default:
        return status;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600 text-xl">
            <AlertTriangle className="w-6 h-6" />
            Conflito de Horário Detectado
          </DialogTitle>
          <DialogDescription className="text-base leading-relaxed">
            O horário selecionado <strong>conflita com {conflictingAppointments.length} agendamento(s) existente(s)</strong>.
            <br />
            <span className="text-blue-600 font-medium">Você pode escolher um horário diferente</span> ou
            <span className="text-amber-600 font-medium"> prosseguir com um "encaixe" (sobreposição intencional)</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* New Appointment Summary - Improved layout */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2 text-base">
              <Calendar className="w-5 h-5" />
              Novo Agendamento que Você Quer Criar
            </h4>
            <div className="space-y-3">
              <div className="font-medium text-blue-800 text-base">{newAppointment.title}</div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-blue-700">
                <div className="flex items-center gap-2 bg-blue-100 px-3 py-1 rounded-full">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">{newAppointment.startTime} - {newEndTime}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>⏱️ {newAppointment.durationMinutes} minutos</span>
                </div>
              </div>
            </div>
          </div>

          {/* Conflicting Appointments */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Agendamentos Conflitantes
            </h4>
            <div className="space-y-3">
              {conflictingAppointments.map((appointment, index) => {
                const endTime = calculateEndTime(appointment.startTime, appointment.durationMinutes);
                
                return (
                  <div key={appointment.id || index} className="border border-red-200 rounded-lg p-4 bg-red-50">
                    <div className="space-y-3">
                      {/* Title and Status */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-red-900 text-base truncate">
                            {appointment.title}
                          </div>
                        </div>
                        <Badge className={cn("text-xs flex-shrink-0", getStatusColor(appointment.status))}>
                          {getStatusLabel(appointment.status)}
                        </Badge>
                      </div>

                      {/* Time Information */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-red-700">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span className="font-medium">{appointment.startTime} - {endTime}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>⏱️ {appointment.durationMinutes} minutos</span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {appointment.description && (
                      <div className="mt-2 p-2 bg-white rounded border border-red-100">
                        <p className="text-sm text-red-700 leading-relaxed">
                          {appointment.description}
                        </p>
                      </div>
                    )}

                    {/* Additional Information */}
                    {(appointment.companyId || appointment.projectId || appointment.userId) && (
                      <div className="flex flex-wrap items-center gap-3 text-xs text-red-600 pt-2 border-t border-red-200">
                        {appointment.companyId && (
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            <span>Empresa: {appointment.companyId}</span>
                          </div>
                        )}
                        {appointment.projectId && (
                          <div className="flex items-center gap-1">
                            <FolderOpen className="w-3 h-3" />
                            <span>Projeto: {appointment.projectId}</span>
                          </div>
                        )}
                        {appointment.userId && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>Usuário: {appointment.userId}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Suggested Alternative Times */}
          {suggestedTimes.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-500" />
                Horários Alternativos Sugeridos
              </h4>
              <div className="flex flex-wrap gap-2">
                {suggestedTimes.map((time) => (
                  <Button
                    key={time}
                    variant="outline"
                    size="sm"
                    className="border-green-200 hover:bg-green-50 text-green-700"
                    onClick={() => {
                      // This would need to be handled by the parent component
                      handleSelectDifferentTime();
                    }}
                  >
                    {time}
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Warning Alert - More prominent */}
          <Alert className="border-amber-300 bg-amber-50 border-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <AlertDescription className="text-amber-900">
              <div className="space-y-2">
                <div className="font-semibold text-base">⚠️ O que significa "Encaixe"?</div>
                <div className="text-sm leading-relaxed">
                  • Você terá <strong>dois agendamentos no mesmo horário</strong><br />
                  • Ambos aparecerão na sua agenda como compromissos ativos<br />
                  • Você é responsável por gerenciar essa sobreposição<br />
                  • Use apenas quando for realmente necessário
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Acknowledgment Checkbox - More prominent */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="acknowledge-overlap"
                checked={acknowledgeOverlap}
                onCheckedChange={(checked) => setAcknowledgeOverlap(checked === true)}
                className="mt-1 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
              />
              <label
                htmlFor="acknowledge-overlap"
                className="text-sm text-amber-800 leading-relaxed cursor-pointer font-medium"
              >
                ✓ Eu entendo que estou criando um agendamento sobreposto e assumo a responsabilidade
                de gerenciar ambos os compromissos adequadamente.
              </label>
            </div>
            {!acknowledgeOverlap && (
              <p className="text-xs text-amber-600 mt-2 ml-7">
                Você deve confirmar que entende as implicações antes de prosseguir.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col gap-3 pt-6">
          {/* Primary Actions - More prominent */}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button
              variant="outline"
              onClick={handleSelectDifferentTime}
              className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 font-medium"
            >
              ✓ Escolher Outro Horário
            </Button>
            <Button
              onClick={handleProceedWithOverlap}
              disabled={!acknowledgeOverlap}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ⚠️ Prosseguir com Encaixe
            </Button>
          </div>

          {/* Secondary Action */}
          <Button
            variant="ghost"
            onClick={handleClose}
            className="w-full text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
