import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useStore } from '@/store/useStore';
import { Lock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import logo from '@/assets/logo.png';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useStore();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/admin/panel', { replace: true });
  }, [isAuthenticated, navigate]);

  if (isAuthenticated) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const ok = await login(password);
    setIsLoading(false);
    if (ok) {
      toast({ title: 'Bienvenido', description: 'Has iniciado sesión correctamente' });
      navigate('/admin/panel');
    } else {
      toast({ title: 'Error', description: 'Contraseña incorrecta', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background hero-gradient flex items-center justify-center p-4">
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

      <Card className="w-full max-w-md card-elevated animate-scale-in relative z-10">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <img
              src={logo}
              alt="Logo Meraki"
              className="w-full h-full object-cover scale-150"
            />
          </div>

          <CardTitle className="text-3xl font-display">Panel de Control</CardTitle>
          <CardDescription>Ingresá la contraseña para acceder al panel</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                required
              />
            </div>

            <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Button variant="link" onClick={() => navigate('/')}>
              Volver a la página principal
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}