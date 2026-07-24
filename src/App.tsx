import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import Index from "./pages/Index";
import SectionPage from "./pages/SectionPage";
import SpecialCategoryPage from "./pages/SpecialCategoryPage";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/AdminLogin";
import AdminPanel from "./pages/AdminPanel";
import AdminServices from "./pages/admin/AdminServices";
import AdminSchedule from "./pages/admin/AdminSchedule";
import AdminAppointments from "./pages/admin/AdminAppointments";
import PaymentReturn from "./pages/PaymentReturn";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/seccion/:id" element={<SectionPage />} />
          <Route path="/especiales/:id" element={<SpecialCategoryPage />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/panel" element={<AdminPanel />}>
            <Route index element={<AdminServices />} />
            <Route path="horarios" element={<AdminSchedule />} />
            <Route path="turnos" element={<AdminAppointments />} />
          </Route>
          <Route path="/pago/exito" element={<PaymentReturn status="success" />} />
          <Route path="/pago/pendiente" element={<PaymentReturn status="pending" />} />
          <Route path="/pago/error" element={<PaymentReturn status="failure" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
