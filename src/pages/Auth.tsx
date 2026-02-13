import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { PlasticButton } from "@/components/ui/plastic-button";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    try {
      const { error } = mode === "signin"
        ? await signIn(email, password)
        : await signUp(email, password);

      if (error) {
        toast.custom((t) => (
          <div className="bg-white border border-black/5 shadow-2xl rounded-2xl p-4 flex items-center gap-4 min-w-[300px]">
            <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-red-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">Authentication Failed</span>
              <span className="text-sm font-bold text-black">{error.message}</span>
            </div>
          </div>
        ));
      } else {
        if (mode === "signin") {
          toast.custom((t) => (
            <div className="bg-white border border-black/5 shadow-2xl rounded-2xl p-4 flex items-center gap-4 min-w-[300px]">
              <div className="h-10 w-10 rounded-xl bg-black flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">Welcome Back</span>
                <span className="text-sm font-bold text-black">Successfully signed in</span>
              </div>
            </div>
          ));
          navigate("/");
        } else {
          toast.custom((t) => (
            <div className="bg-white border border-black/5 shadow-2xl rounded-2xl p-4 flex items-center gap-4 min-w-[300px]">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">Account Created</span>
                <span className="text-sm font-bold text-black">Check email to confirm</span>
              </div>
            </div>
          ));
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-[#FDFDFD]">
      {/* Brand Section - Desktop Only */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-black text-white relative overflow-hidden">
        {/* Abstract Grid Background */}
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)",
            backgroundSize: "40px 40px"
          }}
        />

        <div className="relative z-10 flex items-center gap-3">
          <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center">
            <div className="h-4 w-4 bg-black rounded-sm" />
          </div>
          <span className="text-xs font-bold uppercase tracking-[0.2em]">Angonaloy</span>
        </div>

        <div className="relative z-10 max-w-lg space-y-8">
          <h1 className="text-6xl font-normal leading-[1.1]">
            Master your <br />
            <span className="italic font-light text-white/50">operations</span> logistics.
          </h1>
          <p className="text-lg text-white/60 font-light leading-relaxed">
            Advanced order synchronization, fraud detection, and courier integration in one unified dashboard.
          </p>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-white/30">
          <span>Swiss Grid System</span>
          <span>v2.0.0</span>
        </div>
      </div>

      {/* Auth Form Section */}
      <div className="flex items-center justify-center p-8 lg:p-24">
        <div className="w-full max-w-sm space-y-12">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="h-8 w-8 bg-black rounded-lg flex items-center justify-center">
              <div className="h-4 w-4 bg-white rounded-sm" />
            </div>
            <span className="text-xs font-bold uppercase tracking-[0.2em]">Angonaloy</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-normal text-black">
              {mode === "signin" ? "Welcome back" : "Create account"}
            </h2>
            <p className="text-black/40">
              {mode === "signin"
                ? "Enter your credentials to access the dashboard."
                : "Sign up to start managing your orders."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Email Address</label>
                <Input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 bg-transparent border-black/10 focus-visible:ring-black rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 bg-transparent border-black/10 focus-visible:ring-black rounded-xl pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-black/20 hover:text-black transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <PlasticButton
                type="submit"
                text={mode === "signin" ? "Sign In" : "Create Account"}
                loading={loading}
                className="w-full h-12 text-xs font-bold uppercase tracking-widest bg-black text-white hover:bg-black/90 shadow-xl shadow-black/10"
              />

              <div className="relative flex justify-center text-xs uppercase tracking-widest">
                <span className="bg-[#FDFDFD] px-2 text-black/20">or</span>
                <div className="absolute inset-x-0 top-1/2 border-t border-black/5 -z-10" />
              </div>

              <button
                type="button"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="w-full text-xs font-bold uppercase tracking-widest text-black/40 hover:text-black transition-colors py-2"
              >
                {mode === "signin" ? "Create an account" : "Sign in to existing account"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
