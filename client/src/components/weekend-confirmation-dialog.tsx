import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  Calendar, 
  Clock,
  Info
} from 'lucide-react';

interface WeekendConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: string;
  dayType: string;
  appointmentData: {
    title: string;
    date: string;
    startTime: string;
    durationValue: number;
    durationUnit: string;
  };
  onProceedWithWeekend: () => void;
  onCancel: () => void;
}

export default function WeekendConfirmationDialog({
  open,
  onOpenChange,
  message,
  dayType,
  appointmentData,
  onProceedWithWeekend,
  onCancel
}: WeekendConfirmationDialogProps) {

  console.log("🎯 WeekendConfirmationDialog rendered with props:", {
    open,
    message,
    dayType,
    appointmentData
  });
  
  const handleClose = () => {
    onCancel();
    onOpenChange(false);
  };

  const handleProceed = () => {
    onProceedWithWeekend();
    onOpenChange(false);
  };

  // Format the date for display - avoiding timezone issues
  const formatDate = (dateStr: string) => {
    // Parse date manually to avoid timezone issues
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month - 1 because JS uses 0-11
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Calculate end time
  const calculateEndTime = (startTime: string, durationValue: number, durationUnit: string) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const durationMinutes = durationUnit === 'hours' ? durationValue * 60 : durationValue;
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60);
    const endMins = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  };

  const endTime = calculateEndTime(appointmentData.startTime, appointmentData.durationValue, appointmentData.durationUnit);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600 text-xl">
            <AlertTriangle className="w-6 h-6" />
            Agendamento em {dayType}
          </DialogTitle>
          <DialogDescription className="text-base leading-relaxed">
            {message}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Appointment Summary */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2 text-base">
              <Calendar className="w-5 h-5" />
              Detalhes do Agendamento
            </h4>
            <div className="space-y-3">
              <div className="font-medium text-blue-800 text-base">{appointmentData.title}</div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-blue-700">
                <div className="flex items-center gap-2 bg-blue-100 px-3 py-1 rounded-full">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">{appointmentData.startTime} - {endTime}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(appointmentData.date)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Warning Alert */}
          <Alert className="border-amber-300 bg-amber-50 border-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <AlertDescription className="text-amber-900">
              <div className="space-y-2">
                <div className="font-semibold text-base">⚠️ O que significa "Encaixe de Fim de Semana"?</div>
                <div className="text-sm leading-relaxed">
                  • Este agendamento será marcado como <strong>overtime/encaixe</strong><br />
                  • Aparecerá na sua agenda como um compromisso ativo<br />
                  • Você é responsável por gerenciar este agendamento especial<br />
                  • Use apenas quando for realmente necessário
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Info Alert */}
          <Alert className="border-blue-300 bg-blue-50">
            <Info className="w-5 h-5 text-blue-600" />
            <AlertDescription className="text-blue-900 text-sm">
              <strong>Recomendação:</strong> Considere reagendar para um dia útil (segunda a sexta-feira) 
              para manter a organização da sua agenda de trabalho.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex-col gap-3 pt-6">
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 font-medium"
            >
              ✗ Cancelar
            </Button>
            <Button
              onClick={handleProceed}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-medium"
            >
              ⚠️ Confirmar Encaixe de {dayType}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
