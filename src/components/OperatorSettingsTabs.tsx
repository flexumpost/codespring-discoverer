import { useTranslation } from "react-i18next";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OperatorsList } from "@/components/OperatorsList";
import { PricingSettingsEditor } from "@/components/PricingSettingsEditor";
import { ClosedDaysCalendar } from "@/components/ClosedDaysCalendar";
import { EmailTemplatesEditor } from "@/components/EmailTemplatesEditor";
import { EmailLogTab } from "@/components/EmailLogTab";
import { LoginLogTab } from "@/components/LoginLogTab";
import { OfficeRnDSettingsTab } from "@/components/OfficeRnDSettingsTab";
import { PostageOverviewTab } from "@/components/PostageOverviewTab";

export function OperatorSettingsTabs() {
  const { t } = useTranslation();
  return (
    <Tabs defaultValue="operators">
      <TabsList className="flex-wrap">
        <TabsTrigger value="operators">{t("operatorSettings.operators", "Operatører")}</TabsTrigger>
        <TabsTrigger value="pricing">{t("operatorSettings.pricing", "Priser og betingelser")}</TabsTrigger>
        <TabsTrigger value="calendar">{t("operatorSettings.calendar", "Kalender")}</TabsTrigger>
        <TabsTrigger value="templates">{t("operatorSettings.templates", "Templates")}</TabsTrigger>
        <TabsTrigger value="email-log">{t("operatorSettings.emailLog", "Email Log")}</TabsTrigger>
        <TabsTrigger value="login-log">{t("operatorSettings.loginLog", "Login Log")}</TabsTrigger>
        <TabsTrigger value="officernd">OfficeRnD</TabsTrigger>
        <TabsTrigger value="postage">{t("operatorSettings.postage", "Porto")}</TabsTrigger>
      </TabsList>
      <TabsContent value="operators"><OperatorsList /></TabsContent>
      <TabsContent value="pricing"><PricingSettingsEditor /></TabsContent>
      <TabsContent value="calendar"><ClosedDaysCalendar /></TabsContent>
      <TabsContent value="templates"><EmailTemplatesEditor /></TabsContent>
      <TabsContent value="email-log"><EmailLogTab /></TabsContent>
      <TabsContent value="login-log"><LoginLogTab /></TabsContent>
      <TabsContent value="officernd"><OfficeRnDSettingsTab /></TabsContent>
      <TabsContent value="postage"><PostageOverviewTab /></TabsContent>
    </Tabs>
  );
}
