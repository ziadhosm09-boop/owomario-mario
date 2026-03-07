
import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  message: string;
  ticket_id: string;
  created_at: string;
  read: boolean;
}

export const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Listen for new messages on tickets where user is buyer or seller
    const channel = supabase
      .channel("p2p-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "p2p_messages",
        },
        async (payload) => {
          const msg = payload.new as any;
          // Don't notify for own messages
          if (msg.sender_id === user.id) return;

          // Check if this ticket belongs to the user
          const { data: ticket } = await supabase
            .from("p2p_tickets")
            .select("*")
            .eq("id", msg.ticket_id)
            .single();

          if (!ticket) return;
          if (ticket.buyer_id !== user.id && ticket.seller_id !== user.id) return;

          const notif: Notification = {
            id: msg.id,
            message: msg.message.length > 50 ? msg.message.substring(0, 50) + "..." : msg.message,
            ticket_id: msg.ticket_id,
            created_at: msg.created_at,
            read: false,
          };
          setNotifications((prev) => [notif, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    // Also listen for new tickets where user is seller
    const ticketChannel = supabase
      .channel("p2p-ticket-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "p2p_tickets",
        },
        async (payload) => {
          const ticket = payload.new as any;
          if (ticket.seller_id !== user.id) return;

          const notif: Notification = {
            id: ticket.id,
            message: "📩 New ticket opened on your listing",
            ticket_id: ticket.id,
            created_at: ticket.created_at,
            read: false,
          };
          setNotifications((prev) => [notif, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(ticketChannel);
    };
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleClick = (notif: Notification) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    );
    setOpen(false);
    navigate("/p2p");
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative glass border-white/10 hover:bg-white/5 p-2">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 glass-strong" align="end">
        <div className="flex items-center justify-between p-3 border-b border-white/10">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs h-7">
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map((notif) => (
              <button
                key={notif.id}
                onClick={() => handleClick(notif)}
                className={`w-full text-left p-3 hover:bg-white/5 transition-colors border-b border-white/5 ${
                  !notif.read ? "bg-primary/5" : ""
                }`}
              >
                <p className="text-sm truncate">{notif.message}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(notif.created_at).toLocaleTimeString()}
                </p>
                {!notif.read && (
                  <Badge className="mt-1 text-[9px] h-4 bg-primary/20 text-primary border-0">New</Badge>
                )}
              </button>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
