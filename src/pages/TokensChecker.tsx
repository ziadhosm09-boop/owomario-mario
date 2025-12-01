import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle, Mail, Smartphone, AlertCircle, Download, Eye, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";

interface TokenCheckResults {
  working: string[];
  email_locked: string[];
  phone_locked: string[];
  invalid: string[];
  errors: string[];
}

const TokensChecker = () => {
  const [tokens, setTokens] = useState("");
  const [threadCount, setThreadCount] = useState(5);
  const [isChecking, setIsChecking] = useState(false);
  const [results, setResults] = useState<TokenCheckResults | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState<string[]>([]);
  const [dialogTitle, setDialogTitle] = useState("");
  const [progress, setProgress] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const { toast } = useToast();

  const handleCheck = async () => {
    if (!tokens.trim()) {
      toast({
        title: "Error",
        description: "Please enter tokens to check",
        variant: "destructive",
      });
      return;
    }

    const tokenList = tokens.split("\n").filter((t) => t.trim());
    
    if (tokenList.length === 0) {
      toast({
        title: "Error",
        description: "No valid tokens found",
        variant: "destructive",
      });
      return;
    }

    setIsChecking(true);
    setResults(null);
    setProgress(0);

    // Process in batches of 500 tokens max per request to avoid timeouts
    const BATCH_SIZE = 500;
    const batches = [];
    for (let i = 0; i < tokenList.length; i += BATCH_SIZE) {
      batches.push(tokenList.slice(i, i + BATCH_SIZE));
    }

    setTotalBatches(batches.length);

    const combinedResults: TokenCheckResults = {
      working: [],
      email_locked: [],
      phone_locked: [],
      invalid: [],
      errors: [],
    };

    try {
      for (let i = 0; i < batches.length; i++) {
        setCurrentBatch(i + 1);
        const batch = batches[i];

        const { data, error } = await supabase.functions.invoke("check-discord-tokens", {
          body: { tokens: batch, threadCount },
        });

        if (error) throw error;

        // Combine results from this batch
        combinedResults.working.push(...data.results.working);
        combinedResults.email_locked.push(...data.results.email_locked);
        combinedResults.phone_locked.push(...data.results.phone_locked);
        combinedResults.invalid.push(...data.results.invalid);
        combinedResults.errors.push(...data.results.errors);

        // Update progress
        const progressPercent = ((i + 1) / batches.length) * 100;
        setProgress(progressPercent);

        // Update results in real-time
        setResults({ ...combinedResults });
      }

      toast({
        title: "Check Complete",
        description: `Checked ${tokenList.length} tokens successfully`,
      });
    } catch (error) {
      console.error("Error checking tokens:", error);
      toast({
        title: "Error",
        description: "Failed to check tokens. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
      setProgress(0);
      setCurrentBatch(0);
      setTotalBatches(0);
    }
  };

  const downloadResults = (items: string[], filename: string) => {
    const blob = new Blob([items.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openDialog = (items: string[], title: string) => {
    setDialogContent(items);
    setDialogTitle(title);
    setDialogOpen(true);
  };

  const copyItem = (item: string) => {
    navigator.clipboard.writeText(item);
    toast({
      title: "Copied",
      description: "Item copied to clipboard",
    });
  };

  const copyAll = () => {
    navigator.clipboard.writeText(dialogContent.join("\n"));
    toast({
      title: "Copied",
      description: "All items copied to clipboard",
    });
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
                Discord Tokens Checker
              </h1>
              <p className="text-muted-foreground">
                Check Discord tokens status (Working, Email Locked, Phone Locked)
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Token Input</CardTitle>
                <CardDescription>
                  Enter tokens (one per line). Supports formats: token, email:pass:token, email:pass:"token"
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="tokens">Tokens</Label>
                  <Textarea
                    id="tokens"
                    placeholder="Enter tokens here (one per line)&#10;token&#10;email:pass:token&#10;email:pass:&quot;token&quot;"
                    value={tokens}
                    onChange={(e) => setTokens(e.target.value)}
                    className="min-h-[200px] font-mono text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="threadCount">Thread Count</Label>
                  <Input
                    id="threadCount"
                    type="number"
                    min="1"
                    value={threadCount}
                    onChange={(e) => setThreadCount(Number(e.target.value))}
                    className="max-w-xs"
                  />
                </div>

                {isChecking && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Processing batch {currentBatch} of {totalBatches}</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="w-full" />
                  </div>
                )}

                <Button
                  onClick={handleCheck}
                  disabled={isChecking}
                  className="w-full bg-gradient-primary hover:opacity-90"
                >
                  {isChecking ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Checking... ({currentBatch}/{totalBatches})
                    </>
                  ) : (
                    "Check Tokens"
                  )}
                </Button>
              </CardContent>
            </Card>

            {results && (
              <div className="mt-8 space-y-4">
                <h2 className="text-2xl font-bold">Results</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card className="border-green-500/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          Working
                        </CardTitle>
                        <span className="text-2xl font-bold text-green-500">
                          {results.working.length}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadResults(results.working, "working.txt")}
                        disabled={results.working.length === 0}
                        className="flex-1"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDialog(results.working, "Working Tokens")}
                        disabled={results.working.length === 0}
                        className="flex-1"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-yellow-500/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Mail className="w-5 h-5 text-yellow-500" />
                          Email Locked
                        </CardTitle>
                        <span className="text-2xl font-bold text-yellow-500">
                          {results.email_locked.length}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadResults(results.email_locked, "email_locked.txt")}
                        disabled={results.email_locked.length === 0}
                        className="flex-1"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDialog(results.email_locked, "Email Locked Tokens")}
                        disabled={results.email_locked.length === 0}
                        className="flex-1"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-orange-500/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Smartphone className="w-5 h-5 text-orange-500" />
                          Phone Locked
                        </CardTitle>
                        <span className="text-2xl font-bold text-orange-500">
                          {results.phone_locked.length}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadResults(results.phone_locked, "phone_locked.txt")}
                        disabled={results.phone_locked.length === 0}
                        className="flex-1"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDialog(results.phone_locked, "Phone Locked Tokens")}
                        disabled={results.phone_locked.length === 0}
                        className="flex-1"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-red-500/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <XCircle className="w-5 h-5 text-red-500" />
                          Invalid
                        </CardTitle>
                        <span className="text-2xl font-bold text-red-500">
                          {results.invalid.length}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadResults(results.invalid, "invalid.txt")}
                        disabled={results.invalid.length === 0}
                        className="flex-1"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDialog(results.invalid, "Invalid Tokens")}
                        disabled={results.invalid.length === 0}
                        className="flex-1"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-destructive/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-destructive" />
                          Errors
                        </CardTitle>
                        <span className="text-2xl font-bold text-destructive">
                          {results.errors.length}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadResults(results.errors, "errors.txt")}
                        disabled={results.errors.length === 0}
                        className="flex-1"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDialog(results.errors, "Errors")}
                        disabled={results.errors.length === 0}
                        className="flex-1"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              {dialogContent.length} item(s)
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mb-2">
            <Button variant="outline" size="sm" onClick={copyAll}>
              <Copy className="w-4 h-4 mr-2" />
              Copy All
            </Button>
          </div>
          <ScrollArea className="h-[400px] w-full rounded border p-4">
            <div className="space-y-2">
              {dialogContent.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded hover:bg-accent group"
                >
                  <code className="text-sm font-mono flex-1 break-all">{item}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyItem(item)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default TokensChecker;
