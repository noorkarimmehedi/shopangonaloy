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
      className={`fixed inset-y-0 left-0 z-20 flex flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-300 ${collapsed ? "w-[64px]" : "w-[240px]"
        }`}
    >
      {/* Workspace header with toggle */}
      <div className={`flex flex-col border-b border-sidebar-border ${collapsed ? "items-center py-6 gap-3" : ""}`}>
        <div className={`flex items-center gap-4 ${collapsed ? "px-0" : "px-6 py-6"}`}>
          <div className="flex h-10 w-10 items-center justify-center bg-accent text-accent-foreground text-sm font-black shrink-0">
            A
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-sidebar-foreground">Angonaloy</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">Admin v1</p>
              </div>
              <button
                onClick={onToggle}
                className="p-1 hover:text-accent transition-colors shrink-0"
                title="Collapse"
              >
                <PanelLeftClose className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
        {collapsed && (
          <button
            onClick={onToggle}
            className="p-1 hover:text-accent transition-colors"
            title="Expand"
          >
            <PanelLeft className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4">
        {allItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              title={collapsed ? item.label : undefined}
              className={`flex w-full items-center gap-4 px-6 py-4 text-[11px] font-bold uppercase tracking-[0.15em] transition-colors border-l-4 ${collapsed ? "justify-center px-0 border-l-0" : ""
                } ${isActive
                  ? "border-accent text-accent bg-sidebar-accent"
                  : "border-transparent text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-sidebar-border p-4 bg-sidebar-accent/20">
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
          <div className="flex h-8 w-8 items-center justify-center bg-sidebar-foreground text-[10px] font-black text-sidebar-background shrink-0">
            {user?.email?.charAt(0).toUpperCase() || "U"}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold truncate tracking-wider text-sidebar-foreground">
                {user?.email?.split("@")[0].toUpperCase() || "USER"}
              </p>
              <p className="text-[9px] text-muted-foreground truncate uppercase tracking-tighter">
                {user?.email || ""}
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleSignOut}
              className="p-1.5 text-muted-foreground hover:text-accent transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
