import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Settings,
  LogOut,
  PackageSearch,
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";

const navItems = [
  { label: "Orders", icon: PackageSearch, path: "/" },
];

const adminItems = [
  { label: "Settings", icon: Settings, path: "/settings" },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const allItems = [...navItems, ...(isAdmin ? adminItems : [])];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-20 flex flex-col border-r border-border/60 bg-card transition-all duration-300 ease-in-out ${
        collapsed ? "w-[68px]" : "w-[240px]"
      }`}
    >
      {/* Workspace header with toggle */}
      <div className={`flex flex-col border-b border-border/40 ${collapsed ? "items-center py-4 gap-3" : ""}`}>
        <div className={`flex items-center gap-3 ${collapsed ? "px-0" : "px-4 py-5"}`}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-semibold shrink-0">
            A
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0 animate-fade-in">
                <p className="text-sm font-semibold truncate leading-tight">Angonaloy</p>
                <p className="text-[11px] text-muted-foreground truncate">Workspace</p>
              </div>
              <button
                onClick={onToggle}
                className="p-1.5 rounded-md text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors shrink-0"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
        {collapsed && (
          <button
            onClick={onToggle}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
            title="Expand sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {allItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              title={collapsed ? item.label : undefined}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                collapsed ? "justify-center" : ""
              } ${
                isActive
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-border/40 px-3 py-4">
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground shrink-0">
            {user?.email?.charAt(0).toUpperCase() || "U"}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0 animate-fade-in">
              <p className="text-sm font-medium truncate leading-tight">
                {user?.email?.split("@")[0] || "User"}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {user?.email || ""}
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
