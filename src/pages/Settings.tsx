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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="swiss-container py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                className="h-9 w-9"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                  <SettingsIcon className="h-6 w-6" />
                  Settings
                </h1>
                <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="swiss-container py-10">
        <TeamManagement />
      </main>
    </div>
  );
}
