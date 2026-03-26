import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { TenantProvider } from "@/hooks/useTenants";
import Index from "./pages/Index";
import Login from "./pages/Login";

import BulkUploadPage from "./pages/BulkUploadPage";
import NotificationsPage from "./pages/NotificationsPage";
import SettingsPage from "./pages/SettingsPage";
import ShippingAddressPage from "./pages/ShippingAddressPage";
import TenantsPage from "./pages/TenantsPage";
import TenantDetailPage from "./pages/TenantDetailPage";
import ShippingPrepPage from "./pages/ShippingPrepPage";
import TenantViewPage from "./pages/TenantViewPage";
import SetPasswordPage from "./pages/SetPasswordPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: "operator" | "tenant" }) {
  const { session, role, loading } = useAuth();

  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (requiredRole && role !== requiredRole) return <Navigate to="/" replace />;

  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route
      path="/"
      element={
        <ProtectedRoute>
          <Index />
        </ProtectedRoute>
      }
    />
    <Route
      path="/bulk-upload"
      element={
        <ProtectedRoute requiredRole="operator">
          <BulkUploadPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/notifications"
      element={
        <ProtectedRoute>
          <NotificationsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/shipping-address"
      element={
        <ProtectedRoute>
          <ShippingAddressPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/settings"
      element={
        <ProtectedRoute>
          <SettingsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/shipping-prep"
      element={
        <ProtectedRoute requiredRole="operator">
          <ShippingPrepPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/tenants"
      element={
        <ProtectedRoute requiredRole="operator">
          <TenantsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/tenants/:id"
      element={
        <ProtectedRoute requiredRole="operator">
          <TenantDetailPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/tenants/:id/dashboard"
      element={
        <ProtectedRoute>
          <TenantViewPage />
        </ProtectedRoute>
      }
    />
    <Route path="/set-password" element={<SetPasswordPage />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <TenantProvider>
            <AppRoutes />
          </TenantProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
