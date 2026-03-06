
-- p2p_ratings table
CREATE TABLE public.p2p_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES p2p_tickets(id) ON DELETE CASCADE NOT NULL,
  rater_id uuid NOT NULL,
  rated_user_id uuid NOT NULL,
  rating integer NOT NULL DEFAULT 5,
  review text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(ticket_id, rater_id)
);

ALTER TABLE p2p_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ratings" ON p2p_ratings FOR SELECT USING (true);
CREATE POLICY "Users can rate closed tickets" ON p2p_ratings FOR INSERT 
  WITH CHECK (
    auth.uid() = rater_id 
    AND auth.uid() != rated_user_id
    AND EXISTS (
      SELECT 1 FROM p2p_tickets 
      WHERE id = p2p_ratings.ticket_id 
      AND (buyer_id = auth.uid() OR seller_id = auth.uid()) 
      AND status = 'closed'
    )
  );

-- Rating validation trigger
CREATE OR REPLACE FUNCTION validate_rating()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_rating_range
  BEFORE INSERT OR UPDATE ON p2p_ratings
  FOR EACH ROW EXECUTE FUNCTION validate_rating();

-- Get user rating function
CREATE OR REPLACE FUNCTION get_user_rating(_user_id uuid)
RETURNS TABLE(avg_rating numeric, total_ratings bigint, total_trades bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT 
    COALESCE(AVG(rating)::numeric(3,1), 0),
    COUNT(*)::bigint,
    (SELECT COUNT(*)::bigint FROM p2p_tickets WHERE (seller_id = _user_id OR buyer_id = _user_id) AND status = 'closed')
  FROM p2p_ratings
  WHERE rated_user_id = _user_id
$$;

-- Allow deleting own activity history
CREATE POLICY "Users can delete own history" ON activity_history FOR DELETE USING (auth.uid() = user_id);

-- Add p2p_username to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS p2p_username text;
