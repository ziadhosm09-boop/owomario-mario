import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface JoinResult {
  token: string;
  fullLine: string;
  success: boolean;
  guild_name?: string;
  error?: string;
}

function extractToken(line: string): { token: string; fullLine: string } {
  const trimmed = line.trim();
  // email:pass:"token" or email:pass:token
  const parts = trimmed.split(":");
  if (parts.length >= 3) {
    const lastPart = parts.slice(2).join(":");
    const match = lastPart.match(/"([^"]+)"/);
    return { token: match ? match[1] : lastPart, fullLine: trimmed };
  }
  // "token"
  const match = trimmed.match(/"([^"]+)"/);
  return { token: match ? match[1] : trimmed, fullLine: trimmed };
}

async function getFingerprint(headers: Record<string, string>): Promise<string | null> {
  try {
    const { Authorization, ...noAuthHeaders } = headers;
    const resp = await fetch("https://discord.com/api/v9/experiments", {
      headers: noAuthHeaders,
    });
    if (resp.ok) {
      const data = await resp.json();
      return data.fingerprint || null;
    }
  } catch {}
  return null;
}

function getContextProperties(): string {
  const data = { location: "Accept Invite Page" };
  return btoa(JSON.stringify(data));
}

async function joinServer(token: string, inviteCode: string): Promise<{ success: boolean; guild_name?: string; error?: string }> {
  const baseHeaders: Record<string, string> = {
    "Authorization": token,
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Origin": "https://discord.com",
    "Referer": `https://discord.com/invite/${inviteCode}`,
    "X-Discord-Locale": "en-US",
    "X-Discord-Timezone": "America/New_York",
    "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
  };

  try {
    // Get fingerprint
    const fingerprint = await getFingerprint(baseHeaders);
    if (fingerprint) {
      baseHeaders["X-Fingerprint"] = fingerprint;
    }

    // Small delay
    await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));

    // Fetch invite info
    await fetch(`https://discord.com/api/v9/invites/${inviteCode}?with_counts=true&with_expiration=true`, {
      headers: baseHeaders,
    });

    // Human-like delay
    await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));

    // Join
    baseHeaders["X-Context-Properties"] = getContextProperties();
    const joinResp = await fetch(`https://discord.com/api/v9/invites/${inviteCode}`, {
      method: "POST",
      headers: baseHeaders,
      body: JSON.stringify({}),
    });

    if (joinResp.status === 200) {
      const data = await joinResp.json();
      const guildName = data?.guild?.name || "Unknown";
      return { success: true, guild_name: guildName };
    } else if (joinResp.status === 400) {
      const text = await joinResp.text();
      if (text.includes("captcha")) {
        return { success: false, error: "Captcha required" };
      }
      return { success: false, error: `Error 400: ${text}` };
    } else if (joinResp.status === 403) {
      return { success: false, error: "Token is locked or flagged (403)" };
    } else if (joinResp.status === 401) {
      return { success: false, error: "Invalid token (401)" };
    } else {
      return { success: false, error: `Error ${joinResp.status}` };
    }
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tokens, inviteCode, threadCount = 3 } = await req.json();

    if (!tokens?.length || !inviteCode) {
      return new Response(JSON.stringify({ error: "Missing tokens or invite code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanInvite = inviteCode
      .replace("https://discord.gg/", "")
      .replace("discord.gg/", "")
      .replace("https://discord.com/invite/", "")
      .trim();

    const tokenData = tokens.map((line: string) => extractToken(line));
    const results: JoinResult[] = [];
    const concurrency = Math.min(threadCount, 5);

    // Process in batches
    for (let i = 0; i < tokenData.length; i += concurrency) {
      const batch = tokenData.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(async ({ token, fullLine }: { token: string; fullLine: string }) => {
          const result = await joinServer(token, cleanInvite);
          return { token, fullLine, ...result };
        })
      );
      results.push(...batchResults);

      // Delay between batches
      if (i + concurrency < tokenData.length) {
        await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));
      }
    }

    const joined = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    return new Response(JSON.stringify({
      results: {
        joined: joined.map(r => r.fullLine),
        failed: failed.map(r => `${r.fullLine} | ${r.error}`),
        details: results,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
