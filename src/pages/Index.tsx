import { Mail, Key, Smartphone, Code, Wrench } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { IdeasSection } from "@/components/IdeasSection";
import { FeedbackSection } from "@/components/FeedbackSection";
import { ServiceCard } from "@/components/ServiceCard";
import { Footer } from "@/components/Footer";
import { YouTubeBanner } from "@/components/YouTubeBanner";
import { YouTubeVideos } from "@/components/YouTubeVideos";
import { useTranslation } from "react-i18next";
import emailIllustration from "@/assets/email-illustration.jpg";
import tfaIllustration from "@/assets/2fa-illustration.jpg";
import phoneIllustration from "@/assets/phone-illustration.jpg";
import discordCheckerIllustration from "@/assets/discord-checker-illustration.jpg";
import apiServicesIllustration from "@/assets/api-services-illustration.jpg";

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
      description: "All Discord tools in one place - Trial Checker, Tokens Checker, Change Password",
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
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="pt-24 pb-12">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
          {/* Glassmorphism floating orbs */}
          <div className="absolute top-20 left-[10%] w-72 h-72 bg-primary/15 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute top-40 right-[15%] w-64 h-64 bg-secondary/15 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="container mx-auto px-4 py-24 text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6 text-sm text-muted-foreground">
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
