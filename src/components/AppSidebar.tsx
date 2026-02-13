"use client";

import { useMemo } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  BrainCircuit,
  PackageSearch,
  Settings,
} from "lucide-react";
import { Logo } from "./logo";
import type { Route } from "./nav-main";
import DashboardNavigation from "./nav-main";
import { NotificationsPopover } from "./nav-notifications";
import { TeamSwitcher } from "./team-switcher";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useNotifications } from "@/hooks/useNotifications";

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { notifications, hasUnread, markAsRead } = useNotifications();

  const dashboardRoutes = useMemo((): Route[] => [
    {
      id: "orders",
      title: "Orders",
      icon: <PackageSearch className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />,
      link: "/",
    },
    ...(!roleLoading && isAdmin ? [
      {
        id: "order-analysis",
        title: "AI Analysis",
        icon: <BrainCircuit className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />,
        link: "/order-analysis",
      },
      {
        id: "settings",
        title: "Settings",
        icon: <Settings className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />,
        link: "/settings",
      }
    ] : []),
  ], [isAdmin, roleLoading]);


  const teams = [
    { id: "1", name: "Angonaloy", logo: Logo, plan: "Pro" },
    { id: "2", name: "Admin Team", logo: Logo, plan: "Admin" },
  ];

  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarHeader
        className={cn(
          "flex md:pt-3.5",
          isCollapsed
            ? "flex-row items-center justify-between gap-y-4 md:flex-col md:items-center md:justify-center px-0"
            : "flex-row items-center justify-between px-4"
        )}
      >
        <a href="#" className={cn("flex items-center gap-2", isCollapsed && "md:justify-center w-full")}>
          <Logo className="h-8 w-8 shrink-0" />
          {!isCollapsed && (
            <span className="font-semibold text-black dark:text-white">
              Angonaloy
            </span>
          )}
        </a>

        <motion.div
          key={isCollapsed ? "header-collapsed" : "header-expanded"}
          className={cn(
            "flex items-center gap-2",
            isCollapsed ? "flex-row md:flex-col-reverse md:items-center md:justify-center w-full" : "flex-row"
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <NotificationsPopover
            notifications={notifications}
            hasUnread={hasUnread}
            onMarkAsRead={markAsRead}
          />
          <SidebarTrigger />
        </motion.div>
      </SidebarHeader>
      <SidebarContent className={cn("gap-4 py-4", isCollapsed ? "px-0" : "px-2")}>
        <DashboardNavigation routes={dashboardRoutes} />
      </SidebarContent>
      <SidebarFooter className="px-2">
        <TeamSwitcher teams={teams} />
      </SidebarFooter>
    </Sidebar>
  );
}
