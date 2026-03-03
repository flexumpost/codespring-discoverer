import { Users, Settings, LayoutDashboard, LogOut, MapPin } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const operatorItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Lejere", url: "/tenants", icon: Users },
  { title: "Indstillinger", url: "/settings", icon: Settings },
];

const tenantItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Forsendelsesadresse", url: "/shipping-address", icon: MapPin },
  { title: "Indstillinger", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { role, user, signOut } = useAuth();
  const items = role === "operator" ? operatorItems : tenantItems;

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider">
            Flexum Post
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="text-xs text-muted-foreground truncate mb-2">
          {user?.email}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={signOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log ud
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
