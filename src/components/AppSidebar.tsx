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
      className={`relative z-20 flex flex-col bg-sidebar transition-all duration-300 ease-in-out ${collapsed ? "w-[80px]" : "w-[280px]"
        }`}
    >
      {/* Workspace header — Geometric & Minimal */}
      <div className="border-b border-border flex items-center justify-between h-[80px] px-6">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center bg-primary text-primary-foreground text-lg font-bold">
            A
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <p className="text-sm font-bold uppercase tracking-tight">Angonaloy</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Office</p>
            </div>
          )}
        </div>
      </div>

      {/* Nav items — Typographic focus */}
      <nav className="flex-1 py-10">
        <div className={`space-y-1 ${collapsed ? "px-2" : "px-0"}`}>
          {allItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                title={collapsed ? item.label : undefined}
                className={`flex w-full items-center gap-4 px-6 py-4 transition-all duration-200 ${collapsed ? "justify-center" : ""
                  } ${isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
              >
                {!collapsed && (
                  <span className="text-xs font-bold uppercase tracking-[0.1em] truncate">
                    {item.label}
                  </span>
                )}
                {collapsed && <span className="text-[10px] font-bold uppercase leading-none">{item.label.charAt(0)}</span>}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Toggle button — Floating Swiss precision */}
      <div className="p-4 flex justify-center border-t border-border">
        <button
          onClick={onToggle}
          className="w-full py-4 border border-border hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center gap-2"
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          {!collapsed && <span className="text-[10px] font-bold uppercase tracking-widest">Toggle View</span>}
        </button>
      </div>

      {/* User footer */}
      <div className="border-t border-border px-6 py-8">
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center bg-secondary text-xs font-bold shrink-0">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </div>
            {!collapsed && (
              <div className="animate-fade-in overflow-hidden">
                <p className="text-xs font-bold truncate uppercase tracking-tight">
                  {user?.email?.split("@")[0] || "User"}
                </p>
                <p className="text-[10px] text-muted-foreground truncate uppercase tracking-tighter">
                  {user?.email || ""}
                </p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={handleSignOut}
              className="p-2 border border-border hover:bg-destructive hover:text-destructive-foreground transition-colors"
              title="Logout"
            >
              <LogOut className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
