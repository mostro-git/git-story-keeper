import { useState } from 'react';
import { Service } from '@/types';
import { Button } from '@/components/ui/button';
import { Clock, DollarSign, Sparkles } from 'lucide-react';
import { BookingModal } from './BookingModal';
import { formatPriceARS } from '@/lib/price';

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  return (
    <>
      <div className="group relative overflow-hidden rounded-2xl card-elevated transition-all duration-500 hover:shadow-elevated hover:-translate-y-1 flex flex-col h-full">
        {/* Imagen (relación fija arriba) */}
        <div className="relative w-full aspect-[4/3] overflow-hidden">
          {service.imageUrl ? (
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
              style={{ backgroundImage: `url(${service.imageUrl})` }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-rose-gold-light/30 via-cream to-dusty-rose/20" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 via-transparent to-transparent" />
        </div>

        {/* Contenido: altura automática, texto centrado, sin cortes */}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-foreground">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="text-2xl font-display font-semibold">{service.name}</h3>
          </div>

          <p className="text-sm text-muted-foreground whitespace-pre-line break-words">
            {service.description}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {service.duration} min
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              {formatPriceARS(service.price)}
            </span>
          </div>

          <Button
            variant="gradient"
            size="lg"
            className="w-full mt-2"
            onClick={() => setIsBookingOpen(true)}
          >
            Solicitar Turno
          </Button>
        </div>
      </div>

      <BookingModal
        service={service}
        open={isBookingOpen}
        onOpenChange={setIsBookingOpen}
      />
    </>
  );
}
