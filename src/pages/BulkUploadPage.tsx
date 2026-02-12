import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { BulkUploadDropzone } from "@/components/BulkUploadDropzone";
import { BulkMailReviewTable, type BulkItem } from "@/components/BulkMailReviewTable";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

function fuzzyMatchTenant(
  name: string,
  tenants: { id: string; company_name: string; contact_name: string | null }[]
): { id: string; company_name: string } | null {
  if (!name) return null;
  const lower = name.toLowerCase().trim();
  for (const t of tenants) {
    if (t.company_name.toLowerCase() === lower) return t;
    if (t.contact_name?.toLowerCase() === lower) return t;
  }
  for (const t of tenants) {
    if (t.company_name.toLowerCase().includes(lower) || lower.includes(t.company_name.toLowerCase())) return t;
    if (t.contact_name && (t.contact_name.toLowerCase().includes(lower) || lower.includes(t.contact_name.toLowerCase()))) return t;
  }
  return null;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const BulkUploadPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [items, setItems] = useState<BulkItem[]>([]);
  const [ocrProgress, setOcrProgress] = useState<{ current: number; total: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const abortRef = useRef(false);

  const { data: tenants = [] } = useQuery({
    queryKey: ["tenants-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, company_name, contact_name")
        .eq("is_active", true)
        .order("company_name");
      if (error) throw error;
      return data;
    },
  });

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const runOcrForItem = async (
    file: File,
    retries = 0
  ): Promise<{ stampNumber: string; recipientName: string; senderName: string } | { error: string; fatal?: boolean }> => {
    try {
      const base64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("ocr-stamp", {
        body: { image_base64: base64 },
      });

      if (error) {
        const msg = (error as any)?.message || "Ukendt fejl";
        // Check for rate limit via context (edge function returns 429 status)
        if (msg.includes("429") || msg.includes("rate limit") || msg.includes("Rate limit")) {
          if (retries < 2) {
            await delay(3000);
            return runOcrForItem(file, retries + 1);
          }
          return { error: "Rate limit – maks forsøg nået" };
        }
        if (msg.includes("402") || msg.includes("kredit")) {
          return { error: "AI-kredit opbrugt", fatal: true };
        }
        return { error: msg };
      }

      return {
        stampNumber: data?.stamp_number ?? "",
        recipientName: data?.recipient_name ?? "",
        senderName: data?.sender_name ?? "",
      };
    } catch (err: any) {
      return { error: err.message || "OCR fejlede" };
    }
  };

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      abortRef.current = false;

      const newItems: BulkItem[] = files.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        stampNumber: "",
        recipientName: "",
        senderName: "",
        tenantId: null,
        tenantName: "",
        mailType: "brev" as const,
        status: "pending" as const,
      }));

      setItems((prev) => [...prev, ...newItems]);
      const startIdx = items.length;
      const total = files.length;
      setOcrProgress({ current: 0, total });

      for (let i = 0; i < files.length; i++) {
        if (abortRef.current) break;

        const itemIdx = startIdx + i;
        setItems((prev) => {
          const copy = [...prev];
          if (copy[itemIdx]) copy[itemIdx] = { ...copy[itemIdx], status: "processing" };
          return copy;
        });

        const result = await runOcrForItem(files[i]);
        setOcrProgress({ current: i + 1, total });

        if ("error" in result) {
          setItems((prev) => {
            const copy = [...prev];
            if (copy[itemIdx]) copy[itemIdx] = { ...copy[itemIdx], status: "error", errorMsg: result.error };
            return copy;
          });
          if (result.fatal) {
            toast.error("AI-kredit opbrugt – stopper OCR for resten");
            break;
          }
        } else {
          const match = fuzzyMatchTenant(result.recipientName, tenants);
          setItems((prev) => {
            const copy = [...prev];
            if (copy[itemIdx]) {
              copy[itemIdx] = {
                ...copy[itemIdx],
                stampNumber: result.stampNumber,
                recipientName: result.recipientName,
                senderName: result.senderName,
                tenantId: match?.id ?? null,
                tenantName: match?.company_name ?? "",
                status: "ok",
              };
            }
            return copy;
          });
        }

        if (i < files.length - 1) await delay(500);
      }

      setOcrProgress(null);
    },
    [items.length, tenants]
  );

  const handleUpdateItem = useCallback((index: number, updates: Partial<BulkItem>) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  }, []);

  const handleRemoveItem = useCallback((index: number) => {
    setItems((prev) => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[index].preview);
      copy.splice(index, 1);
      return copy;
    });
  }, []);

  const validItems = items.filter((it) => it.status === "ok" && it.tenantId);

  const handleSaveAll = async () => {
    if (!user || validItems.length === 0) return;
    setSaving(true);

    try {
      for (const item of validItems) {
        const ext = item.file.name.split(".").pop() || "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("mail-photos").upload(path, item.file);
        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage.from("mail-photos").getPublicUrl(path);

        const { error: insertErr } = await supabase.from("mail_items").insert({
          operator_id: user.id,
          mail_type: item.mailType,
          stamp_number: item.stampNumber ? parseInt(item.stampNumber, 10) : null,
          sender_name: item.senderName || null,
          tenant_id: item.tenantId,
          photo_url: urlData.publicUrl,
        });
        if (insertErr) throw insertErr;
      }

      toast.success(`${validItems.length} forsendelse(r) gemt`);
      queryClient.invalidateQueries({ queryKey: ["mail-items"] });
      navigate("/mail");
    } catch (err: any) {
      toast.error("Kunne ikke gemme: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const isProcessing = ocrProgress !== null;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/mail")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-2xl font-bold">Bulk upload</h2>
        </div>

        <BulkUploadDropzone onFilesSelected={handleFilesSelected} disabled={isProcessing || saving} />

        {ocrProgress && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              OCR-behandling: {ocrProgress.current} / {ocrProgress.total}
            </p>
            <Progress value={(ocrProgress.current / ocrProgress.total) * 100} className="h-2" />
          </div>
        )}

        <BulkMailReviewTable
          items={items}
          tenants={tenants}
          onUpdateItem={handleUpdateItem}
          onRemoveItem={handleRemoveItem}
        />

        {items.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {validItems.length} af {items.length} klar til at gemme
            </p>
            <Button
              onClick={handleSaveAll}
              disabled={saving || isProcessing || validItems.length === 0}
              className="gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Gem alle ({validItems.length})
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default BulkUploadPage;
