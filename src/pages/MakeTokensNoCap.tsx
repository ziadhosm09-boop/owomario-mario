import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Zap, 
  Download, 
  Copy, 
  Check, 
  X, 
  AlertCircle, 
  Loader2, 
  BookOpen,
  ChevronDown,
  ChevronUp,
  ShoppingCart
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ToolsPromotion } from "@/components/ToolsPromotion";

interface NocapResults {
  success: string[];
  failed: string[];
  errors: string[];
}

export default function MakeTokensNoCap() {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  
  const [tokens, setTokens] = useState("");
  const [threadCount, setThreadCount] = useState("5");
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<NocapResults | null>(null);
  const [progress, setProgress] = useState(0);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [copiedCategory, setCopiedCategory] = useState<string | null>(null);
  const [showToolsPromo, setShowToolsPromo] = useState(false);

  const handleProcess = async () => {
    const tokenList = tokens
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (tokenList.length === 0) {
      toast.error(isArabic ? "يرجى إدخال التوكنات أولاً" : "Please enter tokens first");
      return;
    }

    setIsProcessing(true);
    setResults(null);
    setProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 5, 90));
      }, 500);

      const { data, error } = await supabase.functions.invoke("make-tokens-nocap", {
        body: {
          tokens: tokenList,
          threadCount: parseInt(threadCount),
        },
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (error) throw error;

      setResults(data.results);
      toast.success(
        isArabic ? "تم الانتهاء من المعالجة" : "Processing complete",
        {
          description: isArabic
            ? `نجح: ${data.results.success.length} | فشل: ${data.results.failed.length}`
            : `Success: ${data.results.success.length} | Failed: ${data.results.failed.length}`,
        }
      );
    } catch (error) {
      console.error("Error:", error);
      toast.error(isArabic ? "حدث خطأ أثناء المعالجة" : "An error occurred during processing");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = (category: string, items: string[]) => {
    if (items.length === 0) return;
    const content = items.join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nocap_${category}_${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(isArabic ? "تم التحميل" : "Downloaded");
  };

  const handleCopyAll = async (category: string, items: string[]) => {
    if (items.length === 0) return;
    try {
      await navigator.clipboard.writeText(items.join("\n"));
      setCopiedCategory(category);
      toast.success(isArabic ? "تم النسخ" : "Copied");
      setTimeout(() => setCopiedCategory(null), 2000);
    } catch {
      toast.error(isArabic ? "فشل النسخ" : "Copy failed");
    }
  };

  const resultCategories = [
    {
      key: "success",
      label: isArabic ? "نجح" : "Success",
      icon: Check,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/30",
    },
    {
      key: "failed",
      label: isArabic ? "فشل" : "Failed",
      icon: X,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/30",
    },
    {
      key: "errors",
      label: isArabic ? "أخطاء" : "Errors",
      icon: AlertCircle,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/30",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-12 bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
                <Zap className="w-5 h-5" />
                <span className="font-semibold">Make Tokens No Cap</span>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                {isArabic ? "إزالة قيود الكابتشا" : "Remove Captcha Restrictions"}
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                {isArabic
                  ? "قم بمعالجة التوكنات لإزالة قيود الـ Captcha عند الانضمام للسيرفرات"
                  : "Process tokens to remove captcha restrictions when joining servers"}
              </p>
            </div>

            {/* Tools Promo Collapsible */}
            <Collapsible open={showToolsPromo} onOpenChange={setShowToolsPromo}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full border-dashed border-primary/50 hover:bg-primary/5 gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  {isArabic ? "🛒 المزيد من الأدوات" : "🛒 More Tools"}
                  {showToolsPromo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <ToolsPromotion />
              </CollapsibleContent>
            </Collapsible>

            {/* Main Card */}
            <Card className="backdrop-blur-sm bg-card/50 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{isArabic ? "إدخال التوكنات" : "Input Tokens"}</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <BookOpen className="w-4 h-4" />
                        README
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="end">
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm">
                          {isArabic ? "ما هذه الأداة؟" : "What is this tool?"}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {isArabic
                            ? "لو التوكينز بتاعتك فيها كابتشا join للسيرفرات، الأداة دي هتخليها no cap join - يعني تقدر تنضم للسيرفرات من غير كابتشا."
                            : "If your tokens have captcha when joining servers, this tool will make them no-cap join - meaning you can join servers without captcha."}
                        </p>
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground">
                            {isArabic ? "الصيغ المدعومة:" : "Supported formats:"}
                          </p>
                          <code className="text-xs block mt-1 p-2 bg-muted rounded">
                            token{"\n"}
                            "token"{"\n"}
                            email:pass:token{"\n"}
                            email:pass:"token"
                          </code>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {isArabic ? "التوكنات" : "Tokens"}
                  </label>
                  <Textarea
                    placeholder={
                      isArabic
                        ? "أدخل التوكنات (واحد في كل سطر)\nيمكنك استخدام:\ntoken\nemail:pass:token"
                        : "Enter tokens (one per line)\nYou can use:\ntoken\nemail:pass:token"
                    }
                    value={tokens}
                    onChange={(e) => setTokens(e.target.value)}
                    className="min-h-[200px] font-mono text-sm"
                    disabled={isProcessing}
                  />
                  <p className="text-xs text-muted-foreground">
                    {tokens.split("\n").filter((t) => t.trim()).length}{" "}
                    {isArabic ? "توكن" : "tokens"}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">
                      {isArabic ? "عدد الثريدات" : "Thread Count"}
                    </label>
                    <Select
                      value={threadCount}
                      onValueChange={setThreadCount}
                      disabled={isProcessing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 5, 10, 15, 20].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} {isArabic ? "ثريد" : "threads"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleProcess}
                    disabled={isProcessing || !tokens.trim()}
                    className="bg-gradient-primary hover:opacity-90 self-end"
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {isArabic ? "جاري المعالجة..." : "Processing..."}
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        {isArabic ? "بدء المعالجة" : "Start Processing"}
                      </>
                    )}
                  </Button>
                </div>

                {isProcessing && (
                  <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <p className="text-sm text-center text-muted-foreground">
                      {progress}%
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Results */}
            {results && (
              <Card className="backdrop-blur-sm bg-card/50 border-primary/20">
                <CardHeader>
                  <CardTitle>{isArabic ? "النتائج" : "Results"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    {resultCategories.map((cat) => {
                      const items = results[cat.key as keyof NocapResults] || [];
                      return (
                        <div
                          key={cat.key}
                          className={`p-4 rounded-lg ${cat.bgColor} border ${cat.borderColor} text-center`}
                        >
                          <cat.icon className={`w-6 h-6 mx-auto mb-2 ${cat.color}`} />
                          <div className={`text-2xl font-bold ${cat.color}`}>
                            {items.length}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {cat.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {resultCategories.map((cat) => {
                    const items = results[cat.key as keyof NocapResults] || [];
                    if (items.length === 0) return null;

                    const isExpanded = expandedCategory === cat.key;

                    return (
                      <div
                        key={cat.key}
                        className={`rounded-lg border ${cat.borderColor} overflow-hidden`}
                      >
                        <div
                          className={`flex items-center justify-between p-4 ${cat.bgColor} cursor-pointer`}
                          onClick={() =>
                            setExpandedCategory(isExpanded ? null : cat.key)
                          }
                        >
                          <div className="flex items-center gap-2">
                            <cat.icon className={`w-5 h-5 ${cat.color}`} />
                            <span className="font-medium">{cat.label}</span>
                            <Badge variant="secondary">{items.length}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyAll(cat.key, items);
                              }}
                            >
                              {copiedCategory === cat.key ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(cat.key, items);
                              }}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-4 bg-card max-h-60 overflow-y-auto">
                            <pre className="text-sm font-mono whitespace-pre-wrap break-all">
                              {items.join("\n")}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
