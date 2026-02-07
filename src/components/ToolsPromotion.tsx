import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Bot, Unlock, Trophy, MessageCircle, Sparkles, ShoppingCart } from "lucide-react";

const DiscordIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

interface Tool {
  icon: React.ReactNode;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  badge?: string;
}

const tools: Tool[] = [
  {
    icon: <Bot className="w-6 h-6" />,
    nameAr: "Token Gen",
    nameEn: "Token Gen",
    descriptionAr: "توليد توكنات ديسكورد",
    descriptionEn: "Generate Discord tokens",
    badge: "🔥 Hot"
  },
  {
    icon: <Unlock className="w-6 h-6" />,
    nameAr: "Unlocker",
    nameEn: "Unlocker",
    descriptionAr: "فتح الحسابات المقفولة (Locked Email / Unclaimed)",
    descriptionEn: "Unlock locked accounts (Locked Email / Unclaimed)",
    badge: "⭐ Popular"
  },
  {
    icon: <Trophy className="w-6 h-6" />,
    nameAr: "Quest Claimer",
    nameEn: "Quest Claimer",
    descriptionAr: "جمع مكافآت الكويستات تلقائياً",
    descriptionEn: "Claim quest rewards automatically",
  }
];

export const ToolsPromotion = () => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  return (
    <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-xl flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            {isArabic ? "🛒 أدوات للبيع" : "🛒 Tools for Sale"}
          </CardTitle>
          <Badge className="bg-gradient-primary text-white">
            <Sparkles className="w-3 h-3 mr-1" />
            {isArabic ? "عروض حصرية" : "Exclusive Deals"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tools Grid */}
        <div className="grid gap-3">
          {tools.map((tool, index) => (
            <div 
              key={index}
              className="flex items-center gap-4 p-3 rounded-lg bg-card/50 border border-border/50 hover:border-primary/50 hover:bg-card transition-all duration-300 group"
            >
              <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                {tool.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold">{isArabic ? tool.nameAr : tool.nameEn}</h4>
                  {tool.badge && (
                    <Badge variant="secondary" className="text-xs">
                      {tool.badge}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {isArabic ? tool.descriptionAr : tool.descriptionEn}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Custom Request Section */}
        <div className="p-4 rounded-lg bg-muted/50 border border-dashed border-muted-foreground/30">
          <p className="text-sm text-center text-muted-foreground mb-3">
            {isArabic 
              ? "🤔 تريد شيئاً غير موجود في القائمة؟ أو تريد شراء أداة؟"
              : "🤔 Want something not in the list? Or want to buy a tool?"
            }
          </p>
          <a 
            href="https://discord.com/users/owomario" 
            target="_blank" 
            rel="noopener noreferrer"
            className="block"
          >
            <Button className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white gap-2">
              <DiscordIcon className="w-5 h-5" />
              <span>
                {isArabic 
                  ? "تواصل مع owomario على Discord" 
                  : "Contact owomario on Discord"
                }
              </span>
              <MessageCircle className="w-4 h-4" />
            </Button>
          </a>
        </div>

        {/* Footer Note */}
        <p className="text-xs text-center text-muted-foreground">
          {isArabic 
            ? "💬 للاستفسار عن الأسعار أو أي أداة أخرى، تواصل معنا!"
            : "💬 For pricing or any other tool inquiries, contact us!"
          }
        </p>
      </CardContent>
    </Card>
  );
};
