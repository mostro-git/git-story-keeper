import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';
import { Sparkles, Star, Clock, Award, Tag } from 'lucide-react';
import { useAppointmentsSync } from '@/hooks/useAppointmentsSync';
import { useCatalogSync } from '@/hooks/useCatalogSync';

// Número de WhatsApp por defecto (mismo que el del Footer)
const DEFAULT_WHATSAPP = '5492613820741';

// Ícono oficial de WhatsApp (Lucide no lo trae).
const WhatsAppIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.91-7.02zM12.05 20.15h-.01a8.23 8.23 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.21 8.21 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.23 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.16 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.74 2.66 4.22 3.73.59.25 1.05.41 1.41.52.59.19 1.13.16 1.55.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.17-.48-.29z"/>
  </svg>
);

const Index = () => {
  const { sections, specialCategories, specialServices, promotions, uniqueServices } = useStore();
  useAppointmentsSync();
  useCatalogSync();

  // Categorías especiales: las que están creadas + agrupar especiales sin categoría como "Sin categoría"
  const specialsByCategory = (catId: string) => specialServices.filter((s) => s.categoryId === catId);
  const orphanSpecials = specialServices.filter(
    (s) => !s.categoryId || !specialCategories.some((c) => c.id === s.categoryId),
  );
  const hasAnyContent =
    sections.length > 0 ||
    specialServices.length > 0 ||
    promotions.length > 0 ||
    uniqueServices.length > 0 ||
    specialCategories.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative min-h-[70vh] flex items-center justify-center hero-gradient overflow-hidden pt-20">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="container mx-auto px-4 py-20 text-center relative z-10">
          <div className="animate-fade-in space-y-6 max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-display font-bold text-foreground">
              Meraki Estética
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Tratamientos personalizados de alta calidad para realzar tu belleza natural.
              Reserva tu turno y déjate consentir.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
              <Button variant="gradient" size="xl" asChild>
                <a href="#servicios">Ver Servicios</a>
              </Button>
              <Button variant="elegant" size="xl" asChild>
                <a href="#contacto">Contactar</a>
              </Button>
            </div>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-muted-foreground/50 rounded-full" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 bg-card">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-4 p-6">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center"><Star className="w-8 h-8 text-primary" /></div>
              <h3 className="text-xl font-display font-semibold text-foreground">Calidad Premium</h3>
              <p className="text-muted-foreground">Utilizamos productos de primera calidad para garantizar los mejores resultados.</p>
            </div>
            <div className="text-center space-y-4 p-6">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center"><Clock className="w-8 h-8 text-primary" /></div>
              <h3 className="text-xl font-display font-semibold text-foreground">Reserva Fácil</h3>
              <p className="text-muted-foreground">Sistema de turnos online para que reserves desde la comodidad de tu hogar.</p>
            </div>
            <div className="text-center space-y-4 p-6">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center"><Award className="w-8 h-8 text-primary" /></div>
              <h3 className="text-xl font-display font-semibold text-foreground">Profesionales</h3>
              <p className="text-muted-foreground">Equipo altamente capacitado y con años de experiencia en el rubro.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Servicios + Promos + Especiales */}
      <section id="servicios" className="py-20 bg-background">
        <div className="container mx-auto px-4 space-y-20">
          <div className="text-center space-y-4">
            <h2 className="text-5xl md:text-7xl font-display font-bold text-foreground">
              Nuestros Servicios
            </h2>
          </div>

          {/* PROMOCIONES (arriba de secciones) */}
          {promotions.length > 0 && (
            <div className="space-y-8">
              <div className="text-center space-y-3">
                <span className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
                  <Tag className="w-4 h-4" />
                  Promociones
                </span>
                <h3 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                  Aprovechá nuestras promos
                </h3>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {promotions.map((promo) => (
                  <div
                    key={promo.id}
                    className="group relative overflow-hidden rounded-2xl card-elevated transition-all duration-500 hover:shadow-elevated hover:-translate-y-1 border-2 border-primary/40"
                    style={{ minHeight: '300px' }}
                  >
                    {promo.imageUrl ? (
                      <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url(${promo.imageUrl})` }} />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/20 to-primary/10" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/30 to-transparent opacity-70" />
                    <div className="absolute top-4 right-4 z-10 bg-primary text-primary-foreground text-base px-4 py-1.5 rounded-full font-bold shadow-lg">
                      -{promo.discountPercent}%
                    </div>
                    <div className="relative h-full flex flex-col justify-center items-center text-center p-6 text-primary-foreground">
                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-2">
                          <Tag className="w-5 h-5 text-gold-shimmer" />
                          <h3 className="text-2xl font-display font-semibold">{promo.name}</h3>
                        </div>
                        <p className="text-sm text-primary-foreground/90 line-clamp-3">{promo.description}</p>
                        <p className="text-xs text-primary-foreground/70">
                          {promo.items.length} servicio{promo.items.length === 1 ? '' : 's'} incluido{promo.items.length === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GRID 3 COLUMNAS: Secciones | Especiales | Únicos */}
          {(sections.length > 0 || specialCategories.length > 0 || orphanSpecials.length > 0 || uniqueServices.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-start">
              {/* COLUMNA 1 — SECCIONES */}
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <span className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
                    <Sparkles className="w-4 h-4" />
                    Secciones
                  </span>
                </div>
                {sections.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground">Sin secciones todavía.</p>
                )}
                {sections.map((section) => (
                  <Link
                    key={section.id}
                    to={`/seccion/${section.id}`}
                    className="group block"
                  >
                    <div
                      className="relative overflow-hidden rounded-2xl card-elevated transition-all duration-500 group-hover:shadow-elevated group-hover:-translate-y-1"
                      style={{ minHeight: '260px' }}
                    >
                      {section.imageUrl ? (
                        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url(${section.imageUrl})` }} />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-rose-gold-light/30 via-cream to-dusty-rose/20" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/30 to-transparent opacity-60 group-hover:opacity-70 transition-opacity duration-500" />
                      <div className="relative h-full min-h-[260px] flex items-center justify-center p-6 text-primary-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Sparkles className="w-5 h-5 text-gold-shimmer" />
                          <h3 className="text-2xl font-display font-semibold">{section.name}</h3>
                        </div>
                      </div>
                    </div>
                    <Button variant="gradient" size="lg" className="w-full mt-4 pointer-events-none">
                      Ver Servicios
                    </Button>
                  </Link>
                ))}
              </div>

              {/* COLUMNA 2 — ESPECIALES */}
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <span className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
                    <Star className="w-4 h-4" />
                    Especiales
                  </span>
                </div>
                {specialCategories.length === 0 && orphanSpecials.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground">Sin especiales todavía.</p>
                )}
                {specialCategories.map((cat) => (
                  <Link
                    key={cat.id}
                    to={`/especiales/${cat.id}`}
                    className="group relative overflow-hidden rounded-2xl card-elevated transition-all duration-500 hover:shadow-elevated hover:-translate-y-1 block border border-primary/20"
                    style={{ minHeight: '320px' }}
                  >
                    {cat.imageUrl ? (
                      <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url(${cat.imageUrl})` }} />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/30 to-transparent opacity-60 group-hover:opacity-70 transition-opacity duration-500" />
                    <div className="absolute top-4 left-4 z-10 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full flex items-center gap-1 font-medium">
                      <Star className="w-3 h-3" /> Especial
                    </div>
                    <div className="relative h-full flex flex-col justify-between items-center text-center p-6 text-primary-foreground">
                      <div className="flex-1 flex flex-col items-center justify-center gap-2">
                        <div className="flex items-center justify-center gap-2">
                          <Star className="w-5 h-5 text-gold-shimmer" />
                          <h3 className="text-2xl font-display font-semibold">{cat.name}</h3>
                        </div>
                        <p className="text-xs text-primary-foreground/70">
                          {specialsByCategory(cat.id).length} servicio{specialsByCategory(cat.id).length === 1 ? '' : 's'}
                        </p>
                      </div>
                      <Button variant="gradient" size="lg" className="w-full mt-4 pointer-events-none">
                        Ver Especiales
                      </Button>
                    </div>
                  </Link>
                ))}
                {orphanSpecials.length > 0 && (
                  <Link
                    to={`/especiales/sin-categoria`}
                    className="group relative overflow-hidden rounded-2xl card-elevated transition-all duration-500 hover:shadow-elevated hover:-translate-y-1 block border border-primary/20"
                    style={{ minHeight: '320px' }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5" />
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/30 to-transparent opacity-60" />
                    <div className="relative h-full flex flex-col justify-between items-center text-center p-6 text-primary-foreground">
                      <div className="flex-1 flex flex-col items-center justify-center gap-2">
                        <div className="flex items-center justify-center gap-2">
                          <Star className="w-5 h-5 text-gold-shimmer" />
                          <h3 className="text-2xl font-display font-semibold">Otros Especiales</h3>
                        </div>
                        <p className="text-xs text-primary-foreground/70">
                          {orphanSpecials.length} servicio{orphanSpecials.length === 1 ? '' : 's'}
                        </p>
                      </div>
                      <Button variant="gradient" size="lg" className="w-full mt-4 pointer-events-none">Ver</Button>
                    </div>
                  </Link>
                )}
              </div>

              {/* COLUMNA 3 — ÚNICOS (WhatsApp directo) */}
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <span className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
                    <WhatsAppIcon className="w-4 h-4" />
                    Únicos
                  </span>
                </div>
                {uniqueServices.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground">Sin servicios únicos todavía.</p>
                )}
                {uniqueServices.map((u) => {
                  const phone = (u.phone || DEFAULT_WHATSAPP).replace(/\D/g, '');
                  const text = encodeURIComponent(`Hola! Quiero solicitar turno: ${u.name}`);
                  const href = `https://wa.me/${phone}?text=${text}`;
                  return (
                    <a
                      key={u.id}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative overflow-hidden rounded-2xl card-elevated transition-all duration-500 hover:shadow-elevated hover:-translate-y-1 block border border-emerald-500/30"
                      style={{ minHeight: '320px' }}
                    >
                      {u.imageUrl ? (
                        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url(${u.imageUrl})` }} />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-teal-400/10 to-emerald-300/5" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/30 to-transparent opacity-65 group-hover:opacity-75 transition-opacity duration-500" />
                      <div className="absolute top-4 left-4 z-10 bg-emerald-600 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1 font-medium">
                        <WhatsAppIcon className="w-3 h-3" /> Único
                      </div>
                      <div className="relative h-full flex flex-col justify-between items-center text-center p-6 text-primary-foreground">
                        <div className="flex-1 flex flex-col items-center justify-center gap-2">
                          <div className="flex items-center justify-center gap-2">
                            <WhatsAppIcon className="w-5 h-5 text-emerald-300" />
                            <h3 className="text-2xl font-display font-semibold">{u.name}</h3>
                          </div>
                          <p className="text-xs text-emerald-200 font-medium">
                            ↓ Solicitá tu turno por WhatsApp
                          </p>
                        </div>
                        <Button
                          size="lg"
                          className="w-full mt-4 pointer-events-none bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <WhatsAppIcon className="w-5 h-5 mr-2" />
                          Solicitar por WhatsApp
                        </Button>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {!hasAnyContent && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No hay servicios disponibles en este momento.</p>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
