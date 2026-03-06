
import { Shield, AlertTriangle, Star, Percent, Ban, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const terms = [
  {
    icon: Shield,
    title: "مسؤولية المنتج",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    items: [
      "البائع مسؤول بالكامل عن جودة المنتج",
      "البائع مسؤول عن مطابقة المنتج للوصف",
      "البائع مسؤول عن الشحن والتوصيل",
      "الموقع ليس مسؤولاً عن المنتج نفسه بل وسيط فقط",
    ],
  },
  {
    icon: AlertTriangle,
    title: "سياسة النزاعات (Dispute Policy)",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    items: [
      "لو حصل خلاف بين البائع والمشتري، الموقع ممكن يتدخل كوسيط",
      "ممكن تتجمد الفلوس مؤقتًا لحين حل النزاع",
      "القرار النهائي للموقع",
    ],
  },
  {
    icon: Star,
    title: "نظام التقييم",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/20",
    items: [
      "كل بائع يكون له Rating ⭐ و Reviews",
      "لو التقييم سيء ممكن يتم تحذيره",
      "أو حظر حسابه نهائيًا",
    ],
  },
  {
    icon: Percent,
    title: "عمولة الموقع",
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/20",
    items: [
      "نسبة العمولة: 5% من كل عملية بيع",
      "يتم خصمها تلقائيًا عند إتمام الصفقة",
      "لا توجد رسوم سحب إضافية",
    ],
  },
  {
    icon: Ban,
    title: "❌ منع التعامل خارج الموقع",
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
    items: [
      "يمنع الاتفاق أو الدفع خارج الموقع",
      "لو حصل ده يتم حظر البائع",
      "يتم إلغاء الحساب نهائيًا",
    ],
  },
  {
    icon: Users,
    title: "منع الحسابات المتعددة",
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
    items: [
      "بائع واحد = حساب واحد",
      "الحسابات المتعددة ممكن تؤدي للحظر الفوري",
      "يتم التحقق من الهوية لمنع التلاعب",
    ],
  },
];

export const P2PTerms = () => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">📜 شروط وأحكام P2P</h2>
        <p className="text-muted-foreground text-sm">يرجى قراءة الشروط بعناية قبل استخدام المنصة</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {terms.map((term, i) => (
          <Card key={i} className={`glass-card border ${term.bg} overflow-hidden`}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${term.bg}`}>
                  <term.icon className={`w-5 h-5 ${term.color}`} />
                </div>
                <h3 className="font-bold text-base">{term.title}</h3>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground" dir="rtl">
                {term.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${term.color.replace("text-", "bg-")}`} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20 text-center">
        <p className="text-sm text-destructive font-semibold" dir="rtl">
          ⚠️ بمجرد استخدامك لمنصة P2P فأنت توافق على جميع الشروط والأحكام المذكورة أعلاه
        </p>
      </div>
    </div>
  );
};
