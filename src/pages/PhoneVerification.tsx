import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Smartphone, Copy, Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, useRef } from "react";
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
  const [phoneList, setPhoneList] = useState("");
  const [results, setResults] = useState<PhoneResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const parsePhoneList = (text: string): Array<{ phone: string; apiUrl: string }> => {
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map(line => {
      const trimmed = line.trim();
      let phone = "";
      let apiUrl = "";
      
      if (trimmed.includes("|")) {
        [phone, apiUrl] = trimmed.split("|").map(s => s.trim());
      } else if (trimmed.includes("----")) {
        [phone, apiUrl] = trimmed.split("----").map(s => s.trim());
      }
      
      return { phone, apiUrl };
    }).filter(item => item.phone && item.apiUrl);
  };

  const fetchCodeForPhone = async (phone: string, apiUrl: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-phone-code', {
        body: { phone, apiUrl }
      });

      if (error) throw error;

      if (data.code) {
        // Code received, remove this phone from the list
        setPhoneList(prev => {
          const lines = prev.split('\n');
          const filtered = lines.filter(line => !line.includes(phone));
          return filtered.join('\n');
        });

        // Add to results
        setResults(prev => [...prev, data]);
        toast.success(`Code received for ${phone}`);
      }

      return data;
    } catch (error: any) {
      console.error(`Error fetching code for ${phone}:`, error);
      return null;
    }
  };

  const handleStart = async () => {
    if (!phoneList.trim()) {
      toast.error("Please enter phone numbers and API URLs");
      return;
    }

    const phones = parsePhoneList(phoneList);
    if (phones.length === 0) {
      toast.error("Invalid format. Use: phone----apiurl or phone|apiurl");
      return;
    }

    setLoading(true);
    setResults([]);

    // Check all phones every 5 seconds
    intervalRef.current = setInterval(async () => {
      const currentPhones = parsePhoneList(phoneList);
      if (currentPhones.length === 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        setLoading(false);
        toast.success("All codes received!");
        return;
      }

      for (const { phone, apiUrl } of currentPhones) {
        await fetchCodeForPhone(phone, apiUrl);
      }
    }, 5000);

    // Initial check
    for (const { phone, apiUrl } of phones) {
      await fetchCodeForPhone(phone, apiUrl);
    }
  };

  const handleStop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setLoading(false);
    toast.info("Stopped checking for codes");
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

  const handleRemoveResult = (index: number) => {
    setResults(prev => prev.filter((_, i) => i !== index));
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
              <div className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="phoneList" className="text-sm font-medium">
                    {t('phoneVerification.phoneLabel')} & API URLs
                  </label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Enter multiple lines in format: phone----apiurl or phone|apiurl
                  </p>
                  <Textarea
                    id="phoneList"
                    placeholder="+1234567890----https://api.example.com/code&#10;+0987654321----https://api.example.com/code2"
                    value={phoneList}
                    onChange={(e) => setPhoneList(e.target.value)}
                    className="font-mono min-h-[200px]"
                    disabled={loading}
                  />
                </div>

                <div className="flex gap-3">
                  <Button 
                    type="button"
                    onClick={handleStart}
                    className="flex-1"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      'Start Checking'
                    )}
                  </Button>
                  
                  {loading && (
                    <Button 
                      type="button"
                      onClick={handleStop}
                      variant="destructive"
                    >
                      Stop
                    </Button>
                  )}
                </div>
              </div>

              {results.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h3 className="text-sm font-medium">Received Codes</h3>
                  {results.map((result, index) => (
                    <div key={index} className="p-4 bg-background/50 rounded-xl border border-border">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            {t('phoneVerification.phoneLabel')}
                          </p>
                          <p className="font-mono text-sm">{result.phone}</p>
                        </div>
                        <Button
                          type="button"
                          onClick={() => handleRemoveResult(index)}
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      {result.code ? (
                        <div className="flex items-center gap-3">
                          <div className="text-2xl font-bold font-mono tracking-wider">
                            {result.code}
                          </div>
                          <Button
                            type="button"
                            onClick={() => handleCopy(result.code!, index)}
                            size="icon"
                            variant="outline"
                            className="shrink-0"
                          >
                            {copiedIndex === index ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      ) : (
                        <p className="text-destructive text-sm">{result.error || t('phoneVerification.noCodeFound')}</p>
                      )}
                    </div>
                  ))}
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
