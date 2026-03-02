import { Shield, User, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "./ui/button";

export const Navbar = () => {
  const { user, loading } = useAuth();

  return (
    <nav className="fixed top-0 w-full z-50 glass-strong">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all group-hover:scale-105">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              VerifyHub
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            {!loading && (
              user ? (
                <Link to="/profile">
                  <Button variant="ghost" size="sm" className="gap-2 glass border-white/10 hover:bg-white/5">
                    <User className="w-4 h-4" />
                    Profile
                  </Button>
                </Link>
              ) : (
                <Link to="/auth">
                  <Button size="sm" className="gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                    <LogIn className="w-4 h-4" />
                    Login
                  </Button>
                </Link>
              )
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
