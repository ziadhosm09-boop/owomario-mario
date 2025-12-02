import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Unlock, Key, Mail, Loader2, Copy, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const DiscordUnlocker = () => {
  const [token, setToken] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState<"ballmail" | "beemail">("ballmail");
  const [isLoading, setIsLoading] = useState(false);
  const [emailResult, setEmailResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleUnlock = async () => {
    if (!token.trim()) {
      toast({
        title: "Error",
        description: "Please enter a Discord token",
        variant: "destructive",
      });
      return;
    }

    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter the Email API key",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setEmailResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("fetch-unlock-email", {
        body: { 
          provider,
          apiKey: apiKey.trim(),
          count: 1
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      // Parse the response based on provider
      let emailData = "";
      
      if (provider === "ballmail") {
        // ballmail returns JSON
        if (data.data && typeof data.data === "object") {
          if (Array.isArray(data.data)) {
            emailData = data.data.map((item: any) => {
              if (typeof item === "string") return item;
              // Format: email:pass:refreshToken:clientId
              return `${item.email || ""}:${item.password || item.pass || ""}:${item.refreshToken || item.refresh_token || ""}:${item.clientId || item.client_id || ""}`;
            }).join("\n");
          } else if (data.data.email) {
            emailData = `${data.data.email}:${data.data.password || data.data.pass || ""}:${data.data.refreshToken || data.data.refresh_token || ""}:${data.data.clientId || data.data.client_id || ""}`;
          } else {
            emailData = JSON.stringify(data.data, null, 2);
          }
        } else {
          emailData = String(data.data);
        }
      } else if (provider === "beemail") {
        // beemail returns text format
        if (data.data?.raw) {
          emailData = data.data.raw;
        } else {
          emailData = JSON.stringify(data.data, null, 2);
        }
      }
      
      setEmailResult(emailData);
      
      toast({
        title: "Success",
        description: `Email fetched from ${provider}`,
      });
    } catch (error: any) {
      console.error("Unlocker error:", error);
      toast({
        title: "Error",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (emailResult) {
      navigator.clipboard.writeText(emailResult);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Email data copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-gradient-primary shadow-glow">
                <Unlock className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold">Discord Unlocker Requests</h1>
              <p className="text-muted-foreground">
                Unlock Discord accounts using email verification
              </p>
            </div>

            <Card className="border-border bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-primary" />
                  Configuration
                </CardTitle>
                <CardDescription>
                  Enter your Discord token and Email API key
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="token" className="flex items-center gap-2">
                    <Unlock className="w-4 h-4" />
                    Discord Token
                  </Label>
                  <Input
                    id="token"
                    type="password"
                    placeholder="Enter your Discord token..."
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="provider" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Provider
                  </Label>
                  <Select value={provider} onValueChange={(v) => setProvider(v as "ballmail" | "beemail")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ballmail">Ballmail.shop</SelectItem>
                      <SelectItem value="beemail">Bee-mails.com</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKey" className="flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    API Key ({provider === "ballmail" ? "ballmail.shop" : "bee-mails.com"})
                  </Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder={`Enter your ${provider} API key...`}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="font-mono"
                  />
                </div>

                <Button
                  onClick={handleUnlock}
                  disabled={isLoading}
                  className="w-full bg-gradient-primary hover:opacity-90"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Fetching Email...
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4 mr-2" />
                      Start Unlock Request
                    </>
                  )}
                </Button>

                {emailResult && (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Email Result:</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyToClipboard}
                        className="h-8"
                      >
                        {copied ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border border-border">
                      <pre className="text-sm font-mono whitespace-pre-wrap break-all text-foreground">
                        {emailResult}
                      </pre>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Format: email:password:refreshToken:clientId
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DiscordUnlocker;
