import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { TeamManagement } from "@/components/TeamManagement";
import { ArrowLeft, Settings as SettingsIcon, Shield, Users, Info, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { motion } from "framer-motion";

export default function Settings() {
  const { user } = useAuth();
  const { isAdmin, loading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFDFD]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#1A1A1A]">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-black/5 bg-white/80 backdrop-blur-xl px-10 h-16">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-black flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="h-4 w-4 text-white"
            >
              <path fill="currentColor" fillRule="evenodd" d="M5.93 5.35A9 9 0 0 0 3.8 8.28L.9 7.34l-.62 1.9l2.9.95a9 9 0 0 0 0 3.62l-2.9.95l.62 1.9l2.9-.94a9 9 0 0 0 2.13 2.93l-1.8 2.47l1.63 1.18l1.8-2.47c1.03.59 2.2.98 3.44 1.12V24h2v-3.05a8.9 8.9 0 0 0 3.45-1.12l1.8 2.47l1.61-1.18l-1.8-2.47a9 9 0 0 0 2.14-2.93l2.9.94l.62-1.9l-2.9-.95a9 9 0 0 0 0-3.62l2.9-.95l-.62-1.9l-2.9.94a9 9 0 0 0-2.13-2.93l1.8-2.47l-1.63-1.18l-1.8 2.47A8.9 8.9 0 0 0 13 3.05V0h-2v3.05a8.9 8.9 0 0 0-3.45 1.12L5.75 1.7l-1.6 1.18l1.8 2.47zM12 19a7 7 0 1 1 0-14a7 7 0 0 1 0 14m4-7a4 4 0 1 1-8 0a4 4 0 0 1 8 0m-6 0a2 2 0 1 0 4 0a2 2 0 0 0-4 0" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-black/40">Control Center</span>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-10 py-16 space-y-16">
        {/* Hero Section */}
        <section className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/5 text-black/60 text-[10px] font-bold uppercase tracking-wider">
            <Shield className="w-3 h-3" />
            Admin Access
          </div>
          <h1 className="text-5xl lg:text-6xl font-normal leading-tight">
            System <span className="italic text-black/30 underline decoration-black/10 transition-colors hover:text-black/60">Configuration</span>
          </h1>
          <p className="text-lg text-black/50 max-w-2xl font-light">
            Manage your organization, team members, and overall application settings from this central dashboard.
          </p>
        </section>

        {/* Action Grid */}
        <section className="grid lg:grid-cols-12 gap-16 items-start">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-3 space-y-8 sticky top-32">
            <div className="space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/30">System Sections</span>
              <div className="flex flex-col gap-2">
                {[
                  { id: "team", label: "Team Management", icon: Users, active: true },
                  { id: "general", label: "General Settings", icon: Info, active: false },
                  { id: "advanced", label: "Advanced", icon: Sparkles, active: false },
                ].map((item) => (
                  <button
                    key={item.id}
                    disabled={!item.active}
                    className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 text-left ${item.active
                      ? "bg-black text-white shadow-xl translate-x-1"
                      : "text-black/30 hover:bg-black/[0.02] cursor-not-allowed"
                      }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="text-sm font-medium tracking-tight">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-9 space-y-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <TeamManagement />
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
}
