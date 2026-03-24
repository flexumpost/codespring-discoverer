import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import TenantDashboard from "./TenantDashboard";

const TenantViewPage = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: tenant } = useQuery({
    queryKey: ["tenant-view-name", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("company_name").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });

  return (
    <AppLayout>
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/tenants/${id}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold text-muted-foreground">
          {t("tenantView.tenantView")}: {tenant?.company_name ?? "..."}
        </h2>
      </div>
      {id && <TenantDashboard overrideTenantId={id} />}
    </AppLayout>
  );
};

export default TenantViewPage;
