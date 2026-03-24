import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useAuth } from "@/hooks/useAuth";
import flexumLogo from "@/assets/flexum-logo.png";

export function AppLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { user, firstName: profileFirstName } = useAuth();
  const displayName = profileFirstName || user?.email || "";

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 10) return t("greeting.morning");
    if (hour >= 10 && hour < 12) return t("greeting.lateMorning");
    if (hour >= 12 && hour < 14) return t("greeting.noon");
    if (hour >= 14 && hour < 18) return t("greeting.afternoon");
    return t("greeting.evening");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-border px-4">
            <SidebarTrigger />
            <img src={flexumLogo} alt="Flexum" className="ml-4 h-7" />
            {displayName && (
              <span className="ml-4 text-sm text-muted-foreground">{getGreeting()} {displayName}</span>
            )}
            <div className="ml-auto flex items-center gap-2">
              <LanguageToggle />
              <NotificationBell />
            </div>
          </header>
          <div className="flex-1 p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
