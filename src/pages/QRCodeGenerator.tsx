import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import QRCode from "react-qr-code";
import { Download, Palette, Image as ImageIcon } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

export default function QRCodeGenerator() {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const [fgColor, setFgColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#FFFFFF");
  const [size, setSize] = useState(256);
  const [logo, setLogo] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownload = () => {
    if (!url) {
      toast.error(t('qrCode.emptyUrlError'));
      return;
    }

    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    canvas.width = size;
    canvas.height = size;

    img.onload = () => {
      ctx?.drawImage(img, 0, 0);
      
      // Add logo if exists
      if (logo) {
        const logoImg = new Image();
        logoImg.onload = () => {
          const logoSize = size * 0.2;
          const x = (size - logoSize) / 2;
          const y = (size - logoSize) / 2;
          
          // Draw white background for logo
          if (ctx) {
            ctx.fillStyle = bgColor;
            ctx.fillRect(x - 5, y - 5, logoSize + 10, logoSize + 10);
            ctx.drawImage(logoImg, x, y, logoSize, logoSize);
          }
          
          downloadCanvas();
        };
        logoImg.src = logo;
      } else {
        downloadCanvas();
      }
    };

    const downloadCanvas = () => {
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = "qr-code.png";
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
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
                {t('qrCode.title')}
              </h1>
              <p className="text-xl text-muted-foreground">
                {t('qrCode.subtitle')}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Controls */}
              <Card className="p-6 space-y-6">
                <div>
                  <Label htmlFor="url" className="text-lg font-semibold mb-2 block">
                    {t('qrCode.urlLabel')}
                  </Label>
                  <Input
                    id="url"
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={t('qrCode.urlPlaceholder')}
                    className="text-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fgColor" className="flex items-center gap-2 mb-2">
                      <Palette className="w-4 h-4" />
                      {t('qrCode.fgColorLabel')}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="fgColor"
                        type="color"
                        value={fgColor}
                        onChange={(e) => setFgColor(e.target.value)}
                        className="h-10 w-20"
                      />
                      <Input
                        type="text"
                        value={fgColor}
                        onChange={(e) => setFgColor(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="bgColor" className="flex items-center gap-2 mb-2">
                      <Palette className="w-4 h-4" />
                      {t('qrCode.bgColorLabel')}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="bgColor"
                        type="color"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="h-10 w-20"
                      />
                      <Input
                        type="text"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="mb-4 block">
                    {t('qrCode.sizeLabel')}: {size}px
                  </Label>
                  <Slider
                    value={[size]}
                    onValueChange={(value) => setSize(value[0])}
                    min={128}
                    max={512}
                    step={32}
                    className="w-full"
                  />
                </div>

                <div>
                  <Label htmlFor="logo" className="flex items-center gap-2 mb-2">
                    <ImageIcon className="w-4 h-4" />
                    {t('qrCode.logoLabel')}
                  </Label>
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="cursor-pointer"
                  />
                  {logo && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLogo(null)}
                      className="mt-2"
                    >
                      {t('qrCode.removeLogo')}
                    </Button>
                  )}
                </div>

                <Button
                  onClick={handleDownload}
                  className="w-full bg-gradient-primary"
                  size="lg"
                >
                  <Download className="w-5 h-5 mr-2" />
                  {t('qrCode.downloadButton')}
                </Button>
              </Card>

              {/* Preview */}
              <Card className="p-6">
                <Label className="text-lg font-semibold mb-4 block">
                  {t('qrCode.preview')}
                </Label>
                <div 
                  ref={qrRef}
                  className="flex items-center justify-center bg-muted rounded-lg p-8"
                  style={{ minHeight: "400px" }}
                >
                  {url ? (
                    <div className="relative">
                      <QRCode
                        value={url}
                        size={size}
                        fgColor={fgColor}
                        bgColor={bgColor}
                        level="H"
                      />
                      {logo && (
                        <div 
                          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-1 rounded"
                          style={{ 
                            backgroundColor: bgColor,
                            width: `${size * 0.22}px`,
                            height: `${size * 0.22}px`,
                          }}
                        >
                          <img 
                            src={logo} 
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
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
