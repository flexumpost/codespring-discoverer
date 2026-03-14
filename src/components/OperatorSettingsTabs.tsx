import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OperatorsList } from "@/components/OperatorsList";
import { PricingSettingsEditor } from "@/components/PricingSettingsEditor";
import { ClosedDaysCalendar } from "@/components/ClosedDaysCalendar";
import { EmailTemplatesEditor } from "@/components/EmailTemplatesEditor";

export function OperatorSettingsTabs() {
  return (
    <Tabs defaultValue="operators">
      <TabsList>
        <TabsTrigger value="operators">Operatører</TabsTrigger>
        <TabsTrigger value="pricing">Priser og betingelser</TabsTrigger>
        <TabsTrigger value="calendar">Kalender</TabsTrigger>
        <TabsTrigger value="templates">Templates</TabsTrigger>
      </TabsList>
      <TabsContent value="operators">
        <OperatorsList />
      </TabsContent>
      <TabsContent value="pricing">
        <PricingSettingsEditor />
      </TabsContent>
      <TabsContent value="calendar">
        <ClosedDaysCalendar />
      </TabsContent>
      <TabsContent value="templates">
        <EmailTemplatesEditor />
      </TabsContent>
    </Tabs>
  );
}
