import { useTranslation } from "react-i18next";
import { useTenants } from "@/hooks/useTenants";
import { AppLayout } from "@/components/AppLayout";
import { TenantSelector } from "@/components/TenantSelector";
import { AutomationCard } from "@/components/AutomationCard";

const AutomationPage = () => {
  const { t } = useTranslation();
  const { tenants, selectedTenant, selectedTenantId, setSelectedTenantId, isLoading } = useTenants();

  return (
    <AppLayout>
      <div className="mb-6">
        <TenantSelector
          tenants={tenants}
          selectedTenantId={selectedTenantId}
          onSelect={setSelectedTenantId}
        />
        <h2 className="text-2xl font-bold mt-4">{t("nav.automation")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("automation.description")}</p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : !selectedTenant ? (
        <p className="text-muted-foreground">{t("settings.noTenantProfile")}</p>
      ) : (
        <div className="max-w-xl">
          <AutomationCard
            tenantId={selectedTenant.id}
            currentMailAction={(selectedTenant as any).default_mail_action ?? null}
          />
        </div>
      )}
    </AppLayout>
  );
};

export default AutomationPage;
