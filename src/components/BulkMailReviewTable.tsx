import { useTranslation } from "react-i18next";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X, Loader2, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type MailType = Database["public"]["Enums"]["mail_type"];

export type BulkItem = {
  file: File;
  preview: string;
  stampNumber: string;
  recipientName: string;
  senderName: string;
  tenantId: string | null;
  tenantName: string;
  mailType: MailType;
  status: "pending" | "processing" | "ok" | "error";
  errorMsg?: string;
};

interface BulkMailReviewTableProps {
  items: BulkItem[];
  tenants: { id: string; company_name: string }[];
  onUpdateItem: (index: number, updates: Partial<BulkItem>) => void;
  onRemoveItem: (index: number) => void;
}

const statusIcon = {
  pending: <Clock className="h-4 w-4 text-muted-foreground" />,
  processing: <Loader2 className="h-4 w-4 text-primary animate-spin" />,
  ok: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  error: <AlertCircle className="h-4 w-4 text-destructive" />,
};

export function BulkMailReviewTable({ items, tenants, onUpdateItem, onRemoveItem }: BulkMailReviewTableProps) {
  const { t } = useTranslation();
  if (items.length === 0) return null;

  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">{t("bulkReview.photo")}</TableHead>
            <TableHead>{t("bulkReview.stampNumber")}</TableHead>
            <TableHead>{t("bulkReview.recipient")}</TableHead>
            <TableHead>{t("bulkReview.sender")}</TableHead>
            <TableHead>{t("bulkReview.tenant")}</TableHead>
            <TableHead className="w-[110px]">{t("bulkReview.type")}</TableHead>
            <TableHead className="w-[50px]">{t("bulkReview.status")}</TableHead>
            <TableHead className="w-[40px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, idx) => (
            <TableRow key={idx}>
              <TableCell>
                <img src={item.preview} alt="Thumbnail" className="h-10 w-10 rounded object-cover" />
              </TableCell>
              <TableCell>
                <Input value={item.stampNumber} onChange={(e) => onUpdateItem(idx, { stampNumber: e.target.value })} placeholder="Nr." className="h-8 w-28" />
              </TableCell>
              <TableCell>
                <Input value={item.recipientName} onChange={(e) => onUpdateItem(idx, { recipientName: e.target.value })} placeholder={t("bulkReview.recipient")} className="h-8 w-36" />
              </TableCell>
              <TableCell>
                <Input value={item.senderName} onChange={(e) => onUpdateItem(idx, { senderName: e.target.value })} placeholder={t("bulkReview.sender")} className="h-8 w-36" />
              </TableCell>
              <TableCell>
                <Select
                  value={item.tenantId ?? "none"}
                  onValueChange={(val) => {
                    const tenant = tenants.find((t) => t.id === val);
                    onUpdateItem(idx, { tenantId: val === "none" ? null : val, tenantName: tenant?.company_name ?? "" });
                  }}
                >
                  <SelectTrigger className="h-8 w-40"><SelectValue placeholder={t("bulkReview.selectTenant")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("bulkReview.notAssigned")}</SelectItem>
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Select value={item.mailType} onValueChange={(val) => onUpdateItem(idx, { mailType: val as MailType })}>
                  <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brev">{t("common.letter")}</SelectItem>
                    <SelectItem value="pakke">{t("common.package")}</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1" title={item.errorMsg}>{statusIcon[item.status]}</div>
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemoveItem(idx)}>
                  <X className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
