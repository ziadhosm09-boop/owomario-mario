import { Mail, Key, Smartphone, Shield, Code, QrCode, CheckCircle, Unlock } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { ServiceCard } from "@/components/ServiceCard";
import { Footer } from "@/components/Footer";
import { YouTubeBanner } from "@/components/YouTubeBanner";
import { YouTubeVideos } from "@/components/YouTubeVideos";
import { useTranslation } from "react-i18next";
import emailIllustration from "@/assets/email-illustration.jpg";
import tfaIllustration from "@/assets/2fa-illustration.jpg";
import phoneIllustration from "@/assets/phone-illustration.jpg";
import discordCheckerIllustration from "@/assets/discord-checker-illustration.jpg";
import tokensCheckerIllustration from "@/assets/tokens-checker-illustration.jpg";
import apiServicesIllustration from "@/assets/api-services-illustration.jpg";
import qrCodeIllustration from "@/assets/qr-code-illustration.jpg";
import discordUnlockerIllustration from "@/assets/discord-unlocker-illustration.jpg";

const Index = () => {
  const { t } = useTranslation();

  const services = [
    {
      icon: Mail,
      title: t('services.emailCodes.title'),
      description: t('services.emailCodes.description'),
      image: emailIllustration,
      link: "/email",
    },
    {
      icon: Key,
      title: t('services.twoFA.title'),
      description: t('services.twoFA.description'),
      image: tfaIllustration,
      link: "/2fa",
    },
    {
      icon: Smartphone,
      title: t('services.phoneVerification.title'),
      description: t('services.phoneVerification.description'),
      image: phoneIllustration,
      link: "/phone",
    },
    {
      icon: Shield,
      title: t('services.discordChecker.title'),
      description: t('services.discordChecker.description'),
      image: discordCheckerIllustration,
      link: "/discord-checker",
    },
    {
      icon: CheckCircle,
      title: t('services.tokensChecker.title'),
      description: t('services.tokensChecker.description'),
      image: tokensCheckerIllustration,
      link: "/tokens-checker",
    },
    {
      icon: Unlock,
      title: "Discord Unlocker",
      description: "Unlock Discord accounts using email verification requests",
      image: discordUnlockerIllustration,
      link: "/discord-unlocker",
    },
    {
      icon: Code,
      title: t('services.apiServices.title'),
      description: t('services.apiServices.description'),
      image: apiServicesIllustration,
      link: "/api",
    },
    {
      icon: QrCode,
      title: t('services.qrCode.title'),
      description: t('services.qrCode.description'),
      image: qrCodeIllustration,
      link: "/qr-code",
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="pt-24 pb-12">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
          
          <div className="container mx-auto px-4 py-20 text-center relative z-10">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-1000">
              {t('hero.title')}
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-150">
              {t('hero.subtitle')}
            </p>
          </div>
        </section>

        {/* YouTube Banner */}
        <section className="container mx-auto px-4 py-6">
          <YouTubeBanner />
        </section>

        {/* Services Section */}
        <section className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div
                key={service.title}
                className="animate-in fade-in slide-in-from-bottom-4 duration-1000"
                style={{ animationDelay: `${(index + 3) * 150}ms` }}
              >
                <ServiceCard {...service} />
              </div>
            ))}
          </div>
        </section>

        {/* YouTube Videos Section */}
        <YouTubeVideos />
      </main>

      <Footer />
    </div>
  );
};

export default Index;
