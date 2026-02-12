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
import { Camera, Upload, X, Video, VideoOff, ZoomIn } from "lucide-react";
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
  const [showTenantList, setShowTenantList] = useState(false);
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
        .select("id, company_name")
        .eq("is_active", true)
        .order("company_name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const filteredTenants = tenants?.filter((t) =>
    t.company_name.toLowerCase().includes(tenantSearch.toLowerCase())
  ) ?? [];

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
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
        {showTenantList && !selectedTenantId && filteredTenants.length > 0 && (
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
                {t.company_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Forsendelsesnr (obligatorisk) */}
      <div className="space-y-2">
        <Label htmlFor="stamp">Forsendelsesnr.</Label>
        <Input id="stamp" type="number" value={stampNumber} onChange={(e) => setStampNumber(e.target.value)} placeholder="F.eks. 12345" />
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
        <DialogContent className={photo ? "sm:max-w-3xl" : "sm:max-w-md"}>
          <DialogHeader>
            <DialogTitle>Registrer ny post</DialogTitle>
          </DialogHeader>

          {photo ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>{photoSection}</div>
              <div>{formFields}</div>
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
    </>
  );
}