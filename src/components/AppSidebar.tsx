"use client";

import { useMemo } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Sparkles,
  PackageSearch,
  Settings,
  MessageCircle,
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
          fill="currentColor"
        >
          <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 1.643.397 3.23 1.145 4.65l-1.116 4.29a.85.85 0 0 0 1.036 1.036l4.29-1.117a9.96 9.96 0 0 0 5.426 1.112a6.5 6.5 0 0 1 9.19-9.19c.019-.257.029-.517.029-.78Zm1 5.5a5.5 5.5 0 1 0-11 0a5.5 5.5 0 0 0 11 0Zm-5 .5l.001 2.503a.5.5 0 1 1-1 0V18h-2.505a.5.5 0 0 1 0-1H17v-2.5a.5.5 0 1 1 1 0V17h2.497a.5.5 0 0 1 0 1H18Z"/>
        </svg>
      ),
      link: "/order-extraction",
    },
    {
      id: "order-chat",
      title: "AI Chat",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" fill="currentColor">
          <g clipPath="url(#clip0_chat)">
            <path opacity="0.4" d="M17 9C17 12.87 13.64 16 9.5 16L8.57001 17.12L8.02 17.78C7.55 18.34 6.65 18.22 6.34 17.55L5 14.6C3.18 13.32 2 11.29 2 9C2 5.13 5.36 2 9.5 2C12.52 2 15.13 3.67001 16.3 6.07001C16.75 6.96001 17 7.95 17 9Z" fill="currentColor"/>
            <path d="M21.9998 12.8603C21.9998 15.1503 20.8198 17.1803 18.9998 18.4603L17.6598 21.4103C17.3498 22.0803 16.4498 22.2103 15.9798 21.6403L14.4998 19.8603C12.0798 19.8603 9.91982 18.7903 8.56982 17.1203L9.49982 16.0003C13.6398 16.0003 16.9998 12.8703 16.9998 9.00031C16.9998 7.95031 16.7498 6.96031 16.2998 6.07031C19.5698 6.82031 21.9998 9.58029 21.9998 12.8603Z" fill="currentColor"/>
            <path d="M12 9.75H7C6.59 9.75 6.25 9.41 6.25 9C6.25 8.59 6.59 8.25 7 8.25H12C12.41 8.25 12.75 8.59 12.75 9C12.75 9.41 12.41 9.75 12 9.75Z" fill="currentColor"/>
          </g>
          <defs><clipPath id="clip0_chat"><rect width="24" height="24" fill="white"/></clipPath></defs>
        </svg>
      ),
      link: "/order-chat",
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
