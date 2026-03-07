import { Mail, Key, Smartphone, Code, Wrench, ShoppingCart } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { IdeasSection } from "@/components/IdeasSection";
import { FeedbackSection } from "@/components/FeedbackSection";
import { ServiceCard } from "@/components/ServiceCard";
import { Footer } from "@/components/Footer";
import { YouTubeBanner } from "@/components/YouTubeBanner";
import { YouTubeVideos } from "@/components/YouTubeVideos";
import { AdsBanner } from "@/components/AdsBanner";
import { useTranslation } from "react-i18next";
import emailIllustration from "@/assets/email-illustration.jpg";
import tfaIllustration from "@/assets/2fa-illustration.jpg";
import phoneIllustration from "@/assets/phone-illustration.jpg";
import discordCheckerIllustration from "@/assets/discord-checker-illustration.jpg";
import apiServicesIllustration from "@/assets/api-services-illustration.jpg";
import p2pTradingIllustration from "@/assets/p2p-trading-illustration.jpg";

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
      icon: Wrench,
      title: "Discord Tools",
      description: "Trial Checker, Tokens Checker, Change Password, Email Verify",
      image: discordCheckerIllustration,
      link: "/discord-tools",
    },
    {
      icon: Code,
      title: t('services.apiServices.title'),
      description: t('services.apiServices.description'),
      image: apiServicesIllustration,
      link: "/api",
    },
    {
      icon: ShoppingCart,
      title: "P2P Trading",
      description: "Buy & sell Discord tokens securely with ticket system",
      image: p2pTradingIllustration,
      link: "/p2p",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-10 left-[10%] w-[500px] h-[500px] bg-primary/6 rounded-full blur-[150px]" />
        <div className="absolute top-40 right-[5%] w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-[40%] w-[500px] h-[300px] bg-accent/4 rounded-full blur-[120px]" />
      </div>

      <main className="pt-24 pb-12 relative z-10">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="container mx-auto px-4 py-20 md:py-28 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-primary/20 mb-6 text-sm text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              All tools ready to use
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-in fade-in slide-in-from-bottom-4 duration-1000">
              {t('hero.title')}
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-150">
              {t('hero.subtitle')}
            </p>
          </div>
        </section>

        {/* Ads Banner */}
        <section className="container mx-auto px-4 py-6">
          <AdsBanner />
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
                className="animate-in fade-in slide-in-from-bottom-4 duration-700"
                style={{ animationDelay: `${(index + 1) * 100}ms` }}
              >
                <ServiceCard {...service} />
              </div>
            ))}
          </div>
        </section>

        {/* YouTube Videos Section */}
        <YouTubeVideos />

        {/* Ideas & Feedback */}
        <section className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <IdeasSection section="home" />
            <FeedbackSection />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
