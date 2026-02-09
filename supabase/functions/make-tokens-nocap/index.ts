import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NocapRequest {
  tokens: string[];
  threadCount: number;
}

interface TokenResult {
  success: string[];
  failed: string[];
  errors: string[];
}

// Headers mimicking iOS mobile for approval
const HEADERS = {
  "Content-Type": "application/json",
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "X-Super-Properties": "eyJvcyI6ImlPUyIsImJyb3dzZXIiOiJEaXNjb3JkIElPUyIsImRldmljZSI6IiIsInN5c3RlbV9sb2NhbGUiOiJlbi1VUyIsImNsaWVudF9idWlsZF9udW1iZXIiOjEwMDAwMH0="
};

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
  
  // Check if it's just "token" format (token wrapped in quotes)
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || 
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    const token = trimmed.slice(1, -1);
    return { token, fullLine: trimmed };
  }
  
  // Plain token format
  return { token: trimmed, fullLine: trimmed };
}

// Generate RSA key pair
async function generateKeyPair(): Promise<{ publicKey: CryptoKey; privateKey: CryptoKey }> {
  return await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// Export public key to base64
async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("spki", publicKey);
  const bytes = new Uint8Array(exported);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Decrypt nonce using private key
async function decryptNonce(privateKey: CryptoKey, encryptedNonce: string): Promise<Uint8Array> {
  const encryptedBytes = Uint8Array.from(atob(encryptedNonce), c => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    encryptedBytes
  );
  return new Uint8Array(decrypted);
}

// Calculate SHA-256 hash and encode as base64url
async function calculateProof(nonce: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", nonce);
  const hashBytes = new Uint8Array(hashBuffer);
  let binary = '';
  for (let i = 0; i < hashBytes.byteLength; i++) {
    binary += String.fromCharCode(hashBytes[i]);
  }
  // Base64url encode without padding
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Approve login with token
async function approveLogin(token: string, fingerprint: string): Promise<{ success: boolean; reason: string }> {
  const headers = { ...HEADERS, Authorization: token };
  const url = "https://discord.com/api/v9/users/@me/remote-auth";
  
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ fingerprint }),
    });
    
    if (res.status === 200) {
      const data = await res.json();
      const handshakeToken = data.handshake_token;
      
      if (handshakeToken) {
        const finishUrl = "https://discord.com/api/v9/users/@me/remote-auth/finish";
        const finishRes = await fetch(finishUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({ fingerprint, handshake_token: handshakeToken }),
        });
        
        if (finishRes.status === 200 || finishRes.status === 204) {
          return { success: true, reason: "Login Finished Successfully" };
        }
      }
      return { success: true, reason: "Approval Sent" };
    } else {
      const text = await res.text();
      return { success: false, reason: `HTTP ${res.status}: ${text}` };
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, reason: msg };
  }
}

// Process single token through QR login simulation
async function processToken(line: string): Promise<{
  type: "success" | "failed" | "error";
  data: string;
}> {
  try {
    const { token, fullLine } = parseToken(line);
    
    if (!token) {
      return { type: "error", data: `${fullLine} | Invalid Format` };
    }
    
    // Generate RSA keys
    const { publicKey, privateKey } = await generateKeyPair();
    const pubKeyBase64 = await exportPublicKey(publicKey);
    
    const gatewayUrl = "wss://remote-auth-gateway.discord.gg/?v=2";
    
    return new Promise((resolve) => {
      let heartbeatInterval: number | undefined;
      let timeoutId: number | undefined;
      let isResolved = false;
      
      const safeResolve = (result: { type: "success" | "failed" | "error"; data: string }) => {
        if (!isResolved) {
          isResolved = true;
          if (timeoutId) clearTimeout(timeoutId);
          if (heartbeatInterval) clearInterval(heartbeatInterval);
          try {
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
              ws.close();
            }
          } catch (e) {
            // Ignore close errors
          }
          resolve(result);
        }
      };
      
      // Timeout after 30 seconds
      timeoutId = setTimeout(() => {
        safeResolve({ type: "error", data: `${fullLine} | Connection Timeout` });
      }, 30000);
      
      const ws = new WebSocket(gatewayUrl);
      
      ws.onopen = () => {
        console.log(`[INFO] WebSocket opened for token: ${token.slice(0, 15)}...`);
      };
      
      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          const op = data.op;
          
          if (op === "hello") {
            const interval = data.heartbeat_interval;
            
            // Start heartbeat
            heartbeatInterval = setInterval(() => {
              if (ws.readyState === WebSocket.OPEN) {
                try {
                  ws.send(JSON.stringify({ op: "heartbeat" }));
                } catch (e) {
                  // Ignore
                }
              }
            }, interval);
            
            // Send init with public key
            ws.send(JSON.stringify({
              op: "init",
              encoded_public_key: pubKeyBase64
            }));
          }
          
          if (op === "nonce_proof") {
            // Decrypt nonce and calculate proof
            const decryptedNonce = await decryptNonce(privateKey, data.encrypted_nonce);
            const proof = await calculateProof(decryptedNonce);
            
            ws.send(JSON.stringify({
              op: "nonce_proof",
              proof: proof
            }));
          }
          
          if (op === "pending_remote_init" || (op === "init" && data.fingerprint)) {
            const fingerprint = data.fingerprint;
            if (fingerprint) {
              const result = await approveLogin(token, fingerprint);
              if (result.success && result.reason.includes("Finished")) {
                safeResolve({ type: "success", data: fullLine });
              } else if (!result.success) {
                safeResolve({ type: "failed", data: `${fullLine} | ${result.reason}` });
              }
            }
          }
          
          if (op === "finish") {
            safeResolve({ type: "success", data: fullLine });
          }
          
          if (op === "cancel") {
            safeResolve({ type: "failed", data: `${fullLine} | Cancelled by server` });
          }
          
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          safeResolve({ type: "error", data: `${fullLine} | ${msg}` });
        }
      };
      
      ws.onerror = () => {
        safeResolve({ type: "error", data: `${fullLine} | WebSocket Error` });
      };
      
      ws.onclose = () => {
        if (!isResolved) {
          safeResolve({ type: "error", data: `${fullLine} | Connection Closed` });
        }
      };
    });
    
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { type: "error", data: `${line} | ${msg}` };
  }
}

// Process tokens in batches
async function processTokens(tokens: string[], threadCount: number): Promise<TokenResult> {
  const results: TokenResult = {
    success: [],
    failed: [],
    errors: [],
  };
  
  const batchSize = threadCount;
  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);
    const promises = batch.map((token) => processToken(token));
    const batchResults = await Promise.all(promises);
    
    batchResults.forEach((result) => {
      if (result.type === "success") {
        results.success.push(result.data);
      } else if (result.type === "failed") {
        results.failed.push(result.data);
      } else {
        results.errors.push(result.data);
      }
    });
    
    // Small delay between batches
    if (i + batchSize < tokens.length) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  
  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { tokens, threadCount }: NocapRequest = await req.json();
    
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
    
    console.log(`[INFO] Starting NoCap process for ${tokens.length} tokens with ${count} threads`);
    
    const results = await processTokens(tokens, count);
    
    console.log(`[INFO] NoCap complete. Success: ${results.success.length}, Failed: ${results.failed.length}, Errors: ${results.errors.length}`);
    
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
