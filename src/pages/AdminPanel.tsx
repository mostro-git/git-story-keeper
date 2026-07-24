import { useEffect, useState } from 'react';
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { LayoutGrid, Clock, Calendar, LogOut, Home, Menu } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAppointmentsSync } from '@/hooks/useAppointmentsSync';
import { useCatalogSync } from '@/hooks/useCatalogSync';
import logo from '@/assets/logo.png';

export default function AdminPanel() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Sincroniza turnos del backend cada 15s y al volver a la pestaña.
  useAppointmentsSync();
  useCatalogSync();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin');
    }
  }, [isAuthenticated, navigate]);

  // Cierra el drawer al navegar
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    logout();
    toast({
      title: 'Sesión cerrada',
      description: 'Has cerrado sesión correctamente',
    });
    navigate('/admin');
  };

  const navItems = [
    { path: '/admin/panel', icon: LayoutGrid, label: 'Servicios' },
    { path: '/admin/panel/horarios', icon: Clock, label: 'Horarios' },
    { path: '/admin/panel/turnos', icon: Calendar, label: 'Turnos' },
  ];

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <img
              src={logo}
              alt="Logo Meraki"
              className="w-full h-full object-cover scale-150"
            />
          </div>

          <div>
            <h1 className="font-display font-semibold text-foreground">Panel Admin</h1>
            <p className="text-xs text-muted-foreground">Gestión de estética</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              location.pathname === item.path
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-border space-y-2">
        <Link
          to="/"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Home className="w-5 h-5" />
          Ver Página Web
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          Cerrar Sesión
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between border-b border-border bg-card px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <img
              src={logo}
              alt="Logo Meraki"
              className="w-full h-full object-cover scale-150"
            />
          </div>

          <span className="font-display font-semibold text-foreground">Panel Admin</span>
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Abrir menú">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 flex flex-col">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-card border-r border-border flex-col">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}