import { ExternalLink } from "lucide-react";

const App = () => (
  <div className="min-h-screen bg-background flex items-center justify-center p-4">
    {/* Background effects */}
    <div className="fixed inset-0 pointer-events-none">
      <div className="absolute top-10 left-[10%] w-[500px] h-[500px] bg-primary/6 rounded-full blur-[150px]" />
      <div className="absolute top-40 right-[5%] w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 left-[40%] w-[500px] h-[300px] bg-accent/4 rounded-full blur-[120px]" />
    </div>

    <div className="relative z-10 text-center space-y-8 max-w-lg w-full">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
        VerifyHub
      </h1>

      <div className="glass border border-primary/20 rounded-2xl p-10 shadow-2xl space-y-6">
        <p className="text-muted-foreground text-lg">
          تم نقل الموقع! الرابط الجديد هو:
        </p>

        <a
          href="https://owomario.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-center gap-3 bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold text-xl px-8 py-4 rounded-xl shadow-lg hover:opacity-90 hover:scale-105 transition-all duration-300"
        >
          owomario.com
          <ExternalLink className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </a>

        <p className="text-sm text-muted-foreground">
          اضغط على الرابط للانتقال للموقع الجديد
        </p>
      </div>
    </div>
  </div>
);

export default App;
