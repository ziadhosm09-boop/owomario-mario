import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Mail, Copy, Check, Loader2, Package, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface CodeResult {
  email: string;
  otp?: string;
  link?: string;
  error?: string;
}

type FetchMode = 'amazon' | 'discord';

const EmailCodes = () => {
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState("");
  const [results, setResults] = useState<CodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [mode, setMode] = useState<FetchMode>('amazon');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accounts.trim()) {
      toast.error(t('emailCodes.error'));
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      const accountLines = accounts.trim().split("\n").filter(line => line.trim());
      
      const { data, error } = await supabase.functions.invoke('fetch-email-codes', {
        body: { 
          accounts: accountLines,
          mode: mode
        }
      });

      if (error) throw error;

      if (data?.results) {
        setResults(data.results);
        const successCount = data.results.filter((r: CodeResult) => r.otp || r.link).length;
        toast.success(`${mode === 'amazon' ? 'Fetched' : 'Found'} ${successCount} ${mode === 'amazon' ? 'codes' : 'links'} successfully`);
      }
    } catch (error: any) {
      console.error("Error fetching codes:", error);
      toast.error(t('emailCodes.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIndex(index);
      toast.success(t('twoFA.copiedSuccess'));
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      toast.error(t('twoFA.copyError'));
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex p-4 rounded-2xl bg-gradient-primary mb-4 shadow-glow">
                <Mail className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-4xl font-bold mb-4">{t('emailCodes.title')}</h1>
              <p className="text-muted-foreground text-lg">
                {t('emailCodes.subtitle')}
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-8 shadow-card">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-center mb-4">Select Service</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setMode('amazon')}
                      className={`
                        relative overflow-hidden rounded-2xl p-6 transition-all duration-300
                        ${mode === 'amazon' 
                          ? 'bg-gradient-to-br from-[#FF9900] to-[#FF6B00] shadow-[0_8px_16px_rgba(255,153,0,0.4),0_4px_8px_rgba(255,153,0,0.3),inset_0_-2px_4px_rgba(0,0,0,0.2),inset_0_2px_4px_rgba(255,255,255,0.3)] scale-105 border-2 border-[#FF9900]' 
                          : 'bg-gradient-to-br from-muted/80 to-muted shadow-[0_4px_8px_rgba(0,0,0,0.1),inset_0_-2px_4px_rgba(0,0,0,0.1)] hover:shadow-[0_6px_12px_rgba(0,0,0,0.15)] hover:scale-[1.02] border border-border'
                        }
                      `}
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className={`
                          p-4 rounded-xl transition-all duration-300
                          ${mode === 'amazon' 
                            ? 'bg-white/20 shadow-[0_4px_8px_rgba(0,0,0,0.2),inset_0_2px_4px_rgba(255,255,255,0.3)]' 
                            : 'bg-background/50'
                          }
                        `}>
                          <Package className={`w-8 h-8 ${mode === 'amazon' ? 'text-white' : 'text-muted-foreground'}`} />
                        </div>
                        <span className={`font-bold text-lg ${mode === 'amazon' ? 'text-white' : 'text-foreground'}`}>
                          Amazon
                        </span>
                        <span className={`text-xs ${mode === 'amazon' ? 'text-white/80' : 'text-muted-foreground'}`}>
                          Get OTP Codes
                        </span>
                      </div>
                      {mode === 'amazon' && (
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 animate-pulse" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setMode('discord')}
                      className={`
                        relative overflow-hidden rounded-2xl p-6 transition-all duration-300
                        ${mode === 'discord' 
                          ? 'bg-gradient-to-br from-[#5865F2] to-[#4752C4] shadow-[0_8px_16px_rgba(88,101,242,0.4),0_4px_8px_rgba(88,101,242,0.3),inset_0_-2px_4px_rgba(0,0,0,0.2),inset_0_2px_4px_rgba(255,255,255,0.3)] scale-105 border-2 border-[#5865F2]' 
                          : 'bg-gradient-to-br from-muted/80 to-muted shadow-[0_4px_8px_rgba(0,0,0,0.1),inset_0_-2px_4px_rgba(0,0,0,0.1)] hover:shadow-[0_6px_12px_rgba(0,0,0,0.15)] hover:scale-[1.02] border border-border'
                        }
                      `}
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className={`
                          p-4 rounded-xl transition-all duration-300
                          ${mode === 'discord' 
                            ? 'bg-white/20 shadow-[0_4px_8px_rgba(0,0,0,0.2),inset_0_2px_4px_rgba(255,255,255,0.3)]' 
                            : 'bg-background/50'
                          }
                        `}>
                          <MessageCircle className={`w-8 h-8 ${mode === 'discord' ? 'text-white' : 'text-muted-foreground'}`} />
                        </div>
                        <span className={`font-bold text-lg ${mode === 'discord' ? 'text-white' : 'text-foreground'}`}>
                          Discord
                        </span>
                        <span className={`text-xs ${mode === 'discord' ? 'text-white/80' : 'text-muted-foreground'}`}>
                          Get Verify Links
                        </span>
                      </div>
                      {mode === 'discord' && (
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 animate-pulse" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="accounts" className="text-sm font-medium">
                    {t('emailCodes.emailLabel')}
                  </label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Enter each account on a separate line in the format: email:password:refreshToken:clientId
                  </p>
                  <Textarea
                    id="accounts"
                    placeholder="email:password:refreshToken:clientId"
                    value={accounts}
                    onChange={(e) => setAccounts(e.target.value)}
                    className="min-h-[120px] font-mono text-sm"
                    disabled={loading}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-primary hover:opacity-90 transition-opacity text-lg"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      {t('emailCodes.loading')}
                    </>
                  ) : (
                    t('emailCodes.fetchButton')
                  )}
                </Button>
              </form>

              {results.length > 0 && (
                <div className="mt-8 space-y-4">
                  <h3 className="text-lg font-semibold">Results:</h3>
                  <div className="space-y-3">
                    {results.map((result, index) => (
                      <div
                        key={index}
                        className="bg-gradient-primary/10 border border-primary/20 rounded-xl p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-sm text-muted-foreground mb-1">
                              {result.email}
                            </div>
                            {result.otp || result.link ? (
                              <div className="flex items-center gap-3">
                                <div className={`${result.link ? 'text-sm' : 'text-2xl'} font-bold font-mono tracking-wider break-all`}>
                                  {result.otp || result.link}
                                </div>
                                <Button
                                  type="button"
                                  onClick={() => handleCopy(result.otp || result.link!, index)}
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8 shrink-0"
                                >
                                  {copiedIndex === index ? (
                                    <Check className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            ) : (
                              <div className="text-sm text-red-500">
                                {result.error || (mode === 'amazon' ? t('emailCodes.noCodesFound') : 'No Discord links found')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default EmailCodes;
