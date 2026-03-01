import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, History, CheckCircle, XCircle, Clock, LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ActivityItem {
  id: string;
  tool_name: string;
  action: string;
  input_summary: string | null;
  result_summary: string | null;
  success: boolean;
  created_at: string;
}

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(profileData);

      const { data: historyData } = await supabase
        .from("activity_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      setHistory((historyData as ActivityItem[]) || []);
      setLoading(false);
    };
    fetchData();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out");
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Profile Card */}
          <Card className="backdrop-blur-xl bg-card/60 border-white/10 mb-8">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{profile?.username || "User"}</h2>
                    <p className="text-muted-foreground text-sm">{profile?.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Joined {new Date(profile?.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button variant="outline" onClick={handleLogout} className="gap-2 border-white/10">
                  <LogOut className="w-4 h-4" /> Logout
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Activity History */}
          <Card className="backdrop-blur-xl bg-card/60 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Activity History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No activity yet. Start using tools!</p>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 p-4 rounded-xl bg-background/50 border border-white/5 hover:border-white/10 transition-colors"
                      >
                        <div className="mt-1">
                          {item.success ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs">
                              {item.tool_name}
                            </Badge>
                            <span className="text-sm font-medium">{item.action}</span>
                          </div>
                          {item.result_summary && (
                            <p className="text-sm text-muted-foreground truncate">
                              {item.result_summary}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                          <Clock className="w-3 h-3" />
                          {new Date(item.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
