import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Clock, Archive } from "lucide-react";

const TenantDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, pending: 0, archived: 0 });

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      const [totalRes, pendingRes, archivedRes] = await Promise.all([
        supabase.from("mail_items").select("id", { count: "exact", head: true }),
        supabase.from("mail_items").select("id", { count: "exact", head: true }).eq("status", "ny"),
        supabase.from("mail_items").select("id", { count: "exact", head: true }).eq("status", "arkiveret"),
      ]);

      setStats({
        total: totalRes.count ?? 0,
        pending: pendingRes.count ?? 0,
        archived: archivedRes.count ?? 0,
      });
    };
    fetchStats();
  }, [user]);

  const cards = [
    { title: "Total post", value: stats.total, icon: Mail },
    { title: "Ny post", value: stats.pending, icon: Clock },
    { title: "Arkiveret", value: stats.archived, icon: Archive },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Min post</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="h-5 w-5 text-primary" />
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

export default TenantDashboard;
