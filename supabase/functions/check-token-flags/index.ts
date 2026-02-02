import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface FlagCheckRequest {
  tokens: string[];
  threadCount: number;
}

interface FlagCheckResult {
  valid: string[];
  flagged: string[];
  locked: string[];
  invalid: string[];
  errors: string[];
}

// Parse token from different formats
function parseToken(line: string): { token: string; fullLine: string } {
  const trimmed = line.trim();
  
  // If contains ':', check if it's email:pass:token format
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    if (parts.length >= 3) {
      let token = parts[parts.length - 1];
      token = token.replace(/^["']|["']$/g, '');
      return { token, fullLine: trimmed };
    }
  }
  
  // Check if it's just "token" format
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || 
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    const token = trimmed.slice(1, -1);
    return { token, fullLine: trimmed };
  }
  
  // Plain token format
  return { token: trimmed, fullLine: trimmed };
}

async function checkTokenFlags(line: string): Promise<{
  type: "valid" | "flagged" | "locked" | "invalid" | "error";
  data: string;
  username?: string;
  flags?: number;
}> {
  const { token, fullLine } = parseToken(line);
  
  if (!token) {
    return { type: "error", data: `${fullLine} | Invalid Format` };
  }

  try {
    // Check @me endpoint
    const response = await fetch("https://discord.com/api/v9/users/@me", {
      headers: {
        "Authorization": token,
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (response.status === 200) {
      const userData = await response.json();
      const flags = userData.flags || 0;
      const username = userData.username || "Unknown";
      
      // Check for flagged/quarantined status
      // 1 << 17: Quarantined (Spammer)
      // 1 << 20: Spammer
      const isFlagged = (flags & (1 << 17)) !== 0 || (flags & (1 << 20)) !== 0;
      
      // Check settings to see if account is locked
      const settingsResponse = await fetch("https://discord.com/api/v9/users/@me/settings", {
        headers: {
          "Authorization": token,
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      
      const isLocked = settingsResponse.status !== 200;
      
      if (isFlagged) {
        return { 
          type: "flagged", 
          data: `${fullLine} | ${username} | Flags: ${flags}`,
          username,
          flags
        };
      } else if (isLocked) {
        return { 
          type: "locked", 
          data: `${fullLine} | ${username} | Settings Status: ${settingsResponse.status}`,
          username
        };
      } else {
        return { 
          type: "valid", 
          data: `${fullLine} | ${username}`,
          username,
          flags
        };
      }
    } else if (response.status === 401) {
      return { type: "invalid", data: `${fullLine} | Invalid Token` };
    } else if (response.status === 403) {
      return { type: "locked", data: `${fullLine} | Locked (403)` };
    } else {
      return { type: "error", data: `${fullLine} | HTTP ${response.status}` };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { type: "error", data: `${fullLine} | ${errorMessage}` };
  }
}

async function processTokens(
  tokens: string[],
  threadCount: number
): Promise<FlagCheckResult> {
  const results: FlagCheckResult = {
    valid: [],
    flagged: [],
    locked: [],
    invalid: [],
    errors: [],
  };

  // Process tokens in batches
  const batchSize = Math.max(threadCount, 1);
  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);
    const promises = batch.map((token) => checkTokenFlags(token));
    const batchResults = await Promise.all(promises);

    batchResults.forEach((result) => {
      if (result.type === "valid") {
        results.valid.push(result.data);
      } else if (result.type === "flagged") {
        results.flagged.push(result.data);
      } else if (result.type === "locked") {
        results.locked.push(result.data);
      } else if (result.type === "invalid") {
        results.invalid.push(result.data);
      } else {
        results.errors.push(result.data);
      }
    });

    // Add delay between batches
    if (i + batchSize < tokens.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tokens, threadCount }: FlagCheckRequest = await req.json();

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return new Response(
        JSON.stringify({ error: "No tokens provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const count = Math.max(threadCount || 1, 1);

    console.log(`[INFO] Starting flag check for ${tokens.length} tokens with ${count} threads`);

    const results = await processTokens(tokens, count);

    console.log(`[INFO] Flag check completed. Valid: ${results.valid.length}, Flagged: ${results.flagged.length}, Locked: ${results.locked.length}, Invalid: ${results.invalid.length}, Errors: ${results.errors.length}`);

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] ${errorMessage}`);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
