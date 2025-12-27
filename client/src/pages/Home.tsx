import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { 
  Send, 
  Loader2, 
  Globe, 
  FileSearch, 
  Scale,
  AlertTriangle,
  Shield,
  Sparkles,
  Download,
  User,
  LogIn,
  LogOut,
  Database,
  Trash2
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
    welcomeDesc: "اختر وضع العمل وابدأ محادثتك",
    login: "تسجيل الدخول",
    logout: "تسجيل الخروج",
    exportPdf: "تصدير PDF",
    loadSamples: "تحميل نماذج",
    clearChat: "مسح المحادثة",
    loginRequired: "يرجى تسجيل الدخول لحفظ المحادثات",
    exportSuccess: "تم تصدير التقرير بنجاح",
    samplesLoaded: "تم تحميل النماذج",
    sampleComplaints: "نماذج الشكاوى"
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
    welcomeDesc: "Select a mode and start your conversation",
    login: "Login",
    logout: "Logout",
    exportPdf: "Export PDF",
    loadSamples: "Load Samples",
    clearChat: "Clear Chat",
    loginRequired: "Please login to save conversations",
    exportSuccess: "Report exported successfully",
    samplesLoaded: "Samples loaded",
    sampleComplaints: "Sample Complaints"
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

// PDF Generation function (client-side)
function generatePDF(data: {
  userName: string;
  timestamp: string;
  feature: string;
  language: string;
  messages: Message[];
  title: string;
  subtitle: string;
}) {
  const { userName, timestamp, feature, language, messages, title, subtitle } = data;
  const isRTL = language === 'arabic';
  
  // Create printable HTML content
  const htmlContent = `
    <!DOCTYPE html>
    <html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${isRTL ? 'ar' : 'en'}">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
          font-family: 'Tajawal', Arial, sans-serif; 
          background: #1a1a1a; 
          color: #f5f5f5;
          padding: 40px;
          direction: ${isRTL ? 'rtl' : 'ltr'};
        }
        .header { 
          text-align: center; 
          border-bottom: 2px solid #c9a227; 
          padding-bottom: 20px; 
          margin-bottom: 30px;
        }
        .logo { color: #c9a227; font-size: 32px; font-weight: bold; }
        .subtitle { color: #888; font-size: 14px; margin-top: 5px; }
        .meta { 
          display: flex; 
          justify-content: space-between; 
          margin-bottom: 30px;
          padding: 15px;
          background: #252525;
          border-radius: 8px;
        }
        .meta-item { font-size: 12px; color: #888; }
        .meta-value { color: #c9a227; font-weight: bold; }
        .messages { margin-top: 20px; }
        .message { 
          margin-bottom: 15px; 
          padding: 15px; 
          border-radius: 8px;
        }
        .user { 
          background: #c9a227; 
          color: #1a1a1a;
          margin-${isRTL ? 'right' : 'left'}: 20%;
        }
        .assistant { 
          background: #252525; 
          border: 1px solid #333;
          margin-${isRTL ? 'left' : 'right'}: 20%;
        }
        .role { font-size: 11px; opacity: 0.7; margin-bottom: 8px; }
        .content { white-space: pre-wrap; line-height: 1.6; }
        .footer { 
          margin-top: 40px; 
          text-align: center; 
          font-size: 11px; 
          color: #666;
          border-top: 1px solid #333;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">رُزن | RUZN</div>
        <div class="subtitle">${subtitle}</div>
      </div>
      <div class="meta">
        <div class="meta-item">${isRTL ? 'المستخدم' : 'User'}: <span class="meta-value">${userName}</span></div>
        <div class="meta-item">${isRTL ? 'الوضع' : 'Mode'}: <span class="meta-value">${feature === 'complaints' ? (isRTL ? 'تصنيف الشكاوى' : 'Complaints Triage') : (isRTL ? 'الاستشارات القانونية' : 'Legal Intelligence')}</span></div>
        <div class="meta-item">${isRTL ? 'التاريخ' : 'Date'}: <span class="meta-value">${new Date(timestamp).toLocaleString(isRTL ? 'ar-OM' : 'en-US')}</span></div>
      </div>
      <div class="messages">
        ${messages.map(msg => `
          <div class="message ${msg.role}">
            <div class="role">${msg.role === 'user' ? (isRTL ? 'المستخدم' : 'User') : (isRTL ? 'رُزن' : 'Ruzn')}</div>
            <div class="content">${msg.content}</div>
          </div>
        `).join('')}
      </div>
      <div class="footer">
        ${isRTL ? 'تم إنشاء هذا التقرير بواسطة رُزن - مدعوم من أكيوتيريوم تكنولوجيز' : 'This report was generated by Ruzn - Powered by Acuterium Technologies'}
      </div>
    </body>
    </html>
  `;
  
  // Open print dialog
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

export default function Home() {
  const [language, setLanguage] = useState<Language>("arabic");
  const [feature, setFeature] = useState<Feature>("complaints");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showSamples, setShowSamples] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { user, isAuthenticated, logout } = useAuth();
  
  const isRTL = language === "arabic";
  const text = UI_TEXT[language];
  const presets = PRESET_QUERIES[feature][language];
  
  const chatMutation = trpc.chat.send.useMutation({
    onSuccess: (data) => {
      const responseContent = typeof data.response === 'string' ? data.response : String(data.response);
      setMessages(prev => [...prev, { role: "assistant", content: responseContent }]);
    }
  });
  
  const exportPdfMutation = trpc.chat.exportPdf.useMutation({
    onSuccess: (data) => {
      generatePDF(data);
      toast.success(text.exportSuccess);
    }
  });
  
  const saveConversationMutation = trpc.chat.saveConversation.useMutation();
  
  const { data: samples } = trpc.chat.getSamples.useQuery({ 
    language,
    category: undefined 
  });
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Auto-save conversation when it has content and user is authenticated
  useEffect(() => {
    if (isAuthenticated && messages.length >= 2) {
      saveConversationMutation.mutate({
        messages,
        feature,
        language
      });
    }
  }, [messages.length]);
  
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
  
  const handleExportPdf = () => {
    if (!isAuthenticated) {
      toast.error(text.loginRequired);
      return;
    }
    if (messages.length === 0) {
      toast.error(language === "arabic" ? "لا توجد محادثة للتصدير" : "No conversation to export");
      return;
    }
    exportPdfMutation.mutate({
      messages,
      feature,
      language
    });
  };
  
  const handleClearChat = () => {
    setMessages([]);
  };
  
  const handleLoadSample = (sampleText: string) => {
    setInput(sampleText);
    setShowSamples(false);
    toast.success(text.samplesLoaded);
  };
  
  const handleLogout = () => {
    logout();
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
            
            <div className="flex items-center gap-2">
              {/* User Auth Display */}
              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-primary flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {user?.name || 'OSAI Staff'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = getLoginUrl()}
                  className="gap-2 border-primary/30"
                >
                  <LogIn className="w-4 h-4" />
                  {text.login}
                </Button>
              )}
              
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
          
          {/* Action Buttons */}
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSamples(!showSamples)}
              className="gap-1 border-primary/20 text-xs"
            >
              <Database className="w-3 h-3" />
              {text.loadSamples}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              disabled={messages.length === 0 || exportPdfMutation.isPending}
              className="gap-1 border-primary/20 text-xs"
            >
              {exportPdfMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Download className="w-3 h-3" />
              )}
              {text.exportPdf}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearChat}
              disabled={messages.length === 0}
              className="gap-1 border-primary/20 text-xs"
            >
              <Trash2 className="w-3 h-3" />
              {text.clearChat}
            </Button>
          </div>
          
          {/* Sample Complaints Panel */}
          {showSamples && samples && samples.length > 0 && (
            <div className="mt-3 p-3 bg-card/80 rounded-lg border border-primary/20">
              <h3 className="text-sm font-semibold mb-2 text-primary">{text.sampleComplaints}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {samples.map((sample) => (
                  <Button
                    key={sample.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLoadSample(sample.text)}
                    className="justify-start text-start h-auto py-2 px-3 text-xs hover:bg-primary/10 border border-transparent hover:border-primary/30"
                  >
                    <span className="truncate">{sample.text}</span>
                    <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${
                      sample.expectedRiskScore >= 70 ? 'bg-red-500/20 text-red-400' :
                      sample.expectedRiskScore >= 40 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {sample.expectedRiskScore}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          )}
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
