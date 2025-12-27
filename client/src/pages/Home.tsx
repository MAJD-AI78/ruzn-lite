import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Streamdown } from "streamdown";
import { 
  Send, 
  Loader2, 
  Globe, 
  FileSearch, 
  Scale,
  AlertTriangle,
  Shield,
  Sparkles
} from "lucide-react";

type Language = "arabic" | "english";
type Feature = "complaints" | "legislative";
type MessageRole = "user" | "assistant";

interface Message {
  role: MessageRole;
  content: string;
}

const PRESET_QUERIES = {
  complaints: {
    arabic: [
      "تم اكتشاف مخالفات مالية في عقود الصيانة بالوزارة",
      "موظف يمنح عقودًا لشركة يملكها قريبه",
      "تأخر صرف مستحقات المقاولين لأكثر من سنة"
    ],
    english: [
      "Financial irregularities discovered in ministry maintenance contracts",
      "Employee awarding contracts to a company owned by his relative",
      "Contractor payments delayed for over a year"
    ]
  },
  legislative: {
    arabic: [
      "ما هي صلاحيات ديوان الرقابة المالية؟",
      "ما هي إجراءات قانون المناقصات الجديد؟",
      "كيف يتم التعامل مع تضارب المصالح؟"
    ],
    english: [
      "What are the powers of the State Audit Institution?",
      "What are the procedures of the new Tender Law?",
      "How is conflict of interest handled?"
    ]
  }
};

const UI_TEXT = {
  arabic: {
    title: "رُزن",
    subtitle: "مساعدك الذكي لديوان الرقابة المالية والإدارية للدولة",
    complaints: "تصنيف الشكاوى",
    legislative: "الاستشارات القانونية",
    placeholder: "اكتب شكواك أو استفسارك هنا...",
    send: "إرسال",
    poweredBy: "مدعوم من أكيوتيريوم تكنولوجيز",
    presetTitle: "استفسارات سريعة",
    welcome: "مرحباً بك في رُزن",
    welcomeDesc: "اختر وضع العمل وابدأ محادثتك"
  },
  english: {
    title: "Ruzn",
    subtitle: "Your Intelligent Assistant for the State Audit Institution",
    complaints: "Complaints Triage",
    legislative: "Legal Intelligence",
    placeholder: "Type your complaint or inquiry here...",
    send: "Send",
    poweredBy: "Powered by Acuterium Technologies",
    presetTitle: "Quick Queries",
    welcome: "Welcome to Ruzn",
    welcomeDesc: "Select a mode and start your conversation"
  }
};

function getRiskBadge(content: string, language: Language) {
  const riskMatch = content.match(/(\d+)\/100/);
  if (!riskMatch) return null;
  
  const score = parseInt(riskMatch[1]);
  let color = "bg-green-500/20 text-green-400 border-green-500/30";
  let label = language === "arabic" ? "منخفض" : "Low";
  let Icon = Shield;
  
  if (score >= 70) {
    color = "bg-red-500/20 text-red-400 border-red-500/30";
    label = language === "arabic" ? "عالي" : "High";
    Icon = AlertTriangle;
  } else if (score >= 40) {
    color = "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    label = language === "arabic" ? "متوسط" : "Medium";
    Icon = AlertTriangle;
  }
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${color}`}>
      <Icon className="w-3 h-3" />
      {label}: {score}/100
    </span>
  );
}

export default function Home() {
  const [language, setLanguage] = useState<Language>("arabic");
  const [feature, setFeature] = useState<Feature>("complaints");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const isRTL = language === "arabic";
  const text = UI_TEXT[language];
  const presets = PRESET_QUERIES[feature][language];
  
  const chatMutation = trpc.chat.send.useMutation({
    onSuccess: (data) => {
      const responseContent = typeof data.response === 'string' ? data.response : String(data.response);
      setMessages(prev => [...prev, { role: "assistant", content: responseContent }]);
    }
  });
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const handleSend = async () => {
    if (!input.trim() || chatMutation.isPending) return;
    
    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    
    chatMutation.mutate({
      message: userMessage,
      language,
      feature,
      history: messages
    });
  };
  
  const handlePreset = (query: string) => {
    setInput(query);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  const toggleLanguage = () => {
    setLanguage(prev => prev === "arabic" ? "english" : "arabic");
  };
  
  return (
    <div 
      className="min-h-screen flex flex-col bg-background"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="/ruzn-logo.png" 
                alt="Ruzn Logo" 
                className="h-12 w-12 object-contain"
              />
              <div>
                <h1 className="text-2xl font-bold text-gold-gradient">
                  {text.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {text.subtitle}
                </p>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLanguage}
              className="gap-2 border-primary/30 hover:border-primary"
            >
              <Globe className="w-4 h-4" />
              {language === "arabic" ? "English" : "العربية"}
            </Button>
          </div>
          
          {/* Feature Toggle */}
          <div className="flex gap-2 mt-4">
            <Button
              variant={feature === "complaints" ? "default" : "outline"}
              onClick={() => setFeature("complaints")}
              className={`gap-2 flex-1 ${feature === "complaints" ? "glow-gold" : "border-primary/30"}`}
            >
              <FileSearch className="w-4 h-4" />
              {text.complaints}
            </Button>
            <Button
              variant={feature === "legislative" ? "default" : "outline"}
              onClick={() => setFeature("legislative")}
              className={`gap-2 flex-1 ${feature === "legislative" ? "glow-gold" : "border-primary/30"}`}
            >
              <Scale className="w-4 h-4" />
              {text.legislative}
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main Chat Area */}
      <main className="flex-1 container max-w-5xl mx-auto px-4 py-6 flex flex-col">
        {/* Messages */}
        <div className="flex-1 space-y-4 mb-4 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-24 h-24 mb-6 rounded-full bg-primary/10 flex items-center justify-center glow-gold">
                <Sparkles className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">{text.welcome}</h2>
              <p className="text-muted-foreground mb-8">{text.welcomeDesc}</p>
              
              {/* Preset Queries */}
              <div className="w-full max-w-md">
                <p className="text-sm text-muted-foreground mb-3">{text.presetTitle}</p>
                <div className="space-y-2">
                  {presets.map((query, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      className="w-full justify-start text-start h-auto py-3 px-4 border-primary/20 hover:border-primary/50 hover:bg-primary/5"
                      onClick={() => handlePreset(query)}
                    >
                      {query}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <Card
                  className={`max-w-[85%] p-4 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border-primary/20"
                  }`}
                >
                  {msg.role === "assistant" && feature === "complaints" && (
                    <div className="mb-2">
                      {getRiskBadge(msg.content, language)}
                    </div>
                  )}
                  <div className="prose prose-invert prose-sm max-w-none">
                    <Streamdown>{msg.content}</Streamdown>
                  </div>
                </Card>
              </div>
            ))
          )}
          
          {chatMutation.isPending && (
            <div className="flex justify-start">
              <Card className="bg-card border-primary/20 p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{language === "arabic" ? "جاري التحليل..." : "Analyzing..."}</span>
                </div>
              </Card>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input Area */}
        <div className="sticky bottom-0 bg-background pt-4 border-t border-border/50">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={text.placeholder}
              className="min-h-[60px] max-h-[120px] resize-none bg-card border-primary/20 focus:border-primary"
              dir={isRTL ? "rtl" : "ltr"}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || chatMutation.isPending}
              className="h-auto px-6 glow-gold"
            >
              {chatMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className={`w-5 h-5 ${isRTL ? "rotate-180" : ""}`} />
              )}
            </Button>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-border/50 py-4">
        <div className="container max-w-5xl mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            {text.poweredBy}
          </p>
        </div>
      </footer>
    </div>
  );
}
