import { useState } from 'react';
import { format, addMinutes, parse, isBefore, setHours, setMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useStore } from '@/store/useStore';
import { Appointment } from '@/types';
import { Clock, CalendarDays } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Swal from 'sweetalert2';
import { sendRescheduleNotification } from '@/lib/payments';

interface RescheduleModalProps {
  appointment: Appointment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RescheduleModal({ appointment, open, onOpenChange }: RescheduleModalProps) {
  const { schedule, appointments, rescheduleAppointment, specialServices, blockedDates, services } = useStore();
  const apptKind: 'service' | 'special' = appointment.kind ?? 'service';
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');

  const service = services.find((s) => s.id === appointment.serviceId);
  const duration = service?.duration ?? 60;

  const getAvailableSlots = (date: Date): string[] => {
    if (!date) return [];

    const dayOfWeek = date.getDay();
    const daySchedule = schedule.find((s) => s.dayOfWeek === dayOfWeek);
    if (!daySchedule || daySchedule.slots.length === 0) return [];

    const slots: string[] = [];
    const dateStr = format(date, 'yyyy-MM-dd');
    const now = new Date();
    const min24h = addMinutes(now, 24 * 60);

    // Exclude current appointment from booked slots
    // Solo consideramos como conflicto turnos del mismo tipo.
    const bookedSlots = appointments.filter(
      (a) => a.date === dateStr && a.id !== appointment.id && (a.kind ?? 'service') === apptKind,
    );

    daySchedule.slots.forEach((slot) => {
      if (!slot.enabled) return;

      let currentTime = parse(slot.startTime, 'HH:mm', new Date());
      const endTime = parse(slot.endTime, 'HH:mm', new Date());

      // Allow start as long as there's at least 30 min of work time left, even if service overflows
      while (addMinutes(currentTime, 30) <= endTime) {
        const timeStr = format(currentTime, 'HH:mm');

        const slotDateTime = setMinutes(setHours(new Date(date), parseInt(timeStr.split(':')[0])), parseInt(timeStr.split(':')[1]));
        if (isBefore(slotDateTime, min24h)) {
          currentTime = addMinutes(currentTime, 30);
          continue;
        }

        const isBooked = bookedSlots.some((booked) => {
          const bookedStart = parse(booked.startTime, 'HH:mm', new Date());
          const bookedEnd = parse(booked.endTime, 'HH:mm', new Date());
          const slotEndTime = addMinutes(currentTime, duration);
          return (
            (currentTime >= bookedStart && currentTime < bookedEnd) ||
            (slotEndTime > bookedStart && slotEndTime <= bookedEnd) ||
            (currentTime <= bookedStart && slotEndTime >= bookedEnd)
          );
        });

        if (!isBooked) slots.push(timeStr);
        currentTime = addMinutes(currentTime, 30);
      }
    });

    return slots;
  };

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date < tomorrow) return true;

    const dateStr = format(date, 'yyyy-MM-dd');
    if (blockedDates.some((b) => b.date === dateStr)) return true;

    const dayOfWeek = date.getDay();
    const daySchedule = schedule.find((s) => s.dayOfWeek === dayOfWeek);
    return !daySchedule || daySchedule.slots.length === 0 || !daySchedule.slots.some((s) => s.enabled);
  };

  const handleReschedule = () => {
    if (!selectedDate || !selectedTime) return;

    const newDateStr = format(selectedDate, 'yyyy-MM-dd');
    const newEndTime = format(addMinutes(parse(selectedTime, 'HH:mm', new Date()), duration), 'HH:mm');

    // Guardamos datos viejos antes de mutar para usarlos en la notificación
    const oldDate = appointment.date;
    const oldStartTime = appointment.startTime;

    // Update atómico: mantenemos el mismo id en el backend
    rescheduleAppointment(appointment.id, {
      date: newDateStr,
      startTime: selectedTime,
      endTime: newEndTime,
    });

    // Notificación por email + WhatsApp (no bloquea). El backend decide canal.
    sendRescheduleNotification({
      clientName: appointment.clientName,
      clientEmail: appointment.clientEmail,
      clientPhone: appointment.clientPhone,
      serviceName: appointment.serviceName,
      oldDate,
      oldStartTime,
      date: newDateStr,
      startTime: selectedTime,
    });

    Swal.fire({
      icon: 'success',
      title: 'Turno reprogramado',
      text: `${appointment.clientName} → ${format(selectedDate, 'PPP', { locale: es })} ${selectedTime}`,
      confirmButtonColor: 'hsl(var(--primary))',
      timer: 2200,
      timerProgressBar: true,
    });

    setSelectedDate(undefined);
    setSelectedTime('');
    onOpenChange(false);
  };

  const availableSlots = selectedDate ? getAvailableSlots(selectedDate) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">Reprogramar Turno</DialogTitle>
          <DialogDescription>
            <span className="font-semibold text-primary">{appointment.serviceName}</span> — {appointment.clientName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              Nueva Fecha
            </Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                setSelectedTime('');
              }}
              disabled={isDateDisabled}
              locale={es}
              className="rounded-lg border border-border p-3 pointer-events-auto"
            />
          </div>

          {selectedDate && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Nuevo Horario
              </Label>
              {availableSlots.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {availableSlots.map((slot) => (
                    <Button
                      key={slot}
                      variant={selectedTime === slot ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedTime(slot)}
                      className="text-sm"
                    >
                      {slot}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No hay horarios disponibles para esta fecha.</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleReschedule} disabled={!selectedTime}>Reprogramar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
