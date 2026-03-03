import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const TYPE_COLORS: Record<string, string> = {
  Lite: "bg-blue-100 text-blue-800 border-blue-200",
  Standard: "bg-green-100 text-green-800 border-green-200",
  Plus: "bg-[#00aaeb]/20 text-[#006d9e] border-[#00aaeb]/40",
  Fastlejer: "bg-amber-100 text-amber-800 border-amber-200",
  Nabo: "bg-cyan-100 text-cyan-800 border-cyan-200",
  "Retur til afsender": "bg-red-100 text-red-800 border-red-200",
};

const TenantsPage = () => {
  const navigate = useNavigate();

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["all-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*, tenant_types(name)")
        .order("company_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: newMailCounts = {} } = useQuery({
    queryKey: ["new-mail-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mail_items")
        .select("tenant_id")
        .eq("status", "ny")
        .not("tenant_id", "is", null);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const item of data) {
        if (item.tenant_id) {
          counts[item.tenant_id] = (counts[item.tenant_id] || 0) + 1;
        }
      }
      return counts;
    },
  });

  return (
    <AppLayout>
      <h2 className="text-2xl font-bold mb-6">Lejere</h2>

      {isLoading ? (
        <p className="text-muted-foreground">Indlæser...</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lejer navn</TableHead>
                <TableHead>Lejertype</TableHead>
                <TableHead className="text-right">Nye breve</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => {
                const typeName = (tenant.tenant_types as any)?.name as string | undefined;
                const newCount = newMailCounts[tenant.id] ?? 0;
                return (
                  <TableRow
                    key={tenant.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/tenants/${tenant.id}`)}
                  >
                    <TableCell className="font-medium">{tenant.company_name}</TableCell>
                    <TableCell>
                      {typeName && (
                        <Badge variant="outline" className={TYPE_COLORS[typeName] ?? ""}>
                          {typeName}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {newCount > 0 ? (
                        <Badge variant="destructive">{newCount}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {tenants.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Ingen lejere fundet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </AppLayout>
  );
};

export default TenantsPage;
