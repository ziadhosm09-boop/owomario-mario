import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Megaphone, Plus, Trash2, ExternalLink, X, Loader2 } from "lucide-react";
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newAd, setNewAd] = useState({ title: "", content: "", image_url: "", link_url: "" });

  useEffect(() => {
    fetchAds();
    if (user) checkAdmin();
  }, [user]);

  const checkAdmin = async () => {
    if (!user) return;
    const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    setIsAdmin(!!data);
  };

  const fetchAds = async () => {
    setLoading(true);
    const { data } = await supabase.from("ads").select("*").order("created_at", { ascending: false });
    setAds((data as Ad[]) || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newAd.content.trim()) return;
    setCreating(true);
    try {
      const { error } = await supabase.from("ads").insert({
        title: newAd.title || null,
        content: newAd.content,
        image_url: newAd.image_url || null,
        link_url: newAd.link_url || null,
        created_by: user!.id,
      });
      if (error) throw error;
      toast({ title: "Ad created!" });
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
      const { error } = await supabase.from("ads").delete().eq("id", id);
      if (error) throw error;
      setAds(ads.filter(a => a.id !== id));
      toast({ title: "Ad deleted" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  if (loading || ads.length === 0 && !isAdmin) return null;

  return (
    <div className="space-y-4">
      {/* Admin controls */}
      {isAdmin && (
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

      {/* Ads display */}
      {ads.map(ad => (
        <Card key={ad.id} className="glass-card border-amber-500/20 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          {isAdmin && (
            <Button variant="ghost" size="icon" onClick={() => handleDelete(ad.id)}
              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10 z-10">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 shrink-0">
                <Megaphone className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                {ad.title && <h3 className="font-bold text-lg">{ad.title}</h3>}
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ad.content}</p>
                {ad.image_url && (
                  <img src={ad.image_url} alt="Ad" className="rounded-lg max-h-48 object-cover mt-2" />
                )}
                {ad.link_url && (
                  <a href={ad.link_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-2">
                    <ExternalLink className="w-3.5 h-3.5" /> Open Link
                  </a>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <Badge variant="outline" className="text-xs border-amber-500/20 text-amber-400">
                    <Megaphone className="w-3 h-3 mr-1" /> AD
                  </Badge>
                  <span className="text-xs text-muted-foreground">{new Date(ad.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
