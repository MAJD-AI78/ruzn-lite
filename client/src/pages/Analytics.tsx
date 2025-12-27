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
  Download,
  Loader2,
  Shield,
  Mic,
  FileDown
} from "lucide-react";

type Language = "arabic" | "english";

const UI_TEXT = {
  arabic: {
    title: "لوحة التحليلات",
    subtitle: "إحصائيات وتحليلات جهاز الرقابة المالية والإدارية",
    totalComplaints: "إجمالي الشكاوى المحللة",
    avgRiskScore: "متوسط درجة الخطورة",
    highRiskCount: "شكاوى عالية الخطورة",
    activeUsers: "المستخدمون النشطون",
    categoryDistribution: "توزيع التصنيفات",
    riskDistribution: "توزيع درجات الخطورة",
    monthlyTrends: "الاتجاهات الشهرية",
    backToChat: "العودة للمحادثة",
    exportReport: "تصدير التقرير",
    pdfExports: "تصدير PDF",
    voiceInputs: "إدخال صوتي",
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
    monthlyTrends: "Monthly Trends",
    backToChat: "Back to Chat",
    exportReport: "Export Report",
    pdfExports: "PDF Exports",
    voiceInputs: "Voice Inputs",
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

// Helper function to convert object to array format
function convertCategoryDistribution(data: Record<string, number> | Array<{category: string, count: number, percentage: number}>) {
  if (Array.isArray(data)) {
    return data;
  }
  
  // Convert object format to array format
  const total = Object.values(data).reduce((sum, count) => sum + count, 0);
  return Object.entries(data).map(([category, count]) => ({
    category,
    count,
    percentage: total > 0 ? Math.round((count / total) * 100 * 10) / 10 : 0
  }));
}

// Helper function to convert risk distribution
function convertRiskDistribution(data: {high: number, medium: number, low: number} | Array<{level: string, count: number, percentage: number}>) {
  if (Array.isArray(data)) {
    return data;
  }
  
  const total = data.high + data.medium + data.low;
  return [
    { level: "high", count: data.high, percentage: total > 0 ? Math.round((data.high / total) * 100 * 10) / 10 : 0 },
    { level: "medium", count: data.medium, percentage: total > 0 ? Math.round((data.medium / total) * 100 * 10) / 10 : 0 },
    { level: "low", count: data.low, percentage: total > 0 ? Math.round((data.low / total) * 100 * 10) / 10 : 0 }
  ];
}

export default function Analytics() {
  const [language, setLanguage] = useState<Language>("arabic");
  const { user, isAuthenticated } = useAuth();
  
  const isRTL = language === "arabic";
  const text = UI_TEXT[language];
  
  const { data: analytics, isLoading, error } = trpc.analytics.getSummary.useQuery({});
  
  // Process the data to ensure correct format
  const processedData = analytics ? {
    totalComplaints: analytics.totalComplaints || 0,
    avgRiskScore: analytics.avgRiskScore || 0,
    highRiskCount: analytics.riskDistribution ? 
      (typeof analytics.riskDistribution === 'object' && !Array.isArray(analytics.riskDistribution) 
        ? (analytics.riskDistribution as any).high 
        : Array.isArray(analytics.riskDistribution) 
          ? analytics.riskDistribution.find((r: any) => r.level === 'high')?.count 
          : 0) 
      : 0,
    activeUsers: analytics.totalUsers || 0,
    categoryDistribution: analytics.categoryDistribution 
      ? convertCategoryDistribution(analytics.categoryDistribution as any) 
      : [],
    riskDistribution: analytics.riskDistribution 
      ? convertRiskDistribution(analytics.riskDistribution as any) 
      : [],
    trends: (analytics as any).trends || [],
    totalPdfExports: (analytics as any).totalPdfExports || 0,
    totalVoiceInputs: (analytics as any).totalVoiceInputs || 0
  } : null;
  
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
        ) : error ? (
          <div className="flex items-center justify-center h-64 text-red-500">
            <AlertTriangle className="w-6 h-6 mr-2" />
            {text.noData}
          </div>
        ) : processedData ? (
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
                    <p className="text-3xl font-bold text-primary">{processedData.totalComplaints.toLocaleString()}</p>
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
                    <p className="text-3xl font-bold text-yellow-500">{processedData.avgRiskScore}/100</p>
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
                    <p className="text-3xl font-bold text-red-500">{processedData.highRiskCount?.toLocaleString() || 0}</p>
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
                    <p className="text-3xl font-bold text-green-500">{processedData.activeUsers}</p>
                  </div>
                </div>
              </Card>
            </div>
            
            {/* Additional Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <Card className="p-4 bg-card border-primary/20">
                <div className="flex items-center gap-3">
                  <FileDown className="w-5 h-5 text-primary" />
                  <span className="text-sm text-muted-foreground">{text.pdfExports}:</span>
                  <span className="font-bold text-primary">{processedData.totalPdfExports}</span>
                </div>
              </Card>
              <Card className="p-4 bg-card border-primary/20">
                <div className="flex items-center gap-3">
                  <Mic className="w-5 h-5 text-primary" />
                  <span className="text-sm text-muted-foreground">{text.voiceInputs}:</span>
                  <span className="font-bold text-primary">{processedData.totalVoiceInputs}</span>
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
                  {processedData.categoryDistribution.length > 0 ? (
                    processedData.categoryDistribution.map((item) => (
                      <div key={item.category} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{text.categories[item.category as keyof typeof text.categories] || item.category}</span>
                          <span className="text-muted-foreground">{item.count} ({item.percentage}%)</span>
                        </div>
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${Math.min(item.percentage * 4, 100)}%`,
                              backgroundColor: CATEGORY_COLORS[item.category] || "#c9a227"
                            }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">{text.noData}</p>
                  )}
                </div>
              </Card>
              
              {/* Risk Distribution */}
              <Card className="p-6 bg-card border-primary/20">
                <div className="flex items-center gap-2 mb-6">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">{text.riskDistribution}</h3>
                </div>
                <div className="space-y-6">
                  {processedData.riskDistribution.length > 0 ? (
                    processedData.riskDistribution.map((item) => {
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
                              className={`h-full ${color.bg} transition-all duration-500 flex items-center justify-end px-2`}
                              style={{ width: `${Math.min(item.percentage * 2.5, 100)}%` }}
                            >
                              <span className="text-xs text-white font-medium">{item.percentage}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-muted-foreground text-center py-4">{text.noData}</p>
                  )}
                </div>
              </Card>
            </div>
            
            {/* Monthly Trends */}
            {processedData.trends && processedData.trends.length > 0 && (
              <Card className="p-6 bg-card border-primary/20">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">{text.monthlyTrends}</h3>
                </div>
                <div className="overflow-x-auto">
                  <div className="flex gap-4 min-w-max pb-4">
                    {processedData.trends.map((trend: any, index: number) => (
                      <div key={index} className="flex flex-col items-center gap-2 min-w-[80px]">
                        <div 
                          className="w-12 bg-primary/20 rounded-t-lg transition-all duration-500 flex items-end justify-center"
                          style={{ height: `${Math.max(trend.complaints * 1.5, 20)}px` }}
                        >
                          <div 
                            className="w-full bg-primary rounded-t-lg"
                            style={{ height: `${Math.max(trend.complaints * 1.2, 15)}px` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{trend.month}</span>
                        <span className="text-sm font-medium text-primary">{trend.complaints}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            {text.noData}
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="border-t border-border/50 py-4 text-center text-sm text-muted-foreground">
        <p>مدعوم من أكيوتيريوم تكنولوجيز | Powered by Acuterium Technologies</p>
      </footer>
    </div>
  );
}
