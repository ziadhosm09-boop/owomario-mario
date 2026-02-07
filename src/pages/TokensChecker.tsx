import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Loader2, CheckCircle, XCircle, Mail, Smartphone, AlertCircle, 
  Download, Eye, Copy, Calendar, Clock, Flag, Lock, User, ShoppingCart, ChevronDown, ChevronUp
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ToolsPromotion } from "@/components/ToolsPromotion";

// Discord Icon component
const DiscordIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

interface TokenCheckResults {
  working: string[];
  email_locked: string[];
  phone_locked: string[];
  invalid: string[];
  errors: string[];
}

interface TokenAgeResult {
  token: string;
  fullLine: string;
  userId: string | null;
  creationDate: string | null;
  age: string | null;
  username: string | null;
  status: "valid" | "invalid" | "error";
  errorMessage?: string;
}

interface AgeCheckResults {
  valid: TokenAgeResult[];
  invalid: TokenAgeResult[];
  errors: TokenAgeResult[];
  byDate: Record<string, string[]>;
}

interface FlagCheckResults {
  valid: string[];
  flagged: string[];
  locked: string[];
  invalid: string[];
  errors: string[];
}

interface CombinedResults {
  status?: TokenCheckResults;
  age?: AgeCheckResults;
  flags?: FlagCheckResults;
}

const TokensChecker = () => {
  const { i18n } = useTranslation();
  
  // Input state
  const [tokens, setTokens] = useState("");
  const [threadCount, setThreadCount] = useState(5);
  
  // Toggle states
  const [enableStatus, setEnableStatus] = useState(true);
  const [enableAge, setEnableAge] = useState(false);
  const [enableFlags, setEnableFlags] = useState(false);
  const [showToolsPromo, setShowToolsPromo] = useState(false);
  
  // Processing state
  const [isChecking, setIsChecking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  
  // Results
  const [results, setResults] = useState<CombinedResults | null>(null);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState<string[]>([]);
  const [dialogTitle, setDialogTitle] = useState("");
  
  const [ageDialogOpen, setAgeDialogOpen] = useState(false);
  const [ageDialogContent, setAgeDialogContent] = useState<TokenAgeResult[]>([]);
  const [ageDialogTitle, setAgeDialogTitle] = useState("");
  
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

    if (!enableStatus && !enableAge && !enableFlags) {
      toast({
        title: "Error",
        description: "Please enable at least one checker",
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

    const BATCH_SIZE = 100;
    const batches: string[][] = [];
    for (let i = 0; i < tokenList.length; i += BATCH_SIZE) {
      batches.push(tokenList.slice(i, i + BATCH_SIZE));
    }

    const newResults: CombinedResults = {};
    const enabledCheckers = [enableStatus, enableAge, enableFlags].filter(Boolean).length;
    let completedSteps = 0;

    try {
      // Status Checker
      if (enableStatus) {
        setCurrentStep("Checking Status...");
        const statusResults: TokenCheckResults = {
          working: [],
          email_locked: [],
          phone_locked: [],
          invalid: [],
          errors: [],
        };

        for (let i = 0; i < batches.length; i++) {
          const { data, error } = await supabase.functions.invoke("check-discord-tokens", {
            body: { tokens: batches[i], threadCount },
          });
          if (error) throw error;

          statusResults.working.push(...data.results.working);
          statusResults.email_locked.push(...data.results.email_locked);
          statusResults.phone_locked.push(...data.results.phone_locked);
          statusResults.invalid.push(...data.results.invalid);
          statusResults.errors.push(...data.results.errors);

          setProgress(((completedSteps + (i + 1) / batches.length) / enabledCheckers) * 100);
        }
        newResults.status = statusResults;
        completedSteps++;
      }

      // Age Checker
      if (enableAge) {
        setCurrentStep("Checking Age...");
        const ageResults: AgeCheckResults = {
          valid: [],
          invalid: [],
          errors: [],
          byDate: {},
        };

        for (let i = 0; i < batches.length; i++) {
          const { data, error } = await supabase.functions.invoke("check-token-age", {
            body: { tokens: batches[i], threadCount },
          });
          if (error) throw error;

          ageResults.valid.push(...data.results.valid);
          ageResults.invalid.push(...data.results.invalid);
          ageResults.errors.push(...data.results.errors);
          
          Object.entries(data.results.byDate as Record<string, string[]>).forEach(([date, tokens]) => {
            if (!ageResults.byDate[date]) {
              ageResults.byDate[date] = [];
            }
            ageResults.byDate[date].push(...tokens);
          });

          setProgress(((completedSteps + (i + 1) / batches.length) / enabledCheckers) * 100);
        }
        newResults.age = ageResults;
        completedSteps++;
      }

      // Flag Checker
      if (enableFlags) {
        setCurrentStep("Checking Flags...");
        const flagResults: FlagCheckResults = {
          valid: [],
          flagged: [],
          locked: [],
          invalid: [],
          errors: [],
        };

        for (let i = 0; i < batches.length; i++) {
          const { data, error } = await supabase.functions.invoke("check-token-flags", {
            body: { tokens: batches[i], threadCount },
          });
          if (error) throw error;

          flagResults.valid.push(...data.results.valid);
          flagResults.flagged.push(...data.results.flagged);
          flagResults.locked.push(...data.results.locked);
          flagResults.invalid.push(...data.results.invalid);
          flagResults.errors.push(...data.results.errors);

          setProgress(((completedSteps + (i + 1) / batches.length) / enabledCheckers) * 100);
        }
        newResults.flags = flagResults;
        completedSteps++;
      }

      setResults(newResults);
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
      setCurrentStep("");
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

  const downloadAgeResults = (items: TokenAgeResult[], filename: string) => {
    const lines = items.map(item => 
      `${item.fullLine} | ${item.username || 'Unknown'} | ${item.creationDate || 'Unknown'} | ${item.age || 'Unknown'}`
    );
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
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

  const openAgeDialog = (items: TokenAgeResult[], title: string) => {
    setAgeDialogContent(items);
    setAgeDialogTitle(title);
    setAgeDialogOpen(true);
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

  const copyAllAgeResults = () => {
    const lines = ageDialogContent.map(item => 
      `${item.fullLine} | ${item.username || 'Unknown'} | ${item.creationDate || 'Unknown'} | ${item.age || 'Unknown'}`
    );
    navigator.clipboard.writeText(lines.join("\n"));
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
            {/* Creator Credit Header */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <Badge variant="outline" className="px-4 py-2 text-sm flex items-center gap-2 bg-card/50 backdrop-blur-sm border-primary/20">
                <User className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Created by</span>
                <a 
                  href="https://discord.com/users/owomario" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-semibold text-primary hover:underline flex items-center gap-1.5"
                >
                  <DiscordIcon className="w-4 h-4" />
                  owomario
                </a>
              </Badge>
            </div>

            {/* Tools Promotion Collapsible */}
            <Collapsible open={showToolsPromo} onOpenChange={setShowToolsPromo} className="mb-8">
              <CollapsibleTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full flex items-center justify-between gap-2 py-6 border-dashed border-2 border-primary/30 hover:border-primary/50 hover:bg-primary/5"
                >
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-primary" />
                    <span className="font-semibold">
                      {i18n.language === 'ar' ? "🛒 المزيد من الأدوات" : "🛒 More Tools"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-gradient-primary text-white text-xs">
                      {i18n.language === 'ar' ? "للبيع" : "For Sale"}
                    </Badge>
                    {showToolsPromo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <ToolsPromotion />
              </CollapsibleContent>
            </Collapsible>

            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
                Discord Tokens Checker
              </h1>
              <p className="text-muted-foreground">
                All-in-one Discord token checker with multiple modes
              </p>
            </div>

            {/* Main Input Card */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Token Input</CardTitle>
                <CardDescription>
                  Enter tokens (one per line). Supports: token, "token", email:pass:token, email:pass:"token"
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Tokens Input */}
                <div>
                  <Label htmlFor="tokens">Tokens</Label>
                  <Textarea
                    id="tokens"
                    placeholder="Enter tokens here (one per line)&#10;token&#10;&quot;token&quot;&#10;email:pass:token&#10;email:pass:&quot;token&quot;"
                    value={tokens}
                    onChange={(e) => setTokens(e.target.value)}
                    className="min-h-[200px] font-mono text-sm"
                  />
                </div>

                {/* Thread Count */}
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

                {/* Checker Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between space-x-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <Label htmlFor="status-toggle" className="font-medium">Status Checker</Label>
                    </div>
                    <Switch
                      id="status-toggle"
                      checked={enableStatus}
                      onCheckedChange={setEnableStatus}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between space-x-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      <Label htmlFor="age-toggle" className="font-medium">Age Checker</Label>
                    </div>
                    <Switch
                      id="age-toggle"
                      checked={enableAge}
                      onCheckedChange={setEnableAge}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between space-x-2">
                    <div className="flex items-center gap-2">
                      <Flag className="w-4 h-4 text-yellow-500" />
                      <Label htmlFor="flag-toggle" className="font-medium">Flagged Checker</Label>
                    </div>
                    <Switch
                      id="flag-toggle"
                      checked={enableFlags}
                      onCheckedChange={setEnableFlags}
                    />
                  </div>
                </div>

                {/* Progress */}
                {isChecking && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{currentStep}</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="w-full" />
                  </div>
                )}

                {/* Check Button */}
                <Button
                  onClick={handleCheck}
                  disabled={isChecking || (!enableStatus && !enableAge && !enableFlags)}
                  className="w-full bg-gradient-primary hover:opacity-90"
                >
                  {isChecking ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {currentStep}
                    </>
                  ) : (
                    "Check Tokens"
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Results Section */}
            {results && (
              <div className="space-y-6">
                {/* Status Results */}
                {results.status && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <CheckCircle className="w-6 h-6 text-green-500" />
                      Status Results
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <ResultCard
                        title="Working"
                        count={results.status.working.length}
                        icon={<CheckCircle className="w-5 h-5 text-green-500" />}
                        borderColor="border-green-500/50"
                        textColor="text-green-500"
                        items={results.status.working}
                        onDownload={() => downloadResults(results.status!.working, "working.txt")}
                        onView={() => openDialog(results.status!.working, "Working Tokens")}
                      />
                      <ResultCard
                        title="Email Locked"
                        count={results.status.email_locked.length}
                        icon={<Mail className="w-5 h-5 text-yellow-500" />}
                        borderColor="border-yellow-500/50"
                        textColor="text-yellow-500"
                        items={results.status.email_locked}
                        onDownload={() => downloadResults(results.status!.email_locked, "email_locked.txt")}
                        onView={() => openDialog(results.status!.email_locked, "Email Locked Tokens")}
                      />
                      <ResultCard
                        title="Phone Locked"
                        count={results.status.phone_locked.length}
                        icon={<Smartphone className="w-5 h-5 text-orange-500" />}
                        borderColor="border-orange-500/50"
                        textColor="text-orange-500"
                        items={results.status.phone_locked}
                        onDownload={() => downloadResults(results.status!.phone_locked, "phone_locked.txt")}
                        onView={() => openDialog(results.status!.phone_locked, "Phone Locked Tokens")}
                      />
                      <ResultCard
                        title="Invalid"
                        count={results.status.invalid.length}
                        icon={<XCircle className="w-5 h-5 text-red-500" />}
                        borderColor="border-red-500/50"
                        textColor="text-red-500"
                        items={results.status.invalid}
                        onDownload={() => downloadResults(results.status!.invalid, "invalid.txt")}
                        onView={() => openDialog(results.status!.invalid, "Invalid Tokens")}
                      />
                      <ResultCard
                        title="Errors"
                        count={results.status.errors.length}
                        icon={<AlertCircle className="w-5 h-5 text-gray-500" />}
                        borderColor="border-gray-500/50"
                        textColor="text-gray-500"
                        items={results.status.errors}
                        onDownload={() => downloadResults(results.status!.errors, "errors.txt")}
                        onView={() => openDialog(results.status!.errors, "Error Tokens")}
                      />
                    </div>
                  </div>
                )}

                {/* Age Results */}
                {results.age && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <Calendar className="w-6 h-6 text-blue-500" />
                      Age Results
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <Card className="border-green-500/50">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <CheckCircle className="w-5 h-5 text-green-500" />
                              Valid
                            </CardTitle>
                            <span className="text-2xl font-bold text-green-500">
                              {results.age.valid.length}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadAgeResults(results.age!.valid, "valid_ages.txt")}
                            disabled={results.age.valid.length === 0}
                            className="flex-1"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAgeDialog(results.age!.valid, "Valid Tokens with Age")}
                            disabled={results.age.valid.length === 0}
                            className="flex-1"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </CardContent>
                      </Card>
                      
                      {Object.keys(results.age.byDate).length > 0 && (
                        <Card className="border-blue-500/50 md:col-span-2">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Clock className="w-5 h-5 text-blue-500" />
                              By Creation Date
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ScrollArea className="h-[200px]">
                              <div className="space-y-2">
                                {Object.entries(results.age.byDate)
                                  .sort(([a], [b]) => a.localeCompare(b))
                                  .map(([date, tokens]) => (
                                    <div key={date} className="flex items-center justify-between p-2 rounded bg-muted/50">
                                      <span className="font-mono text-sm">{date}</span>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="secondary">{tokens.length}</Badge>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => downloadResults(tokens, `tokens_${date}.txt`)}
                                        >
                                          <Download className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </ScrollArea>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                )}

                {/* Flag Results */}
                {results.flags && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <Flag className="w-6 h-6 text-yellow-500" />
                      Flag Results
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <ResultCard
                        title="Valid (Clean)"
                        count={results.flags.valid.length}
                        icon={<CheckCircle className="w-5 h-5 text-green-500" />}
                        borderColor="border-green-500/50"
                        textColor="text-green-500"
                        items={results.flags.valid}
                        onDownload={() => downloadResults(results.flags!.valid, "valid_clean.txt")}
                        onView={() => openDialog(results.flags!.valid, "Valid (Clean) Tokens")}
                      />
                      <ResultCard
                        title="Flagged"
                        count={results.flags.flagged.length}
                        icon={<Flag className="w-5 h-5 text-yellow-500" />}
                        borderColor="border-yellow-500/50"
                        textColor="text-yellow-500"
                        items={results.flags.flagged}
                        onDownload={() => downloadResults(results.flags!.flagged, "flagged.txt")}
                        onView={() => openDialog(results.flags!.flagged, "Flagged Tokens")}
                      />
                      <ResultCard
                        title="Locked"
                        count={results.flags.locked.length}
                        icon={<Lock className="w-5 h-5 text-orange-500" />}
                        borderColor="border-orange-500/50"
                        textColor="text-orange-500"
                        items={results.flags.locked}
                        onDownload={() => downloadResults(results.flags!.locked, "locked.txt")}
                        onView={() => openDialog(results.flags!.locked, "Locked Tokens")}
                      />
                      <ResultCard
                        title="Invalid"
                        count={results.flags.invalid.length}
                        icon={<XCircle className="w-5 h-5 text-red-500" />}
                        borderColor="border-red-500/50"
                        textColor="text-red-500"
                        items={results.flags.invalid}
                        onDownload={() => downloadResults(results.flags!.invalid, "flag_invalid.txt")}
                        onView={() => openDialog(results.flags!.invalid, "Invalid Tokens")}
                      />
                      <ResultCard
                        title="Errors"
                        count={results.flags.errors.length}
                        icon={<AlertCircle className="w-5 h-5 text-gray-500" />}
                        borderColor="border-gray-500/50"
                        textColor="text-gray-500"
                        items={results.flags.errors}
                        onDownload={() => downloadResults(results.flags!.errors, "flag_errors.txt")}
                        onView={() => openDialog(results.flags!.errors, "Error Tokens")}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {/* View Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              {dialogContent.length} items
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mb-2">
            <Button variant="outline" size="sm" onClick={copyAll}>
              <Copy className="w-4 h-4 mr-1" />
              Copy All
            </Button>
          </div>
          <ScrollArea className="h-[400px] rounded-md border p-4">
            <div className="space-y-2">
              {dialogContent.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded bg-muted/50 group"
                >
                  <span className="font-mono text-sm truncate flex-1 mr-2">{item}</span>
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

      {/* Age Dialog */}
      <Dialog open={ageDialogOpen} onOpenChange={setAgeDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{ageDialogTitle}</DialogTitle>
            <DialogDescription>
              {ageDialogContent.length} items
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mb-2">
            <Button variant="outline" size="sm" onClick={copyAllAgeResults}>
              <Copy className="w-4 h-4 mr-1" />
              Copy All
            </Button>
          </div>
          <ScrollArea className="h-[400px] rounded-md border p-4">
            <div className="space-y-2">
              {ageDialogContent.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded bg-muted/50 group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm truncate">{item.fullLine}</p>
                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                      <span>👤 {item.username || 'Unknown'}</span>
                      <span>📅 {item.creationDate || 'Unknown'}</span>
                      <span>⏱️ {item.age || 'Unknown'}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyItem(`${item.fullLine} | ${item.username} | ${item.creationDate} | ${item.age}`)}
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
    </div>
  );
};

// Result Card Component
interface ResultCardProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  borderColor: string;
  textColor: string;
  items: string[];
  onDownload: () => void;
  onView: () => void;
}

const ResultCard = ({ title, count, icon, borderColor, textColor, items, onDownload, onView }: ResultCardProps) => (
  <Card className={borderColor}>
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <span className={`text-2xl font-bold ${textColor}`}>
          {count}
        </span>
      </div>
    </CardHeader>
    <CardContent className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onDownload}
        disabled={items.length === 0}
        className="flex-1"
      >
        <Download className="w-4 h-4 mr-1" />
        Download
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onView}
        disabled={items.length === 0}
        className="flex-1"
      >
        <Eye className="w-4 h-4 mr-1" />
        View
      </Button>
    </CardContent>
  </Card>
);

export default TokensChecker;
