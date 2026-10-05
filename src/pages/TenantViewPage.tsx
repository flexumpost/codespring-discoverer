import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Eye, LayoutDashboard, Building2, Zap, Info } from "lucide-react";
import TenantDashboard from "./TenantDashboard";
import { AddressCard } from "./PartnerAddressesPage";
import { PartnerGroupAddresses, PartnerGroupAutomation } from "@/components/PartnerGroupAddresses";
import { AutomationCard } from "@/components/AutomationCard";
import { MailPricingCard, PackagePricingCard } from "@/components/PricingOverview";
import { TenantContactPersons } from "@/components/TenantContactPersons";

const TenantViewPage = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: tenant } = useQuery({
    queryKey: ["tenant-view", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*, tenant_types(name)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const typeName = tenant?.tenant_types?.name as string | undefined;
  const invalidate = [["tenant-view", id], ["tenant", id]];

  return (
    <AppLayout>
      <div className="flex items-center gap-3 mb-4 rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/tenants/${id}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Eye className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium">
          {t("tenantView.viewingAs", { name: tenant?.company_name ?? "…" })}
        </p>
      </div>

      {id && (
        <Tabs defaultValue="dashboard">
          <TabsList className="mb-4 flex-wrap h-auto">
            <TabsTrigger value="dashboard"><LayoutDashboard className="mr-2 h-4 w-4" />{t("nav.dashboard")}</TabsTrigger>
            <TabsTrigger value="addresses"><Building2 className="mr-2 h-4 w-4" />{t("nav.partnerAddresses")}</TabsTrigger>
            <TabsTrigger value="automation"><Zap className="mr-2 h-4 w-4" />{t("nav.automation")}</TabsTrigger>
            <TabsTrigger value="information"><Info className="mr-2 h-4 w-4" />{t("nav.information")}</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <TenantDashboard overrideTenantId={id} />
          </TabsContent>

          <TabsContent value="addresses">
            {tenant?.is_partner ? (
              <PartnerGroupAddresses tenantId={id} ownerId={tenant.user_id ?? null} />
            ) : (
              <div className="max-w-xl">{tenant && <AddressCard tenant={tenant} />}</div>
            )}
          </TabsContent>

          <TabsContent value="automation">
            {tenant?.is_partner ? (
              <PartnerGroupAutomation tenantId={id} ownerId={tenant.user_id ?? null} />
            ) : (
            <div className="max-w-5xl">
              {tenant && (
                <AutomationCard
                  tenantId={id}
                  currentMailAction={(tenant as any).default_mail_action ?? null}
 currentPackageAction={(tenant as any).default_package_action ?? null}
 currentMailPickupHour={(tenant as any).default_mail_pickup_hour ?? null}
 currentPackagePickupHour={(tenant as any).default_package_pickup_hour ?? null}
 currentMailPickupWeekday={(tenant as any).default_mail_pickup_weekday ?? 4}
 currentPackagePickupWeekday={(tenant as any).default_package_pickup_weekday ?? 4}
 tenantTypeName={typeName}
                  invalidateKeys={invalidate}
                />
              )}
            </div>
            )}
          </TabsContent>

          <TabsContent value="information">
            {tenant && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card>
                  <CardHeader><CardTitle className="text-base">{t("settings.company")}</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-muted-foreground text-xs">{t("settings.companyName")}</Label>
                      <p className="font-medium">{tenant.company_name}</p>
                    </div>
                    {typeName && (
                      <div>
                        <Label className="text-muted-foreground text-xs">{t("settings.tenantType")}</Label>
                        <p className="font-medium">{typeName}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-muted-foreground text-xs">{t("settings.contactPerson")}</Label>
                      <p className="font-medium">{[tenant.contact_first_name, tenant.contact_last_name].filter(Boolean).join(" ") || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">{t("settings.contactEmail")}</Label>
                      <p className="font-medium">{tenant.contact_email || "—"}</p>
                    </div>
                  </CardContent>
                  </Card>
                  <MailPricingCard tenantTypeName={typeName} tenant={tenant} />
                  <PackagePricingCard tenantTypeName={typeName} tenant={tenant} />
                </div>
                <div className="max-w-2xl">
                  <TenantContactPersons
                    tenantId={id}
                    ownerId={tenant.user_id ?? null}
                    primaryContact={{
                      firstName: tenant.contact_first_name ?? null,
                      lastName: tenant.contact_last_name ?? null,
                      email: tenant.contact_email ?? null,
                    }}
                  />
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </AppLayout>
  );
};

export default TenantViewPage;
