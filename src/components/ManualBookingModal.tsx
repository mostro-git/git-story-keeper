import { useState } from 'react';
import { format, addMinutes, parse, isBefore, setHours, setMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStore } from '@/store/useStore';
import { Appointment } from '@/types';
import { Clock, User, Phone, Mail, CalendarDays, Sparkles, Plus, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Swal from 'sweetalert2';
import { sendManualConfirmationEmail } from '@/lib/payments';

interface ManualBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManualBookingModal({ open, onOpenChange }: ManualBookingModalProps) {
  const { services, schedule, appointments, addAppointment, blockedDates, specialServices } = useStore();
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
  const [submitting, setSubmitting] = useState(false);

  const selectedService =
    services.find((s) => s.id === selectedServiceId) ||
    specialServices.find((s) => s.id === selectedServiceId);
  const isSpecial = !!specialServices.find((s) => s.id === selectedServiceId);
  const appointmentKind: 'service' | 'special' = isSpecial ? 'special' : 'service';

  const resetForm = () => {
    setSelectedServiceId('');
    setSelectedDate(undefined);
    setSelectedTime('');
    setFormData({ name: '', phone: '', email: '' });
    setSubmitting(false);
  };

  const getAvailableSlots = (date: Date): string[] => {
    if (!date || !selectedService) return [];

    const dayOfWeek = date.getDay();
    const daySchedule = schedule.find((s) => s.dayOfWeek === dayOfWeek);
    if (!daySchedule || daySchedule.slots.length === 0) return [];

    const slots: string[] = [];
    const dateStr = format(date, 'yyyy-MM-dd');
    // Servicios regulares y especiales no se bloquean entre sí.
    const bookedSlots = appointments.filter(
      (a) => a.date === dateStr && (a.kind ?? 'service') === appointmentKind,
    );

    daySchedule.slots.forEach((slot) => {
      if (!slot.enabled) return;
      let currentTime = parse(slot.startTime, 'HH:mm', new Date());
      const endTime = parse(slot.endTime, 'HH:mm', new Date());
      const serviceDuration = selectedService.duration;

      while (addMinutes(currentTime, 30) <= endTime) {
        const timeStr = format(currentTime, 'HH:mm');

        const isBooked = bookedSlots.some((booked) => {
          const bookedStart = parse(booked.startTime, 'HH:mm', new Date());
          const bookedEnd = parse(booked.endTime, 'HH:mm', new Date());
          const slotStart = currentTime;
          const slotEndTime = addMinutes(currentTime, serviceDuration);
          return (
            (slotStart >= bookedStart && slotStart < bookedEnd) ||
            (slotEndTime > bookedStart && slotEndTime <= bookedEnd) ||
            (slotStart <= bookedStart && slotEndTime >= bookedEnd)
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
    if (date < today) return true;

    const dateStr = format(date, 'yyyy-MM-dd');
    if (blockedDates.some((b) => b.date === dateStr)) return true;

    const dayOfWeek = date.getDay();
    const daySchedule = schedule.find((s) => s.dayOfWeek === dayOfWeek);
    return !daySchedule || daySchedule.slots.length === 0 || !daySchedule.slots.some((s) => s.enabled);
  };

  const handleSubmit = async () => {
    if (!selectedService || !selectedDate || !selectedTime || !formData.name || !formData.phone) {
      Swal.fire({
        icon: 'warning',
        title: 'Faltan datos',
        text: 'Completá los campos obligatorios.',
        confirmButtonColor: 'hsl(var(--primary))',
      });
      return;
    }

    setSubmitting(true);
    try {
      const startTime = selectedTime;
      const endTime = format(
        addMinutes(parse(selectedTime, 'HH:mm', new Date()), selectedService.duration),
        'HH:mm'
      );

      const appointment: Appointment = {
        id: Date.now().toString(),
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        clientName: formData.name,
        clientPhone: formData.phone,
        clientEmail: formData.email,
        date: format(selectedDate, 'yyyy-MM-dd'),
        startTime,
        endTime,
        createdAt: new Date().toISOString(),
        paymentStatus: 'paid',
        depositAmount: 0,
        servicePrice: selectedService.price,
        kind: appointmentKind,
      };

      addAppointment(appointment);

      // Notificación por mail (Gmail) y/o WhatsApp/SMS (Twilio). No bloquea.
      sendManualConfirmationEmail({
        clientName: formData.name,
        clientEmail: formData.email,
        clientPhone: formData.phone,
        serviceName: selectedService.name,
        date: appointment.date,
        startTime,
      });

      await Swal.fire({
        icon: 'success',
        title: 'Turno agregado',
        text: `${selectedService.name} - ${format(selectedDate, 'PPP', { locale: es })} ${startTime}`,
        confirmButtonColor: 'hsl(var(--primary))',
        timer: 2200,
        timerProgressBar: true,
      });
      resetForm();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const availableSlots = selectedDate ? getAvailableSlots(selectedDate) : [];

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Agregar Turno Manual
          </DialogTitle>
          <DialogDescription>
            Crea un turno sin requerir pago de seña. Respeta los horarios y días configurados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Service */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Servicio
            </Label>
            <Select
              value={selectedServiceId}
              onValueChange={(v) => {
                setSelectedServiceId(v);
                setSelectedDate(undefined);
                setSelectedTime('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un servicio" />
              </SelectTrigger>
              <SelectContent>
                {services.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Servicios</div>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.duration} min - ${s.price.toLocaleString()})
                      </SelectItem>
                    ))}
                  </>
                )}
                {specialServices.length > 0 && (
                  <>
                    <div className="px-2 py-1 mt-1 text-xs font-semibold text-muted-foreground border-t border-border">Especiales</div>
                    {specialServices.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        ★ {s.name} ({s.duration} min - ${s.price.toLocaleString()})
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Client */}
          <div className="space-y-2">
            <Label htmlFor="m-name" className="flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Nombre y Apellido
            </Label>
            <Input
              id="m-name"
              placeholder="Nombre completo"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="m-phone" className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" />
              Celular
            </Label>
            <Input
              id="m-phone"
              type="tel"
              placeholder="+54 9 11 1234-5678"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="m-email" className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              Email <span className="text-muted-foreground text-xs">(opcional)</span>
            </Label>
            <Input
              id="m-email"
              type="email"
              placeholder="cliente@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          {/* Date */}
          {selectedService && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                Fecha
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
          )}

          {/* Time */}
          {selectedDate && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Horario
              </Label>
              {availableSlots.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {availableSlots.map((slot) => (
                    <Button
                      key={slot}
                      variant={selectedTime === slot ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedTime(slot)}
                    >
                      {slot}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No hay horarios disponibles.</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button variant="gradient" onClick={handleSubmit} disabled={!selectedTime || submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-1" />
                Agregar Turno
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
