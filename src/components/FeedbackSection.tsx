import { useState, useEffect } from "react";
import { MessageSquare, Send, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FeedbackItem {
  id: string;
  content: string;
  created_at: string;
}

export const FeedbackSection = () => {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [newFeedback, setNewFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchFeedback();
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    setIsAdmin(!!data);
  };

  const fetchFeedback = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setItems(data);
    setLoading(false);
  };

  const handleSubmit = async () => {
    const trimmed = newFeedback.trim();
    if (!trimmed) return;
    if (trimmed.length > 1000) {
      toast.error("Feedback is too long (max 1000 characters)");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("feedback").insert({ content: trimmed });
    if (error) {
      toast.error("Failed to submit feedback");
    } else {
      toast.success("Feedback submitted anonymously! 🙏");
      setNewFeedback("");
      fetchFeedback();
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("feedback").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
    } else {
      setItems(prev => prev.filter(i => i.id !== id));
      toast.success("Feedback deleted");
    }
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <Card className="border-accent/20 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-accent" />
          <span>📝 Feedback / تقييم</span>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Share your feedback anonymously • شارك تقييمك بهوية مخفية
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Textarea
            placeholder="Write your feedback... / اكتب تقييمك هنا..."
            value={newFeedback}
            onChange={(e) => setNewFeedback(e.target.value)}
            className="min-h-[60px] text-sm resize-none"
            maxLength={1000}
          />
          <Button
            onClick={handleSubmit}
            disabled={submitting || !newFeedback.trim()}
            size="icon"
            className="shrink-0 h-auto bg-gradient-accent"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-4">
            No feedback yet • لا يوجد تقييم بعد
          </p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {items.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-lg bg-muted/50 border border-border/50 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm whitespace-pre-wrap break-words">{item.content}</p>
                    <span className="text-xs text-muted-foreground mt-1 block">
                      🕵️ Anonymous • {timeAgo(item.created_at)}
                    </span>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
