import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import {
  LayoutDashboard,
  Settings,
  LogOut,
  ShoppingCart,
  ChevronDown,
} from "lucide-react";

const navItems = [
  { label: "Orders", icon: ShoppingCart, path: "/" },
];

const adminItems = [
  { label: "Settings", icon: Settings, path: "/settings" },
];

export function AppSidebar() {
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
    <aside className="fixed inset-y-0 left-0 z-20 flex w-[240px] flex-col border-r border-border/60 bg-card">
      {/* Workspace header */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border/40">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
          A
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate leading-tight">Angonaloy</p>
          <p className="text-[11px] text-muted-foreground truncate">Workspace</p>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {allItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-border/40 px-3 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
            {user?.email?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate leading-tight">
              {user?.email?.split("@")[0] || "User"}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {user?.email || ""}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
