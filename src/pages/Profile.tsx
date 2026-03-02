import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User, History, CheckCircle, XCircle, Clock, LogOut, Loader2, Eye, Download, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface ActivityItem {
  id: string;
  tool_name: string;
  action: string;
  input_summary: string | null;
  result_summary: string | null;
  success: boolean;
  created_at: string;
  details: any;
}

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState<string[]>([]);
  const [dialogTitle, setDialogTitle] = useState("");

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
        .limit(200);
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

  const downloadResults = (items: string[], filename: string) => {
    const blob = new Blob([items.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openDialog = (items: string[], title: string) => {
    setDialogContent(items);
    setDialogTitle(title);
    setDialogOpen(true);
  };

  const copyAll = () => {
    navigator.clipboard.writeText(dialogContent.join("\n"));
    toast.success("Copied All");
  };

  // Extract viewable result categories from details
  const getResultCategories = (item: ActivityItem) => {
    if (!item.details?.results) return [];
    const results = item.details.results;
    const categories: { key: string; title: string; items: string[]; count: number }[] = [];

    // Handle different result structures
    if (results.working || results.invalid || results.email_locked || results.phone_locked || results.errors) {
      // Status check results
      if (results.working?.length) categories.push({ key: "working", title: "Working", items: results.working, count: results.working.length });
      if (results.email_locked?.length) categories.push({ key: "email_locked", title: "Email Locked", items: results.email_locked, count: results.email_locked.length });
      if (results.phone_locked?.length) categories.push({ key: "phone_locked", title: "Phone Locked", items: results.phone_locked, count: results.phone_locked.length });
      if (results.invalid?.length) categories.push({ key: "invalid", title: "Invalid", items: results.invalid, count: results.invalid.length });
      if (results.errors?.length) categories.push({ key: "errors", title: "Errors", items: results.errors, count: results.errors.length });
    }
    if (results.success && Array.isArray(results.success)) {
      categories.push({ key: "success", title: "Success", items: results.success, count: results.success.length });
    }
    if (results.failed && Array.isArray(results.failed)) {
      categories.push({ key: "failed", title: "Failed", items: results.failed, count: results.failed.length });
    }
    if (results.trial && Array.isArray(results.trial)) {
      categories.push({ key: "trial", title: "Trial", items: results.trial, count: results.trial.length });
    }
    if (results.no_trial && Array.isArray(results.no_trial)) {
      categories.push({ key: "no_trial", title: "No Trial", items: results.no_trial, count: results.no_trial.length });
    }
    // Status results nested
    if (results.status) {
      const s = results.status;
      if (s.working?.length) categories.push({ key: "status_working", title: "Working", items: s.working, count: s.working.length });
      if (s.email_locked?.length) categories.push({ key: "status_email", title: "Email Locked", items: s.email_locked, count: s.email_locked.length });
      if (s.phone_locked?.length) categories.push({ key: "status_phone", title: "Phone Locked", items: s.phone_locked, count: s.phone_locked.length });
      if (s.invalid?.length) categories.push({ key: "status_invalid", title: "Invalid", items: s.invalid, count: s.invalid.length });
    }
    // Flags nested
    if (results.flags) {
      const f = results.flags;
      if (f.valid?.length) categories.push({ key: "flags_clean", title: "Clean", items: f.valid, count: f.valid.length });
      if (f.flagged?.length) categories.push({ key: "flags_flagged", title: "Flagged", items: f.flagged, count: f.flagged.length });
      if (f.locked?.length) categories.push({ key: "flags_locked", title: "Locked", items: f.locked, count: f.locked.length });
    }
    return categories;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/8 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/6 rounded-full blur-[128px]" />
      </div>

      <main className="flex-1 pt-24 pb-12 relative z-10">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Profile Card */}
          <Card className="glass-card border-white/5 mb-8">
            <CardContent className="p-8">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow">
                    <User className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{profile?.username || "User"}</h2>
                    <p className="text-muted-foreground text-sm">{profile?.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Joined {new Date(profile?.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button variant="outline" onClick={handleLogout} className="gap-2 border-white/10 hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive">
                  <LogOut className="w-4 h-4" /> Logout
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Activity History */}
          <Card className="glass-card border-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Activity History
                <Badge variant="secondary" className="ml-2">{history.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No activity yet. Start using tools!</p>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-3">
                    {history.map((item) => {
                      const isExpanded = expandedId === item.id;
                      const categories = getResultCategories(item);
                      const hasDetails = categories.length > 0;

                      return (
                        <div key={item.id} className="rounded-xl glass border-white/5 overflow-hidden transition-all">
                          <div
                            className={`flex items-start gap-3 p-4 ${hasDetails ? 'cursor-pointer hover:bg-white/[0.02]' : ''} transition-colors`}
                            onClick={() => hasDetails && setExpandedId(isExpanded ? null : item.id)}
                          >
                            <div className="mt-1">
                              {item.success ? (
                                <CheckCircle className="w-5 h-5 text-green-400" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                                  {item.tool_name}
                                </Badge>
                                <span className="text-sm font-medium">{item.action}</span>
                              </div>
                              {item.input_summary && (
                                <p className="text-xs text-muted-foreground mb-0.5">Input: {item.input_summary}</p>
                              )}
                              {item.result_summary && (
                                <p className="text-sm text-muted-foreground truncate">
                                  {item.result_summary}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {new Date(item.created_at).toLocaleString()}
                              </div>
                              {hasDetails && (
                                isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>

                          {/* Expanded details */}
                          {isExpanded && hasDetails && (
                            <div className="px-4 pb-4 pt-0 border-t border-white/5">
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-3">
                                {categories.map((cat) => (
                                  <div key={cat.key} className="flex items-center justify-between gap-2 p-2 rounded-lg glass text-sm">
                                    <span className="truncate">{cat.title}</span>
                                    <div className="flex items-center gap-1">
                                      <Badge variant="outline" className="text-xs border-white/10">{cat.count}</Badge>
                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                                        onClick={(e) => { e.stopPropagation(); openDialog(cat.items, cat.title); }}>
                                        <Eye className="w-3 h-3" />
                                      </Button>
                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                                        onClick={(e) => { e.stopPropagation(); downloadResults(cat.items, `${cat.key}.txt`); }}>
                                        <Download className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />

      {/* View Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl glass-strong">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogContent.length} items</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mb-2">
            <Button variant="outline" size="sm" onClick={copyAll} className="border-white/10"><Copy className="w-4 h-4 mr-1" /> Copy All</Button>
            <Button variant="outline" size="sm" onClick={() => downloadResults(dialogContent, `${dialogTitle}.txt`)} className="border-white/10"><Download className="w-4 h-4 mr-1" /> Download</Button>
          </div>
          <ScrollArea className="h-[400px] rounded-xl border border-white/5 p-4">
            <div className="space-y-2">
              {dialogContent.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg glass group">
                  <span className="font-mono text-sm truncate flex-1 mr-2">{item}</span>
                  <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(item); toast.success("Copied"); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
