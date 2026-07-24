import { Heart, Instagram, Mail, MapPin } from 'lucide-react';
import logo from '@/assets/logo.png';

// Ícono oficial de WhatsApp (SVG inline) — Lucide no lo trae.
const WhatsAppIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.91-7.02zM12.05 20.15h-.01a8.23 8.23 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.21 8.21 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.23 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.16 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.74 2.66 4.22 3.73.59.25 1.05.41 1.41.52.59.19 1.13.16 1.55.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.17-.48-.29z"/>
  </svg>
);

export function Footer() {
  return (
    <footer id="contacto" className="bg-foreground text-primary-foreground py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <img
                  src={logo}
                  alt="Logo Meraki"
                  className="w-full h-full object-cover scale-150"
                />
              </div>

              <span className="text-2xl font-display font-semibold">
                Meraki Estética
              </span>
            </div>

            <p className="text-primary-foreground/70 text-sm">
              Tu espacio de belleza y bienestar. Ofrecemos tratamientos de alta calidad
              para que te sientas radiante.
            </p>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="text-lg font-display font-semibold">Contacto</h4>

            <div className="space-y-3 text-sm text-primary-foreground/70">
              <a
                href="https://wa.me/5492613820741"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-primary-foreground transition-colors"
              >
                <WhatsAppIcon className="w-4 h-4" />
                +54 9 261 382-0741
              </a>

              <a
                href="mailto:meraki05estetica@gmail.com"
                className="flex items-center gap-2 hover:text-primary-foreground transition-colors"
              >
                <Mail className="w-4 h-4" />
                meraki05estetica@gmail.com
              </a>

              <a
                href="https://maps.app.goo.gl/2MHSDsEM7bPoYga7A"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-primary-foreground transition-colors"
              >
                <MapPin className="w-4 h-4" />
                Alsina 2386 Luzuriaga Maipú MDZ
              </a>
            </div>
          </div>

          {/* Social */}
          <div className="space-y-4">
            <h4 className="text-lg font-display font-semibold">Síguenos</h4>

            <a
              href="https://instagram.com/meraki__estetica"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors"
            >
              <Instagram className="w-5 h-5" />
              @meraki__estetica
            </a>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-12 pt-8 text-center">
          <p className="text-primary-foreground/60 text-sm flex items-center justify-center gap-1">
            Hecho con <Heart className="w-4 h-4 text-destructive" /> © {new Date().getFullYear()} Meraki Estética
          </p>
        </div>
      </div>
    </footer>
  );
}