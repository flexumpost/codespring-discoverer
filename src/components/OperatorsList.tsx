import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import "@/i18n/operatorDeletion";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";

export function OperatorsList() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; email: string } | null>(null);
  const { data: canDelete = false } = useQuery({
    queryKey: ["operator-administrator", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_operator_administrator");
      if (error) throw error;
      return data === true;
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke("delete-operator", { body: { user_id: id } });
      if (error) {
        const detail = await error.context?.json?.().catch(() => null);
        throw new Error(detail?.error || t("operatorDeletion.error"));
      }
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operators-list"] });
      setDeleteTarget(null);
      toast.success(t("operatorDeletion.success"));
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { data: operators = [], isLoading } = useQuery({
    queryKey: ["operators-list"],
    queryFn: async () => {
      const { data: roles, error } = await supabase.from("user_roles").select("user_id").eq("role", "operator");
      if (error) throw error;
      if (!roles.length) return [];
      const userIds = roles.map((r) => r.user_id);
      const { data: profiles, error: pErr } = await supabase.from("profiles").select("id, first_name, last_name, email").in("id", userIds);
      if (pErr) throw pErr;
      return profiles ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("create-operator", {
        body: { email, password, first_name: firstName, last_name: lastName },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operators-list"] });
      toast.success(t("operators.operatorCreated"));
      setOpen(false); setFirstName(""); setLastName(""); setEmail(""); setPassword("");
    },
    onError: (e: Error) => toast.error(e.message || t("operators.couldNotCreate")),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{t("operators.title")}</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" /> {t("operators.createOperator")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("operators.createNewOperator")}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>{t("operators.firstName")}</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder={t("operators.firstName")} />
              </div>
              <div className="space-y-2">
                <Label>{t("operators.lastName")}</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder={t("operators.lastName")} />
              </div>
              <div className="space-y-2">
                <Label>{t("operators.email")}</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@eksempel.dk" />
              </div>
              <div className="space-y-2">
                <Label>{t("operators.password")}</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("operators.passwordPlaceholder")} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => createMutation.mutate()} disabled={!email || !password || createMutation.isPending}>
                {createMutation.isPending ? t("common.creating") : t("common.create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
        ) : operators.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("operators.noOperators")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("operators.name")}</TableHead>
                <TableHead>{t("operators.email")}</TableHead>
                {canDelete && <TableHead className="w-16"><span className="sr-only">{t("operatorDeletion.delete")}</span></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {operators.map((op) => (
                <TableRow key={op.id}>
                  <TableCell className="font-medium">{[op.first_name, op.last_name].filter(Boolean).join(" ") || "—"}</TableCell>
                  <TableCell>{op.email}</TableCell>
                  {canDelete && <TableCell className="text-right">
                    {op.id === user?.id ? <span className="text-xs text-muted-foreground">{t("operatorDeletion.admin")}</span> :
                      <Button variant="ghost" size="icon" className="text-destructive" aria-label={`${t("operatorDeletion.delete")}: ${op.email}`} title={t("operatorDeletion.delete")} onClick={() => setDeleteTarget(op)}><Trash2 className="h-4 w-4" /></Button>}
                  </TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(value) => { if (!value && !deleteMutation.isPending) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("operatorDeletion.title", { name: deleteTarget?.email })}</AlertDialogTitle>
            <AlertDialogDescription>{t("operatorDeletion.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" disabled={deleteMutation.isPending} onClick={() => setDeleteTarget(null)}>{t("common.cancel")}</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); }}>{t("operatorDeletion.delete")}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
