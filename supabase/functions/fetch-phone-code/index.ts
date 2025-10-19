import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PhoneCodeRequest {
  phone: string;
  apiUrl: string;
}

function extractCode(text: string): string | null {
  if (!text) return null;
  
  // Pattern: YES|123456 or similar format
  const pipePattern = /YES\|(\d{6})/i;
  let match = pipePattern.exec(text);
  if (match && match[1]) {
    console.log(`Found code with pipe pattern: ${match[1]}`);
    return match[1];
  }
  
  // Pattern: 6-digit code anywhere in text
  const digitPattern = /\b(\d{6})\b/;
  match = digitPattern.exec(text);
  if (match && match[1]) {
    console.log(`Found 6-digit code: ${match[1]}`);
    return match[1];
  }
  
  return null;
}

async function fetchCodeFromApi(apiUrl: string): Promise<string | null> {
  console.log(`Fetching code from: ${apiUrl}`);
  
  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!response.ok) {
      console.error(`API request failed: ${response.status}`);
      return null;
    }

    const text = await response.text();
    console.log(`API Response: ${text}`);
    
    return extractCode(text);
  } catch (error: any) {
    console.error(`Error fetching from API: ${error.message}`);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json() as PhoneCodeRequest;
    const { phone, apiUrl } = body;

    if (!phone || !apiUrl) {
      throw new Error("Phone and apiUrl are required");
    }

    console.log(`Processing request for phone: ${phone}`);
    
    const code = await fetchCodeFromApi(apiUrl);

    if (!code) {
      return new Response(
        JSON.stringify({ 
          phone,
          error: "لم يتم العثور على كود" 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        phone,
        code 
      }),
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
