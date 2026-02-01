import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DISCORD_EPOCH = 1420070400000;

interface AgeCheckRequest {
  tokens: string[];
  threadCount: number;
}

interface TokenAgeResult {
  token: string;
  fullLine: string;
  userId: string | null;
  creationDate: string | null;
  age: string | null;
  username: string | null;
  status: "valid" | "invalid" | "error";
  errorMessage?: string;
}

interface AgeCheckResults {
  valid: TokenAgeResult[];
  invalid: TokenAgeResult[];
  errors: TokenAgeResult[];
  byDate: Record<string, string[]>;
}

// Parse token from different formats
function parseToken(line: string): { token: string; fullLine: string } {
  const trimmed = line.trim();
  
  // If contains ':', check if it's email:pass:token format
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    // email:pass:token or email:pass:"token" format
    if (parts.length >= 3) {
      let token = parts[parts.length - 1];
      // Remove quotes if present
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

// Decode user ID from token
function decodeTokenId(token: string): string | null {
  try {
    const idB64 = token.split('.')[0];
    // Add padding if needed
    const padding = (4 - (idB64.length % 4)) % 4;
    const paddedB64 = idB64 + '='.repeat(padding);
    
    // Decode base64
    const decoded = atob(paddedB64);
    
    // Check if it's a valid user ID (numeric)
    if (/^\d+$/.test(decoded)) {
      return decoded;
    }
    return null;
  } catch {
    return null;
  }
}

// Get creation date from Discord snowflake
function getCreationDate(snowflake: string): Date | null {
  try {
    const timestamp = (BigInt(snowflake) >> BigInt(22)) + BigInt(DISCORD_EPOCH);
    return new Date(Number(timestamp));
  } catch {
    return null;
  }
}

// Format age as years, months, days
function formatAge(creationDate: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - creationDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  const years = Math.floor(diffDays / 365);
  const months = Math.floor((diffDays % 365) / 30);
  const days = (diffDays % 365) % 30;
  
  const parts: string[] = [];
  if (years > 0) parts.push(`${years}y`);
  if (months > 0) parts.push(`${months}m`);
  if (days > 0 || parts.length === 0) parts.push(`${days}d`);
  
  return parts.join(" ");
}

async function checkTokenAge(line: string): Promise<TokenAgeResult> {
  const { token, fullLine } = parseToken(line);
  
  if (!token) {
    return {
      token: "",
      fullLine,
      userId: null,
      creationDate: null,
      age: null,
      username: null,
      status: "error",
      errorMessage: "Invalid Format"
    };
  }

  // Decode user ID and calculate age
  const userId = decodeTokenId(token);
  let creationDate: string | null = null;
  let age: string | null = null;

  if (userId) {
    const date = getCreationDate(userId);
    if (date) {
      creationDate = date.toISOString().split('T')[0];
      age = formatAge(date);
    }
  }

  try {
    // Validate token via Discord API
    const response = await fetch("https://discord.com/api/v9/users/@me", {
      headers: {
        "Authorization": token,
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (response.status === 200) {
      const data = await response.json();
      return {
        token,
        fullLine,
        userId,
        creationDate,
        age,
        username: data.username || "Unknown",
        status: "valid"
      };
    } else if (response.status === 401) {
      return {
        token,
        fullLine,
        userId,
        creationDate,
        age,
        username: null,
        status: "invalid",
        errorMessage: "Invalid Token"
      };
    } else {
      return {
        token,
        fullLine,
        userId,
        creationDate,
        age,
        username: null,
        status: "error",
        errorMessage: `HTTP ${response.status}`
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      token,
      fullLine,
      userId,
      creationDate,
      age,
      username: null,
      status: "error",
      errorMessage
    };
  }
}

async function processTokens(
  tokens: string[],
  threadCount: number
): Promise<AgeCheckResults> {
  const results: AgeCheckResults = {
    valid: [],
    invalid: [],
    errors: [],
    byDate: {}
  };

  // Process tokens in batches
  const batchSize = Math.max(threadCount, 1);
  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);
    const promises = batch.map((token) => checkTokenAge(token));
    const batchResults = await Promise.all(promises);

    batchResults.forEach((result) => {
      if (result.status === "valid") {
        results.valid.push(result);
        
        // Group by creation date
        if (result.creationDate) {
          if (!results.byDate[result.creationDate]) {
            results.byDate[result.creationDate] = [];
          }
          results.byDate[result.creationDate].push(result.fullLine);
        }
      } else if (result.status === "invalid") {
        results.invalid.push(result);
      } else {
        results.errors.push(result);
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
    const { tokens, threadCount }: AgeCheckRequest = await req.json();

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

    console.log(`[INFO] Starting age check for ${tokens.length} tokens with ${count} threads`);

    const results = await processTokens(tokens, count);

    console.log(`[INFO] Age check completed. Valid: ${results.valid.length}, Invalid: ${results.invalid.length}, Errors: ${results.errors.length}`);

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
