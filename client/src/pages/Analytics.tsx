import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  BarChart3,
  PieChart,
  TrendingUp,
  FileText,
  AlertTriangle,
  Users,
  ArrowLeft,
  Calendar,
  Download,
  Loader2,
  Shield,
  Scale,
  FileSearch
} from "lucide-react";

type Language = "arabic" | "english";

const UI_TEXT = {
  arabic: {
    title: "لوحة التحليلات",
    subtitle: "إحصائيات وتحليلات ديوان الرقابة",
    totalComplaints: "إجمالي الشكاوى المحللة",
    avgRiskScore: "متوسط درجة الخطورة",
    highRiskCount: "شكاوى عالية الخطورة",
    activeUsers: "المستخدمون النشطون",
    categoryDistribution: "توزيع التصنيفات",
    riskDistribution: "توزيع درجات الخطورة",
    recentActivity: "النشاط الأخير",
    backToChat: "العودة للمحادثة",
    exportReport: "تصدير التقرير",
    noData: "لا توجد بيانات متاحة",
    categories: {
      financial_corruption: "فساد مالي",
      conflict_of_interest: "تضارب المصالح",
      abuse_of_power: "إساءة استخدام السلطة",
      tender_violation: "مخالفة قانون المناقصات",
      administrative_negligence: "إهمال إداري",
      general: "شكوى عامة"
    },
    riskLevels: {
      high: "عالي (70-100)",
      medium: "متوسط (40-69)",
      low: "منخفض (0-39)"
    }
  },
  english: {
    title: "Analytics Dashboard",
    subtitle: "State Audit Institution Statistics",
    totalComplaints: "Total Complaints Analyzed",
    avgRiskScore: "Average Risk Score",
    highRiskCount: "High Risk Complaints",
    activeUsers: "Active Users",
    categoryDistribution: "Category Distribution",
    riskDistribution: "Risk Score Distribution",
    recentActivity: "Recent Activity",
    backToChat: "Back to Chat",
    exportReport: "Export Report",
    noData: "No data available",
    categories: {
      financial_corruption: "Financial Corruption",
      conflict_of_interest: "Conflict of Interest",
      abuse_of_power: "Abuse of Power",
      tender_violation: "Tender Violation",
      administrative_negligence: "Administrative Negligence",
      general: "General Complaint"
    },
    riskLevels: {
      high: "High (70-100)",
      medium: "Medium (40-69)",
      low: "Low (0-39)"
    }
  }
};

const CATEGORY_COLORS: Record<string, string> = {
  financial_corruption: "#ef4444",
  conflict_of_interest: "#f97316",
  abuse_of_power: "#eab308",
  tender_violation: "#22c55e",
  administrative_negligence: "#3b82f6",
  general: "#8b5cf6"
};

export default function Analytics() {
  const [language, setLanguage] = useState<Language>("arabic");
  const { user, isAuthenticated } = useAuth();
  
  const isRTL = language === "arabic";
  const text = UI_TEXT[language];
  
  const { data: analytics, isLoading } = trpc.analytics.getSummary.useQuery({});
  
  // Mock data for demo (will be replaced with real data when available)
  const mockData = {
    totalComplaints: 1378,
    avgRiskScore: 58,
    highRiskCount: 312,
    activeUsers: 47,
    categoryDistribution: [
      { category: "financial_corruption", count: 287, percentage: 20.8 },
      { category: "conflict_of_interest", count: 198, percentage: 14.4 },
      { category: "abuse_of_power", count: 156, percentage: 11.3 },
      { category: "tender_violation", count: 234, percentage: 17.0 },
      { category: "administrative_negligence", count: 312, percentage: 22.6 },
      { category: "general", count: 191, percentage: 13.9 }
    ],
    riskDistribution: [
      { level: "high", count: 312, percentage: 22.6 },
      { level: "medium", count: 534, percentage: 38.8 },
      { level: "low", count: 532, percentage: 38.6 }
    ],
    trends: [
      { month: "يناير", complaints: 98 },
      { month: "فبراير", complaints: 112 },
      { month: "مارس", complaints: 134 },
      { month: "أبريل", complaints: 121 },
      { month: "مايو", complaints: 145 },
      { month: "يونيو", complaints: 167 }
    ]
  };
  
  const data = (analytics || mockData) as any;
  
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
                {text.exportReport}
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-1 container max-w-7xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="p-6 bg-card border-primary/20">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{text.totalComplaints}</p>
                    <p className="text-3xl font-bold text-primary">{data.totalComplaints?.toLocaleString()}</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6 bg-card border-primary/20">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-yellow-500/10">
                    <TrendingUp className="w-6 h-6 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{text.avgRiskScore}</p>
                    <p className="text-3xl font-bold text-yellow-500">{data.avgRiskScore}/100</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6 bg-card border-primary/20">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-red-500/10">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{text.highRiskCount}</p>
                    <p className="text-3xl font-bold text-red-500">{data.highRiskCount?.toLocaleString()}</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6 bg-card border-primary/20">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-green-500/10">
                    <Users className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{text.activeUsers}</p>
                    <p className="text-3xl font-bold text-green-500">{data.activeUsers}</p>
                  </div>
                </div>
              </Card>
            </div>
            
            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Category Distribution */}
              <Card className="p-6 bg-card border-primary/20">
                <div className="flex items-center gap-2 mb-6">
                  <PieChart className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">{text.categoryDistribution}</h3>
                </div>
                <div className="space-y-4">
                  {data.categoryDistribution?.map((item: any) => (
                    <div key={item.category} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{text.categories[item.category as keyof typeof text.categories] || item.category}</span>
                        <span className="text-muted-foreground">{item.count} ({item.percentage}%)</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${item.percentage}%`,
                            backgroundColor: CATEGORY_COLORS[item.category] || "#c9a227"
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              
              {/* Risk Distribution */}
              <Card className="p-6 bg-card border-primary/20">
                <div className="flex items-center gap-2 mb-6">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">{text.riskDistribution}</h3>
                </div>
                <div className="space-y-6">
                  {data.riskDistribution?.map((item: any) => {
                    const colors = {
                      high: { bg: "bg-red-500", text: "text-red-500" },
                      medium: { bg: "bg-yellow-500", text: "text-yellow-500" },
                      low: { bg: "bg-green-500", text: "text-green-500" }
                    };
                    const color = colors[item.level as keyof typeof colors] || colors.low;
                    
                    return (
                      <div key={item.level} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Shield className={`w-4 h-4 ${color.text}`} />
                            <span>{text.riskLevels[item.level as keyof typeof text.riskLevels]}</span>
                          </div>
                          <span className={`font-bold ${color.text}`}>{item.count}</span>
                        </div>
                        <div className="h-8 bg-muted rounded-lg overflow-hidden flex items-center">
                          <div 
                            className={`h-full ${color.bg} rounded-lg flex items-center justify-end px-3 transition-all duration-500`}
                            style={{ width: `${item.percentage}%` }}
                          >
                            <span className="text-xs font-bold text-white">{item.percentage}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
            
            {/* Monthly Trend */}
            <Card className="p-6 bg-card border-primary/20">
              <div className="flex items-center gap-2 mb-6">
                <Calendar className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">
                  {language === "arabic" ? "الاتجاه الشهري للشكاوى" : "Monthly Complaint Trend"}
                </h3>
              </div>
              <div className="h-64 flex items-end justify-between gap-4">
                {(data.trends)?.map((item: any, idx: number) => {
                  const trendData = data.trends || [];
                  const maxComplaints = Math.max(...(trendData.map((i: any) => i.complaints || i.count) || [1]));
                  const height = (item.complaints / maxComplaints) * 100;
                  
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-sm font-bold text-primary">{item.complaints}</span>
                      <div 
                        className="w-full bg-primary/80 rounded-t-lg transition-all duration-500 hover:bg-primary"
                        style={{ height: `${height}%`, minHeight: "20px" }}
                      />
                      <span className="text-xs text-muted-foreground">{item.month}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </>
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
