import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Save, User, Trash2, Eye, CalendarIcon, X, MailPlus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { da, enGB } from "date-fns/locale";
import { MailPricingCard, PackagePricingCard } from "@/components/PricingOverview";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TYPE_COLORS: Record<string, string> = {
  Lite: "bg-blue-100 text-blue-800 border-blue-200",
  Standard: "bg-green-100 text-green-800 border-green-200",
  Plus: "bg-[#00aaeb]/20 text-[#006d9e] border-[#00aaeb]/40",
  Fastlejer: "bg-amber-100 text-amber-800 border-amber-200",
  Nabo: "bg-cyan-100 text-cyan-800 border-cyan-200",
  "Retur til afsender": "bg-red-100 text-red-800 border-red-200",
};

const ResendInviteButton = ({ tenantId }: { tenantId: string }) => {
  const { t } = useTranslation();
  const [sending, setSending] = useState(false);
  const handleResend = async () => {
    setSending(true);
    try {
      const res = await supabase.functions.invoke("send-new-mail-email", {
        body: { tenant_id: tenantId, is_new_tenant: true },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(t("tenantDetail.invitationResent"));
    } catch (err: any) {
      const msg = err.message?.includes("401") || err.message?.includes("Unauthorized")
        ? t("tenantDetail.sessionExpired")
        : (err.message || t("tenantDetail.couldNotResendInvitation"));
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };
  return (
    <Button variant="outline" size="sm" onClick={handleResend} disabled={sending}>
      <MailPlus className="mr-2 h-4 w-4" />
      {sending ? t("common.sending") : t("tenantDetail.resendInvitation")}
    </Button>
  );
};

const TenantDetailPage = () => {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "da" ? da : enGB;
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant-detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*, tenant_types(name, allowed_actions)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Two-step fetch to avoid PGRST200 (no FK between tenant_users and profiles)
  const { data: tenantUsers = [], error: tuError } = useQuery({
    queryKey: ["tenant-users", id],
    enabled: !!id,
    queryFn: async () => {
      const { data: relations, error: e1 } = await supabase
        .from("tenant_users")
        .select("id, user_id")
        .eq("tenant_id", id!);
      if (e1) throw e1;
      if (!relations || relations.length === 0) return [];

      const userIds = relations.map((r) => r.user_id);
      const { data: profiles, error: e2 } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", userIds);
      if (e2) throw e2;

      return relations.map((r) => ({
        ...r,
        profile: profiles?.find((p) => p.id === r.user_id) ?? null,
      }));
    },
  });

  const TYPE_ORDER = ["Fastlejer", "Lite", "Standard", "Plus", "Retur til afsender", "Nabo"];

  const { data: tenantTypes = [] } = useQuery({
    queryKey: ["tenant-types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenant_types").select("id, name");
      if (error) throw error;
      return data.sort((a, b) => {
        const ai = TYPE_ORDER.indexOf(a.name);
        const bi = TYPE_ORDER.indexOf(b.name);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      });
    },
  });

  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [companyName, setCompanyName] = useState("");

  const [contactFirstName, setContactFirstName] = useState("");
  const [contactLastName, setContactLastName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [shippingRecipient, setShippingRecipient] = useState("");
  const [shippingCo, setShippingCo] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingZip, setShippingZip] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingCountry, setShippingCountry] = useState("");

  useEffect(() => {
    if (tenant) {
      setCompanyName(tenant.company_name);
      setContactFirstName(tenant.contact_first_name ?? "");
      setContactLastName(tenant.contact_last_name ?? "");
      setContactEmail(tenant.contact_email ?? "");
      setSelectedTypeId(tenant.tenant_type_id);
      setShippingRecipient(tenant.shipping_recipient ?? "");
      setShippingCo(tenant.shipping_co ?? "");
      setShippingAddress(tenant.shipping_address ?? "");
      setShippingZip(tenant.shipping_zip ?? "");
      setShippingCity(tenant.shipping_city ?? "");
      setShippingCountry(tenant.shipping_country ?? "");
    }
  }, [tenant]);

  // Scheduled type changes
  const [schedDate, setSchedDate] = useState<Date | undefined>(undefined);
  const [schedTypeId, setSchedTypeId] = useState<string>("");

  const { data: scheduledChanges = [] } = useQuery({
    queryKey: ["scheduled-type-changes", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scheduled_type_changes")
        .select("id, new_tenant_type_id, effective_date, executed_at")
        .eq("tenant_id", id!)
        .is("executed_at", null)
        .order("effective_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const typeMutation = useMutation({
    mutationFn: async () => {
      // Check if new type is "Retur til afsender"
      const selectedType = tenantTypes.find((t) => t.id === selectedTypeId);
      const isRetur = selectedType?.name === "Retur til afsender";

      const updatePayload: Record<string, unknown> = {
        tenant_type_id: selectedTypeId,
        company_name: companyName,
      };
      if (isRetur) {
        updatePayload.is_active = false;
      }

      const { error } = await supabase
        .from("tenants")
        .update(updatePayload)
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-detail", id] });
      const selectedType = tenantTypes.find((t) => t.id === selectedTypeId);
      if (selectedType?.name === "Retur til afsender") {
        toast.success(t("tenantDetail.typeChangedToRetur"));
      } else {
        toast.success(t("tenantDetail.companyInfoUpdated"));
      }
    },
    onError: () => toast.error(t("tenantDetail.couldNotSaveType")),
  });

  const scheduleChangeMutation = useMutation({
    mutationFn: async () => {
      if (!schedDate || !schedTypeId || !user?.id) throw new Error("Mangler data");
      const { error } = await supabase.from("scheduled_type_changes").insert({
        tenant_id: id!,
        new_tenant_type_id: schedTypeId,
        effective_date: format(schedDate, "yyyy-MM-dd"),
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-type-changes", id] });
      setSchedDate(undefined);
      setSchedTypeId("");
      toast.success(t("tenantDetail.scheduledChangeCreated"));
    },
    onError: (err: any) => toast.error(err.message || t("tenantDetail.couldNotSave")),
  });

  const cancelScheduledMutation = useMutation({
    mutationFn: async (changeId: string) => {
      const { error } = await supabase
        .from("scheduled_type_changes")
        .delete()
        .eq("id", changeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-type-changes", id] });
      toast.success(t("tenantDetail.scheduledChangeCancelled"));
    },
    onError: () => toast.error(t("tenantDetail.couldNotSave")),
  });

  const contactMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("tenants")
        .update({ contact_first_name: contactFirstName, contact_last_name: contactLastName, contact_email: contactEmail })
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-detail", id] });
      toast.success(t("tenantDetail.contactInfoSaved"));
    },
    onError: () => toast.error(t("tenantDetail.couldNotSave")),
  });

  const shippingMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("tenants")
        .update({
          shipping_recipient: shippingRecipient,
          shipping_co: shippingCo || null,
          shipping_address: shippingAddress,
          shipping_zip: shippingZip,
          shipping_city: shippingCity,
          shipping_country: shippingCountry,
        } as any)
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-detail", id] });
      toast.success(t("tenantDetail.shippingAddressSaved"));
    },
    onError: () => toast.error(t("tenantDetail.couldNotSave")),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await supabase.functions.invoke("delete-tenant", {
        body: { tenant_id: id },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      toast.success(t("tenantDetail.tenantDeleted"));
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      navigate("/tenants");
    },
    onError: (err: any) => toast.error(err.message || t("tenantDetail.couldNotDelete")),
  });

  const typeName = (tenant?.tenant_types as any)?.name as string | undefined;
  const typeChanged = tenant && (selectedTypeId !== tenant.tenant_type_id || companyName !== tenant.company_name);

  const contactChanged =
    tenant &&
    (contactFirstName !== (tenant.contact_first_name ?? "") ||
      contactLastName !== (tenant.contact_last_name ?? "") ||
      contactEmail !== (tenant.contact_email ?? ""));

  const shippingChanged =
    tenant &&
    (shippingRecipient !== (tenant.shipping_recipient ?? "") ||
      shippingCo !== (tenant.shipping_co ?? "") ||
      shippingAddress !== (tenant.shipping_address ?? "") ||
      shippingZip !== (tenant.shipping_zip ?? "") ||
      shippingCity !== (tenant.shipping_city ?? "") ||
      shippingCountry !== (tenant.shipping_country ?? ""));

  return (
    <AppLayout>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/tenants")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-2xl font-bold">
          {isLoading ? t("common.loading") : tenant?.company_name ?? t("tenantDetail.tenantNotFound")}
        </h2>
        {typeName && (
          <Badge variant="outline" className={TYPE_COLORS[typeName] ?? ""}>
            {typeName}
          </Badge>
        )}
        {tenant && (
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/tenants/${id}/dashboard`)}>
              <Eye className="mr-2 h-4 w-4" />
              {t("tenantDetail.viewAsTenant")}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("tenantDetail.deleteAccount")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("tenantDetail.deleteConfirmTitle", { name: tenant.company_name })}</AlertDialogTitle>
                  <AlertDialogDescription>
                    <span dangerouslySetInnerHTML={{ __html: t("tenantDetail.deleteConfirmDesc", { name: tenant.company_name }) }} />
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? t("common.deleting") : t("tenantDetail.deletePermanently")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : !tenant ? (
        <p className="text-muted-foreground">{t("tenantDetail.tenantNotFound")}.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Company + Contact + Shipping + Postmodtagere */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("tenantDetail.company")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">{t("tenantDetail.companyName")}</Label>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder={t("tenantDetail.companyName")} />
                </div>
                {tenant.address && (
                  <div>
                    <Label className="text-muted-foreground text-xs">{t("tenantDetail.address")}</Label>
                    <p className="font-medium">{tenant.address}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">{t("tenantDetail.tenantType")}</Label>
                  <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("tenantDetail.selectTenantType")} />
                    </SelectTrigger>
                    <SelectContent>
                      {tenantTypes.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => typeMutation.mutate()} disabled={!typeChanged || typeMutation.isPending} size="sm">
                  <Save className="mr-2 h-4 w-4" />
                  {typeMutation.isPending ? t("common.saving") : t("common.save")}
                </Button>

                {/* Scheduled type changes */}
                <div className="border-t pt-4 mt-4 space-y-3">
                  <Label className="text-muted-foreground text-xs font-semibold">{t("tenantDetail.scheduledTypeChange")}</Label>

                  {scheduledChanges.length > 0 && (
                    <div className="space-y-2">
                      {scheduledChanges.map((sc: any) => {
                        const typeName2 = tenantTypes.find((tt) => tt.id === sc.new_tenant_type_id)?.name ?? t("tenantDetail.unknownType");
                        return (
                          <div key={sc.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                            <div>
                              <Badge variant="outline" className={TYPE_COLORS[typeName2] ?? ""}>
                                {typeName2}
                              </Badge>
                              <span className="ml-2 text-muted-foreground">
                                pr. {format(new Date(sc.effective_date + "T00:00:00"), "d. MMM yyyy", { locale: dateLocale })}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => cancelScheduledMutation.mutate(sc.id)}
                              disabled={cancelScheduledMutation.isPending}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <Select value={schedTypeId} onValueChange={setSchedTypeId}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={t("tenantDetail.newTenantType")} />
                      </SelectTrigger>
                      <SelectContent>
                        {tenantTypes.filter((t) => t.id !== tenant.tenant_type_id).map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="justify-start text-left font-normal h-9">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {schedDate ? format(schedDate, "d. MMM yyyy", { locale: dateLocale }) : t("tenantDetail.selectDate")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={schedDate}
                          onSelect={setSchedDate}
                          disabled={(date) => date <= new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => scheduleChangeMutation.mutate()}
                      disabled={!schedDate || !schedTypeId || scheduleChangeMutation.isPending}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduleChangeMutation.isPending ? t("common.creating") : t("tenantDetail.scheduleChange")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("tenantDetail.contactInfo")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact_first_name">{t("tenants.firstName")}</Label>
                    <Input id="contact_first_name" value={contactFirstName} onChange={(e) => setContactFirstName(e.target.value)} placeholder={t("tenants.firstName")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_last_name">{t("tenants.lastName")}</Label>
                    <Input id="contact_last_name" value={contactLastName} onChange={(e) => setContactLastName(e.target.value)} placeholder={t("tenants.lastName")} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_email">{t("tenantDetail.contactEmail")}</Label>
                  <Input id="contact_email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder={t("tenants.emailPlaceholder")} />
                </div>
                <Button onClick={() => contactMutation.mutate()} disabled={!contactChanged || contactMutation.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {contactMutation.isPending ? t("common.saving") : t("common.save")}
                </Button>
                {tenant.contact_email && tenant.user_id && (
                  <ResendInviteButton tenantId={tenant.id} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("tenantDetail.shippingAddress")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("tenantDetail.recipient")}</Label>
                  <Input value={shippingRecipient} onChange={(e) => setShippingRecipient(e.target.value)} placeholder={t("tenantDetail.recipientName")} />
                </div>
                <div className="space-y-2">
                  <Label>{t("tenantDetail.coName")}</Label>
                  <Input value={shippingCo} onChange={(e) => setShippingCo(e.target.value)} placeholder={t("tenantDetail.coPlaceholder")} />
                </div>
                <div className="space-y-2">
                  <Label>{t("tenantDetail.address")}</Label>
                  <Input value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} placeholder={t("tenantDetail.streetAddress")} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("tenantDetail.zipCode")}</Label>
                    <Input value={shippingZip} onChange={(e) => setShippingZip(e.target.value)} placeholder={t("tenantDetail.zipPlaceholder")} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("tenantDetail.city")}</Label>
                    <Input value={shippingCity} onChange={(e) => setShippingCity(e.target.value)} placeholder={t("tenantDetail.city")} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("tenantDetail.country")}</Label>
                  <Input value={shippingCountry} onChange={(e) => setShippingCountry(e.target.value)} placeholder={t("tenantDetail.countryPlaceholder")} />
                </div>
                <Button onClick={() => shippingMutation.mutate()} disabled={!shippingChanged || shippingMutation.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {shippingMutation.isPending ? t("common.saving") : t("tenantDetail.saveAddress")}
                </Button>
              </CardContent>
            </Card>

            {/* Postmodtagere */}
            {tuError && (
              <p className="text-sm text-destructive">Kunne ikke hente postmodtagere.</p>
            )}
            {tenantUsers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Postmodtagere</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {tenantUsers.map((tu: any) => {
                      const profile = tu.profile;
                      const isContactPerson = tu.user_id === tenant?.user_id;
                      return (
                        <div key={tu.id} className="flex items-center gap-3 rounded-lg border p-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{[profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Uden navn"}</p>
                              {isContactPerson && (
                                <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Kontaktperson</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Column 2: Mail pricing */}
          <MailPricingCard tenantTypeName={typeName} tenant={tenant as any} />

          {/* Column 3: Package pricing */}
          <PackagePricingCard tenantTypeName={typeName} tenant={tenant as any} />
        </div>
      )}
    </AppLayout>
  );
};

export default TenantDetailPage;
