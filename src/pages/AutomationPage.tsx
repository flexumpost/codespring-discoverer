import { useTranslation } from "react-i18next";
import { useTenants } from "@/hooks/useTenants";
import { AppLayout } from "@/components/AppLayout";
import { AutomationCard } from "@/components/AutomationCard";
import { hasMondayAndThursday } from "@/lib/tiers";

const cardProps = (x: any) => ({
  currentMailAction: x.default_mail_action ?? null,
  currentPackageAction: x.default_package_action ?? null,
  currentMailPickupHour: x.default_mail_pickup_hour ?? null,
  currentPackagePickupHour: x.default_package_pickup_hour ?? null,
  currentMailPickupWeekday: x.default_mail_pickup_weekday ?? 4,
  currentPackagePickupWeekday: x.default_package_pickup_weekday ?? 4,
});

const AutomationPage = () => {
  const { t } = useTranslation();
  const { tenants, selectedTenant, isLoading } = useTenants();
  const isPartner = tenants.some((x: any) => x.is_partner);
  const base: any = selectedTenant ?? tenants[0];
  // Shared set: Monday only if every company allows it
  const noMonday: any = tenants.find((x: any) => !hasMondayAndThursday(x.tenant_types?.name ?? null));
  const sharedTier = (noMonday ?? base)?.tenant_types?.name ?? null;

  return (
    <AppLayout>
      <div className="mb-6" data-tour="automation-page">
        <h2 className="text-2xl font-bold">{t("nav.automation")}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t("automation.description")}
          {!isPartner && tenants.length > 1 && ` ${t("automation.sharedNote")}`}
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : !base ? (
        <p className="text-muted-foreground">{t("settings.noTenantProfile")}</p>
      ) : isPartner ? (
        <div className="max-w-5xl space-y-10">
          {tenants.map((x: any) => (
            <AutomationCard
              key={x.id}
              tenantId={x.id}
              title={x.company_name}
              tenantTypeName={x.tenant_types?.name ?? null}
              {...cardProps(x)}
            />
          ))}
        </div>
      ) : (
        <div className="max-w-5xl">
          <AutomationCard
            tenantId={base.id}
            applyToTenantIds={tenants.map((x: any) => x.id)}
            tenantTypeName={sharedTier}
            {...cardProps(base)}
          />
        </div>
      )}
    </AppLayout>
  );
};

export default AutomationPage;
