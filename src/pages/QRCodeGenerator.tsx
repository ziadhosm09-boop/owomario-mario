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
            ctx.fillStyle = qrData.bgColor;
            ctx.fillRect(x - 5, y - 5, logoSize + 10, logoSize + 10);
            ctx.drawImage(logoImg, x, y, logoSize, logoSize);
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
                          <Label htmlFor={`fgColor-${qrData.id}`} className="flex items-center gap-2 mb-2">
                            <Palette className="w-4 h-4" />
                            {t('qrCode.fgColorLabel')}
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id={`fgColor-${qrData.id}`}
                              type="color"
                              value={qrData.fgColor}
                              onChange={(e) => updateQRCode(qrData.id, { fgColor: e.target.value })}
                              className="h-10 w-20"
                            />
                            <Input
                              type="text"
                              value={qrData.fgColor}
                              onChange={(e) => updateQRCode(qrData.id, { fgColor: e.target.value })}
                              className="flex-1"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor={`bgColor-${qrData.id}`} className="flex items-center gap-2 mb-2">
                            <Palette className="w-4 h-4" />
                            {t('qrCode.bgColorLabel')}
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id={`bgColor-${qrData.id}`}
                              type="color"
                              value={qrData.bgColor}
                              onChange={(e) => updateQRCode(qrData.id, { bgColor: e.target.value })}
                              className="h-10 w-20"
                            />
                            <Input
                              type="text"
                              value={qrData.bgColor}
                              onChange={(e) => updateQRCode(qrData.id, { bgColor: e.target.value })}
                              className="flex-1"
                            />
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQRCode(qrData.id, { logo: null })}
                            className="mt-2"
                          >
                            {t('qrCode.removeLogo')}
                          </Button>
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
                      <div 
                        id={`qr-${qrData.id}`}
                        className="flex items-center justify-center bg-muted rounded-lg p-8"
                        style={{ minHeight: "400px" }}
                      >
                        {qrData.url ? (
                          <div className="relative">
                            <QRCode
                              value={qrData.url}
                              size={qrData.size}
                              fgColor={qrData.fgColor}
                              bgColor={qrData.bgColor}
                              level="H"
                            />
                            {qrData.logo && (
                              <div 
                                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-1 rounded"
                                style={{ 
                                  backgroundColor: qrData.bgColor,
                                  width: `${qrData.size * 0.22}px`,
                                  height: `${qrData.size * 0.22}px`,
                                }}
                              >
                                <img 
                                  src={qrData.logo} 
                                  alt="Logo" 
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-center">
                            {t('qrCode.emptyPreview')}
                          </p>
                        )}
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
