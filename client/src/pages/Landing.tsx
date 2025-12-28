import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Shield,
  Brain,
  FileSearch,
  Scale,
  Lock,
  ArrowRight,
  Globe,
  Sparkles,
  CheckCircle,
  Mail,
  Building2,
  Users
} from "lucide-react";

type Language = "arabic" | "english";

const UI_TEXT = {
  arabic: {
    title: "رُزن",
    tagline: "الذكاء الاصطناعي للحوكمة والامتثال",
    subtitle: "منصة ذكية لتحليل البلاغات والاستشارات القانونية",
    description: "نظام متقدم يعتمد على الذكاء الاصطناعي لمساعدة المؤسسات الحكومية والخاصة في إدارة الشكاوى وتحليل المخاطر والامتثال التنظيمي.",
    features: {
      complaints: {
        title: "تحليل البلاغات",
        desc: "تصنيف وتحليل الشكاوى تلقائياً مع تقييم درجة الخطورة"
      },
      legal: {
        title: "الاستشارات القانونية",
        desc: "مساعد ذكي للاستفسارات القانونية والتنظيمية"
      },
      analytics: {
        title: "لوحة التحليلات",
        desc: "تقارير شاملة ورؤى تحليلية لاتخاذ القرارات"
      },
      security: {
        title: "أمان البيانات",
        desc: "حماية متقدمة للبيانات مع التشفير الكامل"
      }
    },
    accessSection: {
      title: "الوصول للمنصة",
      subtitle: "أدخل رمز الوصول للدخول إلى النظام",
      placeholder: "رمز الوصول",
      button: "دخول",
      error: "رمز الوصول غير صحيح",
      success: "تم التحقق بنجاح"
    },
    contact: {
      title: "تواصل معنا",
      subtitle: "للاستفسارات والعروض التوضيحية",
      email: "info@ruzn.ai",
      cta: "طلب عرض توضيحي"
    },
    footer: {
      poweredBy: "مدعوم من أكيوتيريوم تكنولوجيز",
      rights: "جميع الحقوق محفوظة"
    },
    clients: "عملاؤنا المحتملون",
    clientTypes: ["الجهات الحكومية", "المؤسسات المالية", "الشركات الكبرى"]
  },
  english: {
    title: "Ruzn",
    tagline: "AI for Governance & Compliance",
    subtitle: "Intelligent Platform for Complaint Analysis & Legal Advisory",
    description: "An advanced AI-powered system helping government and private organizations manage complaints, analyze risks, and ensure regulatory compliance.",
    features: {
      complaints: {
        title: "Complaint Analysis",
        desc: "Automatic classification and analysis with risk scoring"
      },
      legal: {
        title: "Legal Advisory",
        desc: "AI assistant for legal and regulatory inquiries"
      },
      analytics: {
        title: "Analytics Dashboard",
        desc: "Comprehensive reports and insights for decision-making"
      },
      security: {
        title: "Data Security",
        desc: "Advanced data protection with full encryption"
      }
    },
    accessSection: {
      title: "Platform Access",
      subtitle: "Enter your access code to enter the system",
      placeholder: "Access Code",
      button: "Enter",
      error: "Invalid access code",
      success: "Verification successful"
    },
    contact: {
      title: "Contact Us",
      subtitle: "For inquiries and demo requests",
      email: "info@ruzn.ai",
      cta: "Request Demo"
    },
    footer: {
      poweredBy: "Powered by Acuterium Technologies",
      rights: "All Rights Reserved"
    },
    clients: "Potential Clients",
    clientTypes: ["Government Entities", "Financial Institutions", "Large Corporations"]
  }
};

interface LandingProps {
  onAccessGranted: () => void;
}

export default function Landing({ onAccessGranted }: LandingProps) {
  const [language, setLanguage] = useState<Language>("arabic");
  const [accessCode, setAccessCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  
  const isRTL = language === "arabic";
  const text = UI_TEXT[language];
  
  // Access code from environment or hardcoded for demo
  const VALID_ACCESS_CODE = "RUZN2024";
  
  const handleAccessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    
    setTimeout(() => {
      if (accessCode.toUpperCase() === VALID_ACCESS_CODE) {
        toast.success(text.accessSection.success);
        // Store access in session
        sessionStorage.setItem("ruzn_access", "granted");
        onAccessGranted();
      } else {
        toast.error(text.accessSection.error);
      }
      setIsVerifying(false);
    }, 500);
  };
  
  return (
    <div 
      className="min-h-screen text-foreground"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/30">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="/ruzn-logo.png" 
                alt="Ruzn Logo" 
                className="h-10 w-10 object-contain"
              />
              <span className="text-2xl font-bold text-gold-gradient">{text.title}</span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLanguage(language === "arabic" ? "english" : "arabic")}
              className="gap-2 border-primary/30"
            >
              <Globe className="w-4 h-4" />
              {language === "arabic" ? "English" : "العربية"}
            </Button>
          </div>
        </div>
      </header>
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary">{text.tagline}</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-gold-gradient">
            {text.title}
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-4">
            {text.subtitle}
          </p>
          
          <p className="text-base text-muted-foreground/80 max-w-2xl mx-auto mb-12">
            {text.description}
          </p>
          
          {/* Access Code Form */}
          <Card className="max-w-md mx-auto p-6 bg-card/50 border-primary/20">
            <div className="flex items-center gap-2 mb-4 justify-center">
              <Lock className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">{text.accessSection.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {text.accessSection.subtitle}
            </p>
            <form onSubmit={handleAccessSubmit} className="flex gap-2">
              <Input
                type="password"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder={text.accessSection.placeholder}
                className="flex-1 bg-background/50 border-primary/20"
              />
              <Button 
                type="submit" 
                disabled={isVerifying || !accessCode}
                className="gap-2"
              >
                {text.accessSection.button}
                <ArrowRight className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
              </Button>
            </form>
          </Card>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/10">
        <div className="container max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<FileSearch className="w-8 h-8" />}
              title={text.features.complaints.title}
              description={text.features.complaints.desc}
            />
            <FeatureCard
              icon={<Scale className="w-8 h-8" />}
              title={text.features.legal.title}
              description={text.features.legal.desc}
            />
            <FeatureCard
              icon={<Brain className="w-8 h-8" />}
              title={text.features.analytics.title}
              description={text.features.analytics.desc}
            />
            <FeatureCard
              icon={<Shield className="w-8 h-8" />}
              title={text.features.security.title}
              description={text.features.security.desc}
            />
          </div>
        </div>
      </section>
      
      {/* Clients Section */}
      <section className="py-20 px-4">
        <div className="container max-w-6xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-8 text-primary">{text.clients}</h2>
          <div className="flex flex-wrap justify-center gap-8">
            {text.clientTypes.map((client, index) => (
              <div key={index} className="flex items-center gap-3 px-6 py-3 rounded-xl bg-muted/20 border border-border/30">
                {index === 0 && <Building2 className="w-5 h-5 text-primary" />}
                {index === 1 && <Scale className="w-5 h-5 text-primary" />}
                {index === 2 && <Users className="w-5 h-5 text-primary" />}
                <span className="text-muted-foreground">{client}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Contact Section */}
      <section className="py-20 px-4 bg-muted/10">
        <div className="container max-w-6xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">{text.contact.title}</h2>
          <p className="text-muted-foreground mb-6">{text.contact.subtitle}</p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a 
              href={`mailto:${text.contact.email}`}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
            >
              <Mail className="w-5 h-5 text-primary" />
              <span>{text.contact.email}</span>
            </a>
            
            <Button className="gap-2">
              <CheckCircle className="w-4 h-4" />
              {text.contact.cta}
            </Button>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border/30">
        <div className="container max-w-6xl mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            {text.footer.poweredBy} • © 2024 {text.footer.rights}
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="p-6 bg-card/30 border-border/30 hover:border-primary/30 transition-colors">
      <div className="text-primary mb-4">{icon}</div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Card>
  );
}
