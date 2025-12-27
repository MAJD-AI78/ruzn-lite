import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Streamdown } from "streamdown";
import {
  Users,
  MessageSquare,
  ArrowLeft,
  Download,
  Loader2,
  Shield,
  Search,
  Clock,
  Eye,
  AlertTriangle,
  X,
  FileText
} from "lucide-react";

type Language = "arabic" | "english";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: number;
  userId: number;
  userName?: string;
  feature: string;
  category?: string | null;
  riskScore?: number | null;
  createdAt: string;
  messageCount?: number;
  messages?: Message[];
}

const UI_TEXT = {
  arabic: {
    title: "لوحة المشرف",
    subtitle: "إدارة المحادثات والمستخدمين",
    backToChat: "العودة للمحادثة",
    conversations: "المحادثات",
    users: "المستخدمون",
    exportAll: "تصدير الكل",
    search: "بحث...",
    filterByCategory: "تصفية حسب التصنيف",
    filterByRisk: "تصفية حسب الخطورة",
    noConversations: "لا توجد محادثات",
    noUsers: "لا يوجد مستخدمون",
    viewDetails: "عرض التفاصيل",
    totalConversations: "إجمالي المحادثات",
    totalUsers: "إجمالي المستخدمين",
    highRiskAlerts: "تنبيهات عالية الخطورة",
    recentActivity: "النشاط الأخير",
    unauthorized: "غير مصرح",
    adminOnly: "هذه الصفحة للمشرفين فقط",
    conversationDetails: "تفاصيل المحادثة",
    user: "المستخدم",
    assistant: "رُزن",
    close: "إغلاق",
    exportPdf: "تصدير PDF",
    riskScore: "درجة الخطورة",
    category: "التصنيف",
    date: "التاريخ",
    messages: "الرسائل",
    categories: {
      financial_corruption: "فساد مالي",
      conflict_of_interest: "تضارب المصالح",
      abuse_of_power: "إساءة استخدام السلطة",
      tender_violation: "مخالفة قانون المناقصات",
      administrative_negligence: "إهمال إداري",
      general: "شكوى عامة"
    }
  },
  english: {
    title: "Admin Panel",
    subtitle: "Manage Conversations and Users",
    backToChat: "Back to Chat",
    conversations: "Conversations",
    users: "Users",
    exportAll: "Export All",
    search: "Search...",
    filterByCategory: "Filter by Category",
    filterByRisk: "Filter by Risk",
    noConversations: "No conversations",
    noUsers: "No users",
    viewDetails: "View Details",
    totalConversations: "Total Conversations",
    totalUsers: "Total Users",
    highRiskAlerts: "High Risk Alerts",
    recentActivity: "Recent Activity",
    unauthorized: "Unauthorized",
    adminOnly: "This page is for administrators only",
    conversationDetails: "Conversation Details",
    user: "User",
    assistant: "Ruzn",
    close: "Close",
    exportPdf: "Export PDF",
    riskScore: "Risk Score",
    category: "Category",
    date: "Date",
    messages: "Messages",
    categories: {
      financial_corruption: "Financial Corruption",
      conflict_of_interest: "Conflict of Interest",
      abuse_of_power: "Abuse of Power",
      tender_violation: "Tender Violation",
      administrative_negligence: "Administrative Negligence",
      general: "General Complaint"
    }
  }
};

export default function Admin() {
  const [language, setLanguage] = useState<Language>("arabic");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState<"conversations" | "users">("conversations");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { user, isAuthenticated } = useAuth();
  const isRTL = language === "arabic";
  const text = UI_TEXT[language];
  
  const { data: conversationsData, isLoading: loadingConversations } = trpc.admin.getAllConversations.useQuery({ limit: 100 });
  const { data: usersData, isLoading: loadingUsers } = trpc.admin.getAllUsers.useQuery();
  
  // Mock data for demo with full messages
  const mockConversations: Conversation[] = [
    { 
      id: 1, 
      userId: 1, 
      userName: "أحمد محمد", 
      feature: "complaints", 
      category: "financial_corruption", 
      riskScore: 85, 
      createdAt: new Date().toISOString(), 
      messageCount: 4,
      messages: [
        { role: "user", content: "تم اكتشاف مخالفات مالية في عقود الصيانة بالوزارة، حيث تم صرف مبالغ لشركات وهمية لا وجود لها على أرض الواقع." },
        { role: "assistant", content: "**تحليل الشكوى**\n\n**التصنيف:** فساد مالي\n**درجة الخطورة:** 85/100 (عالية)\n\n**الكلمات المفتاحية:**\n- مخالفات مالية\n- عقود صيانة\n- شركات وهمية\n\n**التوصية الأولية:**\nيجب إحالة هذه الشكوى فوراً إلى فريق التحقيق المالي نظراً لخطورة الادعاءات المتعلقة بالشركات الوهمية." },
        { role: "user", content: "هل يمكنكم توضيح الإجراءات القانونية المتبعة؟" },
        { role: "assistant", content: "**الإجراءات القانونية:**\n\n1. **المرحلة الأولى:** فتح ملف تحقيق رسمي\n2. **المرحلة الثانية:** جمع الأدلة والمستندات\n3. **المرحلة الثالثة:** استجواب الأطراف المعنية\n4. **المرحلة الرابعة:** إعداد تقرير التحقيق\n5. **المرحلة الخامسة:** إحالة للجهات المختصة إذا ثبتت المخالفة\n\nوفقاً للمرسوم السلطاني رقم 35/2003 بشأن قانون الرقابة المالية والإدارية للدولة." }
      ]
    },
    { 
      id: 2, 
      userId: 2, 
      userName: "فاطمة علي", 
      feature: "complaints", 
      category: "tender_violation", 
      riskScore: 62, 
      createdAt: new Date(Date.now() - 86400000).toISOString(), 
      messageCount: 6,
      messages: [
        { role: "user", content: "لاحظت أن إحدى المناقصات تم ترسيتها على شركة لم تستوفِ الشروط الفنية المطلوبة." },
        { role: "assistant", content: "**تحليل الشكوى**\n\n**التصنيف:** مخالفة قانون المناقصات\n**درجة الخطورة:** 62/100 (متوسطة)\n\n**الكلمات المفتاحية:**\n- مناقصة\n- ترسية\n- شروط فنية\n\n**التوصية الأولية:**\nيتطلب الأمر مراجعة ملف المناقصة والتحقق من استيفاء الشروط الفنية." }
      ]
    },
    { 
      id: 3, 
      userId: 3, 
      userName: "سالم الحارثي", 
      feature: "legislative", 
      category: null, 
      riskScore: null, 
      createdAt: new Date(Date.now() - 172800000).toISOString(), 
      messageCount: 3,
      messages: [
        { role: "user", content: "ما هي صلاحيات ديوان الرقابة المالية والإدارية للدولة؟" },
        { role: "assistant", content: "**صلاحيات ديوان الرقابة المالية والإدارية للدولة**\n\nوفقاً للمرسوم السلطاني رقم 35/2003:\n\n1. **الرقابة المالية:** مراجعة الحسابات والتأكد من سلامة الإجراءات المالية\n2. **الرقابة الإدارية:** التحقق من كفاءة الأداء الإداري\n3. **التحقيق في الشكاوى:** استقبال ومعالجة شكاوى المواطنين\n4. **إعداد التقارير:** رفع تقارير دورية لجلالة السلطان\n5. **المتابعة:** متابعة تنفيذ التوصيات" }
      ]
    },
    { 
      id: 4, 
      userId: 1, 
      userName: "أحمد محمد", 
      feature: "complaints", 
      category: "administrative_negligence", 
      riskScore: 45, 
      createdAt: new Date(Date.now() - 259200000).toISOString(), 
      messageCount: 5,
      messages: [
        { role: "user", content: "تأخر صرف مستحقات المقاولين لأكثر من سنة دون مبرر واضح." },
        { role: "assistant", content: "**تحليل الشكوى**\n\n**التصنيف:** إهمال إداري\n**درجة الخطورة:** 45/100 (متوسطة)\n\n**الكلمات المفتاحية:**\n- تأخر صرف\n- مستحقات\n- مقاولين\n\n**التوصية الأولية:**\nيجب مراجعة إجراءات الصرف والتحقق من أسباب التأخير." }
      ]
    },
    { 
      id: 5, 
      userId: 4, 
      userName: "مريم الراشدي", 
      feature: "complaints", 
      category: "conflict_of_interest", 
      riskScore: 78, 
      createdAt: new Date(Date.now() - 345600000).toISOString(), 
      messageCount: 8,
      messages: [
        { role: "user", content: "موظف في قسم المشتريات يمنح عقودًا لشركة يملكها قريبه من الدرجة الأولى." },
        { role: "assistant", content: "**تحليل الشكوى**\n\n**التصنيف:** تضارب المصالح\n**درجة الخطورة:** 78/100 (عالية)\n\n**الكلمات المفتاحية:**\n- موظف مشتريات\n- عقود\n- قريب\n- تضارب مصالح\n\n**التوصية الأولية:**\nحالة واضحة لتضارب المصالح تستوجب تحقيقاً فورياً وفقاً لقانون الخدمة المدنية." }
      ]
    },
  ];
  
  const mockUsers = [
    { id: 1, name: "أحمد محمد", email: "ahmed@osai.gov.om", role: "user", lastSignedIn: new Date().toISOString(), conversationCount: 12 },
    { id: 2, name: "فاطمة علي", email: "fatima@osai.gov.om", role: "user", lastSignedIn: new Date().toISOString(), conversationCount: 8 },
    { id: 3, name: "سالم الحارثي", email: "salem@osai.gov.om", role: "admin", lastSignedIn: new Date().toISOString(), conversationCount: 5 },
    { id: 4, name: "مريم الراشدي", email: "maryam@osai.gov.om", role: "user", lastSignedIn: new Date().toISOString(), conversationCount: 15 },
  ];
  
  const conversations = conversationsData?.conversations || mockConversations;
  const users = usersData?.users || mockUsers;
  
  const filteredConversations = conversations.filter((c: any) => 
    c.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredUsers = users.filter((u: any) =>
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const highRiskCount = conversations.filter((c: any) => c.riskScore && c.riskScore >= 70).length;
  
  const handleViewConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setIsModalOpen(true);
  };
  
  const handleExportConversationPdf = (conv: Conversation) => {
    if (!conv.messages) return;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${isRTL ? 'ar' : 'en'}">
      <head>
        <meta charset="UTF-8">
        <title>${text.conversationDetails} - ${conv.userName}</title>
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
          .meta { 
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
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
          .risk-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
            ${conv.riskScore && conv.riskScore >= 70 ? 'background: #ef4444; color: white;' : 
              conv.riskScore && conv.riskScore >= 40 ? 'background: #eab308; color: #1a1a1a;' : 
              'background: #22c55e; color: white;'}
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">رُزن | RUZN</div>
          <div style="color: #888; margin-top: 5px;">${text.conversationDetails}</div>
        </div>
        <div class="meta">
          <div class="meta-item">${text.user}: <span class="meta-value">${conv.userName}</span></div>
          <div class="meta-item">${text.date}: <span class="meta-value">${new Date(conv.createdAt).toLocaleString(isRTL ? 'ar-OM' : 'en-US')}</span></div>
          ${conv.category ? `<div class="meta-item">${text.category}: <span class="meta-value">${text.categories[conv.category as keyof typeof text.categories] || conv.category}</span></div>` : ''}
          ${conv.riskScore ? `<div class="meta-item">${text.riskScore}: <span class="risk-badge">${conv.riskScore}/100</span></div>` : ''}
        </div>
        <div class="messages">
          ${conv.messages.map(msg => `
            <div class="message ${msg.role}">
              <div class="role">${msg.role === 'user' ? text.user : text.assistant}</div>
              <div class="content">${msg.content}</div>
            </div>
          `).join('')}
        </div>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center" dir={isRTL ? "rtl" : "ltr"}>
        <Card className="p-8 bg-card border-primary/20 text-center max-w-md">
          <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">{text.unauthorized}</h2>
          <p className="text-muted-foreground mb-4">{text.adminOnly}</p>
          <Link href="/">
            <Button className="glow-gold">{text.backToChat}</Button>
          </Link>
        </Card>
      </div>
    );
  }
  
  return (
    <div 
      className="min-h-screen bg-background text-foreground flex flex-col"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
                  {text.backToChat}
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-primary">{text.title}</h1>
                <p className="text-sm text-muted-foreground">{text.subtitle}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLanguage(language === "arabic" ? "english" : "arabic")}
                className="border-primary/30"
              >
                {language === "arabic" ? "EN" : "عربي"}
              </Button>
              <Button variant="outline" size="sm" className="gap-2 border-primary/30">
                <Download className="w-4 h-4" />
                {text.exportAll}
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-1 container max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-6 bg-card border-primary/20">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{text.totalConversations}</p>
                <p className="text-3xl font-bold text-primary">{conversations.length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6 bg-card border-primary/20">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <Users className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{text.totalUsers}</p>
                <p className="text-3xl font-bold text-green-500">{users.length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6 bg-card border-primary/20">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-red-500/10">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{text.highRiskAlerts}</p>
                <p className="text-3xl font-bold text-red-500">{highRiskCount}</p>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={selectedTab === "conversations" ? "default" : "outline"}
            onClick={() => setSelectedTab("conversations")}
            className={selectedTab === "conversations" ? "glow-gold" : "border-primary/30"}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            {text.conversations}
          </Button>
          <Button
            variant={selectedTab === "users" ? "default" : "outline"}
            onClick={() => setSelectedTab("users")}
            className={selectedTab === "users" ? "glow-gold" : "border-primary/30"}
          >
            <Users className="w-4 h-4 mr-2" />
            {text.users}
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative mb-6">
          <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isRTL ? "right-3" : "left-3"}`} />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={text.search}
            className={`bg-card border-primary/20 ${isRTL ? "pr-10" : "pl-10"}`}
            dir={isRTL ? "rtl" : "ltr"}
          />
        </div>
        
        {/* Content */}
        {selectedTab === "conversations" ? (
          <div className="space-y-4">
            {loadingConversations ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <Card className="p-8 bg-card border-primary/20 text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{text.noConversations}</p>
              </Card>
            ) : (
              filteredConversations.map((conv: any) => (
                <Card 
                  key={conv.id} 
                  className="p-4 bg-card border-primary/20 hover:border-primary/40 transition-colors cursor-pointer"
                  onClick={() => handleViewConversation(conv)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{conv.userName || `User #${conv.userId}`}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{conv.feature === "complaints" ? (language === "arabic" ? "شكوى" : "Complaint") : (language === "arabic" ? "استشارة قانونية" : "Legal Query")}</span>
                          {conv.category && (
                            <>
                              <span>•</span>
                              <span>{text.categories[conv.category as keyof typeof text.categories] || conv.category}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {conv.riskScore !== null && conv.riskScore !== undefined && (
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          conv.riskScore >= 70 ? "bg-red-500/20 text-red-400" :
                          conv.riskScore >= 40 ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-green-500/20 text-green-400"
                        }`}>
                          {conv.riskScore}/100
                        </span>
                      )}
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(conv.createdAt).toLocaleDateString(language === "arabic" ? "ar-OM" : "en-US")}
                      </div>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleViewConversation(conv); }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {loadingUsers ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <Card className="p-8 bg-card border-primary/20 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{text.noUsers}</p>
              </Card>
            ) : (
              filteredUsers.map((u: any) => (
                <Card key={u.id} className="p-4 bg-card border-primary/20 hover:border-primary/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{u.name || `User #${u.id}`}</p>
                        <p className="text-sm text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        u.role === "admin" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                      }`}>
                        {u.role === "admin" ? (language === "arabic" ? "مشرف" : "Admin") : (language === "arabic" ? "مستخدم" : "User")}
                      </span>
                      <div className="text-sm text-muted-foreground">
                        {u.conversationCount || 0} {language === "arabic" ? "محادثة" : "conversations"}
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </main>
      
      {/* Conversation Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden bg-card border-primary/20" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader className="border-b border-border/50 pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold text-primary">
                {text.conversationDetails}
              </DialogTitle>
              <div className="flex items-center gap-2">
                {selectedConversation && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportConversationPdf(selectedConversation)}
                    className="gap-2 border-primary/30"
                  >
                    <FileText className="w-4 h-4" />
                    {text.exportPdf}
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>
          
          {selectedConversation && (
            <div className="overflow-y-auto max-h-[60vh] pr-2">
              {/* Meta Info */}
              <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-background/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">{text.user}</p>
                  <p className="font-semibold text-primary">{selectedConversation.userName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{text.date}</p>
                  <p className="font-semibold">{new Date(selectedConversation.createdAt).toLocaleString(isRTL ? 'ar-OM' : 'en-US')}</p>
                </div>
                {selectedConversation.category && (
                  <div>
                    <p className="text-sm text-muted-foreground">{text.category}</p>
                    <p className="font-semibold">{text.categories[selectedConversation.category as keyof typeof text.categories]}</p>
                  </div>
                )}
                {selectedConversation.riskScore !== null && selectedConversation.riskScore !== undefined && (
                  <div>
                    <p className="text-sm text-muted-foreground">{text.riskScore}</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      selectedConversation.riskScore >= 70 ? "bg-red-500/20 text-red-400" :
                      selectedConversation.riskScore >= 40 ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-green-500/20 text-green-400"
                    }`}>
                      {selectedConversation.riskScore}/100
                    </span>
                  </div>
                )}
              </div>
              
              {/* Messages */}
              <div className="space-y-4">
                <h3 className="font-semibold text-muted-foreground">{text.messages}</h3>
                {selectedConversation.messages?.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground ml-8"
                        : "bg-background border border-primary/20 mr-8"
                    }`}
                  >
                    <p className="text-xs opacity-70 mb-2">
                      {msg.role === "user" ? text.user : text.assistant}
                    </p>
                    <div className="prose prose-invert prose-sm max-w-none">
                      <Streamdown>{msg.content}</Streamdown>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Footer */}
      <footer className="border-t border-border/50 py-4">
        <div className="container max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            {language === "arabic" ? "مدعوم من أكيوتيريوم تكنولوجيز" : "Powered by Acuterium Technologies"}
          </p>
        </div>
      </footer>
    </div>
  );
}
