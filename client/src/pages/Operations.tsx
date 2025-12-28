import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  ArrowLeft,
  FileText,
  ListFilter,
  Map,
  Code,
  AlertTriangle,
  Shield,
  Clock,
  Building2,
  Users,
  Phone,
  Mail,
  Globe,
  Send,
  Download,
  RefreshCw,
  ChevronDown,
  TrendingUp,
  Loader2
} from "lucide-react";

type Language = "arabic" | "english";
type TabId = "intake" | "triage" | "entity" | "schemas";
type RiskLevel = "all" | "high" | "medium" | "low";
type ComplaintStatus = "new" | "investigating" | "closed";

interface Complaint {
  id: number;
  channel: string;
  complainantType: string;
  entity: string;
  governorate: string;
  topic: string;
  amount: number | null;
  text: string;
  riskScore: number;
  status: ComplaintStatus;
  createdAt: string;
  category: string;
}

interface EntityStats {
  name: string;
  totalComplaints: number;
  highRisk: number;
  avgRiskScore: number;
  topCategory: string;
}

const UI_TEXT = {
  arabic: {
    title: "مركز العمليات",
    subtitle: "إدارة البلاغات والتحليل الذكي",
    backToChat: "العودة للمحادثة",
    tabs: {
      intake: "استقبال البلاغات",
      triage: "قائمة الفرز",
      entity: "خريطة الجهات",
      schemas: "المخططات"
    },
    intake: {
      title: "نموذج استقبال بلاغ جديد",
      channel: "قناة الاستقبال",
      complainantType: "نوع المبلغ",
      entity: "الجهة المعنية",
      governorate: "المحافظة",
      topic: "الموضوع",
      amount: "المبلغ المقدر (ر.ع.)",
      text: "تفاصيل البلاغ",
      submit: "إرسال البلاغ",
      reset: "مسح النموذج",
      channels: ["هاتف", "بريد إلكتروني", "موقع إلكتروني", "حضور شخصي", "بريد عادي"],
      complainantTypes: ["مواطن", "موظف حكومي", "شركة", "مجهول"],
      governorates: ["مسقط", "ظفار", "مسندم", "البريمي", "الداخلية", "شمال الباطنة", "جنوب الباطنة", "شمال الشرقية", "جنوب الشرقية", "الظاهرة", "الوسطى"]
    },
    triage: {
      title: "قائمة البلاغات للفرز",
      filter: "تصفية حسب الخطورة",
      all: "الكل",
      high: "عالي",
      medium: "متوسط",
      low: "منخفض",
      noComplaints: "لا توجد بلاغات",
      status: {
        new: "جديد",
        investigating: "قيد التحقيق",
        closed: "مغلق"
      }
    },
    entity: {
      title: "خريطة استخبارات الجهات",
      subtitle: "تجميع البلاغات حسب الجهة مع تركيز المخاطر",
      totalComplaints: "إجمالي البلاغات",
      highRisk: "عالي الخطورة",
      avgRisk: "متوسط المخاطر",
      topCategory: "التصنيف الأعلى"
    },
    schemas: {
      title: "مخططات البيانات",
      complaintSchema: "مخطط البلاغ",
      reportSchema: "مخطط التقرير"
    },
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
    title: "Operations Center",
    subtitle: "Complaint Management & Intelligent Analysis",
    backToChat: "Back to Chat",
    tabs: {
      intake: "Complaint Intake",
      triage: "Triage Queue",
      entity: "Entity Map",
      schemas: "Schemas"
    },
    intake: {
      title: "New Complaint Intake Form",
      channel: "Reception Channel",
      complainantType: "Complainant Type",
      entity: "Concerned Entity",
      governorate: "Governorate",
      topic: "Topic",
      amount: "Estimated Amount (OMR)",
      text: "Complaint Details",
      submit: "Submit Complaint",
      reset: "Clear Form",
      channels: ["Phone", "Email", "Website", "In Person", "Regular Mail"],
      complainantTypes: ["Citizen", "Government Employee", "Company", "Anonymous"],
      governorates: ["Muscat", "Dhofar", "Musandam", "Al Buraimi", "Ad Dakhiliyah", "North Al Batinah", "South Al Batinah", "North Ash Sharqiyah", "South Ash Sharqiyah", "Ad Dhahirah", "Al Wusta"]
    },
    triage: {
      title: "Complaints Triage Queue",
      filter: "Filter by Risk",
      all: "All",
      high: "High",
      medium: "Medium",
      low: "Low",
      noComplaints: "No complaints found",
      status: {
        new: "New",
        investigating: "Investigating",
        closed: "Closed"
      }
    },
    entity: {
      title: "Entity Intelligence Map",
      subtitle: "Aggregated complaints by entity with risk concentration",
      totalComplaints: "Total Complaints",
      highRisk: "High Risk",
      avgRisk: "Avg Risk",
      topCategory: "Top Category"
    },
    schemas: {
      title: "Data Schemas",
      complaintSchema: "Complaint Schema",
      reportSchema: "Report Schema"
    },
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

// Sample entities for demo
const SAMPLE_ENTITIES = [
  "وزارة المالية",
  "وزارة الصحة",
  "وزارة التربية والتعليم",
  "وزارة الإسكان",
  "وزارة النقل والاتصالات",
  "وزارة الزراعة",
  "وزارة العدل",
  "بلدية مسقط",
  "الهيئة العامة للمناطق الاقتصادية",
  "جامعة السلطان قابوس"
];

// Sample complaints for demo
const SAMPLE_COMPLAINTS: Complaint[] = [
  { id: 1, channel: "هاتف", complainantType: "مواطن", entity: "وزارة الصحة", governorate: "مسقط", topic: "مخالفات في المناقصات", amount: 250000, text: "تم رصد مخالفات في إجراءات مناقصة توريد الأجهزة الطبية", riskScore: 85, status: "new", createdAt: new Date().toISOString(), category: "tender_violation" },
  { id: 2, channel: "بريد إلكتروني", complainantType: "موظف حكومي", entity: "وزارة المالية", governorate: "مسقط", topic: "تضارب مصالح", amount: null, text: "موظف يمنح عقوداً لشركة يملكها قريبه", riskScore: 78, status: "investigating", createdAt: new Date(Date.now() - 86400000).toISOString(), category: "conflict_of_interest" },
  { id: 3, channel: "موقع إلكتروني", complainantType: "شركة", entity: "وزارة الإسكان", governorate: "ظفار", topic: "تأخر صرف المستحقات", amount: 500000, text: "تأخر صرف مستحقات المقاولين لأكثر من سنة", riskScore: 62, status: "new", createdAt: new Date(Date.now() - 172800000).toISOString(), category: "administrative_negligence" },
  { id: 4, channel: "حضور شخصي", complainantType: "مجهول", entity: "بلدية مسقط", governorate: "مسقط", topic: "اختلاس أموال", amount: 120000, text: "اكتشاف اختلاس من صندوق الموظفين", riskScore: 92, status: "new", createdAt: new Date(Date.now() - 259200000).toISOString(), category: "financial_corruption" },
  { id: 5, channel: "هاتف", complainantType: "مواطن", entity: "وزارة التربية والتعليم", governorate: "الداخلية", topic: "إهمال إداري", amount: null, text: "عدم متابعة صيانة المباني المدرسية", riskScore: 45, status: "closed", createdAt: new Date(Date.now() - 345600000).toISOString(), category: "administrative_negligence" },
  { id: 6, channel: "بريد إلكتروني", complainantType: "موظف حكومي", entity: "وزارة النقل والاتصالات", governorate: "شمال الباطنة", topic: "سوء استخدام السلطة", amount: 35000, text: "استخدام معدات الوزارة لأغراض شخصية", riskScore: 55, status: "investigating", createdAt: new Date(Date.now() - 432000000).toISOString(), category: "abuse_of_power" }
];

// Complaint and Report schemas
const COMPLAINT_SCHEMA = {
  type: "object",
  properties: {
    id: { type: "integer", description: "Unique complaint identifier" },
    channel: { type: "string", enum: ["phone", "email", "website", "in_person", "mail"] },
    complainantType: { type: "string", enum: ["citizen", "government_employee", "company", "anonymous"] },
    entity: { type: "string", description: "Government entity name" },
    governorate: { type: "string", description: "Omani governorate" },
    topic: { type: "string", description: "Brief topic description" },
    amount: { type: "number", nullable: true, description: "Estimated amount in OMR" },
    text: { type: "string", description: "Full complaint details" },
    riskScore: { type: "integer", minimum: 0, maximum: 100 },
    category: { type: "string", enum: ["financial_corruption", "conflict_of_interest", "abuse_of_power", "tender_violation", "administrative_negligence", "general"] },
    status: { type: "string", enum: ["new", "investigating", "closed"] },
    createdAt: { type: "string", format: "date-time" }
  },
  required: ["id", "channel", "entity", "text", "riskScore", "status", "createdAt"]
};

const REPORT_SCHEMA = {
  type: "object",
  properties: {
    reportId: { type: "string", format: "uuid" },
    reportDate: { type: "string", format: "date" },
    period: { type: "object", properties: { start: { type: "string" }, end: { type: "string" } } },
    summary: {
      type: "object",
      properties: {
        totalComplaints: { type: "integer" },
        highRiskCount: { type: "integer" },
        resolvedCount: { type: "integer" },
        avgRiskScore: { type: "number" }
      }
    },
    categoryBreakdown: { type: "object", additionalProperties: { type: "integer" } },
    topEntities: { type: "array", items: { type: "object", properties: { name: { type: "string" }, count: { type: "integer" }, avgRisk: { type: "number" } } } },
    recommendations: { type: "array", items: { type: "string" } }
  }
};

function getRiskClass(score: number): string {
  if (score >= 70) return "ruzn-tag-high";
  if (score >= 40) return "ruzn-tag-med";
  return "ruzn-tag-low";
}

function getRiskLabel(score: number, language: Language): string {
  const text = UI_TEXT[language].triage;
  if (score >= 70) return text.high;
  if (score >= 40) return text.medium;
  return text.low;
}

export default function Operations() {
  const [language, setLanguage] = useState<Language>("arabic");
  const [activeTab, setActiveTab] = useState<TabId>("intake");
  const [riskFilter, setRiskFilter] = useState<RiskLevel>("all");
  const [complaints, setComplaints] = useState<Complaint[]>(SAMPLE_COMPLAINTS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    channel: "",
    complainantType: "",
    entity: "",
    governorate: "",
    topic: "",
    amount: "",
    text: ""
  });
  
  const { user, isAuthenticated } = useAuth();
  
  const isRTL = language === "arabic";
  const text = UI_TEXT[language];
  
  // Filter complaints by risk level
  const filteredComplaints = useMemo(() => {
    if (riskFilter === "all") return complaints;
    if (riskFilter === "high") return complaints.filter(c => c.riskScore >= 70);
    if (riskFilter === "medium") return complaints.filter(c => c.riskScore >= 40 && c.riskScore < 70);
    return complaints.filter(c => c.riskScore < 40);
  }, [complaints, riskFilter]);
  
  // Calculate entity stats
  const entityStats = useMemo((): EntityStats[] => {
    const statsMap: Record<string, { total: number; highRisk: number; totalRisk: number; categories: Record<string, number> }> = {};
    
    complaints.forEach(c => {
      if (!statsMap[c.entity]) {
        statsMap[c.entity] = { total: 0, highRisk: 0, totalRisk: 0, categories: {} };
      }
      const existing = statsMap[c.entity];
      existing.total++;
      existing.totalRisk += c.riskScore;
      if (c.riskScore >= 70) existing.highRisk++;
      existing.categories[c.category] = (existing.categories[c.category] || 0) + 1;
    });
    
    const result: EntityStats[] = Object.entries(statsMap).map(([name, stats]) => {
      const categoryEntries = Object.entries(stats.categories) as [string, number][];
      const topCategory = categoryEntries.sort((a, b) => b[1] - a[1])[0]?.[0] || "general";
      return {
        name,
        totalComplaints: stats.total,
        highRisk: stats.highRisk,
        avgRiskScore: Math.round(stats.totalRisk / stats.total),
        topCategory
      };
    });
    return result.sort((a, b) => b.avgRiskScore - a.avgRiskScore);
  }, [complaints]);
  
  // Auto-triage function (keyword-based classification)
  const autoTriage = (complaintText: string, amount: number | null): { category: string; riskScore: number } => {
    const textLower = complaintText.toLowerCase();
    let category = "general";
    let baseScore = 30;
    
    // Keyword detection
    if (textLower.includes("مناقصة") || textLower.includes("عقد") || textLower.includes("tender") || textLower.includes("procurement")) {
      category = "tender_violation";
      baseScore = 55;
    } else if (textLower.includes("تضارب") || textLower.includes("قريب") || textLower.includes("conflict") || textLower.includes("relative")) {
      category = "conflict_of_interest";
      baseScore = 60;
    } else if (textLower.includes("رشوة") || textLower.includes("bribe") || textLower.includes("اختلاس") || textLower.includes("embezzle")) {
      category = "financial_corruption";
      baseScore = 75;
    } else if (textLower.includes("اختلاس") || textLower.includes("سرقة") || textLower.includes("fraud") || textLower.includes("theft")) {
      category = "financial_corruption";
      baseScore = 80;
    } else if (textLower.includes("تأخر") || textLower.includes("إهمال") || textLower.includes("delay") || textLower.includes("neglect")) {
      category = "administrative_negligence";
      baseScore = 45;
    } else if (textLower.includes("سلطة") || textLower.includes("استغلال") || textLower.includes("abuse") || textLower.includes("power")) {
      category = "abuse_of_power";
      baseScore = 55;
    }
    
    // Amount modifier
    let amountModifier = 0;
    if (amount) {
      if (amount >= 500000) amountModifier = 20;
      else if (amount >= 100000) amountModifier = 15;
      else if (amount >= 50000) amountModifier = 10;
      else if (amount >= 10000) amountModifier = 5;
    }
    
    const riskScore = Math.min(100, baseScore + amountModifier + Math.floor(Math.random() * 10));
    
    return { category, riskScore };
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const amount = formData.amount ? parseFloat(formData.amount) : null;
      const { category, riskScore } = autoTriage(formData.text, amount);
      
      const newComplaint: Complaint = {
        id: complaints.length + 1,
        channel: formData.channel,
        complainantType: formData.complainantType,
        entity: formData.entity,
        governorate: formData.governorate,
        topic: formData.topic,
        amount,
        text: formData.text,
        riskScore,
        status: "new",
        createdAt: new Date().toISOString(),
        category
      };
      
      setComplaints(prev => [newComplaint, ...prev]);
      
      // Reset form
      setFormData({
        channel: "",
        complainantType: "",
        entity: "",
        governorate: "",
        topic: "",
        amount: "",
        text: ""
      });
      
      toast.success(language === "arabic" ? `تم إضافة البلاغ بنجاح - درجة الخطورة: ${riskScore}` : `Complaint added successfully - Risk Score: ${riskScore}`);
      
      // Switch to triage tab
      setActiveTab("triage");
    } catch (error) {
      toast.error(language === "arabic" ? "حدث خطأ أثناء إرسال البلاغ" : "Error submitting complaint");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleReset = () => {
    setFormData({
      channel: "",
      complainantType: "",
      entity: "",
      governorate: "",
      topic: "",
      amount: "",
      text: ""
    });
  };
  
  const exportToJSON = () => {
    const dataStr = JSON.stringify(complaints, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ruzn-complaints-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(language === "arabic" ? "تم تصدير البيانات" : "Data exported");
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
              <button onClick={exportToJSON} className="ruzn-btn-gold text-sm flex items-center gap-2">
                <Download className="w-4 h-4" />
                JSON
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-1 container max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(["intake", "triage", "entity", "schemas"] as TabId[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`ruzn-tab ${activeTab === tab ? "active" : ""} flex items-center gap-2`}
            >
              {tab === "intake" && <FileText className="w-4 h-4" />}
              {tab === "triage" && <ListFilter className="w-4 h-4" />}
              {tab === "entity" && <Map className="w-4 h-4" />}
              {tab === "schemas" && <Code className="w-4 h-4" />}
              {text.tabs[tab]}
            </button>
          ))}
        </div>
        
        {/* Tab Content */}
        {activeTab === "intake" && (
          <Card className="ruzn-card">
            <div className="ruzn-card-header">
              <h2 className="text-lg font-semibold">{text.intake.title}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">{text.intake.channel}</label>
                  <select
                    value={formData.channel}
                    onChange={e => setFormData(prev => ({ ...prev, channel: e.target.value }))}
                    className="ruzn-input"
                    required
                  >
                    <option value="">--</option>
                    {text.intake.channels.map(ch => (
                      <option key={ch} value={ch}>{ch}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">{text.intake.complainantType}</label>
                  <select
                    value={formData.complainantType}
                    onChange={e => setFormData(prev => ({ ...prev, complainantType: e.target.value }))}
                    className="ruzn-input"
                    required
                  >
                    <option value="">--</option>
                    {text.intake.complainantTypes.map(ct => (
                      <option key={ct} value={ct}>{ct}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">{text.intake.entity}</label>
                  <select
                    value={formData.entity}
                    onChange={e => setFormData(prev => ({ ...prev, entity: e.target.value }))}
                    className="ruzn-input"
                    required
                  >
                    <option value="">--</option>
                    {SAMPLE_ENTITIES.map(ent => (
                      <option key={ent} value={ent}>{ent}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">{text.intake.governorate}</label>
                  <select
                    value={formData.governorate}
                    onChange={e => setFormData(prev => ({ ...prev, governorate: e.target.value }))}
                    className="ruzn-input"
                    required
                  >
                    <option value="">--</option>
                    {text.intake.governorates.map(gov => (
                      <option key={gov} value={gov}>{gov}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">{text.intake.topic}</label>
                  <input
                    type="text"
                    value={formData.topic}
                    onChange={e => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                    className="ruzn-input"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">{text.intake.amount}</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="ruzn-input"
                    min="0"
                    step="0.001"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-muted-foreground mb-2">{text.intake.text}</label>
                <textarea
                  value={formData.text}
                  onChange={e => setFormData(prev => ({ ...prev, text: e.target.value }))}
                  className="ruzn-input min-h-[120px]"
                  required
                />
              </div>
              
              <div className="flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={handleReset} className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  {text.intake.reset}
                </Button>
                <Button type="submit" disabled={isSubmitting} className="gap-2 bg-primary text-primary-foreground">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {text.intake.submit}
                </Button>
              </div>
            </form>
          </Card>
        )}
        
        {activeTab === "triage" && (
          <Card className="ruzn-card">
            <div className="ruzn-card-header">
              <h2 className="text-lg font-semibold">{text.triage.title}</h2>
              <div className="flex gap-2">
                {(["all", "high", "medium", "low"] as RiskLevel[]).map(level => (
                  <button
                    key={level}
                    onClick={() => setRiskFilter(level)}
                    className={`ruzn-tab ${riskFilter === level ? "active" : ""}`}
                  >
                    {text.triage[level]}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4">
              {filteredComplaints.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{text.triage.noComplaints}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="text-start p-2">#</th>
                        <th className="text-start p-2">{text.intake.entity}</th>
                        <th className="text-start p-2">{text.intake.topic}</th>
                        <th className="text-start p-2">{language === "arabic" ? "الخطورة" : "Risk"}</th>
                        <th className="text-start p-2">{language === "arabic" ? "الحالة" : "Status"}</th>
                        <th className="text-start p-2">{language === "arabic" ? "التاريخ" : "Date"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredComplaints.map(complaint => (
                        <tr key={complaint.id} className="border-t border-border/30 hover:bg-muted/20">
                          <td className="p-3">{complaint.id}</td>
                          <td className="p-3">{complaint.entity}</td>
                          <td className="p-3">{complaint.topic}</td>
                          <td className="p-3">
                            <span className={`ruzn-tag ${getRiskClass(complaint.riskScore)}`}>
                              {getRiskLabel(complaint.riskScore, language)} ({complaint.riskScore})
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="ruzn-tag ruzn-tag-info">
                              {text.triage.status[complaint.status]}
                            </span>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {new Date(complaint.createdAt).toLocaleDateString(language === "arabic" ? "ar-OM" : "en-US")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        )}
        
        {activeTab === "entity" && (
          <div className="space-y-6">
            <Card className="ruzn-card">
              <div className="ruzn-card-header">
                <div>
                  <h2 className="text-lg font-semibold">{text.entity.title}</h2>
                  <p className="text-sm text-muted-foreground">{text.entity.subtitle}</p>
                </div>
              </div>
              <div className="p-4">
                {entityStats.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">{text.triage.noComplaints}</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {entityStats.map(entity => (
                      <div key={entity.name} className="ruzn-kpi">
                        <div className="flex items-center gap-2 mb-3">
                          <Building2 className="w-5 h-5 text-primary" />
                          <span className="font-semibold">{entity.name}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">{text.entity.totalComplaints}</span>
                            <p className="ruzn-kpi-value">{entity.totalComplaints}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{text.entity.highRisk}</span>
                            <p className="text-red-400 font-bold">{entity.highRisk}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{text.entity.avgRisk}</span>
                            <p className={`font-bold ${entity.avgRiskScore >= 70 ? "text-red-400" : entity.avgRiskScore >= 40 ? "text-yellow-400" : "text-green-400"}`}>
                              {entity.avgRiskScore}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{text.entity.topCategory}</span>
                            <p className="text-primary text-xs">{text.categories[entity.topCategory as keyof typeof text.categories]}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
        
        {activeTab === "schemas" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="ruzn-card">
              <div className="ruzn-card-header">
                <h2 className="text-lg font-semibold">{text.schemas.complaintSchema}</h2>
              </div>
              <div className="p-4">
                <pre className="text-xs bg-black/30 p-4 rounded-lg overflow-auto max-h-[400px] font-mono">
                  {JSON.stringify(COMPLAINT_SCHEMA, null, 2)}
                </pre>
              </div>
            </Card>
            
            <Card className="ruzn-card">
              <div className="ruzn-card-header">
                <h2 className="text-lg font-semibold">{text.schemas.reportSchema}</h2>
              </div>
              <div className="p-4">
                <pre className="text-xs bg-black/30 p-4 rounded-lg overflow-auto max-h-[400px] font-mono">
                  {JSON.stringify(REPORT_SCHEMA, null, 2)}
                </pre>
              </div>
            </Card>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="border-t border-border/30 py-4 text-center text-sm text-muted-foreground">
        {language === "arabic" ? "مدعوم من أكيوتيريوم تكنولوجيز" : "Powered by Acuterium Technologies"}
      </footer>
    </div>
  );
}
