import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Camera, Upload, X, Video, VideoOff, ZoomIn, Loader2, UserPlus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogDescription } from "@/components/ui/dialog";
import type { Database } from "@/integrations/supabase/types";

type MailType = Database["public"]["Enums"]["mail_type"];

interface RegisterMailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RegisterMailDialog({ open, onOpenChange }: RegisterMailDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [mailType, setMailType] = useState<MailType>("brev");
  const [senderName, setSenderName] = useState("");
  const [stampNumber, setStampNumber] = useState("");
  const [tenantSearch, setTenantSearch] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [selectedTenantName, setSelectedTenantName] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [showTenantList, setShowTenantList] = useState(false);
  const [showCreateTenant, setShowCreateTenant] = useState(false);
  const [newTenantName, setNewTenantName] = useState("");
  const [newTenantContact, setNewTenantContact] = useState("");
  const [newTenantEmail, setNewTenantEmail] = useState("");
  const [newTenantAddress, setNewTenantAddress] = useState("");
  const [newTenantTypeId, setNewTenantTypeId] = useState("");
  const [creatingTenant, setCreatingTenant] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showZoom, setShowZoom] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
    enabled: open,
  });

  const filteredTenants = tenants?.filter((t) => {
    const search = tenantSearch.toLowerCase();
    return t.company_name.toLowerCase().includes(search) ||
      (t.contact_name?.toLowerCase().includes(search) ?? false);
  }) ?? [];

  const handleCreateTenant = async () => {
    if (!newTenantName.trim() || !newTenantTypeId) {
      toast.error("Udfyld venligst firmanavn og lejertype");
      return;
    }
    setCreatingTenant(true);
    try {
      const { data, error } = await supabase.from("tenants").insert({
        company_name: newTenantName.trim(),
        contact_name: newTenantContact || null,
        contact_email: newTenantEmail || null,
        address: newTenantAddress || null,
        tenant_type_id: newTenantTypeId,
      }).select("id, company_name").single();
      if (error) throw error;
      setSelectedTenantId(data.id);
      setSelectedTenantName(data.company_name);
      setTenantSearch("");
      setShowCreateTenant(false);
      queryClient.invalidateQueries({ queryKey: ["tenants-active"] });
      toast.success(`Lejer "${data.company_name}" oprettet`);
    } catch (err: any) {
      toast.error("Kunne ikke oprette lejer: " + err.message);
    } finally {
      setCreatingTenant(false);
    }
  };

  const runOcr = async (file: File) => {
    setOcrLoading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("ocr-stamp", {
        body: { image_base64: base64 },
      });

      if (error) throw error;

      if (data?.stamp_number && !stampNumber) {
        setStampNumber(data.stamp_number);
        toast.success("Forsendelsesnr. fundet: " + data.stamp_number);
      } else if (!data?.stamp_number) {
        toast.info("Kunne ikke aflæse forsendelsesnr. fra billedet");
      }
    } catch (err: any) {
      console.error("OCR error:", err);
      toast.error("OCR fejlede: " + (err.message || "Ukendt fejl"));
    } finally {
      setOcrLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      runOcr(file);
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  }, []);

  const handleTakePhoto = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      toast.error("Kunne ikke aktivere kamera. Tjek at du har givet tilladelse.");
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
        setPhoto(file);
        setPhotoPreview(URL.createObjectURL(file));
        stopCamera();
        runOcr(file);
      }
    }, "image/jpeg", 0.9);
  };

  useEffect(() => {
    if (!open) {
      stopCamera();
    }
  }, [open, stopCamera]);

  const resetForm = () => {
    setMailType("brev");
    setSenderName("");
    setStampNumber("");
    setTenantSearch("");
    setSelectedTenantId(null);
    setSelectedTenantName("");
    setNotes("");
    setPhoto(null);
    setPhotoPreview(null);
    setShowZoom(false);
    stopCamera();
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!selectedTenantId) {
      toast.error("Vælg venligst en lejer");
      return;
    }
    if (!stampNumber) {
      toast.error("Indtast venligst et forsendelsesnr.");
      return;
    }
    setSubmitting(true);

    try {
      let photoUrl: string | null = null;

      if (photo) {
        const ext = photo.name.split(".").pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("mail-photos")
          .upload(path, photo);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("mail-photos")
          .getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from("mail_items").insert({
        operator_id: user.id,
        mail_type: mailType,
        sender_name: senderName || null,
        stamp_number: stampNumber ? parseInt(stampNumber, 10) : null,
        tenant_id: selectedTenantId,
        notes: notes || null,
        photo_url: photoUrl,
      });

      if (error) throw error;

      toast.success("Post registreret");
      queryClient.invalidateQueries({ queryKey: ["mail-items"] });
      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Kunne ikke registrere post: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const photoSection = (
    <div className="space-y-2">
      <Label>Foto (valgfrit)</Label>
      {photoPreview ? (
        <div
          className="relative w-full rounded-md overflow-hidden border border-border cursor-zoom-in group"
          onClick={() => setShowZoom(true)}
        >
          <img src={photoPreview} alt="Preview" className="w-full h-auto object-contain" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6"
            onClick={(e) => { e.stopPropagation(); setPhoto(null); setPhotoPreview(null); }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : showCamera ? (
        <div className="space-y-2">
          <div className="relative w-full rounded-md overflow-hidden border border-border bg-black aspect-video">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          </div>
          <div className="flex gap-2">
            <Button type="button" className="flex-1" onClick={capturePhoto}>
              <Camera className="h-4 w-4 mr-2" />
              Tag billede
            </Button>
            <Button type="button" variant="outline" onClick={stopCamera}>
              <VideoOff className="h-4 w-4 mr-2" />
              Annuller
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <label className="flex-1 cursor-pointer">
            <div className="flex items-center justify-center gap-2 rounded-md border border-dashed border-input p-3 text-sm text-muted-foreground hover:bg-accent transition-colors">
              <Upload className="h-4 w-4" />
              Upload foto
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </label>
          <button
            type="button"
            className="flex-1 flex items-center justify-center gap-2 rounded-md border border-dashed border-input p-3 text-sm text-muted-foreground hover:bg-accent transition-colors"
            onClick={handleTakePhoto}
          >
            <Camera className="h-4 w-4" />
            Tag billede
          </button>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );

  const formFields = (
    <div className="space-y-4">
      {/* Posttype */}
      <div className="space-y-2">
        <Label>Posttype</Label>
        <RadioGroup value={mailType} onValueChange={(v) => setMailType(v as MailType)} className="flex gap-4">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="brev" id="brev" />
            <Label htmlFor="brev" className="cursor-pointer">Brev</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="pakke" id="pakke" />
            <Label htmlFor="pakke" className="cursor-pointer">Pakke</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Lejer (obligatorisk) */}
      <div className="space-y-2 relative">
        <Label>Lejer</Label>
        {selectedTenantId ? (
          <div className="flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm">
            <span className="flex-1">{selectedTenantName}</span>
            <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => { setSelectedTenantId(null); setSelectedTenantName(""); setTenantSearch(""); }}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <Input
            value={tenantSearch}
            onChange={(e) => { setTenantSearch(e.target.value); setShowTenantList(true); }}
            onFocus={() => setShowTenantList(true)}
            onBlur={() => setTimeout(() => setShowTenantList(false), 200)}
            placeholder="Søg lejer..."
          />
        )}
        {showTenantList && !selectedTenantId && (
          <div className="absolute z-10 top-full left-0 right-0 mt-1 max-h-40 overflow-auto rounded-md border border-border bg-popover shadow-md">
            {filteredTenants.map((t) => (
              <button
                key={t.id}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                onMouseDown={() => {
                  setSelectedTenantId(t.id);
                  setSelectedTenantName(t.company_name);
                  setTenantSearch("");
                  setShowTenantList(false);
                }}
              >
                <span>{t.company_name}</span>
                {t.contact_name && (
                  <span className="text-muted-foreground ml-1">({t.contact_name})</span>
                )}
              </button>
            ))}
            {tenantSearch.trim() && filteredTenants.length === 0 && (
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2 text-primary font-medium"
                onMouseDown={() => {
                  setNewTenantName(tenantSearch.trim());
                  setNewTenantContact("");
                  setNewTenantEmail("");
                  setNewTenantAddress("");
                  setNewTenantTypeId("");
                  setShowCreateTenant(true);
                  setShowTenantList(false);
                }}
              >
                <UserPlus className="h-4 w-4" />
                Opret "{tenantSearch.trim()}" som ny lejer
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lejertype info-boks */}
      {(() => {
        const tenantTypeColorMap: Record<string, string> = {
          "Lite": "bg-blue-100 text-blue-800 border-blue-200",
          "Standard": "bg-green-100 text-green-800 border-green-200",
          "Plus": "bg-purple-100 text-purple-800 border-purple-200",
          "Fastlejer": "bg-amber-100 text-amber-800 border-amber-200",
          "Nabo": "bg-cyan-100 text-cyan-800 border-cyan-200",
          "Retur til afsender": "bg-red-100 text-red-800 border-red-200",
        };
        const selectedTenant = tenants?.find((t) => t.id === selectedTenantId);
        const tenantType = selectedTenant
          ? tenantTypes?.find((tt) => tt.id === selectedTenant.tenant_type_id)
          : null;
        const typeName = tenantType?.name ?? null;
        const colorClasses = typeName ? (tenantTypeColorMap[typeName] ?? "bg-gray-100 text-gray-800 border-gray-200") : "";

        return (
          <div
            className={`rounded-md border px-3 py-2 text-sm font-medium min-h-[36px] flex items-center ${
              typeName ? colorClasses : "bg-white border-border text-muted-foreground"
            }`}
          >
            {typeName ?? "Ingen lejer valgt"}
          </div>
        );
      })()}

      {/* Forsendelsesnr (obligatorisk) */}
      <div className="space-y-2">
        <Label htmlFor="stamp">Forsendelsesnr.</Label>
        <div className="relative">
          <Input id="stamp" type="number" value={stampNumber} onChange={(e) => setStampNumber(e.target.value)} placeholder="F.eks. 12345" disabled={ocrLoading} />
          {ocrLoading && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Læser nr...
            </div>
          )}
        </div>
      </div>

      {/* Afsender (valgfrit) */}
      <div className="space-y-2">
        <Label htmlFor="sender">Afsender (valgfrit)</Label>
        <Input id="sender" value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="Afsenderens navn" />
      </div>

      {/* Noter */}
      <div className="space-y-2">
        <Label htmlFor="notes">Noter (valgfrit)</Label>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Eventuelle noter..." rows={2} />
      </div>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={photo ? "max-w-[1300px]" : "sm:max-w-md"}>
          <DialogHeader>
            <DialogTitle>Registrer ny post</DialogTitle>
          </DialogHeader>

          {photo ? (
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-1 min-w-0 h-full">{photoSection}</div>
              <div className="sm:w-[400px] sm:flex-shrink-0">{formFields}</div>
            </div>
          ) : (
            <div className="space-y-4">
              {photoSection}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annuller</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Gemmer..." : "Registrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Zoom overlay */}
      <Dialog open={showZoom} onOpenChange={setShowZoom}>
        <DialogContent className="sm:max-w-[90vw] max-h-[95vh] p-2">
          {photoPreview && (
            <img
              src={photoPreview}
              alt="Zoom"
              className="w-full h-auto max-h-[90vh] object-contain rounded-md"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Opret ny lejer dialog */}
      <Dialog open={showCreateTenant} onOpenChange={setShowCreateTenant}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Opret ny lejer</DialogTitle>
            <DialogDescription>Udfyld oplysningerne for den nye lejer</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-tenant-name">Firmanavn *</Label>
              <Input id="new-tenant-name" value={newTenantName} onChange={(e) => setNewTenantName(e.target.value)} placeholder="Firmanavn" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-tenant-type">Lejertype *</Label>
              <Select value={newTenantTypeId} onValueChange={setNewTenantTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Vælg lejertype" />
                </SelectTrigger>
                <SelectContent>
                  {tenantTypes?.map((tt) => (
                    <SelectItem key={tt.id} value={tt.id}>{tt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-tenant-contact">Kontaktperson</Label>
              <Input id="new-tenant-contact" value={newTenantContact} onChange={(e) => setNewTenantContact(e.target.value)} placeholder="Valgfrit" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-tenant-email">Kontakt-email</Label>
              <Input id="new-tenant-email" type="email" value={newTenantEmail} onChange={(e) => setNewTenantEmail(e.target.value)} placeholder="Valgfrit" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-tenant-address">Adresse</Label>
              <Input id="new-tenant-address" value={newTenantAddress} onChange={(e) => setNewTenantAddress(e.target.value)} placeholder="Valgfrit" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTenant(false)}>Annuller</Button>
            <Button onClick={handleCreateTenant} disabled={creatingTenant}>
              {creatingTenant ? "Opretter..." : "Opret lejer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}