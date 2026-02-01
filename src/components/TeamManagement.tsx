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
import { UserPlus, Trash2, Mail, Users } from "lucide-react";

interface TeamInvite {
  id: string;
  email: string;
  created_at: string;
  invited_by: string;
}

interface TeamMember {
  id: string;
  user_id: string;
  role: "admin" | "team_member";
  created_at: string;
}

export function TeamManagement() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvitesAndMembers();
  }, []);

  const fetchInvitesAndMembers = async () => {
    try {
      const [invitesRes, membersRes] = await Promise.all([
        supabase.from("team_invites").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("*").order("created_at", { ascending: false }),
      ]);

      if (invitesRes.error) throw invitesRes.error;
      if (membersRes.error) throw membersRes.error;

      setInvites(invitesRes.data || []);
      setMembers(membersRes.data || []);
    } catch (error) {
      console.error("Error fetching team data:", error);
      toast.error("Failed to load team data");
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    setInviting(true);
    try {
      // Check if already invited
      const existingInvite = invites.find(
        (invite) => invite.email.toLowerCase() === email.toLowerCase()
      );
      if (existingInvite) {
        toast.error("This email has already been invited");
        return;
      }

      const { error } = await supabase.from("team_invites").insert({
        email: email.toLowerCase().trim(),
        invited_by: user.id,
      });

      if (error) throw error;

      toast.success(`Invitation sent to ${email}`);
      setEmail("");
      fetchInvitesAndMembers();
    } catch (error) {
      console.error("Error sending invite:", error);
      toast.error("Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  const handleDeleteInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from("team_invites")
        .delete()
        .eq("id", inviteId);

      if (error) throw error;

      toast.success("Invitation deleted");
      setInvites((prev) => prev.filter((invite) => invite.id !== inviteId));
    } catch (error) {
      console.error("Error deleting invite:", error);
      toast.error("Failed to delete invitation");
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Invite Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Team Member
          </CardTitle>
          <CardDescription>
            Send an invitation email to add a new team member. They will be able to sign up using the invited email address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="invite-email" className="sr-only">
                Email address
              </Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="team.member@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={inviting}>
              <Mail className="h-4 w-4 mr-2" />
              {inviting ? "Sending..." : "Send Invite"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              These invitations are waiting for the recipients to sign up.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell className="font-medium">{invite.email}</TableCell>
                    <TableCell>{formatDate(invite.created_at)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteInvite(invite.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

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
              No team members yet. Invite someone to get started!
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
