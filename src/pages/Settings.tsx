import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { TeamManagement } from "@/components/TeamManagement";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings as SettingsIcon } from "lucide-react";
import { useEffect } from "react";

export default function Settings() {
  const { user } = useAuth();
  const { isAdmin, loading } = useUserRole();
  const navigate = useNavigate();

  // Redirect non-admins away from settings
  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      {/* Header — Rigid Swiss */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-8 h-[80px]">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="h-10 w-10 border border-border hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center rounded-none"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-4 border-l border-border pl-4 h-[80px]">
            <SettingsIcon className="h-4 w-4" />
            <h2 className="text-xs font-bold uppercase tracking-widest">Workspace Settings</h2>
          </div>
        </div>
      </header>

      <div className="p-0">
        {/* Page title cell */}
        <div className="swiss-grid-container border-b border-border">
          <div className="col-span-12 swiss-grid-cell">
            <h1 className="leading-none">Configuration</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest mt-4 text-muted-foreground">
              ADMINISTRATIVE CONTROL PANEL / {user?.email}
            </p>
          </div>
        </div>

        {/* Content cell */}
        <div className="swiss-grid-container min-h-[calc(100vh-240px)]">
          <div className="col-span-12 md:col-span-8 swiss-grid-cell border-r border-border">
            <div className="max-w-3xl">
              <h3 className="text-sm font-bold uppercase tracking-widest mb-8">Personnel Management</h3>
              <TeamManagement />
            </div>
          </div>
          <div className="col-span-12 md:col-span-4 swiss-grid-cell divide-y divide-border">
            <div className="pb-8">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Instance Details</p>
              <div className="p-4 bg-secondary text-[11px] font-mono leading-relaxed">
                STATUS: ACTIVE<br />
                TYPE: PRODUCTION<br />
                REGION: BD-NORTH-1
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
