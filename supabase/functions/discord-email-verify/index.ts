import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/* Discord API Helpers                                                */
/* ------------------------------------------------------------------ */

function buildXSuper(): string {
  const properties = {
    os: "Windows",
    browser: "Chrome",
    device: "",
    system_locale: "en-US",
    browser_user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    browser_version: "131.0.0.0",
    os_version: "10",
    referrer: "",
    referring_domain: "",
    referrer_current: "",
    referring_domain_current: "",
    release_channel: "stable",
    client_build_number: 351400,
    client_event_source: null,
  };
  return btoa(JSON.stringify(properties));
}

function extractPureToken(raw: string): string {
  if (!raw) return "";
  const parts = raw.trim().split(':');
  return parts[parts.length - 1];
}

async function getDiscordCookies(): Promise<string> {
  try {
    const res = await fetch("https://discord.com/app", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
      redirect: "manual",
    });
    const cookieHeader = res.headers.get("set-cookie") || "";
    const cookies = cookieHeader.split(',').map(c => c.split(';')[0].trim()).filter(Boolean);
    return cookies.join('; ') + '; locale=en-US';
  } catch {
    return "locale=en-US";
  }
}

function getHeaders(token: string, cookies: string, isVerify = false) {
  return {
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Authorization': extractPureToken(token),
    'Content-Type': 'application/json',
    'Cookie': cookies,
    'Origin': 'https://discord.com',
    'Referer': isVerify ? 'https://discord.com/verify' : 'https://discord.com/channels/@me',
    'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'X-Debug-Options': 'bugReporterEnabled',
    'X-Discord-Locale': 'en-US',
    'X-Super-Properties': buildXSuper(),
  };
}

function generatePassword(length = 16): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+";
  let result = "";
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) {
    result += chars[arr[i] % chars.length];
  }
  return result;
}

/* ------------------------------------------------------------------ */
/* Step 1: Add email to Discord account                               */
/* ------------------------------------------------------------------ */

async function addEmailToDiscord(
  token: string,
  email: string,
  cookies: string,
  retries = 3
): Promise<{ success: boolean; newToken: string; password: string; error?: string }> {
  const password = generatePassword();
  const pureToken = extractPureToken(token);

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch("https://discord.com/api/v9/users/@me", {
        method: "PATCH",
        headers: getHeaders(pureToken, cookies),
        body: JSON.stringify({ email, password }),
      });

      if (response.status === 200) {
        const data = await response.json();
        return { success: true, newToken: data.token || pureToken, password };
      } else if (response.status === 400) {
        const data = await response.json();
        if (data.captcha_key) {
          return { success: false, newToken: pureToken, password, error: "Captcha required" };
        }
        return { success: false, newToken: pureToken, password, error: `Bad Request: ${JSON.stringify(data)}` };
      } else if (response.status === 401) {
        return { success: false, newToken: pureToken, password, error: "Invalid token" };
      } else if (response.status === 403) {
        return { success: false, newToken: pureToken, password, error: "Account locked/flagged" };
      } else if (response.status === 429) {
        await sleep(5000);
        continue;
      } else {
        return { success: false, newToken: pureToken, password, error: `HTTP ${response.status}` };
      }
    } catch (e) {
      if (attempt === retries - 1) {
        return { success: false, newToken: pureToken, password, error: String(e) };
      }
      await sleep(2000);
    }
  }
  return { success: false, newToken: pureToken, password: "", error: "Max retries exceeded" };
}

/* ------------------------------------------------------------------ */
/* Step 2: Wait for Discord verification link                         */
/* ------------------------------------------------------------------ */

async function getAccessToken(refreshToken: string, clientId: string): Promise<string> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", refreshToken);
  params.append("scope", "https://graph.microsoft.com/.default");

  const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) throw new Error(`Token error: ${response.status}`);
  const data = await response.json();
  return data.access_token;
}

async function fetchInboxMessages(accessToken: string) {
  const url = "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$select=subject,from,receivedDateTime,bodyPreview,body,id&$top=30&$orderby=receivedDateTime desc";
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'outlook.body-content-type="html"',
    },
  });
  if (!response.ok) throw new Error(`Inbox error: ${response.status}`);
  const data = await response.json();
  return data.value || [];
}

async function fetchMessageById(accessToken: string, messageId: string) {
  const url = `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(messageId)}?$select=body,subject,receivedDateTime`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`Message error: ${response.status}`);
  return await response.json();
}

function cleanHref(href: string): string {
  if (!href) return "";
  const cleaned = href.replace(/&amp;/g, "&").trim();
  try {
    return decodeURIComponent(cleaned);
  } catch {
    return cleaned;
  }
}

function extractDiscordLink(html: string): string | null {
  if (!html) return null;
  const snippet = html.slice(0, 20000);

  const tdAnchorRe = /<td\b[^>]*>[\s\S]{0,500}?<a\b[^>]*href=(?:"|')([^"']*(?:click\.discord\.com\/ls\/click|discord(?:\.com|app\.com)\/verify)[^"']*)(?:"|')[^>]*>(?:[\s\S]{0,200}?verify[\s\S]{0,200}?|[^<]{0,60}?)<\/a>/i;
  let match = tdAnchorRe.exec(snippet);
  if (match && match[1]) return cleanHref(match[1]);

  const clickPattern = /href=["']([^"']*click\.discord\.com\/ls\/click[^"']*)["']/i;
  match = clickPattern.exec(snippet);
  if (match) return cleanHref(match[1]);

  const verifyPattern = /(https?:\/\/(?:www\.)?(?:discord\.com|discordapp\.com)\/verify\/[^\s"'<>]+)/i;
  match = verifyPattern.exec(snippet);
  if (match) return match[1];

  const anyPattern = /href=["']([^"']*(?:discord\.com|discordapp\.com)[^"']*)["']/i;
  match = anyPattern.exec(snippet);
  if (match) return cleanHref(match[1]);

  return null;
}

async function waitForDiscordLink(accessToken: string, maxWaitMs = 120000): Promise<string | null> {
  const seenIds = new Set<string>();
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    try {
      const messages = await fetchInboxMessages(accessToken);
      for (const m of messages) {
        if (!m?.id || seenIds.has(m.id)) continue;
        seenIds.add(m.id);

        const combined = ((m.subject || "") + " " + (m.bodyPreview || "")).toLowerCase();
        if (!combined.includes("discord")) continue;

        const full = await fetchMessageById(accessToken, m.id);
        const bodyHtml = full?.body?.content || "";
        const link = extractDiscordLink(bodyHtml);
        if (link) return link;
      }
    } catch (e) {
      console.warn("Poll error:", e);
    }
    await sleep(3000);
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Step 3: Extract verify token from link (Hash-First, 15 redirects)  */
/* ------------------------------------------------------------------ */

function extractTokenFromUrl(url: string): string | null {
  if (!url) return null;
  let verifyToken = "";

  // 1. Hash first (most common for Discord)
  if (url.includes('#')) {
    const hashPart = url.split('#')[1];
    const params = new URLSearchParams(hashPart.replace('?', '&').replace(/^\//, ''));
    verifyToken = params.get('token') || "";
  }

  // 2. Search params
  if (!verifyToken) {
    try {
      const urlObj = new URL(url);
      verifyToken = urlObj.searchParams.get('token') || "";
    } catch { }
  }

  // 3. Regex fallback
  if (!verifyToken) {
    const match = url.match(/token=([^&|#\s]+)/);
    if (match) verifyToken = match[1];
  }

  return verifyToken || null;
}

async function getVerifyTokenFromLink(verifyLink: string): Promise<{ token: string | null; finalUrl: string }> {
  let currentUrl = verifyLink;
  const maxRedirects = 15;

  console.log(`[Step 3] Starting trace for: ${verifyLink}`);

  for (let i = 0; i < maxRedirects; i++) {
    const token = extractTokenFromUrl(currentUrl);
    if (token) {
      console.log(`[Step 3] Token found at step ${i}: ${token.slice(0, 10)}...`);
      return { token, finalUrl: currentUrl };
    }

    try {
      console.log(`[Step 3] [${i}] Fetching: ${currentUrl.slice(0, 100)}...`);
      const response = await fetch(currentUrl, {
        method: "GET",
        redirect: "manual",
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://outlook.live.com/',
        },
      });

      console.log(`[Step 3] [${i}] Status: ${response.status}`);

      if (response.status >= 300 && response.status < 400) {
        let location = response.headers.get("location");
        if (!location) break;

        if (location.startsWith("/")) {
          const urlObj = new URL(currentUrl);
          location = urlObj.origin + location;
        }

        const tokenInLocation = extractTokenFromUrl(location);
        if (tokenInLocation) {
          console.log(`[Step 3] Token found in Redirect Header!`);
          return { token: tokenInLocation, finalUrl: location };
        }

        currentUrl = location;
        await sleep(500);
        continue;
      }

      if (response.status === 200) {
        const body = await response.text();
        const bodyMatch = body.match(/token=([A-Za-z0-9_\-\.]+)/);
        if (bodyMatch) {
          console.log(`[Step 3] Token found in response body`);
          return { token: bodyMatch[1], finalUrl: currentUrl };
        }
      }

      break;
    } catch (e) {
      console.error(`[Step 3] Error at step ${i}: ${e}`);
      break;
    }
  }

  // Return null token but include the link for manual use
  return { token: null, finalUrl: currentUrl };
}

/* ------------------------------------------------------------------ */
/* Step 4: Verify email via Discord API                               */
/* ------------------------------------------------------------------ */

async function verifyEmail(
  accountToken: string,
  verifyToken: string,
  cookies: string,
): Promise<{ success: boolean; newToken: string; error?: string }> {
  try {
    const response = await fetch("https://discord.com/api/v9/auth/verify", {
      method: "POST",
      headers: getHeaders(accountToken, cookies, true),
      body: JSON.stringify({ token: verifyToken }),
    });

    if (response.status === 200) {
      const data = await response.json();
      return { success: true, newToken: data.token || extractPureToken(accountToken) };
    } else {
      const text = await response.text();
      return { success: false, newToken: extractPureToken(accountToken), error: `Verify failed: ${response.status} - ${text}` };
    }
  } catch (e) {
    return { success: false, newToken: extractPureToken(accountToken), error: String(e) };
  }
}

/* ------------------------------------------------------------------ */
/* Main Handler                                                       */
/* ------------------------------------------------------------------ */

interface ProcessResult {
  token: string;
  email: string;
  discordPassword: string;
  verifiedToken: string;
  success: boolean;
  error?: string;
  step?: string;
  link?: string;
}

async function processOne(
  token: string,
  emailData: string,
  cookies: string,
): Promise<ProcessResult> {
  const parts = emailData.split(':');
  if (parts.length < 4) {
    return { token, email: emailData, discordPassword: "", verifiedToken: "", success: false, error: "Invalid email format (need email:pass:refreshToken:clientId)", step: "parse" };
  }

  const [outlookEmail, , refreshToken, clientId] = parts;
  const pureToken = extractPureToken(token);

  // Step 1: Add email to Discord
  const addResult = await addEmailToDiscord(pureToken, outlookEmail, cookies);
  if (!addResult.success) {
    return { token: pureToken, email: outlookEmail, discordPassword: "", verifiedToken: "", success: false, error: addResult.error, step: "add_email" };
  }

  // Step 2: Get access token and wait for verification link
  let accessToken: string;
  try {
    accessToken = await getAccessToken(refreshToken, clientId);
  } catch (e) {
    return { token: pureToken, email: outlookEmail, discordPassword: addResult.password, verifiedToken: addResult.newToken, success: false, error: `Access token error: ${e}`, step: "access_token" };
  }

  const link = await waitForDiscordLink(accessToken);
  if (!link) {
    return { token: pureToken, email: outlookEmail, discordPassword: addResult.password, verifiedToken: addResult.newToken, success: false, error: "No verification link received", step: "wait_link" };
  }

  // Step 3: Extract verify token from link
  const extractResult = await getVerifyTokenFromLink(link);
  if (!extractResult.token) {
    return { token: pureToken, email: outlookEmail, discordPassword: addResult.password, verifiedToken: addResult.newToken, success: false, error: `Extraction failed. Final URL: ${extractResult.finalUrl}`, step: "extract_token", link };
  }

  // Step 4: Verify
  const verifyResult = await verifyEmail(addResult.newToken, extractResult.token, cookies);
  if (!verifyResult.success) {
    return { token: pureToken, email: outlookEmail, discordPassword: addResult.password, verifiedToken: addResult.newToken, success: false, error: verifyResult.error, step: "verify", link };
  }

  return {
    token: pureToken,
    email: outlookEmail,
    discordPassword: addResult.password,
    verifiedToken: verifyResult.newToken,
    success: true,
  };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tokens, emails, proxies: proxyList = [], threadCount = 3 } = await req.json();

    if (!tokens?.length || !emails?.length) {
      return new Response(
        JSON.stringify({ error: "Provide tokens[] and emails[] arrays" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cookies = await getDiscordCookies();
    const total = Math.min(tokens.length, emails.length);
    const results: ProcessResult[] = [];
    const batchSize = Math.min(threadCount, 3);

    for (let i = 0; i < total; i += batchSize) {
      const batch = [];
      for (let j = i; j < Math.min(i + batchSize, total); j++) {
        batch.push(processOne(tokens[j], emails[j], cookies));
      }
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);

      if (i + batchSize < total) await sleep(2000);
    }

    const success = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    return new Response(
      JSON.stringify({
        results: {
          success: success.map(r => `${r.email}:${r.discordPassword}:${r.verifiedToken}`),
          failed: failed.map(r => `${r.token} | ${r.email} | Step: ${r.step} | ${r.error}`),
          details: results.map(r => ({
            token: r.token,
            email: r.email,
            step: r.step || "complete",
            error: r.error,
            link: r.link,
            success: r.success,
          })),
        },
        total,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
