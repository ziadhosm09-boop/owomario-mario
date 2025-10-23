import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AccountData {
  email: string;
  password: string;
  refreshToken: string;
  clientId: string;
}

function parseAccountLine(line: string): AccountData | null {
  const parts = line.trim().split(":");
  if (parts.length < 4) return null;
  
  return {
    email: parts[0],
    password: parts[1],
    refreshToken: parts[2],
    clientId: parts[3]
  };
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
    throw new Error(`Failed to get access token`);
  }

  const data = await response.json();
  return data.access_token;
}

async function fetchLatestAmazonMessage(accessToken: string) {
  const url = "https://graph.microsoft.com/v1.0/me/messages?$top=50&$select=id,subject,from,receivedDateTime,bodyPreview,body&$orderby=receivedDateTime desc";
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Prefer": "outlook.body-content-type=\"text\""
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch messages`);
  }

  const data = await response.json();
  const messages = data.value || [];
  
  return messages.find((msg: any) => {
    const fromAddress = msg.from?.emailAddress?.address?.toLowerCase() || "";
    const subject = msg.subject?.toLowerCase() || "";
    return fromAddress.includes("amazon") || subject.includes("amazon");
  });
}

async function deleteMessage(accessToken: string, messageId: string) {
  const url = `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(messageId)}`;
  
  await fetch(url, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
}

function htmlToText(html: string): string {
  if (!html) return "";
  let s = html.replace(/<(br|p|div)[^>]*>/gi, "\n");
  s = s.replace(/<\/?[^>]+(>|$)/g, "");
  s = s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
  return s;
}

function extractAllOTPs(text: string): string[] {
  if (!text) return [];
  
  const codes: string[] = [];
  
  const patterns = [
    /verification\s+code\s+is\s*[:]*\s*[\r\n\s]*(\d{6})(?!\d)/gi,
    /your\s+(?:verification\s+)?code\s+(?:is\s*)?[:]*\s*[\r\n\s]*(\d{6})(?!\d)/gi,
    /(?:OTP|otp)\s*[:\)]+\s*(\d{6})(?!\d)/gi
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1] && !codes.includes(match[1])) {
        codes.push(match[1]);
      }
    }
  }
  
  return codes;
}

async function processAccount(account: AccountData): Promise<string | null> {
  try {
    const accessToken = await getAccessToken(account.refreshToken, account.clientId);
    const latestMessage = await fetchLatestAmazonMessage(accessToken);
    
    if (!latestMessage) return null;
    
    const bodyContent = latestMessage.body?.content || "";
    const bodyText = htmlToText(bodyContent);
    const preview = latestMessage.bodyPreview || "";
    const subject = latestMessage.subject || "";
    
    const fullText = `${subject} ${preview} ${bodyText}`;
    const allCodes = extractAllOTPs(fullText);
    
    if (allCodes.length === 0) return null;
    
    const latestCode = allCodes[0];
    
    try {
      await deleteMessage(accessToken, latestMessage.id);
    } catch (e) {
      console.warn(`Failed to delete message: ${e}`);
    }
    
    return latestCode;
  } catch (error) {
    console.error(`Error processing ${account.email}:`, error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accounts } = await req.json();

    if (!accounts || !Array.isArray(accounts)) {
      return new Response("", { 
        headers: corsHeaders,
        status: 400 
      });
    }

    const results: string[] = [];
    
    for (const line of accounts) {
      const accountData = parseAccountLine(line);
      if (!accountData) continue;

      const otp = await processAccount(accountData);
      if (otp) {
        results.push(otp);
      }
    }

    return new Response(
      results.join("\n"),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response("", { 
      headers: corsHeaders,
      status: 500 
    });
  }
});
