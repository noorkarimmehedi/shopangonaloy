import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Package, Eye, EyeOff } from "lucide-react";
import ProceduralGroundBackground from "@/components/ui/animated-pattern-cloud";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Identity verified");
      navigate("/");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signUp(email, password);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Verification link dispatched");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row border-collapse">
      {/* Brand Section — Stark Swiss */}
      <div className="w-full md:w-1/2 md:min-h-screen bg-primary flex flex-col justify-between p-12 md:p-20 text-primary-foreground border-r border-border">
        <div className="space-y-12">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white flex items-center justify-center p-4">
              <img src="/favicon.svg" alt="Logo" className="w-12 h-12 invert" />
            </div>
            <div>
              <h1 className="leading-none text-white tracking-tighter">Angonaloy</h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] mt-2 opacity-60">Inventory Systems v2.4</p>
            </div>
          </div>

          <div className="max-w-md pt-20">
            <h2 className="text-4xl md:text-6xl text-white leading-[0.9] mb-8">Precision Order Management</h2>
            <div className="p-6 border border-white/20 bg-white/5 backdrop-blur-sm">
              <p className="text-xs uppercase font-bold tracking-widest leading-relaxed">
                Secured workspace for real-time Shopify synchronization and fraud verification.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-20">
          <p className="text-[9px] font-bold uppercase tracking-[0.3em] opacity-40">System Availability: 99.9% Uptime</p>
        </div>
      </div>

      {/* Auth Section — Minimal & Rigid */}
      <div className="w-full md:w-1/2 md:min-h-screen flex items-center justify-center p-12 md:p-20">
        <div className="w-full max-w-sm space-y-16">
          <div className="space-y-4">
            <h3 className="text-2xl font-bold uppercase tracking-widest">Authentication</h3>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Please verify your credentials to access the grid.</p>
          </div>

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-none bg-secondary p-1 h-12 mb-10">
              <TabsTrigger value="signin" className="rounded-none font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-background">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-none font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-background">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <form onSubmit={handleSignIn} className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Identity@Workspace</Label>
                  <Input
                    type="email"
                    placeholder="ENTER EMAIL ADDRESS"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-16 rounded-none bg-secondary border-none px-6 text-xs font-bold uppercase tracking-widest placeholder:opacity-30"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Access Token</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-16 rounded-none bg-secondary border-none px-6 text-xs font-bold uppercase tracking-widest placeholder:opacity-30 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-6 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full h-16 rounded-none font-bold uppercase tracking-widest text-xs bg-primary hover:bg-black transition-all" disabled={loading}>
                  {loading ? "Verifying..." : "Confirm Identity"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <form onSubmit={handleSignUp} className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">New Identity</Label>
                  <Input
                    type="email"
                    placeholder="ENTER EMAIL ADDRESS"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-16 rounded-none bg-secondary border-none px-6 text-xs font-bold uppercase tracking-widest placeholder:opacity-30"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Secret Token</Label>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="MIN 6 CHARACTERS"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-16 rounded-none bg-secondary border-none px-6 text-xs font-bold uppercase tracking-widest placeholder:opacity-30"
                  />
                </div>
                <Button type="submit" className="w-full h-16 rounded-none font-bold uppercase tracking-widest text-xs border border-primary text-primary hover:bg-primary hover:text-white transition-all" disabled={loading}>
                  {loading ? "Processing..." : "Create Registry"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="pt-20 border-t border-border">
            <p className="text-[8px] font-bold uppercase tracking-widest leading-loose text-muted-foreground opacity-60">
              AUTHORIZED PERSONNEL ONLY. ALL SYSTEM ACCESS IS LOGGED. <br />
              END-TO-END CRYPTOGRAPHIC PROTECTION ENABLED.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
