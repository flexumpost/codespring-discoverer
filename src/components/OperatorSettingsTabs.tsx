import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OperatorsList } from "@/components/OperatorsList";
import { PricingSettingsEditor } from "@/components/PricingSettingsEditor";

export function OperatorSettingsTabs() {
  return (
    <Tabs defaultValue="operators">
      <TabsList>
        <TabsTrigger value="operators">Operatører</TabsTrigger>
        <TabsTrigger value="pricing">Priser og betingelser</TabsTrigger>
      </TabsList>
      <TabsContent value="operators">
        <OperatorsList />
      </TabsContent>
      <TabsContent value="pricing">
        <PricingSettingsEditor />
      </TabsContent>
    </Tabs>
  );
}
