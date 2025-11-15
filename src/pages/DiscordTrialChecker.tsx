import { useState } from "react";
import { Shield, Loader2, Eye, Copy, Check } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const DiscordTrialChecker = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [tokens, setTokens] = useState("");
  const [threadCount, setThreadCount] = useState("1");
  const [isChecking, setIsChecking] = useState(false);
  const [results, setResults] = useState<{
    trial: string[];
    invalid: string[];
    no_trial: string[];
    errors: string[];
  } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"trial" | "invalid" | "no_trial" | "errors" | null>(null);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const handleCheck = async () => {
    if (!tokens.trim()) {
      toast({
        title: t("discordChecker.error"),
        description: t("discordChecker.emptyTokensError"),
        variant: "destructive",
      });
      return;
    }

    setIsChecking(true);
    setResults(null);

    try {
      const extractToken = (line: string): { token: string; fullLine: string } => {
        const trimmedLine = line.trim();
        const match = trimmedLine.match(/"([^"]+)"/);
        const token = match ? match[1] : trimmedLine;
        return { token, fullLine: trimmedLine };
      };

      const tokenData = tokens
        .split("\n")
        .map((t) => extractToken(t))
        .filter((t) => t.token);

      // Create mapping from token to full line
      const tokenMap = new Map<string, string>();
      tokenData.forEach(({ token, fullLine }) => {
        tokenMap.set(token, fullLine);
      });

      const tokenList = tokenData.map(t => t.token);

      const { data, error } = await supabase.functions.invoke(
        "check-discord-trials",
        {
          body: {
            tokens: tokenList,
            threadCount: parseInt(threadCount),
          },
        }
      );

      if (error) throw error;

      // Map tokens back to full lines
      const mappedResults = {
        trial: data.results.trial.map((token: string) => tokenMap.get(token) || token),
        invalid: data.results.invalid.map((token: string) => tokenMap.get(token) || token),
        no_trial: data.results.no_trial.map((token: string) => tokenMap.get(token) || token),
        errors: data.results.errors.map((token: string) => tokenMap.get(token) || token),
      };

      setResults(mappedResults);
      
      toast({
        title: t("discordChecker.checkComplete"),
        description: `${t("discordChecker.trialsFound")}: ${data.results.trial.length}`,
      });
    } catch (error: any) {
      console.error("Error checking trials:", error);
      toast({
        title: t("discordChecker.error"),
        description: error.message || t("discordChecker.checkError"),
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const downloadResults = (type: keyof typeof results) => {
    if (!results || !results[type].length) return;

    const content = results[type].join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openDialog = (type: "trial" | "invalid" | "no_trial" | "errors") => {
    setDialogType(type);
    setDialogOpen(true);
  };

  const copyItem = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(text);
      setTimeout(() => setCopiedItem(null), 2000);
      toast({
        title: t("discordChecker.copied"),
      });
    } catch (error) {
      toast({
        title: t("discordChecker.error"),
        description: t("discordChecker.copyError"),
        variant: "destructive",
      });
    }
  };

  const copyAll = async () => {
    if (!dialogType || !results) return;
    
    try {
      const content = results[dialogType].join("\n");
      await navigator.clipboard.writeText(content);
      toast({
        title: t("discordChecker.copiedAll"),
        description: `${results[dialogType].length} ${t("discordChecker.items")}`,
      });
    } catch (error) {
      toast({
        title: t("discordChecker.error"),
        description: t("discordChecker.copyError"),
        variant: "destructive",
      });
    }
  };

  const getDialogTitle = () => {
    if (!dialogType) return "";
    switch (dialogType) {
      case "trial":
        return t("discordChecker.trialsFound");
      case "invalid":
        return t("discordChecker.invalid");
      case "no_trial":
        return t("discordChecker.noTrial");
      case "errors":
        return t("discordChecker.errors");
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-4xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
                {t("discordChecker.title")}
              </h1>
              <p className="text-muted-foreground text-lg">
                {t("discordChecker.subtitle")}
              </p>
            </div>

            <Card className="p-6 mb-6">
              <div className="space-y-6">
                <div>
                  <Label htmlFor="tokens" className="text-base font-semibold mb-3 block">
                    {t("discordChecker.tokensLabel")}
                  </Label>
                  <Textarea
                    id="tokens"
                    placeholder={t("discordChecker.tokensPlaceholder")}
                    value={tokens}
                    onChange={(e) => setTokens(e.target.value)}
                    className="min-h-[200px] font-mono text-sm"
                    disabled={isChecking}
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    {t("discordChecker.tokensHint")}
                  </p>
                </div>

                <div>
                  <Label htmlFor="threads" className="text-base font-semibold mb-3 block">
                    {t("discordChecker.threadsLabel")}
                  </Label>
                  <Select
                    value={threadCount}
                    onValueChange={setThreadCount}
                    disabled={isChecking}
                  >
                    <SelectTrigger id="threads" className="w-full">
                      <SelectValue placeholder={t("discordChecker.selectThreads")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 {t("discordChecker.thread")}</SelectItem>
                      <SelectItem value="2">2 {t("discordChecker.threads")}</SelectItem>
                      <SelectItem value="3">3 {t("discordChecker.threads")}</SelectItem>
                      <SelectItem value="4">4 {t("discordChecker.threads")}</SelectItem>
                      <SelectItem value="5">5 {t("discordChecker.threads")}</SelectItem>
                      <SelectItem value="6">6 {t("discordChecker.threads")}</SelectItem>
                      <SelectItem value="7">7 {t("discordChecker.threads")}</SelectItem>
                      <SelectItem value="8">8 {t("discordChecker.threads")}</SelectItem>
                      <SelectItem value="9">9 {t("discordChecker.threads")}</SelectItem>
                      <SelectItem value="10">10 {t("discordChecker.threads")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleCheck}
                  disabled={isChecking}
                  className="w-full"
                  size="lg"
                >
                  {isChecking ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {t("discordChecker.checking")}
                    </>
                  ) : (
                    t("discordChecker.startCheck")
                  )}
                </Button>
              </div>
            </Card>

            {results && (
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">{t("discordChecker.results")}</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold text-success">
                        {t("discordChecker.trialsFound")}
                      </h3>
                      <span className="text-2xl font-bold text-success">
                        {results.trial.length}
                      </span>
                    </div>
                    {results.trial.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadResults("trial")}
                          className="flex-1"
                        >
                          {t("discordChecker.download")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDialog("trial")}
                          className="flex-1"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          {t("discordChecker.showList")}
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold text-destructive">
                        {t("discordChecker.invalid")}
                      </h3>
                      <span className="text-2xl font-bold text-destructive">
                        {results.invalid.length}
                      </span>
                    </div>
                    {results.invalid.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadResults("invalid")}
                          className="flex-1"
                        >
                          {t("discordChecker.download")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDialog("invalid")}
                          className="flex-1"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          {t("discordChecker.showList")}
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-lg bg-muted border">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold">
                        {t("discordChecker.noTrial")}
                      </h3>
                      <span className="text-2xl font-bold">
                        {results.no_trial.length}
                      </span>
                    </div>
                    {results.no_trial.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadResults("no_trial")}
                          className="flex-1"
                        >
                          {t("discordChecker.download")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDialog("no_trial")}
                          className="flex-1"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          {t("discordChecker.showList")}
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold text-warning">
                        {t("discordChecker.errors")}
                      </h3>
                      <span className="text-2xl font-bold text-warning">
                        {results.errors.length}
                      </span>
                    </div>
                    {results.errors.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadResults("errors")}
                          className="flex-1"
                        >
                          {t("discordChecker.download")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDialog("errors")}
                          className="flex-1"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          {t("discordChecker.showList")}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl">{getDialogTitle()}</DialogTitle>
            <DialogDescription>
              {dialogType && results && `${results[dialogType].length} ${t("discordChecker.items")}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex gap-2 mb-4">
            <Button
              onClick={copyAll}
              className="w-full"
              variant="default"
            >
              <Copy className="w-4 h-4 mr-2" />
              {t("discordChecker.copyAll")}
            </Button>
          </div>

          <ScrollArea className="h-[50vh] pr-4">
            <div className="space-y-2">
              {dialogType && results && results[dialogType].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border hover:bg-muted transition-colors"
                >
                  <span className="flex-1 text-sm font-mono break-all">
                    {item}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    onClick={() => copyItem(item)}
                  >
                    {copiedItem === item ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
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

export default DiscordTrialChecker;
