
-- Ideas table (anonymous - no user_id stored)
CREATE TABLE public.ideas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  section TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Feedback table (anonymous)
CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Everyone can read ideas
CREATE POLICY "Anyone can view ideas" ON public.ideas FOR SELECT USING (true);

-- Anyone can insert ideas (anonymous)
CREATE POLICY "Anyone can submit ideas" ON public.ideas FOR INSERT WITH CHECK (true);

-- Only admins can delete ideas
CREATE POLICY "Admins can delete ideas" ON public.ideas FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Everyone can read feedback
CREATE POLICY "Anyone can view feedback" ON public.feedback FOR SELECT USING (true);

-- Anyone can submit feedback
CREATE POLICY "Anyone can submit feedback" ON public.feedback FOR INSERT WITH CHECK (true);

-- Only admins can delete feedback
CREATE POLICY "Admins can delete feedback" ON public.feedback FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
