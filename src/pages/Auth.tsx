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
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    try {
      const { error } = await signIn(email, password);

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
        {/* Retro Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/auth-bg.jpg"
            alt="Background"
            className="w-full h-full object-cover opacity-60 grayscale contrast-125 hover:scale-105 transition-transform duration-[20s]"
          />
          <div className="absolute inset-0 bg-black/40 mix-blend-multiply" />
          {/* Noise Overlay for Retro Feel */}
          <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="h-8 w-8 bg-white/10 backdrop-blur-md rounded-lg flex items-center justify-center border border-white/20">
            <div className="h-4 w-4 bg-white rounded-sm" />
          </div>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/90">Angonaloy</span>
        </div>

        <div className="relative z-10 max-w-lg space-y-8">
          <h1 className="text-6xl font-normal leading-[1.1] tracking-tight">
            Master your <br />
            <span className="italic font-light text-white/60">operations</span> logistics.
          </h1>
          <p className="text-lg text-white/70 font-light leading-relaxed max-w-md">
            Advanced order synchronization, fraud detection, and courier integration in one unified dashboard.
          </p>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-white/40">
          <span>Swiss Grid System</span>
          <span>v2.0.0</span>
        </div>
      </div>

      {/* Auth Form Section */}
      <div className="flex items-center justify-center p-8 lg:p-24">
        <div className="w-full max-w-md">
          {/* Mobile Header - Centered */}
          <div className="lg:hidden flex flex-col items-center gap-4 mb-16">
            <div className="h-12 w-12 bg-black rounded-xl flex items-center justify-center border border-black/5">
              <div className="h-6 w-6 bg-white rounded-sm" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-black/60">Angonaloy</span>
          </div>

          {/* Header - Centered */}
          <div className="text-center space-y-3 mb-16">
            <h2 className="text-4xl font-light text-black tracking-tight">Welcome back</h2>
            <p className="text-sm text-black/40 font-light tracking-wide">Enter your credentials to access the dashboard.</p>
          </div>

          {/* Form Container with Subtle Border */}
          <div className="border border-black/5 rounded-2xl p-10 bg-white/50 backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-6">
                {/* Email Field */}
                <div className="space-y-3">
                  <label className="block text-center text-[9px] font-bold uppercase tracking-[0.25em] text-black/30">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-14 text-center bg-white border-black/10 focus-visible:ring-1 focus-visible:ring-black focus-visible:border-black rounded-xl text-sm placeholder:text-black/20 transition-all"
                    required
                  />
                </div>

                {/* Password Field */}
                <div className="space-y-3">
                  <label className="block text-center text-[9px] font-bold uppercase tracking-[0.25em] text-black/30">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-14 text-center bg-white border-black/10 focus-visible:ring-1 focus-visible:ring-black focus-visible:border-black rounded-xl pr-12 text-sm placeholder:text-black/20 transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-black/20 hover:text-black/60 transition-colors duration-200"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Sign In Button */}
              <div className="pt-4">
                <PlasticButton
                  text="Sign In"
                  loading={loading}
                  className="w-full h-14 text-[10px] font-bold uppercase tracking-[0.3em] bg-black text-white hover:bg-black/90 shadow-2xl shadow-black/5 transition-all duration-300 hover:shadow-black/10"
                />
              </div>
            </form>
          </div>

          {/* Footer Text - Centered */}
          <div className="mt-12 text-center">
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-black/20">
              Secure Authentication
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
