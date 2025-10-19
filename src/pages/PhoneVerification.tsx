import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Smartphone, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface PhoneResult {
  phone: string;
  code?: string;
  error?: string;
}

const PhoneVerification = () => {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [result, setResult] = useState<PhoneResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) {
      toast.error("Please enter phone number and API URL");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Parse input: phone|apiurl or phone----apiurl
      let phone = "";
      let apiUrl = "";
      
      if (input.includes("|")) {
        [phone, apiUrl] = input.split("|").map(s => s.trim());
      } else if (input.includes("----")) {
        [phone, apiUrl] = input.split("----").map(s => s.trim());
      } else {
        toast.error("Invalid format. Use: phone|apiurl or phone----apiurl");
        setLoading(false);
        return;
      }

      if (!phone || !apiUrl) {
        toast.error("Please enter phone number and API URL");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('fetch-phone-code', {
        body: { phone, apiUrl }
      });

      if (error) throw error;

      setResult(data);
      
      if (data.code) {
        toast.success(t('phoneVerification.fetchButton'));
      } else {
        toast.error(data.error || t('phoneVerification.noCodeFound'));
      }
    } catch (error: any) {
      console.error("Error fetching code:", error);
      toast.error(t('phoneVerification.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.code) return;
    
    try {
      await navigator.clipboard.writeText(result.code);
      setCopied(true);
      toast.success(t('twoFA.copiedSuccess'));
      setTimeout(() => setCopied(false), 2000);
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
                <Smartphone className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-4xl font-bold mb-4">{t('phoneVerification.title')}</h1>
              <p className="text-muted-foreground text-lg">
                {t('phoneVerification.subtitle')}
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-8 shadow-card">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="input" className="text-sm font-medium">
                    {t('phoneVerification.phoneLabel')} & API URL
                  </label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Enter in format: phone|apiurl or phone----apiurl
                  </p>
                  <Input
                    id="input"
                    type="text"
                    placeholder="+1234567890|https://api.example.com/code"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="h-12 font-mono text-sm"
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
                      {t('phoneVerification.loading')}
                    </>
                  ) : (
                    t('phoneVerification.fetchButton')
                  )}
                </Button>
              </form>

              {result && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4">Result:</h3>
                  <div className="bg-gradient-primary/10 border border-primary/20 rounded-xl p-4">
                    <div className="text-sm text-muted-foreground mb-2">
                      {result.phone}
                    </div>
                    {result.code ? (
                      <div className="flex items-center gap-3">
                        <div className="text-3xl font-bold font-mono tracking-wider">
                          {result.code}
                        </div>
                        <Button
                          type="button"
                          onClick={handleCopy}
                          size="icon"
                          variant="outline"
                          className="h-10 w-10"
                        >
                          {copied ? (
                            <Check className="w-5 h-5 text-green-500" />
                          ) : (
                            <Copy className="w-5 h-5" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="text-sm text-red-500">
                        {result.error || t('phoneVerification.noCodeFound')}
                      </div>
                    )}
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

export default PhoneVerification;
