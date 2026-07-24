import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { TimeSlot } from '@/types';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { es } from 'date-fns/locale';
import { format, addDays } from 'date-fns';
import { CalendarOff, Trash2 } from 'lucide-react';

const DAYS = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

// Generate time slots in 30 min intervals
const generateTimeOptions = () => {
  const times: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      times.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }
  return times;
};

const TIME_OPTIONS = generateTimeOptions();

export default function AdminSchedule() {
  const { schedule, updateDaySchedule, blockedDates, addBlockedDate, removeBlockedDate, appointments, removeAppointment, addAppointment } = useStore();
  const [blockDate, setBlockDate] = useState<Date | undefined>();
  const [blockReason, setBlockReason] = useState('');

  const handleToggleDay = (dayOfWeek: number, enabled: boolean) => {
    const daySchedule = schedule.find((s) => s.dayOfWeek === dayOfWeek);
    if (!daySchedule) return;

    if (enabled) {
      // Enable with default hours
      updateDaySchedule(dayOfWeek, [{ startTime: '09:00', endTime: '13:00', enabled: true }]);
    } else {
      // Disable
      updateDaySchedule(dayOfWeek, []);
    }

    toast({
      title: enabled ? 'Día habilitado' : 'Día deshabilitado',
      description: `${DAYS[dayOfWeek]} ha sido ${enabled ? 'habilitado' : 'deshabilitado'}`,
    });
  };

  const handleTimeChange = (
    dayOfWeek: number,
    slotIndex: number,
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    const daySchedule = schedule.find((s) => s.dayOfWeek === dayOfWeek);
    if (!daySchedule || daySchedule.slots.length === 0) return;

    const updatedSlots = daySchedule.slots.map((slot, index) => {
      if (index === slotIndex) {
        return { ...slot, [field]: value };
      }
      return slot;
    });

    updateDaySchedule(dayOfWeek, updatedSlots);
  };

  const handleAddSecondSlot = (dayOfWeek: number) => {
    const daySchedule = schedule.find((s) => s.dayOfWeek === dayOfWeek);
    if (!daySchedule || daySchedule.slots.length === 0) return;

    const updatedSlots = [
      ...daySchedule.slots,
      { startTime: '15:00', endTime: '18:00', enabled: true }
    ];

    updateDaySchedule(dayOfWeek, updatedSlots);

    toast({
      title: 'Franja horaria agregada',
      description: `Se agregó una segunda franja horaria para ${DAYS[dayOfWeek]}`,
    });
  };

  const handleRemoveSlot = (dayOfWeek: number, slotIndex: number) => {
    const daySchedule = schedule.find((s) => s.dayOfWeek === dayOfWeek);
    if (!daySchedule || daySchedule.slots.length <= 1) return;

    const updatedSlots = daySchedule.slots.filter((_, index) => index !== slotIndex);
    updateDaySchedule(dayOfWeek, updatedSlots);

    toast({
      title: 'Franja horaria eliminada',
      description: `Se eliminó una franja horaria de ${DAYS[dayOfWeek]}`,
    });
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Horarios</h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          Configura los días y horarios disponibles para solicitar turnos
        </p>
      </div>

      <div className="grid gap-4">
        {schedule.map((daySchedule) => {
          const isEnabled = daySchedule.slots.length > 0 && daySchedule.slots.some(s => s.enabled);

          return (
            <Card key={daySchedule.id} className="card-elevated">
              <CardContent className="p-4 md:p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) =>
                          handleToggleDay(daySchedule.dayOfWeek, checked)
                        }
                      />
                      <Label className="text-lg font-display font-semibold min-w-[120px]">
                        {DAYS[daySchedule.dayOfWeek]}
                      </Label>
                    </div>

                    {!isEnabled && (
                      <span className="text-muted-foreground text-sm">Cerrado</span>
                    )}
                  </div>

                  {isEnabled && (
                    <div className="space-y-3 sm:pl-12">
                      {daySchedule.slots.map((slot, slotIndex) => (
                        <div key={slotIndex} className="flex items-center gap-4 flex-wrap">
                          <span className="text-sm text-muted-foreground font-medium min-w-[70px]">
                            Franja {slotIndex + 1}:
                          </span>
                          <div className="flex items-center gap-2">
                            <Label className="text-sm text-muted-foreground">Desde</Label>
                            <Select
                              value={slot.startTime}
                              onValueChange={(value) =>
                                handleTimeChange(daySchedule.dayOfWeek, slotIndex, 'startTime', value)
                              }
                            >
                              <SelectTrigger className="w-[100px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="max-h-[200px]">
                                {TIME_OPTIONS.map((time) => (
                                  <SelectItem key={time} value={time}>
                                    {time}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-center gap-2">
                            <Label className="text-sm text-muted-foreground">Hasta</Label>
                            <Select
                              value={slot.endTime}
                              onValueChange={(value) =>
                                handleTimeChange(daySchedule.dayOfWeek, slotIndex, 'endTime', value)
                              }
                            >
                              <SelectTrigger className="w-[100px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="max-h-[200px]">
                                {TIME_OPTIONS.map((time) => (
                                  <SelectItem key={time} value={time}>
                                    {time}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {daySchedule.slots.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => handleRemoveSlot(daySchedule.dayOfWeek, slotIndex)}
                            >
                              Eliminar
                            </Button>
                          )}
                        </div>
                      ))}

                      {daySchedule.slots.length < 2 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddSecondSlot(daySchedule.dayOfWeek)}
                        >
                          + Agregar segunda franja horaria
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-muted/50 border-dashed">
        <CardHeader>
          <CardTitle className="text-lg font-display">💡 Consejo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Puedes configurar hasta dos franjas horarias por día (ej: 9:00-13:00 y 15:00-18:00).
            Los turnos se ofrecen en intervalos de 30 minutos dentro del horario configurado.
          </p>
        </CardContent>
      </Card>

      {/* Blocked Dates Section */}
      <div className="pt-4">
        <h2 className="text-xl md:text-2xl font-display font-bold text-foreground mb-1">Pausar Atención (Feriados / Días No Laborales)</h2>
        <p className="text-muted-foreground mb-4 text-sm">
          Selecciona en el calendario los días que no habrá atención (feriados, días festivos, no laborales, etc.). Los turnos existentes se reprogramarán al día siguiente disponible.
        </p>

        <Card className="card-elevated">
          <CardContent className="p-4 md:p-6 space-y-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="space-y-2 flex-1">
                <Label className="flex items-center gap-2">
                  <CalendarOff className="w-4 h-4 text-destructive" />
                  Seleccionar Fecha a Bloquear
                </Label>
                <Calendar
                  mode="single"
                  selected={blockDate}
                  onSelect={setBlockDate}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today;
                  }}
                  locale={es}
                  className="rounded-lg border border-border p-3 pointer-events-auto"
                />
              </div>
              <div className="space-y-4 flex-1">
                <div className="space-y-2">
                  <Label>Motivo (opcional)</Label>
                  <Input
                    placeholder="Ej: Feriado nacional, Día festivo..."
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                  />
                </div>
                {blockDate && (
                  <div className="text-sm bg-destructive/10 text-destructive rounded-lg p-3">
                    Se bloqueará el <strong>{format(blockDate, 'PPP', { locale: es })}</strong>.
                    Los turnos existentes se moverán al día siguiente disponible.
                  </div>
                )}
                <Button
                  variant="destructive"
                  disabled={!blockDate}
                  onClick={() => {
                    if (!blockDate) return;
                    const dateStr = format(blockDate, 'yyyy-MM-dd');

                    // Check if already blocked
                    if (blockedDates.some((b) => b.date === dateStr)) {
                      toast({ title: 'Error', description: 'Esta fecha ya está bloqueada', variant: 'destructive' });
                      return;
                    }

                    // Reschedule appointments on this date
                    const affectedAppointments = appointments.filter((a) => a.date === dateStr);
                    
                    if (affectedAppointments.length > 0) {
                      // Find next available day (not blocked, not a special service day, and has schedule)
                      let nextDate = addDays(blockDate, 1);
                      const allBlockedDates = [...blockedDates.map(b => b.date), dateStr];
                      
                      const findNextAvailable = () => {
                        for (let i = 0; i < 30; i++) {
                          const nextStr = format(nextDate, 'yyyy-MM-dd');
                          const dayOfWeek = nextDate.getDay();
                          const daySchedule = schedule.find((s) => s.dayOfWeek === dayOfWeek);
                          const hasSchedule = daySchedule && daySchedule.slots.length > 0 && daySchedule.slots.some(s => s.enabled);
                          const isBlocked = allBlockedDates.includes(nextStr);
                          
                          if (hasSchedule && !isBlocked) return nextStr;
                          nextDate = addDays(nextDate, 1);
                        }
                        return null;
                      };

                      const nextAvailable = findNextAvailable();

                      if (nextAvailable) {
                        affectedAppointments.forEach((appt) => {
                          removeAppointment(appt.id);
                          addAppointment({ ...appt, date: nextAvailable, id: Date.now().toString() + Math.random().toString(36).slice(2) });
                        });
                        toast({
                          title: 'Turnos reprogramados',
                          description: `${affectedAppointments.length} turno(s) movidos al ${format(new Date(nextAvailable + 'T12:00:00'), 'PPP', { locale: es })}`,
                        });
                      }
                    }

                    addBlockedDate({ date: dateStr, reason: blockReason || undefined });
                    setBlockDate(undefined);
                    setBlockReason('');

                    toast({
                      title: 'Día bloqueado',
                      description: `El ${format(new Date(dateStr + 'T12:00:00'), 'PPP', { locale: es })} ha sido cerrado`,
                    });
                  }}
                >
                  <CalendarOff className="w-4 h-4 mr-2" />
                  Bloquear Día
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* List of blocked dates */}
        {blockedDates.length > 0 && (
          <Card className="card-elevated mt-4">
            <CardHeader>
              <CardTitle className="text-lg font-display">Días Bloqueados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {blockedDates
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((blocked) => (
                  <div
                    key={blocked.date}
                    className="flex items-center justify-between bg-destructive/5 border border-destructive/20 rounded-lg px-4 py-3"
                  >
                    <div>
                      <span className="font-medium">
                        {format(new Date(blocked.date + 'T12:00:00'), 'PPP', { locale: es })}
                      </span>
                      {blocked.reason && (
                        <span className="text-muted-foreground text-sm ml-2">— {blocked.reason}</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        removeBlockedDate(blocked.date);
                        toast({
                          title: 'Día desbloqueado',
                          description: `El día ha sido habilitado nuevamente`,
                        });
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}