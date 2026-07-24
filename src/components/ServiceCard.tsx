import { useState } from 'react';
import { Service } from '@/types';
import { Button } from '@/components/ui/button';
import { Clock, DollarSign, Sparkles } from 'lucide-react';
import { BookingModal } from './BookingModal';

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  return (
    <>
      <div
        className="group relative overflow-hidden rounded-2xl card-elevated transition-all duration-500 hover:shadow-elevated hover:-translate-y-1"
        style={{
          minHeight: '320px',
        }}
      >
        {/* Background Image or Gradient */}
        {service.imageUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
            style={{ backgroundImage: `url(${service.imageUrl})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-rose-gold-light/30 via-cream to-dusty-rose/20" />
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/30 to-transparent opacity-60 group-hover:opacity-70 transition-opacity duration-500" />

        {/* Content */}
        <div className="relative h-full flex flex-col justify-end p-6 text-primary-foreground">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gold-shimmer" />
              <h3 className="text-2xl font-display font-semibold">{service.name}</h3>
            </div>

            <p className="text-sm text-primary-foreground/80 line-clamp-2">
              {service.description}
            </p>

            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {service.duration} min
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                ${service.price.toLocaleString()}
              </span>
            </div>

            <Button
              variant="gradient"
              size="lg"
              className="w-full mt-4"
              onClick={() => setIsBookingOpen(true)}
            >
              Solicitar Turno
            </Button>
          </div>
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
