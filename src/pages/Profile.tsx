import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User, Mail, Shield, Clock } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [lastSignIn, setLastSignIn] = useState("");

  useEffect(() => {
    getProfile();
  }, []);

  async function getProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || "");
        setFullName(user.user_metadata?.full_name || "");
        setLastSignIn(new Date(user.last_sign_in_at || "").toLocaleString());
      }
    } catch (error) {
        console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile() {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName }
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Profile updated successfully!");
    }
    setSaving(false);
  }

  if (loading) {
      return <div className="p-8">Loading profile...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Standard Page Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          My Profile
        </h1>
        <p className="text-muted-foreground">Manage your personal details and account security.</p>
      </div>
      
      <div className="grid gap-6 max-w-3xl">
        {/* Main Profile Settings Card */}
        <Card className="glass-card border-border/50">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Personal Information
                </CardTitle>
                <CardDescription>Update your public profile details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                
                {/* Email Field (Read Only) */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Email Address</label>
                    <div className="flex items-center justify-between p-3 border border-border/50 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-foreground">{email}</span>
                        </div>
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-0">
                            Verified
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground pl-1">Your email address is managed by your identity provider.</p>
                </div>

                <Separator className="bg-border/50" />

                {/* Full Name Field (Editable) */}
                <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="fullName">Full Name</label>
                    <div className="relative">
                        <User className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
                        <Input 
                            id="fullName"
                            className="pl-9 glass-card border-border/50 bg-background/50" 
                            value={fullName} 
                            onChange={(e) => setFullName(e.target.value)} 
                            placeholder="Enter your full name"
                        />
                    </div>
                </div>

                <div className="pt-2 flex justify-end">
                    <Button 
                        onClick={updateProfile} 
                        disabled={saving} 
                        className="bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 min-w-[120px]"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                    </Button>
                </div>
            </CardContent>
        </Card>
        
        {/* Security & Status Card */}
        <Card className="glass-card border-border/50">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Account Security
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="rounded-lg border border-border/50 divide-y divide-border/50">
                    {/* Role Status */}
                    <div className="flex items-center justify-between p-4">
                        <div className="space-y-0.5">
                            <div className="font-medium">System Role</div>
                            <div className="text-sm text-muted-foreground">Your current permission level.</div>
                        </div>
                        <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
                            Administrator
                        </Badge>
                    </div>
                    
                    {/* Last Login */}
                    <div className="flex items-center justify-between p-4">
                        <div className="space-y-0.5">
                            <div className="font-medium flex items-center gap-2">
                                <Clock className="h-4 w-4" /> Last Active
                            </div>
                            <div className="text-sm text-muted-foreground">{lastSignIn || "N/A"}</div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Need to add this import at top if not present in your project
import { Loader2 } from "lucide-react";