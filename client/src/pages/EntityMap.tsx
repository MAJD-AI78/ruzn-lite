import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft,
  Building2,
  AlertTriangle,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  Users,
  MapPin,
  BarChart3,
  PieChart,
  Activity,
  Eye,
  Loader2,
  ChevronDown,
  ChevronUp,
  Calendar,
  Filter
} from "lucide-react";

type Language = "arabic" | "english";
type SortBy = "risk" | "count" | "name";
type TimeRange = "week" | "month" | "quarter" | "year";

interface EntityData {
  id: number;
  name: string;
  nameEn: string;
  governorate: string;
  totalComplaints: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  avgRiskScore: number;
  trend: "up" | "down" | "stable";
  trendPercent: number;
  topCategories: { category: string; count: number }[];
  recentComplaints: { id: number; topic: string; riskScore: number; date: string }[];
}

const UI_TEXT = {
  arabic: {
    title: "خريطة استخبارات الجهات",
    subtitle: "لوحة معلومات الوزير - تجميع البلاغات حسب الجهة",
    backToChat: "العودة للمحادثة",
    totalEntities: "إجمالي الجهات",
    totalComplaints: "إجمالي البلاغات",
    highRiskEntities: "جهات عالية الخطورة",
    avgRiskScore: "متوسط الخطورة",
    sortBy: "ترتيب حسب",
    sortOptions: {
      risk: "درجة الخطورة",
      count: "عدد البلاغات",
      name: "اسم الجهة"
    },
    timeRange: "الفترة الزمنية",
    timeOptions: {
      week: "أسبوع",
      month: "شهر",
      quarter: "ربع سنة",
      year: "سنة"
    },
    entityDetails: "تفاصيل الجهة",
    complaints: "البلاغات",
    highRisk: "عالي",
    mediumRisk: "متوسط",
    lowRisk: "منخفض",
    trend: "الاتجاه",
    trendUp: "ارتفاع",
    trendDown: "انخفاض",
    trendStable: "مستقر",
    topCategories: "أعلى التصنيفات",
    recentComplaints: "أحدث البلاغات",
    viewAll: "عرض الكل",
    noData: "لا توجد بيانات",
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
    title: "Entity Intelligence Map",
    subtitle: "Minister Dashboard - Aggregated Complaints by Entity",
    backToChat: "Back to Chat",
    totalEntities: "Total Entities",
    totalComplaints: "Total Complaints",
    highRiskEntities: "High Risk Entities",
    avgRiskScore: "Avg Risk Score",
    sortBy: "Sort By",
    sortOptions: {
      risk: "Risk Score",
      count: "Complaint Count",
      name: "Entity Name"
    },
    timeRange: "Time Range",
    timeOptions: {
      week: "Week",
      month: "Month",
      quarter: "Quarter",
      year: "Year"
    },
    entityDetails: "Entity Details",
    complaints: "Complaints",
    highRisk: "High",
    mediumRisk: "Medium",
    lowRisk: "Low",
    trend: "Trend",
    trendUp: "Increasing",
    trendDown: "Decreasing",
    trendStable: "Stable",
    topCategories: "Top Categories",
    recentComplaints: "Recent Complaints",
    viewAll: "View All",
    noData: "No data available",
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

// Sample entity data for demo
const SAMPLE_ENTITIES: EntityData[] = [
  {
    id: 1,
    name: "وزارة المالية",
    nameEn: "Ministry of Finance",
    governorate: "مسقط",
    totalComplaints: 45,
    highRiskCount: 12,
    mediumRiskCount: 18,
    lowRiskCount: 15,
    avgRiskScore: 68,
    trend: "up",
    trendPercent: 15,
    topCategories: [
      { category: "tender_violation", count: 18 },
      { category: "financial_corruption", count: 12 },
      { category: "conflict_of_interest", count: 8 }
    ],
    recentComplaints: [
      { id: 101, topic: "مخالفات في إجراءات المناقصات", riskScore: 85, date: "2024-12-27" },
      { id: 102, topic: "تأخر صرف المستحقات", riskScore: 55, date: "2024-12-26" }
    ]
  },
  {
    id: 2,
    name: "وزارة الصحة",
    nameEn: "Ministry of Health",
    governorate: "مسقط",
    totalComplaints: 38,
    highRiskCount: 8,
    mediumRiskCount: 15,
    lowRiskCount: 15,
    avgRiskScore: 58,
    trend: "stable",
    trendPercent: 2,
    topCategories: [
      { category: "administrative_negligence", count: 15 },
      { category: "tender_violation", count: 10 },
      { category: "abuse_of_power", count: 8 }
    ],
    recentComplaints: [
      { id: 201, topic: "إهمال في صيانة المعدات الطبية", riskScore: 72, date: "2024-12-27" },
      { id: 202, topic: "تأخر تعيين الكوادر الطبية", riskScore: 45, date: "2024-12-25" }
    ]
  },
  {
    id: 3,
    name: "وزارة التربية والتعليم",
    nameEn: "Ministry of Education",
    governorate: "مسقط",
    totalComplaints: 32,
    highRiskCount: 5,
    mediumRiskCount: 12,
    lowRiskCount: 15,
    avgRiskScore: 48,
    trend: "down",
    trendPercent: 10,
    topCategories: [
      { category: "administrative_negligence", count: 12 },
      { category: "general", count: 10 },
      { category: "abuse_of_power", count: 5 }
    ],
    recentComplaints: [
      { id: 301, topic: "تأخر صيانة المباني المدرسية", riskScore: 55, date: "2024-12-26" },
      { id: 302, topic: "نقص الكتب الدراسية", riskScore: 35, date: "2024-12-24" }
    ]
  },
  {
    id: 4,
    name: "وزارة الإسكان",
    nameEn: "Ministry of Housing",
    governorate: "مسقط",
    totalComplaints: 28,
    highRiskCount: 10,
    mediumRiskCount: 10,
    lowRiskCount: 8,
    avgRiskScore: 72,
    trend: "up",
    trendPercent: 25,
    topCategories: [
      { category: "tender_violation", count: 12 },
      { category: "conflict_of_interest", count: 8 },
      { category: "financial_corruption", count: 5 }
    ],
    recentComplaints: [
      { id: 401, topic: "تضارب مصالح في منح العقود", riskScore: 88, date: "2024-12-27" },
      { id: 402, topic: "تأخر تسليم المشاريع", riskScore: 62, date: "2024-12-25" }
    ]
  },
  {
    id: 5,
    name: "بلدية مسقط",
    nameEn: "Muscat Municipality",
    governorate: "مسقط",
    totalComplaints: 25,
    highRiskCount: 7,
    mediumRiskCount: 10,
    lowRiskCount: 8,
    avgRiskScore: 62,
    trend: "stable",
    trendPercent: 3,
    topCategories: [
      { category: "abuse_of_power", count: 10 },
      { category: "administrative_negligence", count: 8 },
      { category: "general", count: 5 }
    ],
    recentComplaints: [
      { id: 501, topic: "استغلال المنصب في منح التراخيص", riskScore: 78, date: "2024-12-26" },
      { id: 502, topic: "تأخر معاملات المواطنين", riskScore: 42, date: "2024-12-24" }
    ]
  },
  {
    id: 6,
    name: "وزارة النقل والاتصالات",
    nameEn: "Ministry of Transport",
    governorate: "مسقط",
    totalComplaints: 22,
    highRiskCount: 4,
    mediumRiskCount: 10,
    lowRiskCount: 8,
    avgRiskScore: 52,
    trend: "down",
    trendPercent: 8,
    topCategories: [
      { category: "tender_violation", count: 8 },
      { category: "administrative_negligence", count: 7 },
      { category: "abuse_of_power", count: 4 }
    ],
    recentComplaints: [
      { id: 601, topic: "مخالفات في مناقصة الطرق", riskScore: 68, date: "2024-12-25" },
      { id: 602, topic: "سوء استخدام المعدات", riskScore: 45, date: "2024-12-23" }
    ]
  }
];

function getRiskClass(score: number): string {
  if (score >= 70) return "text-red-400";
  if (score >= 40) return "text-yellow-400";
  return "text-green-400";
}

function getRiskBgClass(score: number): string {
  if (score >= 70) return "bg-red-500/20 border-red-500/30";
  if (score >= 40) return "bg-yellow-500/20 border-yellow-500/30";
  return "bg-green-500/20 border-green-500/30";
}

function TrendIcon({ trend, percent }: { trend: "up" | "down" | "stable"; percent: number }) {
  if (trend === "up") {
    return (
      <span className="flex items-center gap-1 text-red-400 text-sm">
        <TrendingUp className="w-4 h-4" />
        +{percent}%
      </span>
    );
  }
  if (trend === "down") {
    return (
      <span className="flex items-center gap-1 text-green-400 text-sm">
        <TrendingDown className="w-4 h-4" />
        -{percent}%
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-muted-foreground text-sm">
      <Minus className="w-4 h-4" />
      {percent}%
    </span>
  );
}

export default function EntityMap() {
  const [language, setLanguage] = useState<Language>("arabic");
  const [sortBy, setSortBy] = useState<SortBy>("risk");
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const [expandedEntity, setExpandedEntity] = useState<number | null>(null);
  const [entities] = useState<EntityData[]>(SAMPLE_ENTITIES);
  
  const { user, isAuthenticated } = useAuth();
  
  const isRTL = language === "arabic";
  const text = UI_TEXT[language];
  
  // Sort entities
  const sortedEntities = useMemo(() => {
    const sorted = [...entities];
    switch (sortBy) {
      case "risk":
        return sorted.sort((a, b) => b.avgRiskScore - a.avgRiskScore);
      case "count":
        return sorted.sort((a, b) => b.totalComplaints - a.totalComplaints);
      case "name":
        return sorted.sort((a, b) => 
          language === "arabic" 
            ? a.name.localeCompare(b.name, 'ar')
            : a.nameEn.localeCompare(b.nameEn)
        );
      default:
        return sorted;
    }
  }, [entities, sortBy, language]);
  
  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const totalComplaints = entities.reduce((sum, e) => sum + e.totalComplaints, 0);
    const highRiskEntities = entities.filter(e => e.avgRiskScore >= 70).length;
    const avgRisk = Math.round(entities.reduce((sum, e) => sum + e.avgRiskScore, 0) / entities.length);
    
    return {
      totalEntities: entities.length,
      totalComplaints,
      highRiskEntities,
      avgRiskScore: avgRisk
    };
  }, [entities]);
  
  const toggleExpand = (id: number) => {
    setExpandedEntity(expandedEntity === id ? null : id);
  };
  
  return (
    <div 
      className="min-h-screen text-foreground flex flex-col"
      dir={isRTL ? "rtl" : "ltr"}
      style={{
        background: 'radial-gradient(1200px 600px at 60% 18%, rgba(214,179,106,.16), transparent 55%), radial-gradient(900px 500px at 20% 80%, rgba(96,165,250,.10), transparent 60%), linear-gradient(180deg, #050506, #0a0a0c)'
      }}
    >
      {/* Header */}
      <header className="border-b border-white/10 bg-black/35 backdrop-blur-md sticky top-0 z-50">
        <div className="container max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Link href="/">
                <button className="ruzn-btn text-sm flex items-center gap-2">
                  <ArrowLeft className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
                  {text.backToChat}
                </button>
              </Link>
              <div>
                <h1 className="text-xl font-extrabold" style={{ color: 'rgba(214,179,106,.95)' }}>{text.title}</h1>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,.70)' }}>{text.subtitle}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLanguage(language === "arabic" ? "english" : "arabic")}
                className="ruzn-btn text-sm"
              >
                {language === "arabic" ? "EN" : "عربي"}
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-1 container max-w-7xl mx-auto px-4 py-6">
        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="ruzn-kpi">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">{text.totalEntities}</span>
            </div>
            <div className="ruzn-kpi-value">{summaryStats.totalEntities}</div>
          </div>
          
          <div className="ruzn-kpi">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">{text.totalComplaints}</span>
            </div>
            <div className="ruzn-kpi-value">{summaryStats.totalComplaints}</div>
          </div>
          
          <div className="ruzn-kpi">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="text-sm text-muted-foreground">{text.highRiskEntities}</span>
            </div>
            <div className="ruzn-kpi-value text-red-400">{summaryStats.highRiskEntities}</div>
          </div>
          
          <div className="ruzn-kpi">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-yellow-400" />
              <span className="text-sm text-muted-foreground">{text.avgRiskScore}</span>
            </div>
            <div className={`ruzn-kpi-value ${getRiskClass(summaryStats.avgRiskScore)}`}>
              {summaryStats.avgRiskScore}/100
            </div>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{text.sortBy}:</span>
            <div className="flex gap-1">
              {(["risk", "count", "name"] as SortBy[]).map(option => (
                <button
                  key={option}
                  onClick={() => setSortBy(option)}
                  className={`ruzn-tab ${sortBy === option ? "active" : ""}`}
                >
                  {text.sortOptions[option]}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{text.timeRange}:</span>
            <div className="flex gap-1">
              {(["week", "month", "quarter", "year"] as TimeRange[]).map(option => (
                <button
                  key={option}
                  onClick={() => setTimeRange(option)}
                  className={`ruzn-tab ${timeRange === option ? "active" : ""}`}
                >
                  {text.timeOptions[option]}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Entity Cards */}
        <div className="space-y-4">
          {sortedEntities.map(entity => (
            <Card 
              key={entity.id} 
              className={`ruzn-card overflow-hidden transition-all ${
                expandedEntity === entity.id ? "ring-2 ring-primary/50" : ""
              }`}
            >
              {/* Entity Header */}
              <div 
                className="p-4 cursor-pointer hover:bg-muted/20 transition-colors"
                onClick={() => toggleExpand(entity.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${getRiskBgClass(entity.avgRiskScore)} border`}>
                      <Building2 className={`w-6 h-6 ${getRiskClass(entity.avgRiskScore)}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {language === "arabic" ? entity.name : entity.nameEn}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {entity.governorate}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {entity.totalComplaints} {text.complaints}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    {/* Risk Distribution Mini */}
                    <div className="hidden md:flex items-center gap-2">
                      <span className="ruzn-tag ruzn-tag-high">{entity.highRiskCount}</span>
                      <span className="ruzn-tag ruzn-tag-med">{entity.mediumRiskCount}</span>
                      <span className="ruzn-tag ruzn-tag-low">{entity.lowRiskCount}</span>
                    </div>
                    
                    {/* Average Risk Score */}
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${getRiskClass(entity.avgRiskScore)}`}>
                        {entity.avgRiskScore}
                      </div>
                      <div className="text-xs text-muted-foreground">/100</div>
                    </div>
                    
                    {/* Trend */}
                    <TrendIcon trend={entity.trend} percent={entity.trendPercent} />
                    
                    {/* Expand Icon */}
                    {expandedEntity === entity.id ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>
              
              {/* Expanded Details */}
              {expandedEntity === entity.id && (
                <div className="border-t border-border/30 p-4 bg-muted/10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Top Categories */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-primary" />
                        {text.topCategories}
                      </h4>
                      <div className="space-y-2">
                        {entity.topCategories.map((cat, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span className="text-sm">
                              {text.categories[cat.category as keyof typeof text.categories] || cat.category}
                            </span>
                            <span className="ruzn-tag">{cat.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Recent Complaints */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        {text.recentComplaints}
                      </h4>
                      <div className="space-y-2">
                        {entity.recentComplaints.map(complaint => (
                          <div 
                            key={complaint.id} 
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/20"
                          >
                            <div className="flex-1">
                              <span className="text-sm">{complaint.topic}</span>
                              <span className="text-xs text-muted-foreground block">
                                {new Date(complaint.date).toLocaleDateString(language === "arabic" ? "ar-OM" : "en-US")}
                              </span>
                            </div>
                            <span className={`ruzn-tag ${
                              complaint.riskScore >= 70 ? "ruzn-tag-high" :
                              complaint.riskScore >= 40 ? "ruzn-tag-med" : "ruzn-tag-low"
                            }`}>
                              {complaint.riskScore}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Risk Distribution Bar */}
                  <div className="mt-4 pt-4 border-t border-border/30">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">{text.complaints}:</span>
                      <div className="flex-1 flex h-4 rounded-full overflow-hidden">
                        <div 
                          className="bg-red-500/70" 
                          style={{ width: `${(entity.highRiskCount / entity.totalComplaints) * 100}%` }}
                          title={`${text.highRisk}: ${entity.highRiskCount}`}
                        />
                        <div 
                          className="bg-yellow-500/70" 
                          style={{ width: `${(entity.mediumRiskCount / entity.totalComplaints) * 100}%` }}
                          title={`${text.mediumRisk}: ${entity.mediumRiskCount}`}
                        />
                        <div 
                          className="bg-green-500/70" 
                          style={{ width: `${(entity.lowRiskCount / entity.totalComplaints) * 100}%` }}
                          title={`${text.lowRisk}: ${entity.lowRiskCount}`}
                        />
                      </div>
                      <div className="flex gap-3 text-xs">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          {text.highRisk}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-yellow-500" />
                          {text.mediumRisk}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          {text.lowRisk}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-border/30 py-4 text-center text-sm text-muted-foreground">
        {language === "arabic" ? "مدعوم من أكيوتيريوم تكنولوجيز" : "Powered by Acuterium Technologies"}
      </footer>
    </div>
  );
}
