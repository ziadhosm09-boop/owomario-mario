import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const POLL_INTERVAL_MS = 3000;
const MAX_WAIT_MS = 120000;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getAccessToken(refreshToken: string, clientId: string): Promise<string> {
  const tokenUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", refreshToken);
  params.append("scope", "https://graph.microsoft.com/.default");

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function fetchInboxMessages(accessToken: string) {
  const url = "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$select=subject,from,receivedDateTime,bodyPreview,body,id&$top=50&$orderby=receivedDateTime desc";
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Prefer': 'outlook.body-content-type="text"'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch inbox: ${response.status}`);
  }

  const data = await response.json();
  return data.value || [];
}

async function fetchMessageById(accessToken: string, messageId: string) {
  const url = `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(messageId)}?$select=body,subject,receivedDateTime`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch message ${messageId}: ${response.status}`);
  }

  return await response.json();
}

function htmlToText(html: string): string {
  if (!html) return "";
  let s = html.replace(/<(br|p|div)[^>]*>/gi, "\n");
  s = s.replace(/<\/?[^>]+(>|$)/g, "");
  s = s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
  return s;
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

function cleanHref(href: string): string {
  if (!href) return "";
  const cleaned = href.replace(/&amp;/g, "&").trim();
  try {
    return decodeURIComponent(cleaned);
  } catch {
    return cleaned;
  }
}

async function waitForDiscordLink(accessToken: string) {
  const seenIds = new Set<string>();
  const start = Date.now();
  console.log(`Waiting for Discord verify link (poll every ${POLL_INTERVAL_MS} ms)...`);

  while (true) {
    if (Date.now() - start > MAX_WAIT_MS) {
      throw new Error("Timeout: No Discord link found within 2 minutes");
    }

    let messages = [];
    try {
      messages = await fetchInboxMessages(accessToken);
    } catch (e: any) {
      console.warn("Failed to fetch inbox: " + (e.message || e));
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    for (const m of messages) {
      if (!m || !m.id) continue;
      if (seenIds.has(m.id)) continue;
      seenIds.add(m.id);

      const preview = m.bodyPreview || "";
      const subject = m.subject || "";
      const combinedLower = (subject + " " + preview).toLowerCase();

      if (!combinedLower.includes("discord")) continue;

      let full = null;
      try {
        full = await fetchMessageById(accessToken, m.id);
      } catch (e: any) {
        console.warn(`Failed to fetch message ${m.id}: ${e.message || e}`);
        continue;
      }

      const bodyHtml = (full.body && full.body.content) || "";
      let link = extractDiscordLink(bodyHtml);

      if (!link) {
        link = extractDiscordLink(preview) || extractDiscordLink(htmlToText(bodyHtml));
      }

      if (link) {
        if (link.startsWith("//")) link = "https:" + link;
        if (!/^https?:\/\//i.test(link) && link.startsWith("/")) link = "https://discord.com" + link;
        console.log(`Found Discord link in message ${m.id}: ${link}`);
        return link;
      }
    }

    await sleep(POLL_INTERVAL_MS);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    let email: string, refreshToken: string, clientId: string;

    // Check if account data is in single line format (email:password:refreshToken:clientId)
    if (body.account && typeof body.account === 'string') {
      const parts = body.account.split(':');
      if (parts.length < 4) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: "Invalid account format. Use: email:password:refreshToken:clientId" 
          }), 
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      email = parts[0];
      // password = parts[1]; // Not needed for Microsoft Graph API
      refreshToken = parts[2];
      clientId = parts[3];
    } else {
      // Support old format for backward compatibility
      email = body.email;
      refreshToken = body.refreshToken;
      clientId = body.clientId;

      if (!email || !refreshToken || !clientId) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: "Missing required data. Provide 'account' as email:password:refreshToken:clientId or separate fields" 
          }), 
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    console.log('Fetching Discord link for:', email);

    // Get access token using Microsoft Graph API
    const accessToken = await getAccessToken(refreshToken, clientId);
    console.log('Access token obtained, waiting for Discord link...');

    // Wait for Discord verification link
    const discordLink = await waitForDiscordLink(accessToken);

    if (discordLink) {
      console.log('Discord link found:', discordLink);
      return new Response(
        JSON.stringify({ 
          success: true,
          email: email,
          link: discordLink
        }), 
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false,
          email: email,
          error: "No Discord verification link found"
        }), 
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }
    
  } catch (error) {
    console.error('Error in get-discord-link function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
