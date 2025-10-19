import { Shield, Mail, Key, Smartphone } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";

export const Navbar = () => {
  const location = useLocation();
  const { t } = useTranslation();
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="p-2 rounded-lg bg-gradient-primary shadow-glow">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              VerifyHub
            </span>
          </Link>
          
          <div className="hidden md:flex items-center gap-6">
            <Link 
              to="/" 
              className={`flex items-center gap-2 transition-colors ${
                isActive('/') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('nav.home')}
            </Link>
            <Link 
              to="/email" 
              className={`flex items-center gap-2 transition-colors ${
                isActive('/email') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Mail className="w-4 h-4" />
              {t('nav.emailCodes')}
            </Link>
            <Link 
              to="/2fa" 
              className={`flex items-center gap-2 transition-colors ${
                isActive('/2fa') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Key className="w-4 h-4" />
              {t('nav.twoFAGenerator')}
            </Link>
            <Link 
              to="/phone" 
              className={`flex items-center gap-2 transition-colors ${
                isActive('/phone') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              {t('nav.phoneVerification')}
            </Link>
          </div>
          
          <LanguageSwitcher />
        </div>
      </div>
    </nav>
  );
};
