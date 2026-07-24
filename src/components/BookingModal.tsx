import { useState } from 'react';
import { format, addMinutes, parse, isBefore, isAfter, setHours, setMinutes } from 'date-fns';
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
import { useStore } from '@/store/useStore';
import { Service, Appointment } from '@/types';
import { Clock, User, Phone, Mail, CalendarDays, CreditCard, Loader2, Tag } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Swal from 'sweetalert2';
import { calculateDeposit, createPaymentPreference } from '@/lib/payments';

interface BookingModalProps {
  service: Service;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fixedDate?: string; // YYYY-MM-DD - for special services with a fixed date
}

export function BookingModal({ service, open, onOpenChange, fixedDate }: BookingModalProps) {
  const { schedule, appointments, addAppointment, specialServices, blockedDates, promotions, services } = useStore();
  const isSpecialService = specialServices.some((s) => s.id === service.id);
  const appointmentKind: 'service' | 'special' = isSpecialService ? 'special' : 'service';
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    if (fixedDate) {
      const [y, m, d] = fixedDate.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return undefined;
  });
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
  });
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);


  // Promociones que incluyen este servicio (regular o especial)
  const matchingPromos = promotions.filter((p) =>
    p.items.some((it) => it.id === service.id),
  );
  const promoItemLabel = (item: { id: string; type: 'service' | 'special' }) => {
    if (item.type === 'special') {
      const sp = specialServices.find((x) => x.id === item.id);
      return sp ? sp.name : 'Servicio especial';
    }
    const sv = services.find((x) => x.id === item.id);
    return sv ? sv.name : 'Servicio';
  };

  const depositAmount = calculateDeposit(service.price);
  const remainingAmount = service.price - depositAmount;

  const getAvailableSlots = (date: Date): string[] => {
    if (!date) return [];

    const dayOfWeek = date.getDay();
    const daySchedule = schedule.find((s) => s.dayOfWeek === dayOfWeek);

    if (!daySchedule || daySchedule.slots.length === 0) return [];

    const slots: string[] = [];
    const dateStr = format(date, 'yyyy-MM-dd');
    const now = new Date();
    const min24h = addMinutes(now, 24 * 60);

    // Solo consideramos conflicto turnos del mismo tipo (regular vs especial).
    const bookedSlots = appointments.filter(
      (a) => a.date === dateStr && (a.kind ?? 'service') === appointmentKind,
    );

    daySchedule.slots.forEach((slot) => {
      if (!slot.enabled) return;

      let currentTime = parse(slot.startTime, 'HH:mm', new Date());
      const endTime = parse(slot.endTime, 'HH:mm', new Date());
      const serviceDuration = service.duration;

      while (addMinutes(currentTime, 30) <= endTime) {
        const timeStr = format(currentTime, 'HH:mm');

        const slotDateTime = setMinutes(
          setHours(new Date(date), parseInt(timeStr.split(':')[0])),
          parseInt(timeStr.split(':')[1])
        );

        if (isBefore(slotDateTime, min24h)) {
          currentTime = addMinutes(currentTime, 30);
          continue;
        }

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

        if (!isBooked) {
          slots.push(timeStr);
        }

        currentTime = addMinutes(currentTime, 30);
      }
    });

    return slots;
  };

  const handleSubmit = () => {
    if (!selectedDate || !selectedTime || !formData.name || !formData.phone) {
      Swal.fire({
        icon: 'warning',
        title: 'Faltan datos',
        text: 'Por favor complete los campos obligatorios.',
        confirmButtonColor: 'hsl(var(--primary))',
      });
      return;
    }

    setShowConfirmation(true);
  };

  const confirmBooking = async () => {
    const startTime = selectedTime;
    const endTime = format(
      addMinutes(parse(selectedTime, 'HH:mm', new Date()), service.duration),
      'HH:mm'
    );

    const appointmentId = Date.now().toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const appointment: Appointment = {
      id: appointmentId,
      serviceId: service.id,
      serviceName: service.name,
      clientName: formData.name,
      clientPhone: formData.phone,
      clientEmail: formData.email,
      date: format(selectedDate!, 'yyyy-MM-dd'),
      startTime,
      endTime,
      createdAt: new Date().toISOString(),
      paymentStatus: 'pending',
      depositAmount,
      servicePrice: service.price,
      pendingExpiresAt: expiresAt,
      kind: appointmentKind,
    };

    addAppointment(appointment);

    setProcessingPayment(true);
    try {
      const origin = window.location.origin;

      const { initPoint, preferenceId } = await createPaymentPreference({
        appointmentId,
        serviceName: service.name,
        depositAmount,
        clientName: formData.name,
        clientEmail: formData.email,
        clientPhone: formData.phone,
        date: appointment.date,
        startTime,
        successUrl: `${origin}/pago/exito`,
        pendingUrl: `${origin}/pago/pendiente`,
        failureUrl: `${origin}/pago/error`,
      });

      useStore
        .getState()
        .updateAppointmentPayment(appointmentId, { preferenceId });

      window.location.href = initPoint;
    } catch (err) {
      useStore.getState().removeAppointment(appointmentId);
      setProcessingPayment(false);

      Swal.fire({
        icon: 'error',
        title: 'Error al iniciar el pago',
        text:
          err instanceof Error
            ? err.message
            : 'No se pudo conectar con Mercado Pago. Intentá de nuevo.',
        confirmButtonColor: 'hsl(var(--primary))',
      });
    }
  };

  const availableSlots = selectedDate ? getAvailableSlots(selectedDate) : [];

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date < tomorrow) return true;

    const dateStr = format(date, 'yyyy-MM-dd');
    const isBlocked = blockedDates.some((b) => b.date === dateStr);
    if (isBlocked) return true;

    const dayOfWeek = date.getDay();

    const daySchedule = schedule.find((s) => s.dayOfWeek === dayOfWeek);
    return !daySchedule || daySchedule.slots.length === 0 || !daySchedule.slots.some(s => s.enabled);
  };

  return (
    <>
      <Dialog open={open && !showConfirmation} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display text-foreground">
              Solicitar Turno
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              <span className="font-semibold text-primary">{service.name}</span>
              <br />
              Duración: {service.duration} minutos • ${service.price.toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          {matchingPromos.length > 0 && (
            <div className="mt-4 space-y-3">
              {matchingPromos.map((promo) => (
                <div key={promo.id} className="rounded-lg border-2 border-primary/40 bg-primary/5 p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-foreground">{promo.name}</span>
                    </div>
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full">
                      -{promo.discountPercent}%
                    </span>
                  </div>
                  {promo.description && (
                    <p className="text-xs text-muted-foreground">{promo.description}</p>
                  )}
                  <div>
                    <p className="text-xs font-medium text-foreground mb-1">Incluye:</p>
                    <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                      {promo.items.map((it) => (
                        <li key={it.type + ':' + it.id}>
                          {promoItemLabel(it)}
                          {it.id === service.id && <span className="text-primary"> (este servicio)</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Nombre y Apellido
                </Label>
                <Input
                  id="name"
                  placeholder="Tu nombre completo"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  Número de Celular
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+54 9 11 1234-5678"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  Correo Electrónico <span className="text-muted-foreground text-xs">(opcional)</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            {fixedDate ? (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  Fecha del Servicio Especial
                </Label>
                <div className="text-sm font-medium bg-primary/10 rounded-lg px-3 py-2 text-center">
                  📅 {selectedDate && format(selectedDate, 'PPP', { locale: es })}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  Selecciona una Fecha
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

            {selectedDate && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Selecciona un Horario
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
                  <p className="text-muted-foreground text-sm">
                    No hay horarios disponibles para esta fecha.
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button variant="gradient" onClick={handleSubmit} disabled={!selectedTime}>
              Solicitar Turno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showConfirmation}
        onOpenChange={(o) => !processingPayment && setShowConfirmation(o)}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">
              Confirmar y pagar seña
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-4 text-foreground">
              <div className="space-y-1.5 text-sm">
                <p><strong>Servicio:</strong> {service.name}</p>
                <p><strong>Fecha:</strong> {selectedDate && format(selectedDate, 'PPP', { locale: es })}</p>
                <p><strong>Horario:</strong> {selectedTime} - {selectedTime && format(addMinutes(parse(selectedTime, 'HH:mm', new Date()), service.duration), 'HH:mm')}</p>
                <p><strong>Cliente:</strong> {formData.name}</p>
              </div>

              <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Precio total:</span>
                  <span className="font-medium">${service.price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-primary">
                  <span className="font-semibold">Seña a pagar ahora (50%):</span>
                  <span className="font-bold">${depositAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground text-xs pt-1 border-t border-border">
                  <span>Resta abonar en el local:</span>
                  <span>${remainingAmount.toLocaleString()}</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground pt-2">
                Serás redirigido a Mercado Pago. Tu turno queda reservado por 15 minutos
                mientras completás el pago.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmation(false)}
              disabled={processingPayment}
            >
              Volver
            </Button>
            <Button
              variant="gradient"
              onClick={confirmBooking}
              disabled={processingPayment}
            >
              {processingPayment ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Redirigiendo...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pagar ${depositAmount.toLocaleString()} con MP
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}