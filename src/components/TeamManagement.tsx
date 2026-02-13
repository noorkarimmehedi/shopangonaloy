import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { PlasticButton } from "@/components/ui/plastic-button";
import { toast } from "sonner";
import {
  UserPlus,
  Trash2,
  Users,
  Copy,
  Check,
  Eye,
  EyeOff,
  Mail,
  Lock,
  ShieldCheck,
  MoreVertical
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface TeamMember {
  id: string;
  user_id: string;
  role: "admin" | "team_member";
  created_at: string;
}

interface GeneratedCredentials {
  email: string;
  password: string;
}

export function TeamManagement() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatedCredentials, setGeneratedCredentials] = useState<GeneratedCredentials | null>(null);
  const [copied, setCopied] = useState<"email" | "password" | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error("Error fetching team data:", error);
      toast.error("Failed to load team data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    setCreating(true);
    setGeneratedCredentials(null);

    try {
      const { data, error } = await supabase.functions.invoke("create-team-member", {
        body: { email: email.trim(), password: password || undefined },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setGeneratedCredentials({
        email: data.email,
        password: data.password,
      });

      toast.success(`Team member created: ${data.email}`);
      setEmail("");
      setPassword("");
      fetchMembers();
    } catch (error) {
      console.error("Error creating team member:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create team member");
    } finally {
      setCreating(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      toast.success("Team member removed");
      setMembers((prev) => prev.filter((member) => member.id !== memberId));
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove team member");
    }
  };

  const copyToClipboard = async (text: string, type: "email" | "password") => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-20">
      {/* Create Team Member Section */}
      <section className="space-y-10">
        <div className="flex items-center gap-3">
          <div className="h-6 w-1 bg-black rounded-full" />
          <h2 className="text-xl font-medium tracking-tight">Onboard New Member</h2>
        </div>

        <div className="p-10 rounded-[2.5rem] bg-white border border-black/5 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.04)] space-y-10">
          <form onSubmit={handleCreateMember} className="space-y-8">
            <div className="grid gap-8 sm:grid-cols-2">
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 px-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20 transition-colors group-focus-within:text-black" />
                  <Input
                    type="email"
                    placeholder="name@angonaloy.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-14 pl-12 bg-[#F8F8F8] border-none rounded-2xl text-base focus-visible:ring-1 focus-visible:ring-black/10"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 px-1">Initial Password (Optional)</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20 transition-colors group-focus-within:text-black" />
                  <Input
                    type="text"
                    placeholder="Leave blank for auto-gen"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-14 pl-12 bg-[#F8F8F8] border-none rounded-2xl text-base focus-visible:ring-1 focus-visible:ring-black/10"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <PlasticButton
                text="Create Active Role"
                onClick={() => { }} // Form handles it
                loading={creating}
                className="w-full sm:w-auto px-10 h-14"
              />
            </div>
          </form>

          {/* Result Area */}
          <AnimatePresence>
            {generatedCredentials && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-8 bg-blue-50/50 rounded-3xl border border-blue-100/50 space-y-6">
                  <div className="flex items-center gap-3 text-blue-700">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-semibold tracking-tight">Credentials successfully generated</span>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-blue-600/60 uppercase tracking-widest px-1">Access Email</span>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-4 py-3 bg-white/80 rounded-xl border border-blue-200/30 text-sm font-mono text-blue-900">
                          {generatedCredentials.email}
                        </code>
                        <button
                          onClick={() => copyToClipboard(generatedCredentials.email, "email")}
                          className="p-3 bg-white rounded-xl border border-blue-200/30 hover:bg-blue-50 transition-colors"
                        >
                          {copied === "email" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-blue-400" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-blue-600/60 uppercase tracking-widest px-1">Secure Password</span>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-4 py-3 bg-white/80 rounded-xl border border-blue-200/30 text-sm font-mono text-blue-900">
                          {showPassword ? generatedCredentials.password : "••••••••••••"}
                        </code>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowPassword(!showPassword)}
                            className="p-3 bg-white rounded-xl border border-blue-200/30 hover:bg-blue-50 transition-colors"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4 text-blue-400" /> : <Eye className="h-4 w-4 text-blue-400" />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(generatedCredentials.password, "password")}
                            className="p-3 bg-white rounded-xl border border-blue-200/30 hover:bg-blue-50 transition-colors"
                          >
                            {copied === "password" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-blue-400" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Team Member List Section */}
      <section className="space-y-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-6 w-1 bg-black rounded-full" />
            <h2 className="text-xl font-medium tracking-tight">Active Team Directory</h2>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-black/30 bg-black/5 px-3 py-1.5 rounded-full">
            {members.length} Users Found
          </span>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-20 bg-white border border-black/5 rounded-[2.5rem]">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 border-2 border-black/10 border-t-black rounded-full animate-spin" />
                <span className="text-sm text-black/30 font-light">Retrieving team data...</span>
              </div>
            </div>
          ) : members.length === 0 ? (
            <div className="p-20 text-center bg-white border border-black/5 border-dashed rounded-[2.5rem]">
              <Users className="w-10 h-10 text-black/5 mx-auto mb-4" />
              <p className="text-black/30 font-light">No authorized team members found.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {members.map((member) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="group flex items-center justify-between p-6 bg-white border border-black/5 rounded-3xl hover:border-black/20 hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.05)] transition-all duration-300"
                >
                  <div className="flex items-center gap-6">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors duration-300",
                      member.role === "admin" ? "bg-black text-white" : "bg-black/[0.03] text-black/20 group-hover:bg-black group-hover:text-white"
                    )}>
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-medium tracking-tight font-mono text-sm">{member.user_id.slice(0, 12)}...</span>
                        <span className={cn(
                          "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md",
                          member.role === "admin" ? "bg-blue-50 text-blue-600" : "bg-black/[0.05] text-black/40"
                        )}>
                          {member.role}
                        </span>
                      </div>
                      <p className="text-xs text-black/30 font-light italic">Member since {formatDate(member.created_at)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                    {member.user_id !== user?.id && member.role !== "admin" && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        title="Remove Member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    <button className="p-3 text-black/20 hover:text-black hover:bg-black/5 rounded-xl transition-all">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
