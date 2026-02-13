import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { IdeasSection } from "@/components/IdeasSection";
import { Key, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LiquidSphere3D } from "@/components/ui/liquid-sphere-3d";
import { useState, useEffect } from "react";
import * as OTPAuth from "otpauth";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const TwoFAGenerator = () => {
  const { t } = useTranslation();
  const [secretKey, setSecretKey] = useState("");
  const [currentCode, setCurrentCode] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!secretKey) {
      setCurrentCode("");
      return;
    }

    const generateCode = () => {
      try {
        const totp = new OTPAuth.TOTP({
          secret: secretKey,
          digits: 6,
          period: 30,
        });
        const code = totp.generate();
        setCurrentCode(code);
        
        const now = Math.floor(Date.now() / 1000);
        const remaining = 30 - (now % 30);
        setTimeRemaining(remaining);
      } catch (error) {
        console.error("Error generating code:", error);
        toast.error(t('twoFA.invalidKeyError'));
        setCurrentCode("");
      }
    };

    generateCode();
    const interval = setInterval(generateCode, 1000);

    return () => clearInterval(interval);
  }, [secretKey]);

  const handleCopy = async () => {
    if (!currentCode) return;
    
    try {
      await navigator.clipboard.writeText(currentCode);
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
                <Key className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-4xl font-bold mb-4">{t('twoFA.title')}</h1>
              <p className="text-muted-foreground text-lg">
                {t('twoFA.subtitle')}
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-8 shadow-card">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="secretKey" className="text-sm font-medium">
                    {t('twoFA.secretKeyLabel')}
                  </label>
                  <Input
                    id="secretKey"
                    type="text"
                    placeholder={t('twoFA.secretKeyPlaceholder')}
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    className="h-12"
                  />
                </div>

                {currentCode && (
                  <div className="space-y-4 mt-6">
                    <div className="bg-gradient-primary/10 border border-primary/20 rounded-xl p-6">
                      <div className="text-center space-y-4">
                        <div className="text-sm text-muted-foreground">{t('twoFA.currentCode')}</div>
                        <div className="flex items-center justify-center gap-4">
                          <div className="text-5xl font-bold tracking-wider font-mono">
                            {currentCode}
                          </div>
                          <Button
                            type="button"
                            onClick={handleCopy}
                            size="icon"
                            variant="outline"
                            className="h-12 w-12"
                          >
                            {copied ? (
                              <Check className="w-5 h-5 text-green-500" />
                            ) : (
                              <Copy className="w-5 h-5" />
                            )}
                          </Button>
                        </div>
                        <div className="flex flex-col items-center justify-center gap-4">
                          <div className="w-32 h-32">
                            <LiquidSphere3D 
                              value={(timeRemaining / 30) * 100}
                              className="w-full h-full"
                            />
                          </div>
                          <div className="text-sm text-muted-foreground font-medium">
                            {t('twoFA.expiresIn')} {timeRemaining} {t('twoFA.seconds')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="max-w-2xl mx-auto mt-8">
            <IdeasSection section="2fa" />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TwoFAGenerator;
