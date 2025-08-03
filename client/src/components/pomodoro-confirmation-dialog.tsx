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
  Timer, 
  Coffee,
  Info
} from 'lucide-react';

interface PomodoroConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentTitle: string;
  appointmentEndTime: string;
  onConfirm: () => void;
  onSkip: () => void;
}

export default function PomodoroConfirmationDialog({
  open,
  onOpenChange,
  appointmentTitle,
  appointmentEndTime,
  onConfirm,
  onSkip
}: PomodoroConfirmationDialogProps) {

  const handleClose = () => {
    onSkip();
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  // Calculate Pomodoro end time (5 minutes after appointment end)
  const calculatePomodoroEndTime = (startTime: string) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + 5;
    const endHours = Math.floor(totalMinutes / 60);
    const endMins = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  };

  const pomodoroEndTime = calculatePomodoroEndTime(appointmentEndTime);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600 text-xl">
            <Timer className="w-6 h-6" />
            Agendar Pausa Pomodoro?
          </DialogTitle>
          <DialogDescription className="text-base leading-relaxed">
            Deseja agendar uma pausa de 5 minutos após este compromisso?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Appointment Summary */}
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2 text-base">
              <Coffee className="w-5 h-5" />
              Detalhes da Pausa Pomodoro
            </h4>
            <div className="space-y-3">
              <div className="font-medium text-green-800 text-base">Pausa de 5 minutos</div>
              <div className="text-sm text-green-700">
                <div className="mb-2">
                  <strong>Após:</strong> {appointmentTitle}
                </div>
                <div className="flex items-center gap-2 bg-green-100 px-3 py-1 rounded-full inline-flex">
                  <Timer className="w-4 h-4" />
                  <span className="font-medium">{appointmentEndTime} - {pomodoroEndTime}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Info Alert */}
          <Alert className="border-blue-300 bg-blue-50">
            <Info className="w-5 h-5 text-blue-600" />
            <AlertDescription className="text-blue-900 text-sm">
              <strong>Técnica Pomodoro:</strong> Pausas regulares de 5 minutos ajudam a manter o foco 
              e a produtividade ao longo do dia. Esta pausa será agendada automaticamente após seu compromisso.
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
              ✗ Não, obrigado
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium"
            >
              ✓ Sim, agendar pausa
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
