import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';
import { Star, ArrowLeft, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { BookingModal } from '@/components/BookingModal';
import { SpecialService } from '@/types';
import { useAppointmentsSync } from '@/hooks/useAppointmentsSync';
import { useCatalogSync } from '@/hooks/useCatalogSync';

export default function SpecialCategoryPage() {
  const { id } = useParams<{ id: string }>();
  const { specialCategories, specialServices } = useStore();
  const [bookingSpecial, setBookingSpecial] = useState<SpecialService | null>(null);
  useAppointmentsSync();
  useCatalogSync();

  const isOrphan = id === 'sin-categoria';
  const category = isOrphan ? null : specialCategories.find((c) => c.id === id);
  const items = isOrphan
    ? specialServices.filter((s) => !s.categoryId || !specialCategories.some((c) => c.id === s.categoryId))
    : specialServices.filter((s) => s.categoryId === id);

  const title = isOrphan ? 'Otros Especiales' : (category?.name ?? 'Categoría no encontrada');

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="relative pt-28 pb-12 hero-gradient overflow-hidden">
        <div className="absolute top-10 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="container mx-auto px-4 relative z-10">
          <Button variant="ghost" asChild className="mb-6">
            <Link to="/#servicios">
              <ArrowLeft className="w-4 h-4 mr-2" /> Volver
            </Link>
          </Button>
          <div className="max-w-3xl space-y-4">
            <span className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
              <Star className="w-4 h-4" />
              Especiales
            </span>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground">{title}</h1>
            {category?.description && <p className="text-lg text-muted-foreground max-w-2xl">{category.description}</p>}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          {items.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {items.map((special) => (
                <div
                  key={special.id}
                  className="group relative overflow-hidden rounded-2xl card-elevated transition-all duration-500 hover:shadow-elevated hover:-translate-y-1 border border-primary/20"
                  style={{ minHeight: '340px' }}
                >
                  {special.imageUrl ? (
                    <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url(${special.imageUrl})` }} />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/30 to-transparent opacity-60 group-hover:opacity-70 transition-opacity duration-500" />
                  <div className="absolute top-4 left-4 z-10 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full flex items-center gap-1 font-medium">
                    <Star className="w-3 h-3" /> Especial
                  </div>
                  <div className="relative h-full flex flex-col justify-end p-6 text-primary-foreground">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-gold-shimmer" />
                        <h3 className="text-2xl font-display font-semibold">{special.name}</h3>
                      </div>
                      <p className="text-sm text-primary-foreground/80 line-clamp-2">{special.description}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{special.duration} min</span>
                        <span className="flex items-center gap-1">${special.price.toLocaleString()}</span>
                      </div>
                      {special.date && (
                        <div className="text-sm font-medium bg-primary/20 rounded-lg px-3 py-2 text-center">
                          📅 {(() => {
                            try {
                              const [y, m, d] = special.date!.split('-').map(Number);
                              return format(new Date(y, m - 1, d), 'PPP', { locale: es });
                            } catch { return special.date; }
                          })()}
                        </div>
                      )}
                      <Button variant="gradient" size="lg" className="w-full mt-4" onClick={() => setBookingSpecial(special)}>
                        Solicitar Turno
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No hay servicios disponibles en esta categoría.</p>
            </div>
          )}
        </div>
      </section>

      {bookingSpecial && (
        <BookingModal
          service={{
            id: bookingSpecial.id,
            name: bookingSpecial.name,
            description: bookingSpecial.description,
            duration: bookingSpecial.duration,
            price: bookingSpecial.price,
            imageUrl: bookingSpecial.imageUrl,
          }}
          open={!!bookingSpecial}
          onOpenChange={(open) => { if (!open) setBookingSpecial(null); }}
          fixedDate={bookingSpecial.date}
        />
      )}

      <Footer />
    </div>
  );
}
