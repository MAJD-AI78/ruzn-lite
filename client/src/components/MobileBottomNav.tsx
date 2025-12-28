import { Link, useLocation } from "wouter";
import {
  ClipboardList,
  Map,
  TrendingUp,
  Scale,
  FileText,
  BarChart3,
  Settings,
  MessageSquare,
  Home
} from "lucide-react";

interface MobileBottomNavProps {
  language: "arabic" | "english";
  isAdmin?: boolean;
}

const NAV_ITEMS = {
  arabic: {
    home: "الرئيسية",
    operations: "العمليات",
    analytics: "التحليلات",
    caseLaw: "السوابق",
    more: "المزيد"
  },
  english: {
    home: "Home",
    operations: "Operations",
    analytics: "Analytics",
    caseLaw: "Case Law",
    more: "More"
  }
};

export default function MobileBottomNav({ language, isAdmin }: MobileBottomNavProps) {
  const [location] = useLocation();
  const text = NAV_ITEMS[language];
  
  // Haptic feedback helper
  const triggerHaptic = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10); // Short 10ms vibration
    }
  };
  
  const navItems = [
    { href: "/", icon: Home, label: text.home },
    { href: "/operations", icon: ClipboardList, label: text.operations },
    { href: "/analytics", icon: BarChart3, label: text.analytics },
    { href: "/case-law", icon: Scale, label: text.caseLaw },
  ];
  
  // Add admin link if user is admin
  if (isAdmin) {
    navItems.push({ href: "/admin", icon: Settings, label: language === 'arabic' ? 'المشرف' : 'Admin' });
  }
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-black/90 backdrop-blur-lg border-t border-white/10 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location === item.href || 
            (item.href !== "/" && location.startsWith(item.href));
          const Icon = item.icon;
          
          return (
            <Link key={item.href} href={item.href}>
              <button
                onClick={triggerHaptic}
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all ${
                  isActive 
                    ? "text-primary bg-primary/10" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                <span className={`text-[10px] font-medium ${isActive ? "text-primary" : ""}`}>
                  {item.label}
                </span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
