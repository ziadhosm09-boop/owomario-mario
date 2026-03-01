
-- Add username column to profiles
ALTER TABLE public.profiles ADD COLUMN username text UNIQUE;

-- Create activity_history table for tracking all operations
CREATE TABLE public.activity_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tool_name text NOT NULL,
  action text NOT NULL,
  input_summary text,
  result_summary text,
  success boolean NOT NULL DEFAULT true,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own history" ON public.activity_history
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own history" ON public.activity_history
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_activity_history_user_id ON public.activity_history(user_id);
CREATE INDEX idx_activity_history_created_at ON public.activity_history(created_at DESC);
