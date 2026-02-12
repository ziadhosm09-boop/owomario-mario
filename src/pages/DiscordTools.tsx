import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ToolsPromotion } from "@/components/ToolsPromotion";
import {
  Shield, CheckCircle, XCircle, Mail, Smartphone, AlertCircle,
  Download, Eye, Copy, Calendar, Clock, Flag, Lock, User,
  ShoppingCart, ChevronDown, ChevronUp, Loader2, ArrowLeft, KeyRound,
  Check, X, Zap
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Discord Icon
const DiscordIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

type ActiveTool = null | "trial" | "tokens" | "changepass";

// ===================== TYPES =====================
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

interface ChangePassResults {
  success: string[];
  failed: string[];
  errors: string[];
}

// ===================== RESULT CARD =====================
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
        <span className={`text-2xl font-bold ${textColor}`}>{count}</span>
      </div>
    </CardHeader>
    <CardContent className="flex gap-2">
      <Button variant="outline" size="sm" onClick={onDownload} disabled={items.length === 0} className="flex-1">
        <Download className="w-4 h-4 mr-1" /> Download
      </Button>
      <Button variant="outline" size="sm" onClick={onView} disabled={items.length === 0} className="flex-1">
        <Eye className="w-4 h-4 mr-1" /> View
      </Button>
    </CardContent>
  </Card>
);

// ===================== MAIN PAGE =====================
const DiscordTools = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const { toast } = useToast();
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const [showToolsPromo, setShowToolsPromo] = useState(false);

  // ---- Shared ----
  const [tokens, setTokens] = useState("");
  const [threadCount, setThreadCount] = useState(5);

  // ---- Trial Checker State ----
  const [trialResults, setTrialResults] = useState<{ trial: string[]; invalid: string[]; no_trial: string[]; errors: string[] } | null>(null);
  const [trialChecking, setTrialChecking] = useState(false);

  // ---- Tokens Checker State ----
  const [enableStatus, setEnableStatus] = useState(true);
  const [enableAge, setEnableAge] = useState(false);
  const [enableFlags, setEnableFlags] = useState(false);
  const [tokensResults, setTokensResults] = useState<CombinedResults | null>(null);
  const [tokensChecking, setTokensChecking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");

  // ---- Change Pass State ----
  const [passwordMode, setPasswordMode] = useState<"random" | "fixed">("random");
  const [newPassword, setNewPassword] = useState("");
  const [changePassResults, setChangePassResults] = useState<ChangePassResults | null>(null);
  const [changePassChecking, setChangePassChecking] = useState(false);
  const [changeProgress, setChangeProgress] = useState(0);

  // ---- Dialog State ----
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState<string[]>([]);
  const [dialogTitle, setDialogTitle] = useState("");
  const [ageDialogOpen, setAgeDialogOpen] = useState(false);
  const [ageDialogContent, setAgeDialogContent] = useState<TokenAgeResult[]>([]);
  const [ageDialogTitle, setAgeDialogTitle] = useState("");

  // ---- Helpers ----
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
    downloadResults(lines, filename);
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
    toast({ title: "Copied" });
  };

  const copyAll = () => {
    navigator.clipboard.writeText(dialogContent.join("\n"));
    toast({ title: "Copied All" });
  };

  const copyAllAgeResults = () => {
    const lines = ageDialogContent.map(item =>
      `${item.fullLine} | ${item.username || 'Unknown'} | ${item.creationDate || 'Unknown'} | ${item.age || 'Unknown'}`
    );
    navigator.clipboard.writeText(lines.join("\n"));
    toast({ title: "Copied All" });
  };

  // ---- Trial Checker Logic ----
  const handleTrialCheck = async () => {
    if (!tokens.trim()) return;
    setTrialChecking(true);
    setTrialResults(null);
    try {
      const extractToken = (line: string) => {
        const t = line.trim();
        const match = t.match(/"([^"]+)"/);
        return { token: match ? match[1] : t, fullLine: t };
      };
      const tokenData = tokens.split("\n").map(extractToken).filter(t => t.token);
      const tokenMap = new Map(tokenData.map(({ token, fullLine }) => [token, fullLine]));
      const tokenList = tokenData.map(t => t.token);
      const { data, error } = await supabase.functions.invoke("check-discord-trials", {
        body: { tokens: tokenList, threadCount },
      });
      if (error) throw error;
      setTrialResults({
        trial: data.results.trial.map((t: string) => tokenMap.get(t) || t),
        invalid: data.results.invalid.map((t: string) => tokenMap.get(t) || t),
        no_trial: data.results.no_trial.map((t: string) => tokenMap.get(t) || t),
        errors: data.results.errors.map((t: string) => tokenMap.get(t) || t),
      });
      toast({ title: "Done", description: `Trials: ${data.results.trial.length}` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setTrialChecking(false);
    }
  };

  // ---- Tokens Checker Logic ----
  const handleTokensCheck = async () => {
    if (!tokens.trim() || (!enableStatus && !enableAge && !enableFlags)) return;
    const tokenList = tokens.split("\n").filter(t => t.trim());
    if (!tokenList.length) return;

    setTokensChecking(true);
    setTokensResults(null);
    setProgress(0);
    const BATCH_SIZE = 100;
    const batches: string[][] = [];
    for (let i = 0; i < tokenList.length; i += BATCH_SIZE) batches.push(tokenList.slice(i, i + BATCH_SIZE));
    const newResults: CombinedResults = {};
    const enabledCheckers = [enableStatus, enableAge, enableFlags].filter(Boolean).length;
    let completedSteps = 0;

    try {
      if (enableStatus) {
        setCurrentStep("Checking Status...");
        const sr: TokenCheckResults = { working: [], email_locked: [], phone_locked: [], invalid: [], errors: [] };
        for (let i = 0; i < batches.length; i++) {
          const { data, error } = await supabase.functions.invoke("check-discord-tokens", { body: { tokens: batches[i], threadCount } });
          if (error) throw error;
          sr.working.push(...data.results.working);
          sr.email_locked.push(...data.results.email_locked);
          sr.phone_locked.push(...data.results.phone_locked);
          sr.invalid.push(...data.results.invalid);
          sr.errors.push(...data.results.errors);
          setProgress(((completedSteps + (i + 1) / batches.length) / enabledCheckers) * 100);
        }
        newResults.status = sr;
        completedSteps++;
      }
      if (enableAge) {
        setCurrentStep("Checking Age...");
        const ar: AgeCheckResults = { valid: [], invalid: [], errors: [], byDate: {} };
        for (let i = 0; i < batches.length; i++) {
          const { data, error } = await supabase.functions.invoke("check-token-age", { body: { tokens: batches[i], threadCount } });
          if (error) throw error;
          ar.valid.push(...data.results.valid);
          ar.invalid.push(...data.results.invalid);
          ar.errors.push(...data.results.errors);
          Object.entries(data.results.byDate as Record<string, string[]>).forEach(([date, tokens]) => {
            if (!ar.byDate[date]) ar.byDate[date] = [];
            ar.byDate[date].push(...tokens);
          });
          setProgress(((completedSteps + (i + 1) / batches.length) / enabledCheckers) * 100);
        }
        newResults.age = ar;
        completedSteps++;
      }
      if (enableFlags) {
        setCurrentStep("Checking Flags...");
        const fr: FlagCheckResults = { valid: [], flagged: [], locked: [], invalid: [], errors: [] };
        for (let i = 0; i < batches.length; i++) {
          const { data, error } = await supabase.functions.invoke("check-token-flags", { body: { tokens: batches[i], threadCount } });
          if (error) throw error;
          fr.valid.push(...data.results.valid);
          fr.flagged.push(...data.results.flagged);
          fr.locked.push(...data.results.locked);
          fr.invalid.push(...data.results.invalid);
          fr.errors.push(...data.results.errors);
          setProgress(((completedSteps + (i + 1) / batches.length) / enabledCheckers) * 100);
        }
        newResults.flags = fr;
        completedSteps++;
      }
      setTokensResults(newResults);
      toast({ title: "Done", description: `Checked ${tokenList.length} tokens` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setTokensChecking(false);
      setProgress(0);
      setCurrentStep("");
    }
  };

  // ---- Change Pass Logic ----
  const handleChangePass = async () => {
    if (!tokens.trim()) return;
    const lines = tokens.split("\n").filter(t => t.trim());
    if (!lines.length) return;

    setChangePassChecking(true);
    setChangePassResults(null);
    setChangeProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setChangeProgress(prev => Math.min(prev + 3, 90));
      }, 500);

      const { data, error } = await supabase.functions.invoke("change-discord-pass", {
        body: {
          accounts: lines,
          newPassword: passwordMode === "fixed" ? newPassword : null,
          threadCount: Math.min(threadCount, 100),
        },
      });

      clearInterval(progressInterval);
      setChangeProgress(100);

      if (error) throw error;
      setChangePassResults(data.results);
      toast({ title: "Done", description: `Success: ${data.results.success.length} | Failed: ${data.results.failed.length}` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setChangePassChecking(false);
    }
  };

  // ===================== MENU =====================
  const tools = [
    {
      id: "trial" as const,
      icon: Shield,
      title: "Trial Checker",
      description: isAr ? "فحص التوكنات للتريال" : "Check tokens for trial eligibility",
      color: "from-emerald-500/20 to-green-500/10",
      borderColor: "border-emerald-500/30",
      iconColor: "text-emerald-500",
    },
    {
      id: "tokens" as const,
      icon: CheckCircle,
      title: "Tokens Checker",
      description: isAr ? "فحص شامل للتوكنات (الحالة، العمر، الفلاجز)" : "All-in-one checker (Status, Age, Flags)",
      color: "from-blue-500/20 to-cyan-500/10",
      borderColor: "border-blue-500/30",
      iconColor: "text-blue-500",
    },
    {
      id: "changepass" as const,
      icon: KeyRound,
      title: "Change Password",
      description: isAr ? "تغيير كلمة مرور الحسابات" : "Change account passwords in bulk",
      color: "from-purple-500/20 to-pink-500/10",
      borderColor: "border-purple-500/30",
      iconColor: "text-purple-500",
    },
  ];

  // ===================== RENDER =====================
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Creator Badge */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <Badge variant="outline" className="px-4 py-2 text-sm flex items-center gap-2 bg-card/50 backdrop-blur-sm border-primary/20">
                <User className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Created by</span>
                <a href="https://discord.com/users/owomario" target="_blank" rel="noopener noreferrer"
                  className="font-semibold text-primary hover:underline flex items-center gap-1.5">
                  <DiscordIcon className="w-4 h-4" /> owomario
                </a>
              </Badge>
            </div>

            {/* Tools Promo */}
            <Collapsible open={showToolsPromo} onOpenChange={setShowToolsPromo} className="mb-8">
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full flex items-center justify-between gap-2 py-6 border-dashed border-2 border-primary/30 hover:border-primary/50 hover:bg-primary/5">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-primary" />
                    <span className="font-semibold">{isAr ? "🛒 المزيد من الأدوات" : "🛒 More Tools"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-gradient-primary text-white text-xs">{isAr ? "للبيع" : "For Sale"}</Badge>
                    {showToolsPromo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4"><ToolsPromotion /></CollapsibleContent>
            </Collapsible>

            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
                <DiscordIcon className="w-5 h-5" />
                <span className="font-semibold">Discord Tools</span>
              </div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
                Discord Tools
              </h1>
              <p className="text-muted-foreground">
                {isAr ? "كل أدوات الديسكورد في مكان واحد" : "All Discord tools in one place"}
              </p>
            </div>

            {/* Back Button when tool is active */}
            {activeTool && (
              <Button variant="ghost" onClick={() => setActiveTool(null)} className="mb-4 gap-2">
                <ArrowLeft className="w-4 h-4" />
                {isAr ? "رجوع للقائمة" : "Back to Menu"}
              </Button>
            )}

            {/* ============ MENU ============ */}
            {!activeTool && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {tools.map((tool) => (
                  <Card
                    key={tool.id}
                    className={`cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl ${tool.borderColor} bg-gradient-to-br ${tool.color} group`}
                    onClick={() => setActiveTool(tool.id)}
                  >
                    <CardContent className="p-6 text-center space-y-4">
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-background/50 backdrop-blur-sm ${tool.iconColor} group-hover:scale-110 transition-transform`}>
                        <tool.icon className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-bold">{tool.title}</h3>
                      <p className="text-sm text-muted-foreground">{tool.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* ============ TRIAL CHECKER ============ */}
            {activeTool === "trial" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-emerald-500" /> Trial Checker</CardTitle>
                    <CardDescription>
                      {isAr ? "أدخل التوكنات للفحص (واحد في كل سطر)" : "Enter tokens to check (one per line)"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea placeholder="token&#10;&quot;token&quot;&#10;email:pass:token" value={tokens} onChange={e => setTokens(e.target.value)}
                      className="min-h-[200px] font-mono text-sm" disabled={trialChecking} />
                    <div className="flex gap-4 items-end">
                      <div className="flex-1">
                        <Label>{isAr ? "عدد الثريدات" : "Thread Count"}</Label>
                        <Input type="number" min="1" max="100" value={threadCount} onChange={e => setThreadCount(Number(e.target.value))} className="max-w-xs" />
                      </div>
                      <Button onClick={handleTrialCheck} disabled={trialChecking || !tokens.trim()} className="bg-gradient-primary">
                        {trialChecking ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking...</> : "Check Trials"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {trialResults && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { key: "trial", title: "Trial", color: "text-green-500", border: "border-green-500/50", icon: <CheckCircle className="w-5 h-5 text-green-500" /> },
                      { key: "invalid", title: "Invalid", color: "text-red-500", border: "border-red-500/50", icon: <XCircle className="w-5 h-5 text-red-500" /> },
                      { key: "no_trial", title: "No Trial", color: "text-muted-foreground", border: "border-muted", icon: <X className="w-5 h-5" /> },
                      { key: "errors", title: "Errors", color: "text-yellow-500", border: "border-yellow-500/50", icon: <AlertCircle className="w-5 h-5 text-yellow-500" /> },
                    ].map(cat => {
                      const items = trialResults[cat.key as keyof typeof trialResults];
                      return (
                        <ResultCard key={cat.key} title={cat.title} count={items.length} icon={cat.icon}
                          borderColor={cat.border} textColor={cat.color} items={items}
                          onDownload={() => downloadResults(items, `${cat.key}.txt`)}
                          onView={() => openDialog(items, cat.title)} />
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ============ TOKENS CHECKER ============ */}
            {activeTool === "tokens" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-blue-500" /> Tokens Checker</CardTitle>
                    <CardDescription>Enter tokens (one per line). Supports: token, "token", email:pass:token</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <Textarea placeholder='token&#10;"token"&#10;email:pass:token' value={tokens} onChange={e => setTokens(e.target.value)}
                      className="min-h-[200px] font-mono text-sm" />
                    <div>
                      <Label>{isAr ? "عدد الثريدات" : "Thread Count"}</Label>
                      <Input type="number" min="1" value={threadCount} onChange={e => setThreadCount(Number(e.target.value))} className="max-w-xs" />
                    </div>
                    {/* Toggles */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <Label className="font-medium">Status</Label>
                        </div>
                        <Switch checked={enableStatus} onCheckedChange={setEnableStatus} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-500" />
                          <Label className="font-medium">Age</Label>
                        </div>
                        <Switch checked={enableAge} onCheckedChange={setEnableAge} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Flag className="w-4 h-4 text-yellow-500" />
                          <Label className="font-medium">Flags</Label>
                        </div>
                        <Switch checked={enableFlags} onCheckedChange={setEnableFlags} />
                      </div>
                    </div>
                    {tokensChecking && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{currentStep}</span><span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} />
                      </div>
                    )}
                    <Button onClick={handleTokensCheck} disabled={tokensChecking || (!enableStatus && !enableAge && !enableFlags)}
                      className="w-full bg-gradient-primary">
                      {tokensChecking ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{currentStep}</> : "Check Tokens"}
                    </Button>
                  </CardContent>
                </Card>

                {/* Status Results */}
                {tokensResults?.status && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500" /> Status Results</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        { key: "working", title: "Working", icon: <CheckCircle className="w-5 h-5 text-green-500" />, border: "border-green-500/50", color: "text-green-500" },
                        { key: "email_locked", title: "Email Locked", icon: <Mail className="w-5 h-5 text-yellow-500" />, border: "border-yellow-500/50", color: "text-yellow-500" },
                        { key: "phone_locked", title: "Phone Locked", icon: <Smartphone className="w-5 h-5 text-orange-500" />, border: "border-orange-500/50", color: "text-orange-500" },
                        { key: "invalid", title: "Invalid", icon: <XCircle className="w-5 h-5 text-red-500" />, border: "border-red-500/50", color: "text-red-500" },
                        { key: "errors", title: "Errors", icon: <AlertCircle className="w-5 h-5 text-gray-500" />, border: "border-gray-500/50", color: "text-gray-500" },
                      ].map(c => (
                        <ResultCard key={c.key} title={c.title} count={tokensResults.status![c.key as keyof TokenCheckResults].length}
                          icon={c.icon} borderColor={c.border} textColor={c.color}
                          items={tokensResults.status![c.key as keyof TokenCheckResults]}
                          onDownload={() => downloadResults(tokensResults.status![c.key as keyof TokenCheckResults], `${c.key}.txt`)}
                          onView={() => openDialog(tokensResults.status![c.key as keyof TokenCheckResults], c.title)} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Age Results */}
                {tokensResults?.age && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-500" /> Age Results</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="border-green-500/50">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500" /> Valid</CardTitle>
                            <span className="text-2xl font-bold text-green-500">{tokensResults.age.valid.length}</span>
                          </div>
                        </CardHeader>
                        <CardContent className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => downloadAgeResults(tokensResults.age!.valid, "valid_ages.txt")} disabled={!tokensResults.age.valid.length} className="flex-1">
                            <Download className="w-4 h-4 mr-1" /> Download
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openAgeDialog(tokensResults.age!.valid, "Valid Tokens")} disabled={!tokensResults.age.valid.length} className="flex-1">
                            <Eye className="w-4 h-4 mr-1" /> View
                          </Button>
                        </CardContent>
                      </Card>
                      {Object.keys(tokensResults.age.byDate).length > 0 && (
                        <Card className="border-blue-500/50">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2"><Clock className="w-5 h-5 text-blue-500" /> By Date</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ScrollArea className="h-[200px]">
                              {Object.entries(tokensResults.age.byDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, toks]) => (
                                <div key={date} className="flex items-center justify-between p-2 rounded bg-muted/50 mb-1">
                                  <span className="font-mono text-sm">{date}</span>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary">{toks.length}</Badge>
                                    <Button variant="ghost" size="sm" onClick={() => downloadResults(toks, `tokens_${date}.txt`)}>
                                      <Download className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </ScrollArea>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                )}

                {/* Flag Results */}
                {tokensResults?.flags && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2"><Flag className="w-5 h-5 text-yellow-500" /> Flag Results</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        { key: "valid", title: "Clean", icon: <CheckCircle className="w-5 h-5 text-green-500" />, border: "border-green-500/50", color: "text-green-500" },
                        { key: "flagged", title: "Flagged", icon: <Flag className="w-5 h-5 text-yellow-500" />, border: "border-yellow-500/50", color: "text-yellow-500" },
                        { key: "locked", title: "Locked", icon: <Lock className="w-5 h-5 text-orange-500" />, border: "border-orange-500/50", color: "text-orange-500" },
                        { key: "invalid", title: "Invalid", icon: <XCircle className="w-5 h-5 text-red-500" />, border: "border-red-500/50", color: "text-red-500" },
                        { key: "errors", title: "Errors", icon: <AlertCircle className="w-5 h-5 text-gray-500" />, border: "border-gray-500/50", color: "text-gray-500" },
                      ].map(c => (
                        <ResultCard key={c.key} title={c.title} count={tokensResults.flags![c.key as keyof FlagCheckResults].length}
                          icon={c.icon} borderColor={c.border} textColor={c.color}
                          items={tokensResults.flags![c.key as keyof FlagCheckResults]}
                          onDownload={() => downloadResults(tokensResults.flags![c.key as keyof FlagCheckResults], `${c.key}.txt`)}
                          onView={() => openDialog(tokensResults.flags![c.key as keyof FlagCheckResults], c.title)} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ============ CHANGE PASSWORD ============ */}
            {activeTool === "changepass" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5 text-purple-500" /> Change Password</CardTitle>
                    <CardDescription>
                      {isAr ? "أدخل الحسابات بصيغة email:pass:token (واحد في كل سطر)" : "Enter accounts as email:pass:token (one per line)"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      placeholder="email:pass:token&#10;email:pass:&quot;token&quot;"
                      value={tokens} onChange={e => setTokens(e.target.value)}
                      className="min-h-[200px] font-mono text-sm" disabled={changePassChecking}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>{isAr ? "عدد الثريدات" : "Thread Count"}</Label>
                        <Input type="number" min="1" max="100" value={threadCount}
                          onChange={e => setThreadCount(Number(e.target.value))} />
                      </div>
                      <div>
                        <Label>{isAr ? "نوع الباسورد" : "Password Mode"}</Label>
                        <Select value={passwordMode} onValueChange={(v: "random" | "fixed") => setPasswordMode(v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="random">{isAr ? "عشوائي" : "Random"}</SelectItem>
                            <SelectItem value="fixed">{isAr ? "ثابت" : "Fixed"}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {passwordMode === "fixed" && (
                      <div>
                        <Label>{isAr ? "كلمة المرور الجديدة" : "New Password"}</Label>
                        <Input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                          placeholder={isAr ? "أدخل كلمة المرور الجديدة" : "Enter new password"} />
                      </div>
                    )}
                    {changePassChecking && (
                      <div className="space-y-2">
                        <Progress value={changeProgress} className="h-2" />
                        <p className="text-sm text-center text-muted-foreground">{changeProgress}%</p>
                      </div>
                    )}
                    <Button onClick={handleChangePass} disabled={changePassChecking || !tokens.trim()}
                      className="w-full bg-gradient-primary">
                      {changePassChecking ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : isAr ? "تغيير كلمة المرور" : "Change Passwords"}
                    </Button>
                  </CardContent>
                </Card>

                {changePassResults && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { key: "success", title: isAr ? "نجح" : "Success", icon: <Check className="w-5 h-5 text-green-500" />, border: "border-green-500/50", color: "text-green-500" },
                      { key: "failed", title: isAr ? "فشل" : "Failed", icon: <X className="w-5 h-5 text-red-500" />, border: "border-red-500/50", color: "text-red-500" },
                      { key: "errors", title: isAr ? "أخطاء" : "Errors", icon: <AlertCircle className="w-5 h-5 text-yellow-500" />, border: "border-yellow-500/50", color: "text-yellow-500" },
                    ].map(c => (
                      <ResultCard key={c.key} title={c.title} count={changePassResults[c.key as keyof ChangePassResults].length}
                        icon={c.icon} borderColor={c.border} textColor={c.color}
                        items={changePassResults[c.key as keyof ChangePassResults]}
                        onDownload={() => downloadResults(changePassResults[c.key as keyof ChangePassResults], `changepass_${c.key}.txt`)}
                        onView={() => openDialog(changePassResults[c.key as keyof ChangePassResults], c.title)} />
                    ))}
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
            <DialogDescription>{dialogContent.length} items</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mb-2">
            <Button variant="outline" size="sm" onClick={copyAll}><Copy className="w-4 h-4 mr-1" /> Copy All</Button>
          </div>
          <ScrollArea className="h-[400px] rounded-md border p-4">
            <div className="space-y-2">
              {dialogContent.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/50 group">
                  <span className="font-mono text-sm truncate flex-1 mr-2">{item}</span>
                  <Button variant="ghost" size="sm" onClick={() => copyItem(item)} className="opacity-0 group-hover:opacity-100 transition-opacity">
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
            <DialogDescription>{ageDialogContent.length} items</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mb-2">
            <Button variant="outline" size="sm" onClick={copyAllAgeResults}><Copy className="w-4 h-4 mr-1" /> Copy All</Button>
          </div>
          <ScrollArea className="h-[400px] rounded-md border p-4">
            <div className="space-y-2">
              {ageDialogContent.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded bg-muted/50 group">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm truncate">{item.fullLine}</p>
                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                      <span>👤 {item.username || 'Unknown'}</span>
                      <span>📅 {item.creationDate || 'Unknown'}</span>
                      <span>⏱️ {item.age || 'Unknown'}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => copyItem(`${item.fullLine} | ${item.username} | ${item.creationDate} | ${item.age}`)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity">
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

export default DiscordTools;
