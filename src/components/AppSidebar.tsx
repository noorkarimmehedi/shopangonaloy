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
  Sparkles,
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
    {
      id: "order-extraction",
      title: "Order Extraction",
      icon: (
        <svg
          width="20" 
          height="20" 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24"
          className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors"
        >
          <g fill="none">
            <path fill="url(#SVGMjbAg03p)" d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10a9.96 9.96 0 0 1-4.644-1.142l-4.29 1.117a.85.85 0 0 1-1.037-1.036l1.116-4.289A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2m.75 5.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5z"/>
            <path fill="url(#SVGvP6UgdVF)" d="M12.75 7.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5z"/>
            <defs>
              <linearGradient id="SVGMjbAg03p" x1="2.714" x2="20.178" y1="5.751" y2="35.521" gradientUnits="userSpaceOnUse">
                <stop stopColor="#0FAFFF"/>
                <stop offset="1" stopColor="#CC23D1"/>
              </linearGradient>
              <linearGradient id="SVGvP6UgdVF" x1="7.875" x2="9.537" y1="7.176" y2="17.893" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FDFDFD"/>
                <stop offset="1" stopColor="#CCEAFF"/>
              </linearGradient>
            </defs>
          </g>
        </svg>
      ),
      link: "/order-extraction",
    },
    ...(!roleLoading && isAdmin ? [
      {
        id: "order-analysis",
        title: "AI Analysis",
        icon: (
          <svg
            viewBox="0 0 324 323"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors dark:invert"
            aria-hidden="true"
          >
            <rect x="0.5" width="323" height="323" rx="161.5" fill="currentColor"></rect>
            <circle cx="162" cy="161.5" r="60" fill="white"></circle>
          </svg>
        ),
        link: "/order-analysis",
      },
      {
        id: "settings",
        title: "Settings",
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors"
          >
            <path fill="currentColor" fillRule="evenodd" d="M5.93 5.35A9 9 0 0 0 3.8 8.28L.9 7.34l-.62 1.9l2.9.95a9 9 0 0 0 0 3.62l-2.9.95l.62 1.9l2.9-.94a9 9 0 0 0 2.13 2.93l-1.8 2.47l1.63 1.18l1.8-2.47c1.03.59 2.2.98 3.44 1.12V24h2v-3.05a8.9 8.9 0 0 0 3.45-1.12l1.8 2.47l1.61-1.18l-1.8-2.47a9 9 0 0 0 2.14-2.93l2.9.94l.62-1.9l-2.9-.95a9 9 0 0 0 0-3.62l2.9-.95l-.62-1.9l-2.9.94a9 9 0 0 0-2.13-2.93l1.8-2.47l-1.63-1.18l-1.8 2.47A8.9 8.9 0 0 0 13 3.05V0h-2v3.05a8.9 8.9 0 0 0-3.45 1.12L5.75 1.7l-1.6 1.18l1.8 2.47zM12 19a7 7 0 1 1 0-14a7 7 0 0 1 0 14m4-7a4 4 0 1 1-8 0a4 4 0 0 1 8 0m-6 0a2 2 0 1 0 4 0a2 2 0 0 0-4 0" clipRule="evenodd" />
          </svg>
        ),
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
