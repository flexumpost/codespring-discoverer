import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import flexumLogo from "@/assets/flexum-logo.png";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const displayName = user?.user_metadata?.full_name || user?.email || "";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-border px-4">
            <SidebarTrigger />
            <img src={flexumLogo} alt="Flexum" className="ml-4 h-7" />
            {displayName && (
              <span className="ml-4 text-sm text-muted-foreground">Hej {displayName}</span>
            )}
          </header>
          <div className="flex-1 p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
