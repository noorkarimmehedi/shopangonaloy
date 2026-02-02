import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserPlus, Trash2, Users, Copy, Check, Eye, EyeOff } from "lucide-react";

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
    <div className="space-y-6">
      {/* Create Team Member Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create Team Member
          </CardTitle>
          <CardDescription>
            Generate login credentials for a new team member. Share the credentials with them so they can log in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleCreateMember} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="member-email">Email address</Label>
                <Input
                  id="member-email"
                  type="email"
                  placeholder="team.member@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-password">Password (optional)</Label>
                <Input
                  id="member-password"
                  type="text"
                  placeholder="Leave empty to auto-generate"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" disabled={creating}>
              <UserPlus className="h-4 w-4 mr-2" />
              {creating ? "Creating..." : "Create Member"}
            </Button>
          </form>

          {/* Generated Credentials Display */}
          {generatedCredentials && (
            <div className="mt-6 p-4 bg-muted rounded-lg border space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <Check className="h-4 w-4" />
                Credentials Generated - Share these with the team member
              </div>
              
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-background rounded border text-sm">
                      {generatedCredentials.email}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(generatedCredentials.email, "email")}
                    >
                      {copied === "email" ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Password</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-background rounded border text-sm">
                      {showPassword ? generatedCredentials.password : "••••••••••••"}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(generatedCredentials.password, "password")}
                    >
                      {copied === "password" ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
          <CardDescription>
            Users with access to this dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4 text-muted-foreground">Loading...</div>
          ) : members.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No team members yet. Create one above to get started!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-mono text-xs">
                      {member.user_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={member.role === "admin" ? "default" : "secondary"}
                      >
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(member.created_at)}</TableCell>
                    <TableCell>
                      {member.user_id !== user?.id && member.role !== "admin" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMember(member.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
