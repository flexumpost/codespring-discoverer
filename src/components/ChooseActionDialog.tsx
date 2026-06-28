import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface ActionCard {
  key: string;
  action: string; // chosen_action value, or special tokens "__archive__"|"__reactivate__"|"__cancel__"
  title: string;
  description: string;
  dateText?: string;
  price: string;
  /** Tailwind classes for the card surface: background + border + heading colour */
  color: string;
  icon?: LucideIcon;
  ctaLabel: string;
  destructive?: boolean;
}

interface ChooseActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  cards: ActionCard[];
  onSelect: (card: ActionCard) => void;
  disabled?: boolean;
}

export function ChooseActionDialog({
  open,
  onOpenChange,
  title,
  description,
  cards,
  onSelect,
  disabled,
}: ChooseActionDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2 max-h-[70vh] overflow-y-auto pr-1 pt-1">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                type="button"
                key={card.key}
                disabled={disabled}
                onClick={() => onSelect(card)}
                className={cn(
                  "group text-left rounded-lg border-2 p-4 transition-all",
                  "hover:shadow-md hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                  card.color,
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {Icon && <Icon className="h-5 w-5 shrink-0" />}
                    <h4 className="font-semibold text-sm leading-tight">{card.title}</h4>
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium rounded-full px-2 py-0.5 bg-background/70 border whitespace-nowrap",
                      card.price === "0 kr." || card.price === "Gratis" ? "text-emerald-700 border-emerald-300" : "text-foreground border-foreground/20",
                    )}
                  >
                    {card.price}
                  </span>
                </div>
                <p className="text-xs text-foreground/80 leading-snug min-h-[2.5rem]">
                  {card.description}
                </p>
                {card.dateText && (
                  <p className="text-xs font-medium mt-1.5">{card.dateText}</p>
                )}
                <div className="mt-3">
                  <span
                    className={cn(
                      "inline-flex items-center justify-center text-xs font-medium rounded-md px-3 py-1.5 border bg-background/80 group-hover:bg-background transition-colors",
                      card.destructive && "text-destructive border-destructive/40",
                    )}
                  >
                    {card.ctaLabel}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        {cards.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            {/* No actions available */}
            —
          </p>
        )}
        <div className="flex justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
