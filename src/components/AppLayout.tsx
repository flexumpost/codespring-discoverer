import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/hooks/useAuth";
import flexumLogo from "@/assets/flexum-logo.png";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const firstName = user?.user_metadata?.first_name || user?.email || "";

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 10) return "Godmorgen";
    if (hour >= 10 && hour < 12) return "God formiddag";
    if (hour >= 12 && hour < 14) return "God middag";
    if (hour >= 14 && hour < 18) return "God eftermiddag";
    return "God aften";
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-border px-4">
            <SidebarTrigger />
            <img src={flexumLogo} alt="Flexum" className="ml-4 h-7" />
            {firstName && (
              <span className="ml-4 text-sm text-muted-foreground">{getGreeting()} {firstName}</span>
            )}
            <div className="ml-auto">
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
