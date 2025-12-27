import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Users,
  MessageSquare,
  ArrowLeft,
  Download,
  Loader2,
  Shield,
  Search,
  Calendar,
  Filter,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock
} from "lucide-react";

type Language = "arabic" | "english";

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
  
  const { user, isAuthenticated } = useAuth();
  const isRTL = language === "arabic";
  const text = UI_TEXT[language];
  
  const { data: conversationsData, isLoading: loadingConversations } = trpc.admin.getAllConversations.useQuery({ limit: 100 });
  const { data: usersData, isLoading: loadingUsers } = trpc.admin.getAllUsers.useQuery();
  
  const isAdmin = user?.role === "admin";
  
  // Mock data for demo
  const mockConversations = [
    { id: 1, userId: 1, userName: "أحمد محمد", feature: "complaints", category: "financial_corruption", riskScore: 85, createdAt: new Date().toISOString(), messageCount: 4 },
    { id: 2, userId: 2, userName: "فاطمة علي", feature: "complaints", category: "tender_violation", riskScore: 62, createdAt: new Date().toISOString(), messageCount: 6 },
    { id: 3, userId: 3, userName: "سالم الحارثي", feature: "legislative", category: null, riskScore: null, createdAt: new Date().toISOString(), messageCount: 3 },
    { id: 4, userId: 1, userName: "أحمد محمد", feature: "complaints", category: "administrative_negligence", riskScore: 45, createdAt: new Date().toISOString(), messageCount: 5 },
    { id: 5, userId: 4, userName: "مريم الراشدي", feature: "complaints", category: "conflict_of_interest", riskScore: 78, createdAt: new Date().toISOString(), messageCount: 8 },
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
                <Card key={conv.id} className="p-4 bg-card border-primary/20 hover:border-primary/40 transition-colors">
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
                      <Button variant="ghost" size="sm">
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
