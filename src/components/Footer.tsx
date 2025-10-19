import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";

const DiscordIcon = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 127.14 96.36" 
    className="w-8 h-8"
  >
    <path 
      fill="currentColor" 
      d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"
    />
  </svg>
);

export const Footer = () => {
  const { t } = useTranslation();
  
  return (
    <footer className="border-t border-border py-16 mt-20">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-8">
          <h3 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            {t('footer.contactTitle')}
          </h3>
          
          <div className="flex justify-center">
            <a 
              href="https://discord.gg/cTwUN7C4Mj"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block"
            >
              {/* Blur Container - يتشال مع الـ hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#5865F2]/20 to-[#7289DA]/20 backdrop-blur-xl rounded-2xl transition-all duration-700 ease-out group-hover:backdrop-blur-none group-hover:opacity-0" />
              
              {/* 3D Card */}
              <div className="relative bg-gradient-to-br from-[#5865F2] to-[#7289DA] p-8 rounded-2xl shadow-2xl transform transition-all duration-700 ease-out group-hover:scale-105 group-hover:rotate-y-6 group-hover:shadow-[0_20px_80px_-15px_rgba(88,101,242,0.8)]"
                style={{
                  transformStyle: 'preserve-3d',
                  perspective: '1000px'
                }}
              >
                {/* Inner glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                
                <div className="relative space-y-4 transform transition-transform duration-700 group-hover:translateZ-10">
                  {/* Discord Icon */}
                  <div className="flex justify-center transform transition-transform duration-700 group-hover:scale-110 group-hover:rotate-12">
                    <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl shadow-lg">
                      <DiscordIcon />
                    </div>
                  </div>
                  
                  {/* Server Info */}
                  <div className="space-y-2">
                    <p className="text-white font-bold text-xl tracking-wide">
                      Join Our Server
                    </p>
                    <div className="flex items-center justify-center gap-2 text-white/90">
                      <svg 
                        className="w-5 h-5" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                        />
                      </svg>
                      <span className="font-semibold">@owomario</span>
                    </div>
                  </div>
                  
                  {/* Button */}
                  <Button 
                    className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-2 border-white/30 shadow-lg transition-all duration-300 group-hover:shadow-2xl"
                  >
                    <span className="flex items-center gap-2">
                      <span>Click to Join</span>
                      <svg 
                        className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M13 7l5 5m0 0l-5 5m5-5H6" 
                        />
                      </svg>
                    </span>
                  </Button>
                </div>
                
                {/* Decorative elements */}
                <div className="absolute -top-2 -right-2 w-24 h-24 bg-white/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="absolute -bottom-2 -left-2 w-32 h-32 bg-[#7289DA]/30 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              </div>
            </a>
          </div>
          
          {/* Additional Info */}
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            For support, bug reports, or any questions, join our Discord community!
          </p>
        </div>
      </div>
    </footer>
  );
};
