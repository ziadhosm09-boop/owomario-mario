import { Youtube, ExternalLink } from "lucide-react";
import { Button } from "./ui/button";

export const YouTubeBanner = () => {
  return (
    <a
      href="https://www.youtube.com/@owomario"
      target="_blank"
      rel="noopener noreferrer"
      className="block group"
    >
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-destructive via-destructive/90 to-destructive p-4 shadow-lg transition-all duration-300 hover:shadow-2xl hover:shadow-destructive/20 hover:scale-[1.02]">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 bg-white/5 opacity-50" />
        
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* YouTube Icon with pulse effect */}
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-full animate-ping" />
              <div className="relative p-3 bg-white/10 backdrop-blur-sm rounded-full">
                <Youtube className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <div className="space-y-1">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                @owomario
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">
                  YouTube
                </span>
              </h3>
              <p className="text-white/80 text-sm">
                Subscribe for tutorials & updates! 🔔
              </p>
            </div>
          </div>
          
          <Button 
            variant="secondary"
            className="bg-white text-destructive hover:bg-white/90 font-bold shadow-lg group-hover:scale-105 transition-transform"
          >
            <span className="hidden sm:inline">Subscribe</span>
            <ExternalLink className="w-4 h-4 sm:ml-2" />
          </Button>
        </div>
      </div>
    </a>
  );
};
