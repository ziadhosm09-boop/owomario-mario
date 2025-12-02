import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FetchEmailRequest {
  provider: "ballmail" | "beemail";
  apiKey: string;
  count?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { provider, apiKey, count = 1 }: FetchEmailRequest = await req.json();

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let apiUrl: string;
    
    if (provider === "ballmail") {
      apiUrl = `https://ballmail.shop/api/account/any?api_key=${encodeURIComponent(apiKey)}&count=${count}`;
    } else if (provider === "beemail") {
      apiUrl = `http://bee-mails.com/getEmail?num=${count}&key=${encodeURIComponent(apiKey)}&format=txt`;
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid provider. Use 'ballmail' or 'beemail'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetching from ${provider}: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Accept": "*/*",
      },
    });

    const contentType = response.headers.get("content-type") || "";
    let data: any;

    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      // For text responses (like beemail with format=txt)
      const text = await response.text();
      data = { raw: text };
    }

    console.log(`Response from ${provider}:`, data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        provider,
        data 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("Error fetching email:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to fetch email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
