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
import { Camera, Upload, X, VideoOff, ZoomIn, Loader2, UserPlus, Crop, ArrowDownToLine } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogDescription } from "@/components/ui/dialog";
import type { Database } from "@/integrations/supabase/types";
import { validateStampNumber } from "@/lib/validateStampNumber";

type MailType = Database["public"]["Enums"]["mail_type"];

interface RegisterMailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
  const [newTenantContactFirstName, setNewTenantContactFirstName] = useState("");
  const [newTenantContactLastName, setNewTenantContactLastName] = useState("");
  const [newTenantEmail, setNewTenantEmail] = useState("");
  const [newTenantTypeId, setNewTenantTypeId] = useState("");
  const [creatingTenant, setCreatingTenant] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showZoom, setShowZoom] = useState(false);
  // Crop mode state
  const [cropTarget, setCropTarget] = useState<"tenant" | "stamp" | "sender" | null>(null);
  const [cropLoading, setCropLoading] = useState(false);
  const [cropRect, setCropRect] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const cropMode = cropTarget !== null;
  const [ocrRecipient, setOcrRecipient] = useState<string | null>(null);
  const [noAutoMatch, setNoAutoMatch] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cropImageRef = useRef<HTMLImageElement>(null);
  const cropContainerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
    enabled: open,
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

  const filteredTenants = tenants?.filter((t) => {
    const search = tenantSearch.toLowerCase();
    const contactFull = [t.contact_first_name, t.contact_last_name].filter(Boolean).join(" ").toLowerCase();
    return t.company_name.toLowerCase().includes(search) ||
      contactFull.includes(search);
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
        contact_first_name: newTenantContactFirstName.trim() || null,
        contact_last_name: newTenantContactLastName.trim() || null,
        contact_email: newTenantEmail.trim() || null,
        tenant_type_id: newTenantTypeId,
      }).select("id, company_name").single();
      if (error) throw error;

      // Auto-invite if email is provided
      const email = newTenantEmail.trim();
      if (email && data?.id) {
        try {
          const { error: inviteError } = await supabase.functions.invoke(
            "create-tenant-user",
            {
              body: {
                email,
                first_name: newTenantContactFirstName.trim() || newTenantName.trim(),
                last_name: newTenantContactLastName.trim() || "",
                tenant_ids: [data.id],
                mode: "invite",
              },
            }
          );
          if (inviteError) throw inviteError;
          toast.success("Invitation sendt til " + email);
        } catch (err: any) {
          toast.error("Kunne ikke sende invitation: " + (err?.message || err));
        }
      }

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

  const tryAutoMatchTenant = useCallback((recipientName: string) => {
    if (!tenants || !recipientName) {
      setNoAutoMatch(true);
      return;
    }
    const match = fuzzyMatchTenant(recipientName, tenants);
    if (match) {
      setSelectedTenantId(match.id);
      setSelectedTenantName(match.company_name);
      setTenantSearch("");
      toast.success(`Lejer matchet automatisk: ${match.company_name}`);
      setNoAutoMatch(false);
    } else {
      setNoAutoMatch(true);
      toast.info(`Modtager "${recipientName}" matchede ingen lejer`);
    }
  }, [tenants]);

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
        const validation = validateStampNumber(String(data.stamp_number), recentStampNumbers);
        if (validation.valid) {
          setStampNumber(data.stamp_number);
          toast.success("Forsendelsesnr. fundet: " + data.stamp_number);
        } else {
          toast.warning(`Aflæst nr. "${data.stamp_number}" virker usandsynligt – kontrollér venligst`, {
            description: validation.reason,
          });
        }
      } else if (!data?.stamp_number) {
        toast.info("Kunne ikke aflæse forsendelsesnr. fra billedet");
      }

      // Smart swap: if sender matches a tenant but recipient doesn't, swap them
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

      // Handle sender name
      if (detectedSender && !senderName) {
        setSenderName(detectedSender);
        toast.success("Afsender fundet: " + detectedSender);
      }

      // Handle recipient name
      if (recipientName) {
        setOcrRecipient(recipientName);
        tryAutoMatchTenant(recipientName);
      } else {
        setOcrRecipient(null);
        setNoAutoMatch(true);
      }
    } catch (err: any) {
      console.error("OCR error:", err);
      toast.error("OCR fejlede: " + (err.message || "Ukendt fejl"));
    } finally {
      setOcrLoading(false);
    }
  };

  const handleCropOcr = async () => {
    if (!cropRect || !photoPreview || !cropImageRef.current) return;
    setCropLoading(true);

    try {
      const img = cropImageRef.current;
      const displayW = img.clientWidth;
      const displayH = img.clientHeight;
      const naturalW = img.naturalWidth;
      const naturalH = img.naturalHeight;

      const scaleX = naturalW / displayW;
      const scaleY = naturalH / displayH;

      const x = Math.min(cropRect.startX, cropRect.endX) * scaleX;
      const y = Math.min(cropRect.startY, cropRect.endY) * scaleY;
      const w = Math.abs(cropRect.endX - cropRect.startX) * scaleX;
      const h = Math.abs(cropRect.endY - cropRect.startY) * scaleY;

      if (w < 10 || h < 10) {
        toast.error("Markér et større område");
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
        toast.success(`Aflæst tekst: "${ocrText}"`);
        if (cropTarget === "stamp") {
          const digits = ocrText.replace(/\D/g, "");
          if (digits) {
            setStampNumber(digits);
            toast.success("Forsendelsesnr. sat: " + digits);
          } else {
            toast.info("Ingen cifre fundet i det markerede område");
          }
        } else if (cropTarget === "sender") {
          setSenderName(ocrText);
          toast.success("Afsender sat: " + ocrText);
        } else {
          // tenant matching (existing logic)
          if (tenants) {
            const match = fuzzyMatchTenant(ocrText, tenants);
            if (match) {
              setSelectedTenantId(match.id);
              setSelectedTenantName(match.company_name);
              setTenantSearch("");
              toast.success(`Lejer matchet: ${match.company_name}`);
            } else {
              setTenantSearch(ocrText);
              setShowTenantList(true);
              toast.info("Ingen match – teksten er sat som søgning");
            }
          }
        }
      } else {
        toast.info("Kunne ikke aflæse tekst i det markerede område");
      }

      setCropTarget(null);
      setCropRect(null);
    } catch (err: any) {
      console.error("Crop OCR error:", err);
      toast.error("OCR fejlede: " + (err.message || "Ukendt fejl"));
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
    // Auto-start OCR when a valid selection is made
    if (cropRect) {
      const w = Math.abs(cropRect.endX - cropRect.startX);
      const h = Math.abs(cropRect.endY - cropRect.startY);
      if (w > 10 && h > 10) {
        // Use setTimeout to let state settle before calling OCR
        setTimeout(() => handleCropOcr(), 0);
      }
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      setCropTarget(null);
      setCropRect(null);
      setNoAutoMatch(false);
      setOcrRecipient(null);
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
        setCropTarget(null);
        setCropRect(null);
        setNoAutoMatch(false);
        setOcrRecipient(null);
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
    setCropTarget(null);
    setCropRect(null);
    setCropLoading(false);
    setOcrRecipient(null);
    setNoAutoMatch(false);
    stopCamera();
  };

  const handleSubmit = async (closeAfter = true) => {
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

        // Store just the path — bucket is private, signed URLs generated on read
        photoUrl = path;
      }

      const { error } = await supabase.from("mail_items").insert({
        operator_id: user.id,
        mail_type: mailType,
        sender_name: senderName.trim() || "Ukendt afsender",
        stamp_number: stampNumber ? parseInt(stampNumber, 10) : null,
        tenant_id: selectedTenantId,
        notes: notes || null,
        photo_url: photoUrl,
      });

      if (error) throw error;

      // Fire-and-forget: send email notification to tenant
      if (selectedTenantId) {
        supabase.functions.invoke("send-new-mail-email", {
          body: {
            tenant_id: selectedTenantId,
            mail_type: mailType,
            stamp_number: stampNumber ? parseInt(stampNumber, 10) : null,
          },
        }).catch((err) => console.error("send-new-mail-email failed:", err));
      }

      toast.success("Post registreret");
      queryClient.invalidateQueries({ queryKey: ["mail-items"] });
      resetForm();
      if (closeAfter) {
        onOpenChange(false);
      } else {
        handleTakePhoto();
      }
    } catch (err: any) {
      toast.error("Kunne ikke registrere post: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const cropOverlayStyle = cropRect
    ? {
        left: Math.min(cropRect.startX, cropRect.endX),
        top: Math.min(cropRect.startY, cropRect.endY),
        width: Math.abs(cropRect.endX - cropRect.startX),
        height: Math.abs(cropRect.endY - cropRect.startY),
      }
    : null;

  const photoSection = (
    <div className="space-y-2">
      <Label>Foto (valgfrit)</Label>
      {photoPreview ? (
        <div className="space-y-2">
          <div
            ref={cropContainerRef}
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
              src={photoPreview}
              alt="Preview"
              className="w-full h-auto object-contain select-none"
              draggable={false}
            />
            {/* Crop selection overlay */}
            {cropMode && cropOverlayStyle && (
              <div
                className="absolute border-2 border-primary bg-primary/20 pointer-events-none"
                style={cropOverlayStyle}
              />
            )}
            {/* Zoom hint when not in crop mode */}
            {!cropMode && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
              </div>
            )}
            {/* Crop mode hint */}
            {cropMode && !cropRect && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="bg-black/60 text-white px-3 py-1.5 rounded-md text-sm font-medium">
                  {cropTarget === "stamp" ? "Tegn en boks omkring forsendelsesnr." : cropTarget === "sender" ? "Tegn en boks omkring afsenderen" : "Tegn en boks omkring navnet"}
                </span>
              </div>
            )}
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6"
              onClick={(e) => { e.stopPropagation(); setPhoto(null); setPhotoPreview(null); setCropTarget(null); setCropRect(null); }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          {/* Crop mode controls */}
          {photoPreview && (
            <div className="space-y-1">
              {!cropMode ? (
                <div className="flex gap-2 flex-wrap">
                  {noAutoMatch && !selectedTenantId && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => { setCropTarget("tenant"); setCropRect(null); }}
                    >
                      <Crop className="h-4 w-4 mr-2" />
                      Markér navn
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => { setCropTarget("sender"); setCropRect(null); }}
                  >
                    <Crop className="h-4 w-4 mr-2" />
                    Markér afsender
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => { setCropTarget("stamp"); setCropRect(null); }}
                  >
                    <Crop className="h-4 w-4 mr-2" />
                    Markér forsendelsesnr.
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setPhoto(null);
                      setPhotoPreview(null);
                      setCropTarget(null);
                      setCropRect(null);
                      handleTakePhoto();
                    }}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Tag nyt billede
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2 items-center">
                  {cropLoading && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Læser...
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { setCropTarget(null); setCropRect(null); }}
                  >
                    Annuller
                  </Button>
                </div>
              )}
            </div>
          )}
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
        {ocrRecipient && !selectedTenantId && (
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
            onClick={() => {
              setTenantSearch(ocrRecipient);
              setShowTenantList(true);
            }}
          >
            OCR fandt: "{ocrRecipient}"
            <ArrowDownToLine className="h-3 w-3" />
          </button>
        )}
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
                {(t.contact_first_name || t.contact_last_name) && (
                  <span className="text-muted-foreground ml-1">({[t.contact_first_name, t.contact_last_name].filter(Boolean).join(" ")})</span>
                )}
              </button>
            ))}
            {tenantSearch.trim() && filteredTenants.length === 0 && (
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2 text-primary font-medium"
                onMouseDown={() => {
                  setNewTenantName(tenantSearch.trim());
                  setNewTenantContactFirstName("");
                  setNewTenantContactLastName("");
                  setNewTenantEmail("");
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
          "Plus": "bg-[#00aaeb]/20 text-[#006d9e] border-[#00aaeb]/40",
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
            {photo && (
              <>
                <Button variant="secondary" onClick={() => handleSubmit(false)} disabled={submitting}>
                  {submitting ? "Gemmer..." : "Registrer og næste"}
                </Button>
                <Button onClick={() => handleSubmit(true)} disabled={submitting}>
                  {submitting ? "Gemmer..." : "Registrer"}
                </Button>
              </>
            )}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-tenant-first-name">Fornavn</Label>
                <Input id="new-tenant-first-name" value={newTenantContactFirstName} onChange={(e) => setNewTenantContactFirstName(e.target.value)} placeholder="Valgfrit" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-tenant-last-name">Efternavn</Label>
                <Input id="new-tenant-last-name" value={newTenantContactLastName} onChange={(e) => setNewTenantContactLastName(e.target.value)} placeholder="Valgfrit" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-tenant-email">Kontakt-email</Label>
              <Input id="new-tenant-email" type="email" value={newTenantEmail} onChange={(e) => setNewTenantEmail(e.target.value)} placeholder="Valgfrit" />
              {newTenantEmail.trim() && (
                <p className="text-xs text-muted-foreground">En invitation sendes automatisk til {newTenantEmail.trim()}</p>
              )}
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
