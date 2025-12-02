import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Unlock, Key, Mail, Loader2 } from "lucide-react";

const DiscordUnlocker = () => {
  const [token, setToken] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
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
    setResult(null);

    try {
      // Fetch email from ballmail API
      const emailResponse = await fetch(
        `https://ballmail.shop/api/account/any?api_key=${encodeURIComponent(apiKey)}&count=1`
      );

      if (!emailResponse.ok) {
        throw new Error("Failed to fetch email from API");
      }

      const emailData = await emailResponse.json();
      
      setResult(JSON.stringify(emailData, null, 2));
      
      toast({
        title: "Success",
        description: "Email fetched successfully",
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
                  <Label htmlFor="apiKey" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email API Key
                  </Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="Enter your ballmail.shop API key..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    API from ballmail.shop
                  </p>
                </div>

                <Button
                  onClick={handleUnlock}
                  disabled={isLoading}
                  className="w-full bg-gradient-primary hover:opacity-90"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4 mr-2" />
                      Start Unlock Request
                    </>
                  )}
                </Button>

                {result && (
                  <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border">
                    <Label className="text-sm font-medium mb-2 block">Result:</Label>
                    <pre className="text-xs font-mono whitespace-pre-wrap break-all text-foreground">
                      {result}
                    </pre>
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
