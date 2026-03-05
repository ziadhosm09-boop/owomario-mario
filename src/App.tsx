import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n/config";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Index from "./pages/Index";
import EmailCodes from "./pages/EmailCodes";
import TwoFAGenerator from "./pages/TwoFAGenerator";
import PhoneVerification from "./pages/PhoneVerification";
import DiscordTools from "./pages/DiscordTools";
import ApiServices from "./pages/ApiServices";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import P2P from "./pages/P2P";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nextProvider i18n={i18n}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/email" element={<ProtectedRoute><EmailCodes /></ProtectedRoute>} />
            <Route path="/2fa" element={<ProtectedRoute><TwoFAGenerator /></ProtectedRoute>} />
            <Route path="/phone" element={<ProtectedRoute><PhoneVerification /></ProtectedRoute>} />
            <Route path="/discord-tools" element={<ProtectedRoute><DiscordTools /></ProtectedRoute>} />
            <Route path="/api" element={<ProtectedRoute><ApiServices /></ProtectedRoute>} />
            <Route path="/p2p" element={<ProtectedRoute><P2P /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </I18nextProvider>
  </QueryClientProvider>
);

export default App;
