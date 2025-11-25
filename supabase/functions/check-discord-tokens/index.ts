import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CheckRequest {
  tokens: string[];
  threadCount: number;
}

interface TokenCheckResult {
  working: string[];
  email_locked: string[];
  phone_locked: string[];
  invalid: string[];
  errors: string[];
}

// Parse token from different formats
function parseToken(line: string): { token: string; fullLine: string } {
  const trimmed = line.trim();
  
  // Handle email:pass:"token" format (remove quotes from token)
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    if (parts.length >= 3) {
      let token = parts[parts.length - 1];
      // Remove quotes if present
      token = token.replace(/^["']|["']$/g, '');
      return { token, fullLine: trimmed };
    } else if (parts.length === 1) {
      return { token: parts[0], fullLine: trimmed };
    }
  }
  
  // Plain token format
  return { token: trimmed, fullLine: trimmed };
}

async function checkToken(line: string): Promise<{
  type: "working" | "email_locked" | "phone_locked" | "invalid" | "error";
  data: string;
}> {
  try {
    const { token, fullLine } = parseToken(line);
    
    if (!token) {
      return { type: "error", data: `${fullLine} | Invalid Format` };
    }

    const ws = new WebSocket("wss://gateway.discord.gg/?encoding=json&v=9");
    
    return new Promise((resolve) => {
      let heartbeatInterval: number;
      let timeoutId: number;

      // Set a timeout for the entire operation
      timeoutId = setTimeout(() => {
        ws.close();
        resolve({ type: "error", data: `${fullLine} | Connection Timeout` });
      }, 10000);

      ws.onopen = () => {
        console.log(`[INFO] WebSocket opened for token check`);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        // Handle Hello message
        if (data.op === 10) {
          const heartbeatInterval_ms = data.d.heartbeat_interval;
          
          // Start heartbeat
          heartbeatInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ op: 1, d: null }));
            }
          }, heartbeatInterval_ms);

          // Send Identify payload
          const identifyPayload = {
            op: 2,
            d: {
              token: token,
              capabilities: 16381,
              properties: {
                os: "Windows",
                browser: "Chrome",
                device: "",
                system_locale: "en-US",
                browser_user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
                browser_version: "138.0.0.0",
                os_version: "10",
                referrer: "https://discord.com/",
                referring_domain: "discord.com",
                referrer_current: "https://discord.com/",
                referring_domain_current: "discord.com",
                release_channel: "stable",
                client_build_number: 317140,
                client_event_source: null
              },
              presence: {
                status: "online",
                since: 0,
                activities: [],
                afk: false
              },
              compress: false,
              client_state: {
                guild_versions: {},
                highest_last_message_id: "0",
                read_state_version: 0,
                user_guild_settings_version: -1,
                user_settings_version: -1,
                private_channels_version: "0",
                api_code_version: 0
              }
            }
          };
          
          ws.send(JSON.stringify(identifyPayload));
        }
        
        // Handle Ready or other responses
        if (data.op === 0 && data.t === "READY") {
          clearTimeout(timeoutId);
          clearInterval(heartbeatInterval);
          ws.close();
          
          const required_action = data.d?.required_action;
          
          if (required_action === "REQUIRE_VERIFIED_PHONE") {
            resolve({ type: "phone_locked", data: fullLine });
          } else if (required_action === "REQUIRE_VERIFIED_EMAIL") {
            resolve({ type: "email_locked", data: fullLine });
          } else if (!required_action || required_action === "AGREEMENTS") {
            resolve({ type: "working", data: fullLine });
          } else {
            resolve({ type: "invalid", data: `${fullLine} | ${required_action}` });
          }
        }
        
        // Handle Invalid Session (op 9)
        if (data.op === 9) {
          clearTimeout(timeoutId);
          clearInterval(heartbeatInterval);
          ws.close();
          resolve({ type: "invalid", data: `${fullLine} | Invalid Session` });
        }
      };

      ws.onerror = (error) => {
        clearTimeout(timeoutId);
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        console.error(`[ERROR] WebSocket error:`, error);
        resolve({ type: "error", data: `${fullLine} | Connection Error` });
      };

      ws.onclose = () => {
        clearTimeout(timeoutId);
        if (heartbeatInterval) clearInterval(heartbeatInterval);
      };
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { type: "error", data: `${line} | ${errorMessage}` };
  }
}

async function processTokens(
  tokens: string[],
  threadCount: number
): Promise<TokenCheckResult> {
  const results: TokenCheckResult = {
    working: [],
    email_locked: [],
    phone_locked: [],
    invalid: [],
    errors: [],
  };

  // Process tokens in batches based on thread count
  const batchSize = threadCount;
  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);
    const promises = batch.map((token) => checkToken(token));
    const batchResults = await Promise.all(promises);

    batchResults.forEach((result) => {
      if (result.type === "working") {
        results.working.push(result.data);
      } else if (result.type === "email_locked") {
        results.email_locked.push(result.data);
      } else if (result.type === "phone_locked") {
        results.phone_locked.push(result.data);
      } else if (result.type === "invalid") {
        results.invalid.push(result.data);
      } else if (result.type === "error") {
        results.errors.push(result.data);
      }
    });

    // Add small delay between batches to avoid overwhelming the gateway
    if (i + batchSize < tokens.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tokens, threadCount }: CheckRequest = await req.json();

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return new Response(
        JSON.stringify({ error: "No tokens provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const count = Math.min(Math.max(threadCount || 1, 1), 10);

    console.log(`[INFO] Starting token check for ${tokens.length} tokens with ${count} threads`);

    const results = await processTokens(tokens, count);

    console.log(`[INFO] Check completed. Working: ${results.working.length}, Email Locked: ${results.email_locked.length}, Phone Locked: ${results.phone_locked.length}, Invalid: ${results.invalid.length}, Errors: ${results.errors.length}`);

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
