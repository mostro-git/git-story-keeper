import { useEffect, useState } from 'react';
import { useSearchParams, Link, useLocation } from 'react-router-dom';
import { CheckCircle2, Clock, XCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useStore } from '@/store/useStore';
import { fetchPaymentStatus } from '@/lib/payments';

type ReturnStatus = 'success' | 'pending' | 'failure';

interface Props {
  status: ReturnStatus;
}

export default function PaymentReturn({ status }: Props) {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { updateAppointmentPayment, appointments } = useStore();
  const [confirming, setConfirming] = useState(true);
  const [finalStatus, setFinalStatus] = useState<ReturnStatus>(status);

  // Mercado Pago devuelve estos query params: payment_id, status, external_reference
  const appointmentId = searchParams.get('external_reference') || '';
  const paymentId = searchParams.get('payment_id') || undefined;

  useEffect(() => {
    let cancelled = false;
    async function confirm() {
      if (!appointmentId) {
        setConfirming(false);
        return;
      }
      // Optimista: actualizamos según la URL de retorno
      if (status === 'success') {
        updateAppointmentPayment(appointmentId, {
          paymentStatus: 'paid',
          paymentId,
          pendingExpiresAt: undefined,
        });
      } else if (status === 'failure') {
        updateAppointmentPayment(appointmentId, { paymentStatus: 'failed' });
      }

      // Verificación real contra el backend (que ya recibió el webhook)
      try {
        const result = await fetchPaymentStatus(appointmentId);
        if (cancelled) return;
        if (result.status === 'paid') {
          updateAppointmentPayment(appointmentId, {
            paymentStatus: 'paid',
            paymentId: result.paymentId,
            pendingExpiresAt: undefined,
          });
          setFinalStatus('success');
        } else if (result.status === 'failed') {
          updateAppointmentPayment(appointmentId, { paymentStatus: 'failed' });
          setFinalStatus('failure');
        } else {
          setFinalStatus('pending');
        }
      } catch {
        // Si el backend no responde, dejamos lo que dice la URL
      } finally {
        if (!cancelled) setConfirming(false);
      }
    }
    confirm();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const appointment = appointments.find((a) => a.id === appointmentId);

  const config = {
    success: {
      icon: CheckCircle2,
      iconClass: 'text-green-600',
      title: '¡Pago confirmado!',
      message: 'Tu seña fue recibida y tu turno está reservado.',
    },
    pending: {
      icon: Clock,
      iconClass: 'text-amber-500',
      title: 'Pago pendiente',
      message:
        'Tu pago está siendo procesado. Te avisaremos por contacto cuando se confirme.',
    },
    failure: {
      icon: XCircle,
      iconClass: 'text-destructive',
      title: 'Pago rechazado',
      message:
        'No pudimos confirmar tu pago. El turno no fue reservado. Podés volver a intentarlo.',
    },
  }[finalStatus];

  const Icon = config.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="card-elevated max-w-md w-full">
        <CardContent className="p-8 text-center space-y-4">
          <Icon className={`w-16 h-16 mx-auto ${config.iconClass}`} />
          <h1 className="text-2xl font-display font-bold text-foreground">
            {config.title}
          </h1>
          <p className="text-muted-foreground">{config.message}</p>

          {appointment && finalStatus === 'success' && (
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-left space-y-1">
              <p>
                <strong>Servicio:</strong> {appointment.serviceName}
              </p>
              <p>
                <strong>Fecha:</strong> {appointment.date} {appointment.startTime}
              </p>
              <p>
                <strong>Seña pagada:</strong> $
                {appointment.depositAmount?.toLocaleString()}
              </p>
              <p>
                <strong>Resta abonar:</strong> $
                {(
                  (appointment.servicePrice || 0) -
                  (appointment.depositAmount || 0)
                ).toLocaleString()}{' '}
                en el local
              </p>
            </div>
          )}

          {confirming && (
            <p className="text-xs text-muted-foreground">
              Confirmando con el servidor...
            </p>
          )}

          <Button asChild variant="gradient" className="w-full mt-4">
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al inicio
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
