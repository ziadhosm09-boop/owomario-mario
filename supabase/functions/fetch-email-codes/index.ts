import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const POLL_INTERVAL_MS = 3000;
const MAX_WAIT_MS = 120000;
const FILTER_DISCORD = true;

interface AccountData {
  email: string;
  password: string;
  refreshToken: string;
  clientId: string;
  raw: string;
}

function parseAccountLine(line: string): AccountData | null {
  const parts = line.trim().split(":");
  if (parts.length < 4) return null;
  
  return {
    email: parts[0],
    password: parts[1],
    refreshToken: parts[2],
    clientId: parts[3],
    raw: line.trim()
  };
}

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

async function fetchLatestAmazonMessage(accessToken: string) {
  console.log("Fetching latest Amazon message from account...");
  const url = "https://graph.microsoft.com/v1.0/me/messages?$top=50&$select=id,subject,from,receivedDateTime,bodyPreview,body,isRead&$orderby=receivedDateTime desc";
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Prefer": "outlook.body-content-type=\"text\""
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to fetch messages. Status: ${response.status}, Error: ${errorText}`);
    throw new Error(`Failed to fetch messages: ${response.status}`);
  }

  const data = await response.json();
  const messages = data.value || [];
  
  const amazonMessage = messages.find((msg: any) => {
    const fromAddress = msg.from?.emailAddress?.address?.toLowerCase() || "";
    const subject = msg.subject?.toLowerCase() || "";
    return fromAddress.includes("amazon") || subject.includes("amazon");
  });
  
  console.log(`Found latest Amazon message: ${amazonMessage ? amazonMessage.subject : 'None'}`);
  return amazonMessage;
}

async function deleteMessage(accessToken: string, messageId: string) {
  const url = `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(messageId)}`;
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to delete message ${messageId}: ${response.status}`);
  }

  console.log(`Successfully deleted message: ${messageId}`);
  return true;
}

function extractAllOTPs(text: string): string[] {
  if (!text) return [];
  
  const codes: string[] = [];
  
  const verificationPattern = /verification\s+code\s+is\s*[:]*\s*[\r\n\s]*(\d{6})(?!\d)/gi;
  let match;
  while ((match = verificationPattern.exec(text)) !== null) {
    if (match[1] && !codes.includes(match[1])) {
      console.log(`Found verification code: ${match[1]}`);
      codes.push(match[1]);
    }
  }
  
  const yourCodePattern = /your\s+(?:verification\s+)?code\s+(?:is\s*)?[:]*\s*[\r\n\s]*(\d{6})(?!\d)/gi;
  while ((match = yourCodePattern.exec(text)) !== null) {
    if (match[1] && !codes.includes(match[1])) {
      console.log(`Found 'your code': ${match[1]}`);
      codes.push(match[1]);
    }
  }
  
  const otpPattern = /(?:OTP|otp)\s*[:\)]+\s*(\d{6})(?!\d)/gi;
  while ((match = otpPattern.exec(text)) !== null) {
    if (match[1] && !codes.includes(match[1])) {
      console.log(`Found OTP: ${match[1]}`);
      codes.push(match[1]);
    }
  }
  
  return codes;
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

async function waitForFirstDiscordLink(
  accessToken: string,
  opts: { pollIntervalMs?: number; maxWaitMs?: number; onlyDiscord?: boolean } = {}
) {
  const interval = opts.pollIntervalMs ?? POLL_INTERVAL_MS;
  const timeout = opts.maxWaitMs ?? MAX_WAIT_MS;
  const filterDiscord = opts.onlyDiscord ?? FILTER_DISCORD;

  const seenIds = new Set<string>();
  const start = Date.now();
  console.log(`Waiting for Discord verify link (poll every ${interval} ms)...`);

  while (true) {
    if (timeout && Date.now() - start > timeout) {
      throw new Error("Timeout reached while waiting for Discord verify link.");
    }

    let messages = [];
    try {
      messages = await fetchInboxMessages(accessToken);
    } catch (e: any) {
      console.warn("Failed to fetch inbox page: " + (e.message || e));
      await sleep(interval);
      continue;
    }

    for (const m of messages) {
      if (!m || !m.id) continue;
      if (seenIds.has(m.id)) continue;
      seenIds.add(m.id);

      const preview = m.bodyPreview || "";
      const subject = m.subject || "";
      const combinedLower = (subject + " " + preview).toLowerCase();

      if (filterDiscord && !combinedLower.includes("discord")) continue;

      let full = null;
      try {
        full = await fetchMessageById(accessToken, m.id);
      } catch (e: any) {
        console.warn(`Failed to fetch full message ${m.id}: ${e.message || e}`);
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
        console.log(`Found Discord verify link in message ${m.id}: ${link}`);
        return { link, messageId: m.id, subject: full.subject || subject };
      }
    }

    await sleep(interval);
  }
}

async function processAccount(account: AccountData, mode: string = 'amazon') {
  try {
    console.log(`Processing account: ${account.email} in ${mode} mode`);
    
    const accessToken = await getAccessToken(account.refreshToken, account.clientId);
    
    if (mode === 'discord') {
      console.log(`Obtained access token for ${account.email}. Waiting for Discord link...`);
      try {
        const result = await waitForFirstDiscordLink(accessToken, { 
          pollIntervalMs: POLL_INTERVAL_MS, 
          maxWaitMs: MAX_WAIT_MS, 
          onlyDiscord: FILTER_DISCORD 
        });
        
        if (result && result.link) {
          console.log(`Found Discord link for ${account.email}: ${result.link}`);
          return { 
            email: account.email,
            link: result.link,
            messageId: result.messageId,
            subject: result.subject
          };
        } else {
          return { email: account.email, error: "لم يتم العثور على رابط Discord" };
        }
      } catch (e: any) {
        console.warn(`Failed to fetch Discord link: ${e.message}`);
        return { email: account.email, error: e.message };
      }
    }
    
    console.log(`Obtained access token for ${account.email}. Fetching latest Amazon message...`);
    
    try {
      const latestMessage = await fetchLatestAmazonMessage(accessToken);
      
      if (!latestMessage) {
        return { email: account.email, error: "لم يتم العثور على رسائل Amazon" };
      }
      
      console.log(`Found latest Amazon message for ${account.email}: ${latestMessage.subject}`);
      
      const bodyContent = latestMessage.body?.content || "";
      const bodyText = htmlToText(bodyContent);
      const preview = latestMessage.bodyPreview || "";
      const subject = latestMessage.subject || "";
      
      const fullText = `${subject} ${preview} ${bodyText}`;
      const allCodes = extractAllOTPs(fullText);
      
      console.log(`Message "${subject}" - Found codes:`, allCodes);
      
      if (allCodes.length === 0) {
        return { email: account.email, error: "لم يتم العثور على كود في آخر رسالة" };
      }
      
      const latestCode = allCodes[0];
      
      try {
        await deleteMessage(accessToken, latestMessage.id);
        console.log(`Deleted message after extracting code for ${account.email}`);
      } catch (deleteError: any) {
        console.warn(`Failed to delete message: ${deleteError.message}`);
      }
      
      return { 
        email: account.email,
        otp: latestCode,
        messageDeleted: true
      };
    } catch (e: any) {
      console.warn(`Failed to fetch Amazon message: ${e.message}`);
      return { email: account.email, error: e.message };
    }
  } catch (error: any) {
    console.error(`Error processing ${account.email}:`, error);
    return { email: account.email, error: error.message, messages: [] };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accounts, mode = 'amazon' } = await req.json();

    if (!accounts || !Array.isArray(accounts)) {
      throw new Error("Invalid accounts data");
    }

    console.log(`Processing ${accounts.length} accounts in ${mode} mode`);

    const results = [];
    
    for (const line of accounts) {
      const accountData = parseAccountLine(line);
      if (!accountData) {
        results.push({ 
          email: line.split(":")[0] || "unknown", 
          error: "صيغة الحساب غير صحيحة" 
        });
        continue;
      }

      const result = await processAccount(accountData, mode);
      
      if (mode === 'discord') {
        if (result.link) {
          results.push({
            email: result.email,
            link: result.link
          });
        } else {
          results.push({
            email: result.email,
            error: result.error || "لم يتم العثور على رابط Discord"
          });
        }
      } else {
        if (result.otp) {
          results.push({
            email: result.email,
            otp: result.otp
          });
        } else {
          results.push({
            email: result.email,
            error: result.error || "لم يتم العثور على أكواد"
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ results }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: any) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});