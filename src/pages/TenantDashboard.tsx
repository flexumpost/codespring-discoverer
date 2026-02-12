import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Mail, Clock, Archive, Eye, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type MailStatus = Database["public"]["Enums"]["mail_status"];
type MailItem = Database["public"]["Tables"]["mail_items"]["Row"];

const STATUS_LABELS: Record<MailStatus, string> = {
  ny: "Ny",
  afventer_handling: "Afventer handling",
  ulaest: "Ulæst",
  laest: "Læst",
  arkiveret: "Arkiveret",
};

const ACTION_LABELS: Record<string, string> = {
  scan: "Scan",
  videresend: "Videresend",
  opbevar: "Opbevar",
  destruer: "Destruer",
  daglig: "Daglig scanning",
  prioritet: "Prioritet",
  retur: "Retur til afsender",
};

type FilterStatus = "ny" | "ulaest" | "laest" | "arkiveret" | null;

const TenantDashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<FilterStatus>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [confirmDestroy, setConfirmDestroy] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MailItem | null>(null);

  // Fetch stats
  const { data: stats = { ny: 0, ulaest: 0, laest: 0, arkiveret: 0 } } = useQuery({
    queryKey: ["tenant-stats"],
    enabled: !!user,
    queryFn: async () => {
      const [nyRes, ulaestRes, laestRes, arkiveretRes] = await Promise.all([
        supabase.from("mail_items").select("id", { count: "exact", head: true }).eq("status", "ny"),
        supabase.from("mail_items").select("id", { count: "exact", head: true }).eq("status", "ulaest"),
        supabase.from("mail_items").select("id", { count: "exact", head: true }).eq("status", "laest"),
        supabase.from("mail_items").select("id", { count: "exact", head: true }).eq("status", "arkiveret"),
      ]);
      return {
        ny: nyRes.count ?? 0,
        ulaest: ulaestRes.count ?? 0,
        laest: laestRes.count ?? 0,
        arkiveret: arkiveretRes.count ?? 0,
      };
    },
  });

  // Fetch tenant info
  const { data: tenant } = useQuery({
    queryKey: ["my-tenant", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, tenant_type_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch allowed actions
  const { data: allowedActions = [] } = useQuery({
    queryKey: ["tenant-type-actions", tenant?.tenant_type_id],
    enabled: !!tenant?.tenant_type_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_types")
        .select("allowed_actions")
        .eq("id", tenant!.tenant_type_id)
        .single();
      if (error) throw error;
      return (data?.allowed_actions as string[]) ?? [];
    },
  });

  // Fetch mail items based on active filter
  const { data: mailItems = [], isLoading } = useQuery({
    queryKey: ["tenant-mail", activeFilter],
    enabled: !!user,
    queryFn: async () => {
      let query = supabase
        .from("mail_items")
        .select("*")
        .order("received_at", { ascending: false });

      if (activeFilter) {
        query = query.eq("status", activeFilter as MailStatus);
      } else {
        query = query.neq("status", "arkiveret" as MailStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Choose action mutation
  const chooseAction = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) => {
      const { error } = await supabase
        .from("mail_items")
        .update({ chosen_action: action, status: "afventer_handling" as MailStatus })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-mail"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-stats"] });
      toast.success("Handling valgt");
    },
    onError: () => {
      toast.error("Kunne ikke vælge handling");
    },
  });

  // Mark as read mutation
  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mail_items")
        .update({ status: "laest" as MailStatus })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-mail"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-stats"] });
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mail_items")
        .update({ status: "arkiveret" as MailStatus })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-mail"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-stats"] });
      setSelectedItem(null);
      toast.success("Forsendelse arkiveret");
    },
    onError: () => {
      toast.error("Kunne ikke arkivere");
    },
  });

  const handleAction = (id: string, action: string) => {
    if (action === "destruer") {
      setConfirmDestroy(id);
    } else {
      chooseAction.mutate({ id, action });
    }
  };

  const handleCardClick = (status: FilterStatus) => {
    setActiveFilter((prev) => (prev === status ? null : status));
  };

  const handleRowClick = (item: MailItem) => {
    setSelectedItem(item);
    // Mark as read if status is "ny" or "ulaest"
    if (item.status === "ny" || item.status === "ulaest") {
      markAsRead.mutate(item.id);
    }
  };

  const canArchive =
    selectedItem &&
    (selectedItem.status === "laest" || selectedItem.status === "afventer_handling" ||
      // Also allow archiving if we just marked it as read
      selectedItem.status === "ny" || selectedItem.status === "ulaest");

  const cards = [
    { title: "Ny forsendelse", value: stats.ny, icon: Mail, status: "ny" as FilterStatus },
    { title: "Ulæste breve", value: stats.ulaest, icon: Clock, status: "ulaest" as FilterStatus },
    { title: "Læste breve", value: stats.laest, icon: Eye, status: "laest" as FilterStatus },
    { title: "Arkiveret", value: stats.arkiveret, icon: Archive, status: "arkiveret" as FilterStatus },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Min post</h2>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        {cards.map((card) => (
          <Card
            key={card.title}
            className={`cursor-pointer transition-all ${
              activeFilter === card.status
                ? "ring-2 ring-primary shadow-md"
                : "hover:shadow-sm"
            }`}
            onClick={() => handleCardClick(card.status)}
          >
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

      {/* Mail table */}
      {isLoading ? (
        <p className="text-muted-foreground">Indlæser...</p>
      ) : mailItems.length === 0 ? (
        <p className="text-muted-foreground">Ingen post fundet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Foto</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Forsendelsesnr.</TableHead>
              <TableHead>Afsender</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Handling</TableHead>
              <TableHead>Modtaget</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mailItems.map((item) => (
              <TableRow
                key={item.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleRowClick(item)}
              >
                <TableCell>
                  {item.photo_url ? (
                    <img
                      src={item.photo_url}
                      alt="Foto"
                      className="h-10 w-10 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={item.mail_type === "pakke" ? "secondary" : "outline"}>
                    {item.mail_type === "pakke" ? "Pakke" : "Brev"}
                  </Badge>
                </TableCell>
                <TableCell>{item.stamp_number ?? "—"}</TableCell>
                <TableCell>{item.sender_name ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline">{STATUS_LABELS[item.status]}</Badge>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {item.status === "ny" ? (
                    <div className="flex flex-wrap gap-1">
                      {allowedActions.map((action) => (
                        <Button
                          key={action}
                          size="sm"
                          variant={action === "destruer" ? "destructive" : "outline"}
                          onClick={() => handleAction(item.id, action)}
                          disabled={chooseAction.isPending}
                          className="text-xs h-7 px-2"
                        >
                          {ACTION_LABELS[action] ?? action}
                        </Button>
                      ))}
                    </div>
                  ) : item.chosen_action ? (
                    <Badge className="bg-primary/10 text-primary border-primary/20">
                      {ACTION_LABELS[item.chosen_action] ?? item.chosen_action}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>{new Date(item.received_at).toLocaleDateString("da-DK")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Forsendelsesdetaljer</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              {selectedItem.photo_url && (
                <img
                  src={selectedItem.photo_url}
                  alt="Forsendelse"
                  className="w-full rounded border"
                />
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Type</span>
                  <p className="font-medium">
                    {selectedItem.mail_type === "pakke" ? "Pakke" : "Brev"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Forsendelsesnr.</span>
                  <p className="font-medium">{selectedItem.stamp_number ?? "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Afsender</span>
                  <p className="font-medium">{selectedItem.sender_name ?? "Ukendt"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <p>
                    <Badge variant="outline">{STATUS_LABELS[selectedItem.status]}</Badge>
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Valgt handling</span>
                  <p className="font-medium">
                    {selectedItem.chosen_action
                      ? ACTION_LABELS[selectedItem.chosen_action] ?? selectedItem.chosen_action
                      : "Ingen"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Modtaget</span>
                  <p className="font-medium">
                    {new Date(selectedItem.received_at).toLocaleDateString("da-DK")}
                  </p>
                </div>
              </div>
              {selectedItem.notes && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Noter fra operatør</span>
                  <p className="mt-1 rounded bg-muted p-3">{selectedItem.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {canArchive && selectedItem.status !== "arkiveret" && (
              <Button
                variant="outline"
                onClick={() => archiveMutation.mutate(selectedItem!.id)}
                disabled={archiveMutation.isPending}
              >
                <Archive className="mr-2 h-4 w-4" />
                {archiveMutation.isPending ? "Arkiverer..." : "Arkivér"}
              </Button>
            )}
            <Button variant="ghost" onClick={() => setSelectedItem(null)}>
              Luk
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo preview dialog */}
      <Dialog open={!!photoPreview} onOpenChange={() => setPhotoPreview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Foto</DialogTitle>
          </DialogHeader>
          {photoPreview && (
            <img src={photoPreview} alt="Forsendelse" className="w-full rounded" />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm destroy dialog */}
      <Dialog open={!!confirmDestroy} onOpenChange={() => setConfirmDestroy(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bekræft destruering</DialogTitle>
            <DialogDescription>
              Er du sikker på at du vil destruere denne forsendelse? Handlingen kan ikke fortrydes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDestroy(null)}>
              Annuller
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDestroy) {
                  chooseAction.mutate({ id: confirmDestroy, action: "destruer" });
                  setConfirmDestroy(null);
                }
              }}
            >
              Destruer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TenantDashboard;
