import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, accountType, quantity } = await req.json();

    if (!apiKey || !accountType || !quantity) {
      return new Response(
        JSON.stringify({ error: "Missing apiKey, accountType, or quantity" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accountCode = accountType === "HOTMAIL" ? "HOTMAIL" : "OUTLOOK";
    const url = `https://api.zeus-x.ru/purchase?apikey=${encodeURIComponent(apiKey)}&accountcode=${accountCode}&quantity=${encodeURIComponent(quantity)}`;

    const response = await fetch(url);
    const text = await response.text();

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      // Plain text response - treat each line as an account
      data = { success: true, accounts: text.trim().split("\n") };
    }

    // Extract accounts from various response formats
    let accounts: string[] = [];

    if (typeof data === "object" && data !== null) {
      // Zeus-X format: Data.Accounts
      if (data.Data && typeof data.Data === "object" && Array.isArray(data.Data.Accounts)) {
        accounts = data.Data.Accounts;
      }
      // Fallback keys
      if (!accounts.length) {
        const raw = data.accounts || data.Accounts || data.data || data.Data;
        if (Array.isArray(raw)) accounts = raw;
      }
      // Error check
      if (!accounts.length && data.Code !== 0 && data.Message) {
        return new Response(
          JSON.stringify({ error: data.Message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (Array.isArray(data) && !accounts.length) {
      accounts = data;
    }

    // Format accounts to email:pass:refreshToken:clientId
    const formatted: string[] = [];
    for (const acc of accounts) {
      if (typeof acc === "object" && acc !== null) {
        const login = acc.Email || acc.login || acc.email || acc.user;
        const password = acc.Password || acc.password || acc.pass;
        const refreshToken = acc.RefreshToken || acc.refresh_token || "";
        const clientId = acc.ClientId || acc.service_id || "";
        if (login && password) {
          formatted.push(`${login}:${password}:${refreshToken}:${clientId}`);
        }
      } else if (typeof acc === "string" && acc.includes(":")) {
        const parts = acc.split(":");
        if (parts.length === 2) {
          formatted.push(`${acc}::`);
        } else if (parts.length === 3) {
          formatted.push(`${acc}:`);
        } else {
          formatted.push(acc);
        }
      }
    }

    return new Response(
      JSON.stringify({ emails: formatted, total: formatted.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
