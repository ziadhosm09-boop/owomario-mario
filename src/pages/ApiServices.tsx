import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Check } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { IdeasSection } from "@/components/IdeasSection";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ApiEndpoint {
  id: string;
  title: string;
  description: string;
  method: string;
  endpoint: string;
  requestBody: string;
  responseExample: string;
}

const generateCurl = (endpoint: string, requestBody: string, method: string) => {
  return `curl -X ${method} "${endpoint}" \\
  -H "Content-Type: application/json" \\
  -d '${requestBody}'`;
};

const generateJavaScript = (endpoint: string, requestBody: string) => {
  return `fetch("${endpoint}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: '${requestBody}'
})
  .then(response => response.text())
  .then(data => console.log(data))
  .catch(error => console.error("Error:", error));`;
};

const generatePython = (endpoint: string, requestBody: string) => {
  return `import requests

url = "${endpoint}"
data = '${requestBody}'

response = requests.post(url, data=data, headers={"Content-Type": "application/json"})
print(response.text)`;
};

export default function ApiServices() {
  const { t } = useTranslation();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const baseUrl = "https://isqbduxgxroysrojtseq.supabase.co/functions/v1";

  const apis: ApiEndpoint[] = [
    {
      id: "amazon-otp",
      title: "Amazon OTP",
      description: "جلب آخر كود OTP من Amazon وحذف الرسالة",
      method: "POST",
      endpoint: `${baseUrl}/get-otp`,
      requestBody: "email@hotmail.com:password:refreshToken:clientId",
      responseExample: "529149"
    },
    {
      id: "email-codes",
      title: "Email Codes (Detailed)",
      description: "جلب أكواد Amazon أو روابط Discord من البريد الإلكتروني",
      method: "POST",
      endpoint: `${baseUrl}/fetch-email-codes`,
      requestBody: JSON.stringify({
        accounts: [
          "email@hotmail.com:password:refreshToken:clientId"
        ],
        mode: "amazon"
      }, null, 2),
      responseExample: JSON.stringify({
        results: [
          {
            email: "email@hotmail.com",
            otp: "529149"
          }
        ]
      }, null, 2)
    },
    {
      id: "discord-checker",
      title: "Discord Trial Checker",
      description: "فحص حالة التجربة المجانية لـ Discord",
      method: "POST",
      endpoint: `${baseUrl}/check-discord-trials`,
      requestBody: JSON.stringify({
        tokens: ["discord_token_here"]
      }, null, 2),
      responseExample: JSON.stringify({
        results: [
          {
            token: "discord_token_here",
            eligible: true,
            message: "Eligible for Nitro trial"
          }
        ]
      }, null, 2)
    },
    {
      id: "discord-link",
      title: "Get Discord Link",
      description: "الحصول على رابط التحقق من Discord",
      method: "POST",
      endpoint: `${baseUrl}/get-discord-link`,
      requestBody: JSON.stringify({
        email: "email@example.com"
      }, null, 2),
      responseExample: JSON.stringify({
        link: "https://discord.com/verify/...",
        status: "success"
      }, null, 2)
    },
  ];

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("تم النسخ!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast.error("فشل النسخ");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-24 pb-12 bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                API Services
              </h1>
              <p className="text-muted-foreground text-lg">
                استخدم الـ APIs التالية للتكامل مع خدماتنا
              </p>
            </div>

          <Accordion type="single" collapsible className="space-y-4">
            {apis.map((api) => (
              <AccordionItem key={api.id} value={api.id} className="border-none">
                <Card className="backdrop-blur-sm bg-card/50 border-primary/20 hover:border-primary/40 transition-all overflow-hidden">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="text-left">
                        <h3 className="text-xl font-bold text-foreground mb-1">
                          {api.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">{api.description}</p>
                      </div>
                      <span className="px-3 py-1 bg-primary/20 text-primary rounded-md text-sm font-semibold">
                        {api.method}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6">
                    <div className="space-y-4 pt-4">
                      <div>
                        <label className="text-sm font-semibold text-foreground mb-2 block">
                          Endpoint
                        </label>
                        <div className="flex items-center gap-2 bg-muted/50 p-3 rounded-lg border border-border">
                          <code className="flex-1 text-sm text-foreground break-all">
                            {api.endpoint}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(api.endpoint, `${api.id}-endpoint`)}
                            className="shrink-0"
                          >
                            {copiedId === `${api.id}-endpoint` ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-foreground mb-2 block">
                          أمثلة الاستخدام
                        </label>
                        <Tabs defaultValue="curl" className="w-full">
                          <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="curl">cURL</TabsTrigger>
                            <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                            <TabsTrigger value="python">Python</TabsTrigger>
                          </TabsList>
                          
                          <TabsContent value="curl" className="mt-2">
                            <div className="relative bg-muted/50 p-4 rounded-lg border border-border">
                              <pre className="text-sm text-foreground overflow-x-auto whitespace-pre-wrap">
                                {generateCurl(api.endpoint, api.requestBody, api.method)}
                              </pre>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopy(generateCurl(api.endpoint, api.requestBody, api.method), `${api.id}-curl`)}
                                className="absolute top-2 right-2"
                              >
                                {copiedId === `${api.id}-curl` ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TabsContent>

                          <TabsContent value="javascript" className="mt-2">
                            <div className="relative bg-muted/50 p-4 rounded-lg border border-border">
                              <pre className="text-sm text-foreground overflow-x-auto whitespace-pre-wrap">
                                {generateJavaScript(api.endpoint, api.requestBody)}
                              </pre>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopy(generateJavaScript(api.endpoint, api.requestBody), `${api.id}-js`)}
                                className="absolute top-2 right-2"
                              >
                                {copiedId === `${api.id}-js` ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TabsContent>

                          <TabsContent value="python" className="mt-2">
                            <div className="relative bg-muted/50 p-4 rounded-lg border border-border">
                              <pre className="text-sm text-foreground overflow-x-auto whitespace-pre-wrap">
                                {generatePython(api.endpoint, api.requestBody)}
                              </pre>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopy(generatePython(api.endpoint, api.requestBody), `${api.id}-python`)}
                                className="absolute top-2 right-2"
                              >
                                {copiedId === `${api.id}-python` ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TabsContent>
                        </Tabs>
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-foreground mb-2 block">
                          Request Body
                        </label>
                        <div className="relative bg-muted/50 p-3 rounded-lg border border-border">
                          <pre className="text-sm text-foreground overflow-x-auto">
                            {api.requestBody}
                          </pre>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(api.requestBody, `${api.id}-request`)}
                            className="absolute top-2 right-2"
                          >
                            {copiedId === `${api.id}-request` ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-foreground mb-2 block">
                          Response Example
                        </label>
                        <div className="relative bg-muted/50 p-3 rounded-lg border border-border">
                          <pre className="text-sm text-foreground overflow-x-auto">
                            {api.responseExample}
                          </pre>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(api.responseExample, `${api.id}-response`)}
                            className="absolute top-2 right-2"
                          >
                            {copiedId === `${api.id}-response` ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </Card>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-8 p-6 bg-primary/10 rounded-lg border border-primary/20">
            <h3 className="text-lg font-semibold mb-2 text-foreground">ملاحظات مهمة:</h3>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>جميع الطلبات يجب أن تكون من نوع POST</li>
              <li>يجب إرفاق Header: Content-Type: application/json</li>
              <li>يمكنك استخدام Authorization header إذا لزم الأمر</li>
              <li>API الخاص بـ Amazon OTP يحذف الرسالة تلقائياً بعد قراءتها</li>
            </ul>
          </div>
          <div className="mt-8">
            <IdeasSection section="api" />
          </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
