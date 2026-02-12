import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Users, Package, Clock } from "lucide-react";

const OperatorDashboard = () => {
  const [stats, setStats] = useState({ mailToday: 0, totalTenants: 0, pending: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const today = new Date().toISOString().split("T")[0];

      const [mailRes, tenantRes, pendingRes] = await Promise.all([
        supabase.from("mail_items").select("id", { count: "exact", head: true }).gte("received_at", today),
        supabase.from("tenants").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("mail_items").select("id", { count: "exact", head: true }).eq("status", "ny"),
      ]);

      setStats({
        mailToday: mailRes.count ?? 0,
        totalTenants: tenantRes.count ?? 0,
        pending: pendingRes.count ?? 0,
      });
    };
    fetchStats();
  }, []);

  const cards = [
    { title: "Post i dag", value: stats.mailToday, icon: Mail, color: "text-primary" },
    { title: "Aktive lejere", value: stats.totalTenants, icon: Users, color: "text-primary" },
    { title: "Afventer handling", value: stats.pending, icon: Clock, color: "text-destructive" },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Operatør-dashboard</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default OperatorDashboard;
