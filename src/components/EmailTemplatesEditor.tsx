import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Pencil, X } from "lucide-react";

type EmailTemplate = {
  id: string;
  slug: string;
  subject: string;
  body: string;
  audience: string;
  updated_at: string;
};

const SLUG_LABELS: Record<string, string> = {
  welcome: "Velkomst e-mail",
  new_shipment: "Ny forsendelse",
  scan_ready: "Ny scanning",
  pickup_confirmed: "Bekræftelse på afhentningsdato",
  pickup_reminder: "Påmindelse om bestilt afhentning",
  operator_new_request: "Ny anmodning fra lejer",
};

export function EmailTemplatesEditor() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .order("audience", { ascending: true });
    if (error) {
      toast.error("Kunne ikke hente e-mail templates");
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const startEdit = (t: EmailTemplate) => {
    setEditingId(t.id);
    setEditSubject(t.subject);
    setEditBody(t.body);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleSave = async (id: string) => {
    setSaving(true);
    const { error } = await supabase
      .from("email_templates")
      .update({ subject: editSubject, body: editBody, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast.error("Kunne ikke gemme template");
    } else {
      toast.success("Template gemt");
      setEditingId(null);
      fetchTemplates();
    }
    setSaving(false);
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Indlæser...</p>;
  }

  const tenantTemplates = templates.filter((t) => t.audience === "tenant");
  const operatorTemplates = templates.filter((t) => t.audience === "operator");

  const renderTemplate = (t: EmailTemplate) => {
    const isEditing = editingId === t.id;
    return (
      <Card key={t.id}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {SLUG_LABELS[t.slug] || t.slug}
            </CardTitle>
            {!isEditing && (
              <Button variant="ghost" size="icon" onClick={() => startEdit(t)}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <Label>Emne</Label>
                <Input
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                />
              </div>
              <div>
                <Label>Brødtekst</Label>
                <Textarea
                  rows={6}
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Brug {"{{name}}"}, {"{{date}}"}, {"{{type}}"} som pladsholdere.
                  Linjeskift med \n.
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleSave(t.id)} disabled={saving}>
                  <Check className="h-4 w-4 mr-1" /> Gem
                </Button>
                <Button size="sm" variant="outline" onClick={cancelEdit}>
                  <X className="h-4 w-4 mr-1" /> Annuller
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-1 text-sm">
              <p>
                <span className="font-medium">Emne:</span> {t.subject}
              </p>
              <p className="text-muted-foreground whitespace-pre-line">{t.body}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-3">Lejer e-mails</h3>
        <div className="space-y-3">{tenantTemplates.map(renderTemplate)}</div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-3">Operatør e-mails</h3>
        <div className="space-y-3">{operatorTemplates.map(renderTemplate)}</div>
      </div>
    </div>
  );
}
