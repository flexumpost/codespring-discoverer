import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import OperatorDashboard from "./OperatorDashboard";
import TenantDashboard from "./TenantDashboard";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {role === "operator" ? <OperatorDashboard /> : <TenantDashboard />}
    </AppLayout>
  );
};

export default Index;
