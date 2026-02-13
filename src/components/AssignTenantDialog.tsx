import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, Search } from "lucide-react";

interface AssignTenantDialogProps {
  mailItemId: string;
  currentTenantId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned: () => void;
}

export function AssignTenantDialog({
  mailItemId,
  currentTenantId,
  open,
  onOpenChange,
  onAssigned,
}: AssignTenantDialogProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newTypeId, setNewTypeId] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: tenants } = useQuery({
    queryKey: ["tenants-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, company_name, contact_name, tenant_type_id")
        .eq("is_active", true)
        .order("company_name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: tenantTypes } = useQuery({
    queryKey: ["tenant-types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenant_types").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
    enabled: open && showCreate,
  });

  const filtered = tenants?.filter((t) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      t.company_name.toLowerCase().includes(s) ||
      (t.contact_name?.toLowerCase().includes(s) ?? false)
    );
  }) ?? [];

  const handleAssign = async (tenantId: string) => {
    if (tenantId === currentTenantId) {
      onOpenChange(false);
      return;
    }
    setAssigning(true);
    try {
      const { error } = await supabase
        .from("mail_items")
        .update({ tenant_id: tenantId })
        .eq("id", mailItemId);
      if (error) throw error;
      toast.success("Lejer tildelt");
      onAssigned();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Kunne ikke tildele lejer: " + err.message);
    } finally {
      setAssigning(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newTypeId) {
      toast.error("Udfyld venligst firmanavn og lejertype");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("tenants")
        .insert({
          company_name: newName.trim(),
          contact_name: newContact || null,
          contact_email: newEmail || null,
          address: newAddress || null,
          tenant_type_id: newTypeId,
        })
        .select("id, company_name")
        .single();
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["tenants-active"] });
      toast.success(`Lejer "${data.company_name}" oprettet`);
      await handleAssign(data.id);
    } catch (err: any) {
      toast.error("Kunne ikke oprette lejer: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  const resetCreate = () => {
    setShowCreate(false);
    setNewName("");
    setNewContact("");
    setNewEmail("");
    setNewAddress("");
    setNewTypeId("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetCreate(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tildel lejer</DialogTitle>
        </DialogHeader>

        {!showCreate ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Søg lejer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>

            <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
              {filtered.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">Ingen lejere fundet</p>
              ) : (
                filtered.map((t) => (
                  <button
                    key={t.id}
                    className="w-full text-left px-3 py-2 hover:bg-accent transition-colors flex items-center justify-between text-sm disabled:opacity-50"
                    onClick={() => handleAssign(t.id)}
                    disabled={assigning}
                  >
                    <div>
                      <span className="font-medium">{t.company_name}</span>
                      {t.contact_name && (
                        <span className="text-muted-foreground ml-2">({t.contact_name})</span>
                      )}
                    </div>
                    {t.id === currentTenantId && (
                      <Badge variant="secondary" className="text-xs">aktuel</Badge>
                    )}
                  </button>
                ))
              )}
            </div>

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setShowCreate(true)}
            >
              <UserPlus className="h-4 w-4" /> Opret ny lejer
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label>Firmanavn *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div>
              <Label>Kontaktperson</Label>
              <Input value={newContact} onChange={(e) => setNewContact(e.target.value)} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>
            <div>
              <Label>Adresse</Label>
              <Input value={newAddress} onChange={(e) => setNewAddress(e.target.value)} />
            </div>
            <div>
              <Label>Lejertype *</Label>
              <Select value={newTypeId} onValueChange={setNewTypeId}>
                <SelectTrigger><SelectValue placeholder="Vælg type" /></SelectTrigger>
                <SelectContent>
                  {tenantTypes?.map((tt) => (
                    <SelectItem key={tt.id} value={tt.id}>{tt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={resetCreate}>
                Tilbage
              </Button>
              <Button className="flex-1" onClick={handleCreate} disabled={creating}>
                {creating ? "Opretter..." : "Opret og tildel"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
