import { useState } from "react";
import { Shield, Loader2 } from "lucide-react";
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
      const tokenList = tokens
        .split("\n")
        .map((t) => t.trim())
        .filter((t) => t);

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

      setResults(data.results);
      
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadResults("trial")}
                        className="w-full mt-2"
                      >
                        {t("discordChecker.download")}
                      </Button>
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadResults("invalid")}
                        className="w-full mt-2"
                      >
                        {t("discordChecker.download")}
                      </Button>
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadResults("no_trial")}
                        className="w-full mt-2"
                      >
                        {t("discordChecker.download")}
                      </Button>
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadResults("errors")}
                        className="w-full mt-2"
                      >
                        {t("discordChecker.download")}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DiscordTrialChecker;
