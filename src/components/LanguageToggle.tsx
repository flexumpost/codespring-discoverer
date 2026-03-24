import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith("da") ? "da" : "en";

  const toggle = () => {
    const newLang = currentLang === "da" ? "en" : "da";
    i18n.changeLanguage(newLang);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      className="gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
    >
      <Globe className="h-4 w-4" />
      {currentLang === "da" ? "EN" : "DA"}
    </Button>
  );
}
