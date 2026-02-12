import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Clock, Archive, ArrowRight, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TenantDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({ ny: 0, ulaest: 0, laest: 0, arkiveret: 0 });

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      const [nyRes, ulaestRes, laestRes, arkiveretRes] = await Promise.all([
        supabase.from("mail_items").select("id", { count: "exact", head: true }).eq("status", "ny"),
        supabase.from("mail_items").select("id", { count: "exact", head: true }).eq("status", "ulaest"),
        supabase.from("mail_items").select("id", { count: "exact", head: true }).eq("status", "laest"),
        supabase.from("mail_items").select("id", { count: "exact", head: true }).eq("status", "arkiveret"),
      ]);

      setStats({
        ny: nyRes.count ?? 0,
        ulaest: ulaestRes.count ?? 0,
        laest: laestRes.count ?? 0,
        arkiveret: arkiveretRes.count ?? 0,
      });
    };
    fetchStats();
  }, [user]);

  const cards = [
    { title: "Ny post", value: stats.ny, icon: Mail },
    { title: "Ulæste breve", value: stats.ulaest, icon: Clock },
    { title: "Læste breve", value: stats.laest, icon: Eye },
    { title: "Arkiveret", value: stats.arkiveret, icon: Archive },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Min post</h2>
      <div className="grid gap-4 md:grid-cols-4">
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
      <div className="mt-6">
        <Button onClick={() => navigate("/my-mail")} className="gap-2">
          Se al post <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default TenantDashboard;
