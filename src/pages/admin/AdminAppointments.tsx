import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarIcon, Clock, User, Phone, Mail, Trash2, CalendarClock, CheckCircle2, XCircle, Hourglass, DollarSign, Plus, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { RescheduleModal } from '@/components/RescheduleModal';
import { ManualBookingModal } from '@/components/ManualBookingModal';
import { Appointment, PaymentStatus } from '@/types';
import { sendCancellationNotification } from '@/lib/payments';

export default function AdminAppointments() {
  const { appointments, removeAppointment, cleanupExpiredPending } = useStore();
  const [rescheduleAppointment, setRescheduleAppointment] = useState<Appointment | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<'all' | PaymentStatus>('all');
  const [manualBookingOpen, setManualBookingOpen] = useState(false);

  // Limpia turnos pendientes vencidos al entrar y cada 60s
  useEffect(() => {
    cleanupExpiredPending();
    const interval = setInterval(cleanupExpiredPending, 60_000);
    return () => clearInterval(interval);
  }, [cleanupExpiredPending]);

  const handleCancel = (appointment: Appointment) => {
    removeAppointment(appointment.id);

    // Notificación por email + WhatsApp (no bloquea). El backend decide canal.
    sendCancellationNotification({
      clientName: appointment.clientName,
      clientEmail: appointment.clientEmail,
      clientPhone: appointment.clientPhone,
      serviceName: appointment.serviceName,
      date: appointment.date,
      startTime: appointment.startTime,
    });

    toast({
      title: 'Turno cancelado',
      description: `El turno de ${appointment.serviceName} ha sido cancelado y el horario quedó disponible`,
    });
  };

  const handleComplete = (id: string, serviceName: string) => {
    removeAppointment(id);
    toast({
      title: 'Turno marcado como realizado',
      description: `El turno de ${serviceName} fue archivado y los datos del cliente eliminados`,
    });
  };

  // Devuelve true si la fecha/hora de fin del turno ya pasó
  const isFinished = (a: Appointment) => {
    const end = new Date(`${a.date}T${a.endTime}:00`);
    return end.getTime() <= Date.now();
  };

  // Sort appointments by date and time
  const sortedAppointments = [...appointments].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.startTime.localeCompare(b.startTime);
  });

  // Filter by payment status
  const filteredAppointments =
    paymentFilter === 'all'
      ? sortedAppointments
      : sortedAppointments.filter(
          (a) => (a.paymentStatus || 'paid') === paymentFilter
        );

  // Group by upcoming and past
  const today = format(new Date(), 'yyyy-MM-dd');
  const upcomingAppointments = filteredAppointments.filter((a) => a.date >= today);
  const pastAppointments = filteredAppointments.filter((a) => a.date < today);

  // Stats (sobre todos, no filtrados)
  const paidCount = appointments.filter((a) => a.paymentStatus === 'paid').length;
  const pendingCount = appointments.filter((a) => a.paymentStatus === 'pending').length;
  const totalDeposits = appointments
    .filter((a) => a.paymentStatus === 'paid')
    .reduce((sum, a) => sum + (a.depositAmount || 0), 0);

  const renderPaymentBadge = (a: Appointment) => {
    const status = a.paymentStatus || 'paid'; // turnos viejos sin estado = paid
    if (status === 'paid') {
      return (
        <Badge className="bg-success text-success-foreground hover:bg-success/90 gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Pagado
        </Badge>
      );
    }
    if (status === 'pending') {
      return (
        <Badge variant="outline" className="border-warning text-warning gap-1">
          <Hourglass className="w-3 h-3" />
          Pendiente
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="w-3 h-3" />
        Fallido
      </Badge>
    );
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Turnos</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Visualiza y gestiona los turnos solicitados
          </p>
        </div>
        <Button variant="gradient" onClick={() => setManualBookingOpen(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-1" />
          Agregar turno manual
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="card-elevated">
          <CardContent className="p-4 md:p-6 flex items-center gap-3 md:gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-foreground">
                {appointments.filter(a => a.date >= today).length}
              </p>
              <p className="text-sm text-muted-foreground">Próximos</p>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4 md:p-6 flex items-center gap-3 md:gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-foreground">
                {paidCount}
              </p>
              <p className="text-sm text-muted-foreground">Señas pagadas</p>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4 md:p-6 flex items-center gap-3 md:gap-4">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
              <Hourglass className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-foreground">
                {pendingCount}
              </p>
              <p className="text-sm text-muted-foreground">Pendientes</p>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4 md:p-6 flex items-center gap-3 md:gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-foreground">
                ${totalDeposits.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Recaudado en señas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtro de pago */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Filtrar por pago:</span>
        <Select value={paymentFilter} onValueChange={(v) => setPaymentFilter(v as typeof paymentFilter)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="paid">Pagados</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="failed">Fallidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Upcoming Appointments */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="font-display text-xl">Turnos Próximos</CardTitle>
          <CardDescription>
            Turnos programados a partir de hoy
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingAppointments.length > 0 ? (
            <div className="overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Servicio</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Horario</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Pago</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingAppointments.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {appointment.serviceName}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(parseISO(appointment.date), 'PPP', { locale: es })}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {appointment.startTime} - {appointment.endTime}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{appointment.clientName}</TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground whitespace-nowrap">
                            <Phone className="w-3 h-3" />
                            {appointment.clientPhone}
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground whitespace-nowrap">
                            <Mail className="w-3 h-3" />
                            {appointment.clientEmail}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {renderPaymentBadge(appointment)}
                          {appointment.depositAmount && (
                            <p className="text-xs text-muted-foreground">
                              ${appointment.depositAmount.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRescheduleAppointment(appointment)}
                            title="Reprogramar"
                          >
                            <CalendarClock className="w-4 h-4" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={!isFinished(appointment)}
                                className="text-success hover:bg-success hover:text-success-foreground disabled:opacity-40"
                                title={isFinished(appointment) ? 'Marcar como realizado' : 'Disponible al finalizar el turno'}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Marcar como realizado?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Se archivará el turno de <strong>{appointment.clientName}</strong> para{' '}
                                  <strong>{appointment.serviceName}</strong> y se eliminarán sus datos personales.
                                  Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Volver</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleComplete(appointment.id, appointment.serviceName)}
                                >
                                  Confirmar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                title="Cancelar turno"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Cancelar este turno?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. El turno de{' '}
                                  <strong>{appointment.clientName}</strong> para{' '}
                                  <strong>{appointment.serviceName}</strong> será cancelado y el horario quedará disponible nuevamente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Volver</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => handleCancel(appointment)}
                                >
                                  Cancelar Turno
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <CalendarIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No hay turnos programados</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Appointments */}
      {pastAppointments.length > 0 && (
        <Card className="card-elevated opacity-75">
          <CardHeader>
            <CardTitle className="font-display text-xl text-muted-foreground">
              Turnos Pasados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Servicio</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Horario</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pastAppointments.map((appointment) => (
                    <TableRow key={appointment.id} className="text-muted-foreground">
                      <TableCell className="whitespace-nowrap">{appointment.serviceName}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(parseISO(appointment.date), 'PPP', { locale: es })}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {appointment.startTime} - {appointment.endTime}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{appointment.clientName}</TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-success hover:bg-success hover:text-success-foreground"
                              title="Marcar como realizado"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Marcar como realizado?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Se archivará el turno de <strong>{appointment.clientName}</strong> para{' '}
                                <strong>{appointment.serviceName}</strong> y se eliminarán sus datos personales.
                                Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Volver</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleComplete(appointment.id, appointment.serviceName)}
                              >
                                Confirmar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {rescheduleAppointment && (
        <RescheduleModal
          appointment={rescheduleAppointment}
          open={!!rescheduleAppointment}
          onOpenChange={(open) => { if (!open) setRescheduleAppointment(null); }}
        />
      )}

      <ManualBookingModal open={manualBookingOpen} onOpenChange={setManualBookingOpen} />
    </div>
  );
}
