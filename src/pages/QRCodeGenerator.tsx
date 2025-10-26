import { useState } from "react";
import { useTranslation } from "react-i18next";
import QRCode from "react-qr-code";
import { Download, Palette, Image as ImageIcon, Plus, X } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

interface QRCodeData {
  id: string;
  url: string;
  fgColor: string;
  bgColor: string;
  size: number;
  logo: string | null;
  logoRadius: number;
}

export default function QRCodeGenerator() {
  const { t } = useTranslation();
  const [qrCodes, setQrCodes] = useState<QRCodeData[]>([
    {
      id: "1",
      url: "",
      fgColor: "#000000",
      bgColor: "#FFFFFF",
      size: 256,
      logo: null,
      logoRadius: 8,
    },
  ]);

  const addNewQRCode = () => {
    const newQRCode: QRCodeData = {
      id: Date.now().toString(),
      url: "",
      fgColor: "#000000",
      bgColor: "#FFFFFF",
      size: 256,
      logo: null,
      logoRadius: 8,
    };
    setQrCodes([...qrCodes, newQRCode]);
    toast.success(t('qrCode.addedNewQR'));
  };

  const removeQRCode = (id: string) => {
    if (qrCodes.length === 1) {
      toast.error(t('qrCode.cannotRemoveLast'));
      return;
    }
    setQrCodes(qrCodes.filter((qr) => qr.id !== id));
    toast.success(t('qrCode.removedQR'));
  };

  const updateQRCode = (id: string, updates: Partial<QRCodeData>) => {
    setQrCodes(
      qrCodes.map((qr) => (qr.id === id ? { ...qr, ...updates } : qr))
    );
  };

  const handleLogoUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateQRCode(id, { logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownload = (qrData: QRCodeData) => {
    if (!qrData.url) {
      toast.error(t('qrCode.emptyUrlError'));
      return;
    }

    const qrElement = document.getElementById(`qr-${qrData.id}`);
    const svg = qrElement?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    canvas.width = qrData.size;
    canvas.height = qrData.size;

    img.onload = () => {
      ctx?.drawImage(img, 0, 0);
      
      if (qrData.logo) {
        const logoImg = new Image();
        logoImg.onload = () => {
          const logoSize = qrData.size * 0.2;
          const x = (qrData.size - logoSize) / 2;
          const y = (qrData.size - logoSize) / 2;
          
          if (ctx) {
            // Draw rounded background
            ctx.fillStyle = qrData.bgColor;
            ctx.beginPath();
            ctx.roundRect(x - 5, y - 5, logoSize + 10, logoSize + 10, qrData.logoRadius);
            ctx.fill();
            
            // Draw rounded logo
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(x, y, logoSize, logoSize, qrData.logoRadius);
            ctx.clip();
            ctx.drawImage(logoImg, x, y, logoSize, logoSize);
            ctx.restore();
          }
          
          downloadCanvas();
        };
        logoImg.src = qrData.logo;
      } else {
        downloadCanvas();
      }
    };

    const downloadCanvas = () => {
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `qr-code-${qrData.id}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
      toast.success(t('qrCode.downloadSuccess'));
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
                {t('qrCode.title')}
              </h1>
              <p className="text-xl text-muted-foreground mb-6">
                {t('qrCode.subtitle')}
              </p>
              <Button
                onClick={addNewQRCode}
                className="bg-gradient-primary"
                size="lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                {t('qrCode.addNewQR')}
              </Button>
            </div>

            {/* QR Codes Grid */}
            <div className="space-y-8">
              {qrCodes.map((qrData, index) => (
                <Card key={qrData.id} className="p-6 relative">
                  {/* Remove Button */}
                  {qrCodes.length > 1 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-4 right-4 z-10"
                      onClick={() => removeQRCode(qrData.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}

                  <div className="mb-4">
                    <h2 className="text-2xl font-bold text-foreground">
                      QR Code #{index + 1}
                    </h2>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Controls */}
                    <div className="space-y-6">
                      <div>
                        <Label htmlFor={`url-${qrData.id}`} className="text-lg font-semibold mb-2 block">
                          {t('qrCode.urlLabel')}
                        </Label>
                        <Input
                          id={`url-${qrData.id}`}
                          type="text"
                          value={qrData.url}
                          onChange={(e) => updateQRCode(qrData.id, { url: e.target.value })}
                          placeholder={t('qrCode.urlPlaceholder')}
                          className="text-lg"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`fgColor-${qrData.id}`} className="flex items-center gap-2 mb-3">
                            <Palette className="w-4 h-4" />
                            {t('qrCode.fgColorLabel')}
                          </Label>
                          <div className="relative group">
                            <div 
                              className="absolute inset-0 bg-gradient-primary rounded-lg blur-xl opacity-50 group-hover:opacity-75 transition-opacity"
                              style={{ zIndex: -1 }}
                            />
                            <div className="relative flex gap-2 p-3 bg-card/80 backdrop-blur-sm rounded-lg border border-primary/20 shadow-glow transition-all hover:shadow-glow-accent">
                              <div className="relative">
                                <Input
                                  id={`fgColor-${qrData.id}`}
                                  type="color"
                                  value={qrData.fgColor}
                                  onChange={(e) => updateQRCode(qrData.id, { fgColor: e.target.value })}
                                  className="h-12 w-12 cursor-pointer border-2 border-primary/30 shadow-lg hover:scale-110 transition-transform"
                                  style={{ 
                                    background: `linear-gradient(135deg, ${qrData.fgColor} 0%, ${qrData.fgColor}dd 100%)`,
                                  }}
                                />
                                <div className="absolute -inset-1 bg-gradient-primary rounded-lg opacity-0 group-hover:opacity-20 blur transition-opacity" />
                              </div>
                              <Input
                                type="text"
                                value={qrData.fgColor}
                                onChange={(e) => updateQRCode(qrData.id, { fgColor: e.target.value })}
                                className="flex-1 bg-background/50 border-primary/30"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor={`bgColor-${qrData.id}`} className="flex items-center gap-2 mb-3">
                            <Palette className="w-4 h-4" />
                            {t('qrCode.bgColorLabel')}
                          </Label>
                          <div className="relative group">
                            <div 
                              className="absolute inset-0 bg-gradient-secondary rounded-lg blur-xl opacity-50 group-hover:opacity-75 transition-opacity"
                              style={{ zIndex: -1 }}
                            />
                            <div className="relative flex gap-2 p-3 bg-card/80 backdrop-blur-sm rounded-lg border border-secondary/20 shadow-glow transition-all hover:shadow-glow-accent">
                              <div className="relative">
                                <Input
                                  id={`bgColor-${qrData.id}`}
                                  type="color"
                                  value={qrData.bgColor}
                                  onChange={(e) => updateQRCode(qrData.id, { bgColor: e.target.value })}
                                  className="h-12 w-12 cursor-pointer border-2 border-secondary/30 shadow-lg hover:scale-110 transition-transform"
                                  style={{ 
                                    background: `linear-gradient(135deg, ${qrData.bgColor} 0%, ${qrData.bgColor}dd 100%)`,
                                  }}
                                />
                                <div className="absolute -inset-1 bg-gradient-secondary rounded-lg opacity-0 group-hover:opacity-20 blur transition-opacity" />
                              </div>
                              <Input
                                type="text"
                                value={qrData.bgColor}
                                onChange={(e) => updateQRCode(qrData.id, { bgColor: e.target.value })}
                                className="flex-1 bg-background/50 border-secondary/30"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label className="mb-4 block">
                          {t('qrCode.sizeLabel')}: {qrData.size}px
                        </Label>
                        <Slider
                          value={[qrData.size]}
                          onValueChange={(value) => updateQRCode(qrData.id, { size: value[0] })}
                          min={128}
                          max={512}
                          step={32}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <Label htmlFor={`logo-${qrData.id}`} className="flex items-center gap-2 mb-2">
                          <ImageIcon className="w-4 h-4" />
                          {t('qrCode.logoLabel')}
                        </Label>
                        <Input
                          id={`logo-${qrData.id}`}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLogoUpload(qrData.id, e)}
                          className="cursor-pointer"
                        />
                        {qrData.logo && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQRCode(qrData.id, { logo: null })}
                              className="mt-2"
                            >
                              {t('qrCode.removeLogo')}
                            </Button>
                            
                            <div className="mt-4">
                              <Label className="mb-4 block">
                                {t('qrCode.logoRadiusLabel')}: {qrData.logoRadius}px
                              </Label>
                              <Slider
                                value={[qrData.logoRadius]}
                                onValueChange={(value) => updateQRCode(qrData.id, { logoRadius: value[0] })}
                                min={0}
                                max={50}
                                step={1}
                                className="w-full"
                              />
                            </div>
                          </>
                        )}
                      </div>

                      <Button
                        onClick={() => handleDownload(qrData)}
                        className="w-full bg-gradient-primary"
                        size="lg"
                      >
                        <Download className="w-5 h-5 mr-2" />
                        {t('qrCode.downloadButton')}
                      </Button>
                    </div>

                    {/* Preview */}
                    <div>
                      <Label className="text-lg font-semibold mb-4 block">
                        {t('qrCode.preview')}
                      </Label>
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-hero rounded-lg opacity-50" />
                        <div 
                          id={`qr-${qrData.id}`}
                          className="relative flex items-center justify-center bg-gradient-card rounded-lg p-8 border border-primary/10 shadow-card overflow-hidden"
                          style={{ minHeight: "400px" }}
                        >
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]" />
                          {qrData.url ? (
                            <div className="relative">
                              <div className="absolute -inset-4 bg-gradient-primary rounded-lg opacity-20 blur-2xl animate-pulse" />
                              <div className="relative p-4 bg-background/50 backdrop-blur-sm rounded-xl border-2 border-primary/20 shadow-glow">
                                <QRCode
                                  value={qrData.url}
                                  size={qrData.size}
                                  fgColor={qrData.fgColor}
                                  bgColor={qrData.bgColor}
                                  level="H"
                                />
                                {qrData.logo && (
                                  <div 
                                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 shadow-xl"
                                    style={{ 
                                      backgroundColor: qrData.bgColor,
                                      width: `${qrData.size * 0.22}px`,
                                      height: `${qrData.size * 0.22}px`,
                                      borderRadius: `${qrData.logoRadius}px`,
                                      padding: '4px',
                                      boxShadow: `0 0 20px ${qrData.fgColor}40`,
                                    }}
                                  >
                                    <img 
                                      src={qrData.logo} 
                                      alt="Logo" 
                                      className="w-full h-full object-contain"
                                      style={{ 
                                        borderRadius: `${qrData.logoRadius - 2}px`,
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <p className="text-muted-foreground text-center relative z-10">
                              {t('qrCode.emptyPreview')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
