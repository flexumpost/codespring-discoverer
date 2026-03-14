import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, Image as ImageIcon, Bold, Italic, Heading2, List, ListOrdered } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import { cn } from "@/lib/utils";

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
  shipment_dispatched: "Forsendelse afsendt",
  destruction_confirmed: "Destruering bekræftet",
  missing_address: "Manglende forsendelsesadresse",
  action_required: "Handling påkrævet",
  address_updated: "Forsendelsesadresse opdateret",
  daily_report: "Daglig rapport",
};

function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;

  const addImage = () => {
    const url = window.prompt("Billede-URL:");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const btnClass = (active: boolean) =>
    cn(
      "p-1.5 rounded hover:bg-accent transition-colors",
      active && "bg-accent text-accent-foreground"
    );

  return (
    <div className="flex items-center gap-0.5 border-b border-border px-2 py-1.5 flex-wrap">
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive("bold"))}>
        <Bold className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive("italic"))}>
        <Italic className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btnClass(editor.isActive("heading", { level: 2 }))}>
        <Heading2 className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive("bulletList"))}>
        <List className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnClass(editor.isActive("orderedList"))}>
        <ListOrdered className="h-4 w-4" />
      </button>
      <div className="w-px h-5 bg-border mx-1" />
      <button type="button" onClick={addImage} className={btnClass(false)}>
        <ImageIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

export function EmailTemplatesEditor() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit, TiptapImage.configure({ inline: false })],
    content: "",
    onUpdate: () => setDirty(true),
  });

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

  const selectTemplate = useCallback(
    (t: EmailTemplate) => {
      setSelectedId(t.id);
      setEditSubject(t.subject);
      editor?.commands.setContent(t.body || "");
      setDirty(false);
    },
    [editor]
  );

  // Auto-select first template once loaded
  useEffect(() => {
    if (templates.length > 0 && !selectedId && editor) {
      selectTemplate(templates[0]);
    }
  }, [templates, selectedId, editor, selectTemplate]);

  const selected = templates.find((t) => t.id === selectedId);

  const handleSave = async () => {
    if (!selected || !editor) return;
    setSaving(true);
    const { error } = await supabase
      .from("email_templates")
      .update({
        subject: editSubject,
        body: editor.getHTML(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", selected.id);

    if (error) {
      toast.error("Kunne ikke gemme template");
    } else {
      toast.success("Template gemt");
      setDirty(false);
      fetchTemplates();
    }
    setSaving(false);
  };

  const handleCancel = () => {
    if (selected) {
      setEditSubject(selected.subject);
      editor?.commands.setContent(selected.body || "");
      setDirty(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Indlæser...</p>;
  }

  const tenantTemplates = templates.filter((t) => t.audience === "tenant");
  const operatorTemplates = templates.filter((t) => t.audience === "operator");

  const renderSidebarItem = (t: EmailTemplate) => (
    <button
      key={t.id}
      onClick={() => selectTemplate(t)}
      className={cn(
        "w-full text-left px-3 py-2 rounded-md text-sm transition-colors truncate",
        selectedId === t.id
          ? "bg-primary text-primary-foreground font-medium"
          : "hover:bg-muted text-foreground"
      )}
    >
      {SLUG_LABELS[t.slug] || t.slug}
    </button>
  );

  return (
    <div className="flex flex-col md:flex-row gap-6 min-h-[500px]">
      {/* Sidebar */}
      <div className="w-full md:w-60 shrink-0 space-y-4">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 px-3">
            Lejer
          </h4>
          <div className="space-y-0.5">{tenantTemplates.map(renderSidebarItem)}</div>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 px-3">
            Operatør
          </h4>
          <div className="space-y-0.5">{operatorTemplates.map(renderSidebarItem)}</div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-w-0">
        {selected ? (
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 block">Emne</Label>
              <Input
                value={editSubject}
                onChange={(e) => {
                  setEditSubject(e.target.value);
                  setDirty(true);
                }}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Brødtekst</Label>
              <div className="rounded-md border border-input bg-background overflow-hidden">
                <EditorToolbar editor={editor} />
                <ScrollArea className="h-[320px]">
                  <div className="p-3 prose prose-sm max-w-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[280px]">
                    <EditorContent editor={editor} />
                  </div>
                </ScrollArea>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Brug {"{{name}}"}, {"{{date}}"}, {"{{stamp_number}}"} som pladsholdere.
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving || !dirty}>
                <Check className="h-4 w-4 mr-1" /> Gem
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel} disabled={!dirty}>
                <X className="h-4 w-4 mr-1" /> Annuller
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Vælg en template fra listen.</p>
        )}
      </div>
    </div>
  );
}
