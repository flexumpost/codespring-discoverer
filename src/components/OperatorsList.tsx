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
import { Plus } from "lucide-react";

export function OperatorsList() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {operators.map((op) => (
                <TableRow key={op.id}>
                  <TableCell className="font-medium">{[op.first_name, op.last_name].filter(Boolean).join(" ") || "—"}</TableCell>
                  <TableCell>{op.email}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
