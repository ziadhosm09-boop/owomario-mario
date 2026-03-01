import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}

export async function saveActivity(
  userId: string,
  toolName: string,
  action: string,
  success: boolean,
  resultSummary?: string,
  inputSummary?: string,
  details?: any
) {
  try {
    await supabase.from("activity_history").insert({
      user_id: userId,
      tool_name: toolName,
      action: action,
      success: success,
      result_summary: resultSummary || null,
      input_summary: inputSummary || null,
      details: details || null,
    });
  } catch (e) {
    console.error("Failed to save activity:", e);
  }
}
