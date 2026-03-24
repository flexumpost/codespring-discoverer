import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSignedPhotoUrl } from "@/components/PhotoHoverPreview";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, Search, Loader2, Crop, ZoomIn, X, ArrowDownToLine } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { validateStampNumber } from "@/lib/validateStampNumber";
import { useTranslation } from "react-i18next";

type MailItem = Tables<"mail_items">;

function fuzzyMatchTenant(
  name: string,
  tenants: { id: string; company_name: string; contact_first_name: string | null; contact_last_name: string | null }[]
): { id: string; company_name: string } | null {
  if (!name) return null;
  const lower = name.toLowerCase().trim();
  const contactFull = (t: { contact_first_name: string | null; contact_last_name: string | null }) =>
    [t.contact_first_name, t.contact_last_name].filter(Boolean).join(" ").toLowerCase();
  for (const t of tenants) {
    if (t.company_name.toLowerCase() === lower) return t;
    const cf = contactFull(t);
    if (cf && cf === lower) return t;
  }
  for (const t of tenants) {
    if (t.company_name.toLowerCase().includes(lower) || lower.includes(t.company_name.toLowerCase())) return t;
    const cf = contactFull(t);
    if (cf && (cf.includes(lower) || lower.includes(cf))) return t;
  }
  return null;
}

interface AssignTenantDialogProps {
  mailItem: MailItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned: () => void;
}

export function AssignTenantDialog({
  mailItem,
  open,
  onOpenChange,
  onAssigned,
}: AssignTenantDialogProps) {
  const { t } = useTranslation();
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

  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrRecipient, setOcrRecipient] = useState<string | null>(null);
  const [noAutoMatch, setNoAutoMatch] = useState(false);
  const [stampNumber, setStampNumber] = useState("");
  const [senderName, setSenderName] = useState("");
  const [suggestedTenantId, setSuggestedTenantId] = useState<string | null>(null);

  const [cropTarget, setCropTarget] = useState<"tenant" | "stamp" | "sender" | null>(null);
  const [cropLoading, setCropLoading] = useState(false);
  const [cropRect, setCropRect] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const cropMode = cropTarget !== null;

  const [showZoom, setShowZoom] = useState(false);

  const cropImageRef = useRef<HTMLImageElement>(null);
  const ocrRanRef = useRef(false);

  const photoUrl = useSignedPhotoUrl(mailItem.photo_url);

  useEffect(() => {
    if (open) {
      setStampNumber(mailItem.stamp_number?.toString() ?? "");
      setSenderName(mailItem.sender_name ?? "");
      ocrRanRef.current = false;
      setOcrRecipient(null);
      setNoAutoMatch(false);
      setSuggestedTenantId(null);
      setCropTarget(null);
      setCropRect(null);
      setSearch("");
      setShowCreate(false);
    }
  }, [open, mailItem]);

  const { data: tenants } = useQuery({
    queryKey: ["tenants-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, company_name, contact_first_name, contact_last_name, tenant_type_id")
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

  const { data: recentStampNumbers = [] } = useQuery({
    queryKey: ["recent-stamp-numbers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mail_items")
        .select("stamp_number")
        .not("stamp_number", "is", null)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data.map((r) => r.stamp_number as number);
    },
    enabled: open,
  });

  const filtered = tenants?.filter((tn) => {
    if (!search) return true;
    const s = search.toLowerCase();
    const contactFull = [tn.contact_first_name, tn.contact_last_name].filter(Boolean).join(" ").toLowerCase();
    return (
      tn.company_name.toLowerCase().includes(s) ||
      contactFull.includes(s)
    );
  }) ?? [];

  const tryAutoMatchTenant = useCallback((recipientName: string) => {
    if (!tenants || !recipientName) {
      setNoAutoMatch(true);
      return;
    }
    const match = fuzzyMatchTenant(recipientName, tenants);
    if (match) {
      setSuggestedTenantId(match.id);
      setSearch("");
      toast.success(t("registerMail.tenantMatched") + `: ${match.company_name}`);
      setNoAutoMatch(false);
    } else {
      setNoAutoMatch(true);
      toast.info(t("registerMail.noMatch", { name: recipientName }));
    }
  }, [tenants, t]);

  useEffect(() => {
    if (!open || !photoUrl || ocrRanRef.current || !tenants) return;
    if (mailItem.tenant_id) return;
    ocrRanRef.current = true;
    runOcrFromUrl(photoUrl);
  }, [open, photoUrl, tenants, mailItem.tenant_id]);

  const runOcrFromUrl = async (url: string) => {
    setOcrLoading(true);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const { data, error } = await supabase.functions.invoke("ocr-stamp", {
        body: { image_base64: base64 },
      });

      if (error) throw error;

      if (data?.stamp_number && !stampNumber) {
        const validation = validateStampNumber(String(data.stamp_number), recentStampNumbers);
        if (validation.valid) {
          setStampNumber(data.stamp_number);
          toast.success(t("registerMail.stampFound") + ": " + data.stamp_number);
        }
      }

      let recipientName = data?.recipient_name ?? "";
      let detectedSender = data?.sender_name ?? "";
      if (tenants && recipientName && detectedSender) {
        const recipientMatch = fuzzyMatchTenant(recipientName, tenants);
        const senderMatch = fuzzyMatchTenant(detectedSender, tenants);
        if (!recipientMatch && senderMatch) {
          const tmp = recipientName;
          recipientName = detectedSender;
          detectedSender = tmp;
        }
      }

      if (detectedSender && !senderName) {
        setSenderName(detectedSender);
      }

      if (recipientName) {
        setOcrRecipient(recipientName);
        tryAutoMatchTenant(recipientName);
      } else {
        setOcrRecipient(null);
        setNoAutoMatch(true);
      }
    } catch (err: any) {
      console.error("OCR error:", err);
      toast.error(t("registerMail.ocrFailed") + ": " + (err.message || t("common.unknown")));
    } finally {
      setOcrLoading(false);
    }
  };

  const handleCropOcr = async () => {
    if (!cropRect || !cropImageRef.current) return;
    setCropLoading(true);
    try {
      const img = cropImageRef.current;
      const scaleX = img.naturalWidth / img.clientWidth;
      const scaleY = img.naturalHeight / img.clientHeight;
      const x = Math.min(cropRect.startX, cropRect.endX) * scaleX;
      const y = Math.min(cropRect.startY, cropRect.endY) * scaleY;
      const w = Math.abs(cropRect.endX - cropRect.startX) * scaleX;
      const h = Math.abs(cropRect.endY - cropRect.startY) * scaleY;

      if (w < 10 || h < 10) {
        toast.error(t("registerMail.selectLargerArea"));
        setCropLoading(false);
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context error");
      ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
      const cropBase64 = canvas.toDataURL("image/jpeg", 0.9);

      const { data, error } = await supabase.functions.invoke("ocr-stamp", {
        body: { crop_base64: cropBase64 },
      });
      if (error) throw error;

      const ocrText = data?.ocr_text;
      if (ocrText) {
        toast.success(t("registerMail.readText", { text: ocrText }));
        if (cropTarget === "stamp") {
          const digits = ocrText.replace(/\D/g, "");
          if (digits) {
            setStampNumber(digits);
            toast.success(t("registerMail.numberSet") + ": " + digits);
          } else {
            toast.info(t("registerMail.noDigitsFound"));
          }
        } else if (cropTarget === "sender") {
          setSenderName(ocrText);
          toast.success(t("registerMail.senderSet") + ": " + ocrText);
        } else if (cropTarget === "tenant") {
          if (tenants) {
            const match = fuzzyMatchTenant(ocrText, tenants);
            if (match) {
              setSuggestedTenantId(match.id);
              setSearch("");
              toast.success(t("registerMail.tenantMatchedCrop") + `: ${match.company_name}`);
            } else {
              setSearch(ocrText);
              toast.info(t("registerMail.noMatchSearch"));
            }
          }
        }
      } else {
        toast.info(t("registerMail.couldNotReadArea"));
      }

      setCropTarget(null);
      setCropRect(null);
    } catch (err: any) {
      toast.error(t("registerMail.ocrFailed") + ": " + (err.message || t("common.unknown")));
    } finally {
      setCropLoading(false);
    }
  };

  const handleCropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cropMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCropRect({ startX: x, startY: y, endX: x, endY: y });
    setIsCropping(true);
  };

  const handleCropMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCropping || !cropRect) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    setCropRect((prev) => prev ? { ...prev, endX: x, endY: y } : null);
  };

  const handleCropMouseUp = () => {
    setIsCropping(false);
    if (cropRect) {
      const w = Math.abs(cropRect.endX - cropRect.startX);
      const h = Math.abs(cropRect.endY - cropRect.startY);
      if (w > 10 && h > 10) {
        setTimeout(() => handleCropOcr(), 0);
      }
    }
  };

  const handleAssign = async (tenantId: string) => {
    if (tenantId === mailItem.tenant_id) {
      onOpenChange(false);
      return;
    }
    setAssigning(true);
    try {
      const updatePayload: Record<string, unknown> = { tenant_id: tenantId };

      const newStamp = stampNumber ? parseInt(stampNumber, 10) : null;
      if (newStamp !== mailItem.stamp_number) {
        updatePayload.stamp_number = newStamp;
      }
      const newSender = senderName.trim() || null;
      if (newSender !== mailItem.sender_name) {
        updatePayload.sender_name = newSender;
      }

      const { error } = await supabase
        .from("mail_items")
        .update(updatePayload)
        .eq("id", mailItem.id);
      if (error) throw error;
      toast.success(t("assignTenant.tenantAssigned"));
      onAssigned();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(t("assignTenant.couldNotAssign") + ": " + err.message);
    } finally {
      setAssigning(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newTypeId) {
      toast.error(t("registerMail.fillCompanyAndType"));
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("tenants")
        .insert({
        company_name: newName.trim(),
        contact_first_name: newContact.split(" ")[0] || null,
        contact_last_name: newContact.split(" ").slice(1).join(" ") || null,
        contact_email: newEmail || null,
        address: newAddress || null,
        tenant_type_id: newTypeId,
        })
        .select("id, company_name")
        .single();
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["tenants-active"] });
      toast.success(t("registerMail.tenantCreated", { name: data.company_name }));
      await handleAssign(data.id);
    } catch (err: any) {
      toast.error(t("registerMail.couldNotCreateTenant") + ": " + err.message);
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

  const cropOverlayStyle = cropRect
    ? {
        left: Math.min(cropRect.startX, cropRect.endX),
        top: Math.min(cropRect.startY, cropRect.endY),
        width: Math.abs(cropRect.endX - cropRect.startX),
        height: Math.abs(cropRect.endY - cropRect.startY),
      }
    : null;

  const hasPhoto = !!photoUrl;

  const photoSection = hasPhoto ? (
    <div className="space-y-2">
      <div
        className={`relative w-full rounded-md overflow-hidden border border-border group ${
          cropMode ? "cursor-crosshair" : "cursor-zoom-in"
        }`}
        onClick={cropMode ? undefined : () => setShowZoom(true)}
        onMouseDown={cropMode ? handleCropMouseDown : undefined}
        onMouseMove={cropMode ? handleCropMouseMove : undefined}
        onMouseUp={cropMode ? handleCropMouseUp : undefined}
      >
        <img
          ref={cropImageRef}
          src={photoUrl}
          alt={t("assignTenant.shipment")}
          className="w-full h-auto object-contain select-none"
          draggable={false}
          crossOrigin="anonymous"
        />
        {cropMode && cropOverlayStyle && (
          <div
            className="absolute border-2 border-primary bg-primary/20 pointer-events-none"
            style={cropOverlayStyle}
          />
        )}
        {!cropMode && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
          </div>
        )}
        {cropMode && !cropRect && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="bg-black/60 text-white px-3 py-1.5 rounded-md text-sm font-medium">
              {cropTarget === "stamp" ? t("registerMail.drawBoxStamp") : cropTarget === "sender" ? t("registerMail.drawBoxSender") : t("registerMail.drawBoxName")}
            </span>
          </div>
        )}
      </div>
      {!cropMode ? (
        <div className="flex gap-2 flex-wrap">
          <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => { setCropTarget("tenant"); setCropRect(null); }}>
            <Crop className="h-4 w-4 mr-2" /> {t("registerMail.markName")}
          </Button>
          <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => { setCropTarget("sender"); setCropRect(null); }}>
            <Crop className="h-4 w-4 mr-2" /> {t("registerMail.markSender")}
          </Button>
          <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => { setCropTarget("stamp"); setCropRect(null); }}>
            <Crop className="h-4 w-4 mr-2" /> {t("registerMail.markStamp")}
          </Button>
        </div>
      ) : (
        <div className="flex gap-2 items-center">
          {cropLoading && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> {t("registerMail.reading")}
            </div>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => { setCropTarget(null); setCropRect(null); }}>
            {t("common.cancel")}
          </Button>
        </div>
      )}
      <div className="space-y-2 pt-2 border-t">
        <div>
          <Label className="text-xs">{t("assignTenant.stampNumber")}</Label>
          <Input type="number" value={stampNumber} onChange={(e) => setStampNumber(e.target.value)} placeholder={t("registerMail.stampPlaceholder")} className="h-8 text-sm" disabled={ocrLoading} />
        </div>
        <div>
          <Label className="text-xs">{t("assignTenant.senderName")}</Label>
          <Input value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder={t("registerMail.senderPlaceholder")} className="h-8 text-sm" disabled={ocrLoading} />
        </div>
      </div>
    </div>
  ) : null;

  const tenantSection = (
    <div className="space-y-3">
      {ocrLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("assignTenant.runningOcr")}
        </div>
      )}

      {ocrRecipient && (
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
          onClick={() => setSearch(ocrRecipient)}
        >
          {t("registerMail.ocrFound", { text: ocrRecipient })}
          <ArrowDownToLine className="h-3 w-3" />
        </button>
      )}

      {!showCreate ? (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("assignTenant.searchTenant")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              autoFocus={!hasPhoto}
            />
          </div>

          <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
            {filtered.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">{t("assignTenant.noTenantsFound")}</p>
            ) : (
              filtered.map((tn) => (
                <button
                  key={tn.id}
                  className="w-full text-left px-3 py-2 hover:bg-accent transition-colors flex items-center justify-between text-sm disabled:opacity-50"
                  onClick={() => handleAssign(tn.id)}
                  disabled={assigning}
                >
                  <div>
                    <span className="font-medium">{tn.company_name}</span>
                    {(tn.contact_first_name || tn.contact_last_name) && (
                      <span className="text-muted-foreground ml-2">({[tn.contact_first_name, tn.contact_last_name].filter(Boolean).join(" ")})</span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {tn.id === suggestedTenantId && (
                      <Badge variant="default" className="text-xs">{t("common.suggested")}</Badge>
                    )}
                    {tn.id === mailItem.tenant_id && (
                      <Badge variant="secondary" className="text-xs">{t("common.current")}</Badge>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => setShowCreate(true)}
          >
            <UserPlus className="h-4 w-4" /> {t("assignTenant.createNewTenant")}
          </Button>
        </>
      ) : (
        <div className="space-y-3">
          <div>
            <Label>{t("assignTenant.companyName")}</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>
          <div>
            <Label>{t("assignTenant.contactPerson")}</Label>
            <Input value={newContact} onChange={(e) => setNewContact(e.target.value)} />
          </div>
          <div>
            <Label>{t("assignTenant.email")}</Label>
            <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
          </div>
          <div>
            <Label>{t("assignTenant.address")}</Label>
            <Input value={newAddress} onChange={(e) => setNewAddress(e.target.value)} />
          </div>
          <div>
            <Label>{t("assignTenant.tenantType")}</Label>
            <Select value={newTypeId} onValueChange={setNewTypeId}>
              <SelectTrigger><SelectValue placeholder={t("assignTenant.selectType")} /></SelectTrigger>
              <SelectContent>
                {tenantTypes?.map((tt) => (
                  <SelectItem key={tt.id} value={tt.id}>{tt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={resetCreate}>
              {t("common.back")}
            </Button>
            <Button className="flex-1" onClick={handleCreate} disabled={creating}>
              {creating ? t("common.creating") : t("assignTenant.createAndAssign")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) resetCreate(); onOpenChange(v); }}>
        <DialogContent className={hasPhoto ? "max-w-4xl" : "max-w-md"}>
          <DialogHeader>
            <DialogTitle>{t("assignTenant.title")}</DialogTitle>
          </DialogHeader>

          {hasPhoto ? (
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-1 min-w-0">{photoSection}</div>
              <div className="sm:w-[320px] sm:flex-shrink-0">{tenantSection}</div>
            </div>
          ) : (
            tenantSection
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showZoom} onOpenChange={setShowZoom}>
        <DialogContent className="sm:max-w-[90vw] max-h-[95vh] p-2">
          {photoUrl && (
            <img src={photoUrl} alt="Zoom" className="w-full h-auto max-h-[90vh] object-contain rounded-md" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
