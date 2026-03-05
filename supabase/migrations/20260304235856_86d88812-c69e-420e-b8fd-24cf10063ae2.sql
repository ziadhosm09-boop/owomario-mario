
-- ADS table
CREATE TABLE public.ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  title text,
  image_url text,
  link_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ads" ON public.ads FOR SELECT USING (true);
CREATE POLICY "Admins can insert ads" ON public.ads FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete ads" ON public.ads FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update ads" ON public.ads FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- P2P Listings
CREATE TABLE public.p2p_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  discord_username text NOT NULL,
  discord_id text NOT NULL,
  listing_type text NOT NULL DEFAULT 'sell',
  item_category text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  price numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  description text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.p2p_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view active listings" ON public.p2p_listings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create own listings" ON public.p2p_listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own listings" ON public.p2p_listings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own listings" ON public.p2p_listings FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- P2P Tickets
CREATE TABLE public.p2p_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.p2p_listings(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.p2p_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets" ON public.p2p_tickets FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Users can create tickets" ON public.p2p_tickets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Users can update own tickets" ON public.p2p_tickets FOR UPDATE TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- P2P Messages
CREATE TABLE public.p2p_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.p2p_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.p2p_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ticket messages" ON public.p2p_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.p2p_tickets
      WHERE id = ticket_id
      AND (buyer_id = auth.uid() OR seller_id = auth.uid())
    )
  );
CREATE POLICY "Users can send messages" ON public.p2p_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.p2p_tickets
      WHERE id = ticket_id
      AND (buyer_id = auth.uid() OR seller_id = auth.uid())
    )
  );

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.p2p_messages;
