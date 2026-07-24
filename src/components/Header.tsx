import { Link } from 'react-router-dom';
import logo from '@/assets/logo.png';

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-effect border-b border-border/50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <img
              src={logo}
              alt="Logo Meraki"
              className="w-full h-full object-cover scale-150"
            />
          </div>

          <span className="text-2xl font-display font-semibold text-foreground group-hover:text-primary transition-colors">
            Meraki Estética
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          <a
            href="#servicios"
            className="text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            Servicios
          </a>
          <a
            href="#contacto"
            className="text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            Contacto
          </a>
        </nav>
      </div>
    </header>
  );
}