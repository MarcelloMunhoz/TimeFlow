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
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Conflito de Agendamento Detectado
          </DialogTitle>
          <DialogDescription>
            O horário selecionado conflita com {conflictingAppointments.length} agendamento(s) existente(s).
            Você pode prosseguir com um "encaixe" ou escolher um horário diferente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* New Appointment Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Novo Agendamento
            </h4>
            <div className="space-y-2 text-sm">
              <div className="font-medium text-blue-800">{newAppointment.title}</div>
              <div className="flex items-center gap-4 text-blue-700">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {newAppointment.startTime} - {newEndTime}
                </div>
                <div>
                  {newAppointment.durationMinutes} minutos
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
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-red-900 mb-1">
                          {appointment.title}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-red-700">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {appointment.startTime} - {endTime}
                          </div>
                          <div>
                            {appointment.durationMinutes} minutos
                          </div>
                        </div>
                      </div>
                      <Badge className={cn("text-xs", getStatusColor(appointment.status))}>
                        {getStatusLabel(appointment.status)}
                      </Badge>
                    </div>

                    {appointment.description && (
                      <p className="text-sm text-red-600 mb-2">
                        {appointment.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-red-600">
                      {appointment.companyId && (
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          <span>Empresa ID: {appointment.companyId}</span>
                        </div>
                      )}
                      {appointment.projectId && (
                        <div className="flex items-center gap-1">
                          <FolderOpen className="w-3 h-3" />
                          <span>Projeto ID: {appointment.projectId}</span>
                        </div>
                      )}
                      {appointment.userId && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>Usuário ID: {appointment.userId}</span>
                        </div>
                      )}
                    </div>
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

          {/* Warning Alert */}
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Atenção:</strong> Prosseguir com o "encaixe" criará agendamentos sobrepostos. 
              Certifique-se de que isso é intencional e que você pode gerenciar ambos os compromissos.
            </AlertDescription>
          </Alert>

          {/* Acknowledgment Checkbox */}
          <div className="flex items-start space-x-2">
            <Checkbox
              id="acknowledge-overlap"
              checked={acknowledgeOverlap}
              onCheckedChange={setAcknowledgeOverlap}
            />
            <label
              htmlFor="acknowledge-overlap"
              className="text-sm text-gray-700 leading-relaxed cursor-pointer"
            >
              Eu entendo que estou criando um agendamento sobreposto e assumo a responsabilidade 
              de gerenciar ambos os compromissos adequadamente.
            </label>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 sm:flex-none"
            >
              Cancelar
            </Button>
            <Button
              variant="outline"
              onClick={handleSelectDifferentTime}
              className="flex-1 sm:flex-none border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              Escolher Outro Horário
            </Button>
          </div>
          <Button
            onClick={handleProceedWithOverlap}
            disabled={!acknowledgeOverlap}
            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white"
          >
            Prosseguir com Encaixe
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
