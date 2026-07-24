import { Link, useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ServiceCard } from '@/components/ServiceCard';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { useAppointmentsSync } from '@/hooks/useAppointmentsSync';
import { useCatalogSync } from '@/hooks/useCatalogSync';

export default function SectionPage() {
  const { id } = useParams<{ id: string }>();
  const { sections, services } = useStore();
  useAppointmentsSync();
  useCatalogSync();

  const section = sections.find((s) => s.id === id);
  const sectionServices = services.filter((s) => s.sectionId === id);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="relative pt-28 pb-12 hero-gradient overflow-hidden">
        <div className="absolute top-10 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="container mx-auto px-4 relative z-10">
          <Button variant="ghost" asChild className="mb-6">
            <Link to="/#servicios">
              <ArrowLeft className="w-4 h-4 mr-2" /> Volver a secciones
            </Link>
          </Button>

          {section ? (
            <div className="max-w-3xl space-y-4">
              <span className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                {section.name}
              </span>
              <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground">
                {section.name}
              </h1>
              {section.description && (
                <p className="text-lg text-muted-foreground max-w-2xl">{section.description}</p>
              )}
            </div>
          ) : (
            <h1 className="text-3xl font-display font-bold">Sección no encontrada</h1>
          )}
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          {sectionServices.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {sectionServices.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No hay servicios disponibles en esta sección por el momento.
              </p>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
