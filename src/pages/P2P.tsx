
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { P2PTerms } from "@/components/P2PTerms";
import { AdsBanner } from "@/components/AdsBanner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ShoppingCart, Plus, MessageCircle, Send, ArrowLeft, Shield,
  Tag, Package, DollarSign, User, Clock, Loader2, ExternalLink,
  AlertTriangle, X, Star, FileText, Image as ImageIcon
} from "lucide-react";

const DISCORD_SERVER_LINK = "https://discord.gg/cTwUN7C4Mj";

const CATEGORIES = [
  "Discord Tokens (Nitro)",
  "Discord Tokens (Non-Nitro)",
  "Discord Tokens (Aged)",
  "Discord Tokens (Phone Verified)",
  "Discord Tokens (Email Verified)",
  "Discord Tokens (Other)",
  "Other",
];

interface Listing {
  id: string;
  user_id: string;
  discord_username: string;
  discord_id: string;
  listing_type: string;
  item_category: string;
  quantity: number;
  price: number;
  currency: string;
  description: string | null;
  status: string;
  created_at: string;
}

interface Ticket {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  status: string;
  created_at: string;
  listing?: Listing;
}

interface Message {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

interface UserRating {
  avg_rating: number;
  total_ratings: number;
  total_trades: number;
}

type View = "listings" | "create" | "my-listings" | "my-tickets" | "ticket-chat" | "terms";

const isImageUrl = (url: string) => /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(url.trim());

const P2P = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<View>("listings");
  const [listings, setListings] = useState<Listing[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sellerRatings, setSellerRatings] = useState<Record<string, UserRating>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Username dialog
  const [showUsernameDialog, setShowUsernameDialog] = useState(false);
  const [p2pUsername, setP2pUsername] = useState("");
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [savingUsername, setSavingUsername] = useState(false);

  // Rating dialog
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingReview, setRatingReview] = useState("");
  const [ratingTarget, setRatingTarget] = useState<{ ticketId: string; userId: string } | null>(null);
  const [submittingRating, setSubmittingRating] = useState(false);

  // Create form
  const [form, setForm] = useState({
    discord_username: "",
    discord_id: "",
    listing_type: "sell",
    item_category: CATEGORIES[0],
    quantity: 1,
    price: 0,
    currency: "USD",
    description: "",
  });

  useEffect(() => {
    fetchListings();
    if (user) checkUsername();
  }, [user]);

  useEffect(() => {
    if (view === "my-listings") fetchMyListings();
    if (view === "my-tickets") fetchMyTickets();
  }, [view]);

  useEffect(() => {
    if (!activeTicket) return;
    fetchMessages(activeTicket.id);

    const channel = supabase
      .channel(`ticket-${activeTicket.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "p2p_messages",
        filter: `ticket_id=eq.${activeTicket.id}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const checkUsername = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("p2p_username").eq("id", user.id).single();
    if (data?.p2p_username) {
      setCurrentUsername(data.p2p_username);
    } else {
      setShowUsernameDialog(true);
    }
  };

  const handleSetUsername = async () => {
    if (!user || !p2pUsername.trim()) return;
    setSavingUsername(true);
    try {
      const { error } = await supabase.from("profiles").update({ p2p_username: p2pUsername.trim() } as any).eq("id", user.id);
      if (error) throw error;
      setCurrentUsername(p2pUsername.trim());
      setShowUsernameDialog(false);
      toast({ title: "✅ Username set!" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSavingUsername(false);
    }
  };

  const fetchListings = async () => {
    setLoading(true);
    const { data } = await supabase.from("p2p_listings").select("*").eq("status", "active").order("created_at", { ascending: false });
    const listingsData = (data || []) as Listing[];
    setListings(listingsData);

    // Fetch ratings for all sellers
    const sellerIds = [...new Set(listingsData.map(l => l.user_id))];
    const ratingsMap: Record<string, UserRating> = {};
    await Promise.all(sellerIds.map(async (sid) => {
      const { data: rData } = await supabase.rpc("get_user_rating", { _user_id: sid });
      if (rData && rData.length > 0) {
        ratingsMap[sid] = rData[0] as UserRating;
      }
    }));
    setSellerRatings(ratingsMap);
    setLoading(false);
  };

  const fetchMyListings = async () => {
    if (!user) return;
    const { data } = await supabase.from("p2p_listings").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setMyListings((data || []) as Listing[]);
  };

  const fetchMyTickets = async () => {
    if (!user) return;
    const { data: tickets } = await supabase.from("p2p_tickets").select("*").order("created_at", { ascending: false });
    if (!tickets?.length) { setMyTickets([]); return; }

    const listingIds = [...new Set((tickets as Ticket[]).map(t => t.listing_id))];
    const { data: listingsData } = await supabase.from("p2p_listings").select("*").in("id", listingIds);
    const listingsMap = new Map((listingsData || []).map((l: any) => [l.id, l]));

    setMyTickets((tickets as Ticket[]).map(t => ({ ...t, listing: listingsMap.get(t.listing_id) as Listing })));
  };

  const fetchMessages = async (ticketId: string) => {
    const { data } = await supabase.from("p2p_messages").select("*").eq("ticket_id", ticketId).order("created_at", { ascending: true });
    setMessages((data || []) as Message[]);
  };

  const handleCreateListing = async () => {
    if (!user || !form.discord_username || !form.discord_id || !form.price) {
      toast({ title: "Fill all required fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("p2p_listings").insert({
        user_id: user.id,
        discord_username: form.discord_username,
        discord_id: form.discord_id,
        listing_type: form.listing_type,
        item_category: form.item_category,
        quantity: form.quantity,
        price: form.price,
        currency: form.currency,
        description: form.description || null,
      });
      if (error) throw error;
      toast({ title: "Listing created!" });
      setView("listings");
      fetchListings();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTicket = async (listing: Listing) => {
    if (!user) return;
    if (listing.user_id === user.id) {
      toast({ title: "Can't buy your own listing", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: existing } = await supabase.from("p2p_tickets")
        .select("*").eq("listing_id", listing.id).eq("buyer_id", user.id).eq("status", "open").limit(1);

      if (existing?.length) {
        setActiveTicket({ ...(existing[0] as Ticket), listing });
        setView("ticket-chat");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.from("p2p_tickets").insert({
        listing_id: listing.id,
        buyer_id: user.id,
        seller_id: listing.user_id,
      }).select().single();

      if (error) throw error;
      setActiveTicket({ ...(data as Ticket), listing });
      setView("ticket-chat");
      toast({ title: "Ticket opened!" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeTicket || !user) return;
    setSending(true);
    try {
      const { error } = await supabase.from("p2p_messages").insert({
        ticket_id: activeTicket.id,
        sender_id: user.id,
        message: newMessage.trim(),
      });
      if (error) throw error;
      setNewMessage("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleSendImage = () => {
    const url = prompt("Paste image URL:");
    if (!url?.trim()) return;
    if (!isImageUrl(url)) {
      toast({ title: "Invalid image URL", variant: "destructive" });
      return;
    }
    setNewMessage(url.trim());
    // Will be sent on next Enter/click
  };

  const handleRequestMediator = async () => {
    if (!activeTicket || !user) return;
    setSending(true);
    try {
      const { error } = await supabase.from("p2p_messages").insert({
        ticket_id: activeTicket.id,
        sender_id: user.id,
        message: `🛡️ طلب وسيط\n\nلطلب الوسيط ارجو دخول هذا السيرفر:\n${DISCORD_SERVER_LINK}\n\nافتح تيكيت واكتب تفاصيل الصفقة.`,
      });
      if (error) throw error;
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleDeleteListing = async (id: string) => {
    try {
      const { error } = await supabase.from("p2p_listings").delete().eq("id", id);
      if (error) throw error;
      setMyListings(prev => prev.filter(l => l.id !== id));
      toast({ title: "Listing deleted" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleCloseTicket = async () => {
    if (!activeTicket || !user) return;
    try {
      const { error } = await supabase.from("p2p_tickets").update({ status: "closed" }).eq("id", activeTicket.id);
      if (error) throw error;
      toast({ title: "Ticket closed" });

      // Show rating dialog
      const otherUserId = activeTicket.buyer_id === user.id ? activeTicket.seller_id : activeTicket.buyer_id;
      setRatingTarget({ ticketId: activeTicket.id, userId: otherUserId });
      setShowRatingDialog(true);

      setActiveTicket({ ...activeTicket, status: "closed" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleSubmitRating = async () => {
    if (!ratingTarget || !user) return;
    setSubmittingRating(true);
    try {
      const { error } = await supabase.from("p2p_ratings" as any).insert({
        ticket_id: ratingTarget.ticketId,
        rater_id: user.id,
        rated_user_id: ratingTarget.userId,
        rating: ratingValue,
        review: ratingReview || null,
      } as any);
      if (error) throw error;
      toast({ title: "⭐ Rating submitted!" });
      setShowRatingDialog(false);
      setRatingValue(5);
      setRatingReview("");
      setRatingTarget(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSubmittingRating(false);
    }
  };

  const renderStars = (rating: number, interactive = false) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          className={`w-4 h-4 ${s <= rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"} ${interactive ? "cursor-pointer hover:scale-110 transition-transform" : ""}`}
          onClick={interactive ? () => setRatingValue(s) : undefined}
        />
      ))}
    </div>
  );

  const renderMessage = (msg: Message) => {
    const isMe = msg.sender_id === user?.id;
    const isMediatorRequest = msg.message.includes("🛡️");
    const msgIsImage = isImageUrl(msg.message);

    if (isMediatorRequest) {
      return (
        <div key={msg.id} className="flex justify-center my-3">
          <div className="max-w-[85%] p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-center space-y-2">
            <Shield className="w-6 h-6 text-amber-400 mx-auto" />
            <p className="text-sm font-semibold text-amber-400">طلب وسيط</p>
            <p className="text-xs text-muted-foreground" dir="rtl">لطلب الوسيط ارجو دخول هذا السيرفر:</p>
            <a
              href={DISCORD_SERVER_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-mono"
            >
              <ExternalLink className="w-3.5 h-3.5" /> {DISCORD_SERVER_LINK}
            </a>
            <p className="text-xs text-muted-foreground" dir="rtl">افتح تيكيت واكتب تفاصيل الصفقة</p>
            <span className="text-[10px] text-muted-foreground/50 block">
              {new Date(msg.created_at).toLocaleTimeString()}
            </span>
          </div>
        </div>
      );
    }

    return (
      <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
        <div className={`max-w-[70%] p-3 rounded-2xl ${
          isMe ? "bg-primary/20 text-foreground rounded-br-md" : "glass rounded-bl-md"
        }`}>
          {msgIsImage ? (
            <img src={msg.message} alt="Shared image" className="rounded-xl max-h-64 object-cover" loading="lazy" />
          ) : (
            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
          )}
          <span className="text-[10px] text-muted-foreground mt-1 block">
            {new Date(msg.created_at).toLocaleTimeString()}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-24 pb-12">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-20 left-[15%] w-96 h-96 bg-primary/8 rounded-full blur-[120px]" />
          <div className="absolute top-60 right-[10%] w-80 h-80 bg-secondary/6 rounded-full blur-[120px]" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-primary/20 text-primary mb-4">
                <ShoppingCart className="w-5 h-5" />
                <span className="font-semibold text-sm">P2P Marketplace</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent bg-[length:200%_auto]">
                P2P Trading
              </h1>
              <p className="text-muted-foreground">Buy & sell Discord tokens securely with our ticket system</p>
              {currentUsername && (
                <Badge variant="outline" className="mt-2 border-primary/30 text-primary">
                  <User className="w-3 h-3 mr-1" /> {currentUsername}
                </Badge>
              )}
            </div>

            {/* Warning */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-warning/10 border border-warning/20 mb-6">
              <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-warning">Security Notice</p>
                <p className="text-muted-foreground">Always use a mediator for large trades. We are not responsible for any losses. Discord info is kept private between parties.</p>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex flex-wrap gap-2 mb-6">
              {(view !== "listings") && (
                <Button variant="ghost" onClick={() => { setView("listings"); setActiveTicket(null); }} className="gap-2 glass border-white/10">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
              )}
              <Button variant={view === "listings" ? "default" : "outline"} onClick={() => setView("listings")} className="gap-2">
                <ShoppingCart className="w-4 h-4" /> Browse
              </Button>
              <Button variant={view === "create" ? "default" : "outline"} onClick={() => setView("create")} className="gap-2">
                <Plus className="w-4 h-4" /> Create Listing
              </Button>
              <Button variant={view === "my-listings" ? "default" : "outline"} onClick={() => setView("my-listings")} className="gap-2">
                <Package className="w-4 h-4" /> My Listings
              </Button>
              <Button variant={view === "my-tickets" ? "default" : "outline"} onClick={() => setView("my-tickets")} className="gap-2">
                <MessageCircle className="w-4 h-4" /> My Tickets
              </Button>
              <Button variant={view === "terms" ? "default" : "outline"} onClick={() => setView("terms")} className="gap-2">
                <FileText className="w-4 h-4" /> Terms
              </Button>
            </div>

            {/* ============ TERMS ============ */}
            {view === "terms" && <P2PTerms />}

            {/* ============ BROWSE LISTINGS ============ */}
            {view === "listings" && (
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
                ) : listings.length === 0 ? (
                  <Card className="glass-card"><CardContent className="p-12 text-center text-muted-foreground">No listings yet. Be the first to create one!</CardContent></Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {listings.map(listing => {
                      const rating = sellerRatings[listing.user_id];
                      return (
                        <Card key={listing.id} className="glass-card border-primary/10 hover:border-primary/30 transition-all group">
                          <CardContent className="p-5 space-y-3">
                            <div className="flex items-center justify-between">
                              <Badge className={listing.listing_type === "sell" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-blue-500/20 text-blue-400 border-blue-500/30"}>
                                {listing.listing_type === "sell" ? "🟢 Selling" : "🔵 Buying"}
                              </Badge>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {new Date(listing.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-bold text-lg">{listing.item_category}</h3>
                              {listing.description && <p className="text-sm text-muted-foreground mt-1">{listing.description}</p>}
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="flex items-center gap-1.5"><Package className="w-4 h-4 text-muted-foreground" /> Qty: <strong>{listing.quantity}</strong></span>
                              <span className="flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-green-400" /> <strong>${listing.price}</strong> {listing.currency}</span>
                            </div>
                            {/* Seller rating */}
                            {rating && rating.total_ratings > 0 && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {renderStars(Math.round(rating.avg_rating))}
                                <span>{Number(rating.avg_rating).toFixed(1)} ({rating.total_ratings} reviews • {rating.total_trades} trades)</span>
                              </div>
                            )}
                            {listing.user_id !== user?.id && (
                              <Button onClick={() => handleOpenTicket(listing)} className="w-full gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                                <MessageCircle className="w-4 h-4" /> Open Ticket
                              </Button>
                            )}
                            {listing.user_id === user?.id && (
                              <Badge variant="outline" className="border-muted text-muted-foreground">Your listing</Badge>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ============ CREATE LISTING ============ */}
            {view === "create" && (
              <Card className="glass-card border-primary/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5 text-primary" /> Create Listing</CardTitle>
                  <CardDescription>Your Discord info will only be visible after both parties agree to trade</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Discord Username *</Label>
                      <Input value={form.discord_username} onChange={e => setForm({ ...form, discord_username: e.target.value })}
                        placeholder="username" className="bg-background/50 border-white/10" />
                    </div>
                    <div>
                      <Label>Discord ID *</Label>
                      <Input value={form.discord_id} onChange={e => setForm({ ...form, discord_id: e.target.value })}
                        placeholder="123456789" className="bg-background/50 border-white/10" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Type</Label>
                      <Select value={form.listing_type} onValueChange={v => setForm({ ...form, listing_type: v })}>
                        <SelectTrigger className="bg-background/50 border-white/10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sell">Sell</SelectItem>
                          <SelectItem value="buy">Buy</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Category *</Label>
                      <Select value={form.item_category} onValueChange={v => setForm({ ...form, item_category: v })}>
                        <SelectTrigger className="bg-background/50 border-white/10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label>Quantity *</Label>
                      <Input type="number" min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })}
                        className="bg-background/50 border-white/10" />
                    </div>
                    <div>
                      <Label>Price ($) *</Label>
                      <Input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })}
                        className="bg-background/50 border-white/10" />
                    </div>
                    <div>
                      <Label>Currency</Label>
                      <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                        <SelectTrigger className="bg-background/50 border-white/10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="EGP">EGP</SelectItem>
                          <SelectItem value="USDT">USDT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Description (optional)</Label>
                    <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                      placeholder="Additional details..." className="bg-background/50 border-white/10" />
                  </div>
                  <Button onClick={handleCreateListing} disabled={loading} className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Create Listing
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* ============ MY LISTINGS ============ */}
            {view === "my-listings" && (
              <div className="space-y-4">
                {myListings.length === 0 ? (
                  <Card className="glass-card"><CardContent className="p-12 text-center text-muted-foreground">No listings yet</CardContent></Card>
                ) : myListings.map(listing => (
                  <Card key={listing.id} className="glass-card border-primary/10">
                    <CardContent className="p-5 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={listing.listing_type === "sell" ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"}>
                            {listing.listing_type === "sell" ? "Selling" : "Buying"}
                          </Badge>
                          <Badge variant="outline">{listing.status}</Badge>
                        </div>
                        <h3 className="font-bold">{listing.item_category}</h3>
                        <p className="text-sm text-muted-foreground">Qty: {listing.quantity} • ${listing.price} {listing.currency}</p>
                      </div>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteListing(listing.id)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* ============ MY TICKETS ============ */}
            {view === "my-tickets" && (
              <div className="space-y-4">
                {myTickets.length === 0 ? (
                  <Card className="glass-card"><CardContent className="p-12 text-center text-muted-foreground">No tickets yet</CardContent></Card>
                ) : myTickets.map(ticket => (
                  <Card key={ticket.id} className="glass-card border-primary/10 cursor-pointer hover:border-primary/30 transition-all"
                    onClick={() => { setActiveTicket(ticket); setView("ticket-chat"); }}>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={ticket.status === "open" ? "border-green-500/30 text-green-400" : "border-muted text-muted-foreground"}>
                              {ticket.status}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {ticket.buyer_id === user?.id ? "You're buying" : "You're selling"}
                            </Badge>
                          </div>
                          <h3 className="font-bold">{ticket.listing?.item_category || "Unknown"}</h3>
                          <p className="text-sm text-muted-foreground">
                            Qty: {ticket.listing?.quantity} • ${ticket.listing?.price} {ticket.listing?.currency}
                          </p>
                        </div>
                        <MessageCircle className="w-5 h-5 text-primary" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* ============ TICKET CHAT ============ */}
            {view === "ticket-chat" && activeTicket && (
              <div className="space-y-4">
                <Card className="glass-card border-primary/10">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-primary" />
                        Ticket #{activeTicket.id.slice(0, 8)}
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleRequestMediator} disabled={sending}
                          className="gap-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
                          <Shield className="w-4 h-4" /> Request Mediator
                        </Button>
                        {activeTicket.status === "open" && (
                          <Button variant="destructive" size="sm" onClick={handleCloseTicket}>Close</Button>
                        )}
                      </div>
                    </div>
                    <CardDescription>
                      {activeTicket.listing?.item_category} • Qty: {activeTicket.listing?.quantity} • ${activeTicket.listing?.price}
                    </CardDescription>
                  </CardHeader>
                </Card>

                {/* Messages */}
                <Card className="glass-card border-white/5">
                  <CardContent className="p-0">
                    <ScrollArea className="h-[400px] p-4">
                      <div className="space-y-3">
                        <div className="text-center py-2">
                          <span className="text-xs text-muted-foreground px-3 py-1 rounded-full glass">
                            Ticket opened • Keep communication respectful
                          </span>
                        </div>
                        {messages.map(msg => renderMessage(msg))}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>
                    {activeTicket.status === "open" && (
                      <div className="p-4 border-t border-white/5 flex gap-2">
                        <Button variant="ghost" size="icon" onClick={handleSendImage} className="shrink-0 text-muted-foreground hover:text-primary">
                          <ImageIcon className="w-5 h-5" />
                        </Button>
                        <Input value={newMessage} onChange={e => setNewMessage(e.target.value)}
                          placeholder="Type a message..."
                          className="bg-background/50 border-white/10"
                          onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSendMessage()} />
                        <Button onClick={handleSendMessage} disabled={sending || !newMessage.trim()} size="icon"
                          className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 shrink-0">
                          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </Button>
                      </div>
                    )}
                    {activeTicket.status !== "open" && (
                      <div className="p-4 text-center text-sm text-muted-foreground border-t border-white/5">
                        This ticket is closed
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
          <div className="container mx-auto px-4 py-6"><AdsBanner /></div>
        </div>
      </main>
      <Footer />

      {/* Username Dialog */}
      <Dialog open={showUsernameDialog} onOpenChange={setShowUsernameDialog}>
        <DialogContent className="glass-strong max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Set P2P Username</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Choose a username that will be displayed in the P2P marketplace.</p>
            <Input
              value={p2pUsername}
              onChange={e => setP2pUsername(e.target.value)}
              placeholder="Your P2P username"
              className="bg-background/50 border-white/10"
              onKeyDown={e => e.key === "Enter" && handleSetUsername()}
            />
            <Button onClick={handleSetUsername} disabled={savingUsername || !p2pUsername.trim()} className="w-full">
              {savingUsername ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Set Username
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rating Dialog */}
      <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <DialogContent className="glass-strong max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Star className="w-5 h-5 text-yellow-400" /> Rate this trade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star
                    key={s}
                    className={`w-8 h-8 cursor-pointer transition-all hover:scale-110 ${s <= ratingValue ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`}
                    onClick={() => setRatingValue(s)}
                  />
                ))}
              </div>
            </div>
            <Textarea
              value={ratingReview}
              onChange={e => setRatingReview(e.target.value)}
              placeholder="Write a review (optional)..."
              className="bg-background/50 border-white/10"
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowRatingDialog(false)} className="flex-1 border-white/10">Skip</Button>
              <Button onClick={handleSubmitRating} disabled={submittingRating} className="flex-1">
                {submittingRating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default P2P;
