
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Megaphone, Plus, Trash2, ExternalLink, Loader2, Lock, Unlock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Ad {
  id: string;
  title: string | null;
  content: string;
  image_url: string | null;
  link_url: string | null;
  created_at: string;
  created_by: string;
}

export const AdsBanner = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [newAd, setNewAd] = useState({ title: "", content: "", image_url: "", link_url: "" });

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    setLoading(true);
    const { data } = await supabase.from("ads").select("*").order("created_at", { ascending: false });
    setAds((data as Ad[]) || []);
    setLoading(false);
  };

  const handlePasswordSubmit = async () => {
    // Validate password server-side only
    try {
      const res = await supabase.functions.invoke("manage-ads", {
        body: { action: "verify", password },
      });
      if (res.error || res.data?.error) {
        setPasswordError(true);
        return;
      }
      setAdminUnlocked(true);
      setShowPasswordDialog(false);
      setPasswordError(false);
      toast({ title: "🔓 Admin Mode Unlocked" });
    } catch {
      setPasswordError(true);
    }
  };

  const handleCreate = async () => {
    if (!newAd.content.trim()) return;
    setCreating(true);
    try {
      const res = await supabase.functions.invoke("manage-ads", {
        body: {
          action: "create",
          password,
          title: newAd.title || null,
          content: newAd.content,
          image_url: newAd.image_url || null,
          link_url: newAd.link_url || null,
          created_by: user?.id || "00000000-0000-0000-0000-000000000000",
        },
      });
      if (res.error) throw new Error(res.error.message);
      toast({ title: "✅ Ad created!" });
      setNewAd({ title: "", content: "", image_url: "", link_url: "" });
      setShowCreateDialog(false);
      fetchAds();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await supabase.functions.invoke("manage-ads", {
        body: { action: "delete", password, id },
      });
      if (res.error) throw new Error(res.error.message);
      setAds(ads.filter(a => a.id !== id));
      toast({ title: "Ad deleted" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  if (loading || (ads.length === 0 && !adminUnlocked)) return null;

  return (
    <div className="space-y-4">
      {/* Admin unlock button */}
      {!adminUnlocked && (
        <div className="flex justify-end">
          <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 opacity-30 hover:opacity-100 transition-opacity">
                <Lock className="w-3.5 h-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-strong max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Lock className="w-5 h-5" /> Admin Access</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setPasswordError(false); }}
                    placeholder="Enter admin password"
                    className="bg-background/50 border-white/10"
                    onKeyDown={e => e.key === "Enter" && handlePasswordSubmit()}
                  />
                  {passwordError && <p className="text-xs text-destructive mt-1">Wrong password</p>}
                </div>
                <Button onClick={handlePasswordSubmit} className="w-full gap-2">
                  <Unlock className="w-4 h-4" /> Unlock
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Admin controls */}
      {adminUnlocked && (
        <div className="flex justify-end">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90">
                <Plus className="w-4 h-4" /> New Ad
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-strong">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Megaphone className="w-5 h-5" /> Create Ad</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Title (optional)</Label>
                  <Input value={newAd.title} onChange={e => setNewAd({ ...newAd, title: e.target.value })} placeholder="Ad title" className="bg-background/50 border-white/10" />
                </div>
                <div>
                  <Label>Content *</Label>
                  <Textarea value={newAd.content} onChange={e => setNewAd({ ...newAd, content: e.target.value })} placeholder="Ad content..." className="bg-background/50 border-white/10 min-h-[100px]" />
                </div>
                <div>
                  <Label>Image URL (optional)</Label>
                  <Input value={newAd.image_url} onChange={e => setNewAd({ ...newAd, image_url: e.target.value })} placeholder="https://..." className="bg-background/50 border-white/10" />
                </div>
                <div>
                  <Label>Link URL (optional)</Label>
                  <Input value={newAd.link_url} onChange={e => setNewAd({ ...newAd, link_url: e.target.value })} placeholder="https://..." className="bg-background/50 border-white/10" />
                </div>
                <Button onClick={handleCreate} disabled={creating || !newAd.content.trim()} className="w-full">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Create Ad
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Watermark-style Ads */}
      {ads.map(ad => (
        <div
          key={ad.id}
          className="relative overflow-hidden rounded-2xl border border-amber-500/10 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5 backdrop-blur-sm group"
        >
          {/* Watermark background text */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden opacity-[0.03]">
            <span className="text-[120px] font-black tracking-widest text-amber-500 rotate-[-15deg] whitespace-nowrap">
              AD AD AD AD
            </span>
          </div>

          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

          {/* Delete button for admin */}
          {adminUnlocked && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(ad.id)}
              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10 z-10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}

          <div className="relative z-[1] p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 shrink-0 border border-amber-500/20">
                <Megaphone className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400/70 px-2 py-0.5 rounded-full border border-amber-500/20 bg-amber-500/5">
                    Sponsored
                  </span>
                </div>
                {ad.title && <h3 className="font-bold text-lg leading-tight">{ad.title}</h3>}
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{ad.content}</p>
                {ad.image_url && (
                  <img src={ad.image_url} alt="Ad" className="rounded-xl max-h-48 object-cover mt-2 border border-white/5" />
                )}
                {ad.link_url && (
                  <a
                    href={ad.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 transition-colors mt-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open Link
                  </a>
                )}
                <div className="text-[10px] text-muted-foreground/50 pt-1">
                  {new Date(ad.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
