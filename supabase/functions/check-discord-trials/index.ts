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

interface TrialCheckResult {
  trial: string[];
  invalid: string[];
  no_trial: string[];
  errors: string[];
}

async function checkToken(token: string): Promise<{
  type: "trial" | "invalid" | "no_trial" | "error";
  data: string;
}> {
  try {
    const parts = token.split(":");
    let actualToken: string;
    let email = "N/A";
    let password = "N/A";

    if (parts.length === 3) {
      [email, password, actualToken] = parts;
    } else if (parts.length === 1) {
      actualToken = parts[0];
    } else {
      return { type: "error", data: `${token} | Invalid Format` };
    }

    const xSuperProperties = btoa(
      JSON.stringify({
        os: "Windows",
        browser: "Chrome",
        device: "",
        system_locale: "en-GB",
        browser_user_agent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
        browser_version: "138.0.0.0",
        os_version: "10",
        referrer: "",
        referring_domain: "",
        referrer_current: "",
        referring_domain_current: "",
        release_channel: "stable",
        client_build_number: 417266,
        client_event_source: null,
      })
    );

    const response = await fetch(
      "https://discord.com/api/v9/users/@me/billing/user-offer",
      {
        method: "POST",
        headers: {
          accept: "*/*",
          "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
          authorization: actualToken,
          "content-type": "application/json",
          origin: "https://discord.com",
          referer: "https://discord.com/channels/@me",
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
          "x-super-properties": xSuperProperties,
        },
        body: JSON.stringify({}),
      }
    );

    const status = response.status;

    if (status === 200) {
      const data = await response.json();
      if (
        data.user_trial_offer &&
        data.user_trial_offer.trial_id
      ) {
        const trialId = data.user_trial_offer.trial_id;
        const expiresAt = data.user_trial_offer.expires_at || "N/A";
        const result =
          parts.length === 3
            ? `${email}:${password}:${actualToken}|${trialId}|${expiresAt}`
            : `${actualToken}|${trialId}|${expiresAt}`;
        return { type: "trial", data: result };
      } else {
        return {
          type: "no_trial",
          data: token,
        };
      }
    } else if (status === 401) {
      return { type: "invalid", data: token };
    } else if (status === 404 || status === 405) {
      return { type: "no_trial", data: token };
    } else if (status === 429) {
      return { type: "error", data: `${token} | Rate Limited` };
    } else {
      return { type: "error", data: `${token} | HTTP ${status}` };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { type: "error", data: `${token} | ${errorMessage}` };
  }
}

async function processTokens(
  tokens: string[],
  threadCount: number
): Promise<TrialCheckResult> {
  const results: TrialCheckResult = {
    trial: [],
    invalid: [],
    no_trial: [],
    errors: [],
  };

  // Process tokens in batches based on thread count
  const batchSize = threadCount;
  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);
    const promises = batch.map((token) => checkToken(token));
    const batchResults = await Promise.all(promises);

    batchResults.forEach((result) => {
      if (result.type === "trial") {
        results.trial.push(result.data);
      } else if (result.type === "invalid") {
        results.invalid.push(result.data);
      } else if (result.type === "no_trial") {
        results.no_trial.push(result.data);
      } else if (result.type === "error") {
        results.errors.push(result.data);
      }
    });

    // Add small delay between batches to avoid rate limiting
    if (i + batchSize < tokens.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
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

    const count = Math.min(Math.max(threadCount || 1, 1), 3);

    const results = await processTokens(tokens, count);

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
