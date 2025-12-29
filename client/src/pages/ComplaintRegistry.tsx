import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { ArrowRight, ArrowLeft, Printer, RefreshCw, FileJson, FileSpreadsheet, Copy, ChevronDown, ChevronUp, UserPlus, Users, Bell } from 'lucide-react';
import { trpc } from '../lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';

// Bilingual dictionary
const I18N = {
  ar: {
    appTitle: "سجل البلاغات والقضايا",
    appSub: "ذكاء البلاغات • تقييم المخاطر • لوحة مؤشرات • تقرير يومي لمعالي الوزير",
    pillMode: "الوضع:", pillOffline: "عرض تجريبي", pillData: "البيانات:",
    btnSeed: "توليد بيانات عشوائية", btnReset: "إعادة ضبط", btnPrint: "طباعة التقرير",
    opsTitle: "عمليات رُزن لايت", opsMeta: "استقبال • فرز • تحقيق • متابعة",
    tabIntake: "استقبال البلاغات", tabQueue: "قائمة الفرز", tabEntities: "خريطة الجهات", tabSchemas: "المخططات",
    lblChannel: "قناة البلاغ", lblType: "صفة المُبلّغ",
    lblEntity: "الجهة (وزارة / وحدة / شركة)", lblGov: "المحافظة",
    lblTopic: "الموضوع (اختياري)", lblAmount: "المبلغ (ريال عماني)",
    lblText: "نص البلاغ (عربي / English)",
    hintText: "جرّب كلمات: مناقصة • ترسية • تضارب مصالح • رشوة • عمولة • اختلاس",
    btnSubmit: "إرسال + فرز", btnSample: "تعبئة مثال",
    previewTitle: "نتيجة الفرز (معاينة)",
    tagClass: "التصنيف", tagRisk: "المخاطر", tagRoute: "الإحالة المقترحة", tagFlags: "مؤشرات",
    kTotalLbl: "إجمالي البلاغات", kHighLbl: "عالية المخاطر", kSlaLbl: "الالتزام بالـ SLA", kSavedLbl: "ساعات حفظت",
    fAll: "الكل", fHigh: "عالي", fMed: "متوسط", fLow: "منخفض",
    btnInv: "قيد التحقيق", btnClosed: "إغلاق",
    thId: "المعرف", thDate: "التاريخ", thEntity: "الجهة", thClass: "التصنيف", thRisk: "المخاطر", thStatus: "الحالة", thRoute: "الإحالة",
    caseTitle: "حزمة الحالة", entityPill: "ذكاء الجهات • مؤشرات الربط",
    ehEntity: "الجهة", ehCount: "عدد البلاغات", ehHigh: "عالية المخاطر", ehTopics: "أبرز المواضيع", ehAction: "إجراء مقترح",
    minTitle: "لوحة معالي الوزير", btnGen: "إنشاء التقرير اليومي",
    mNewLbl: "جديد اليوم", mTopLbl: "أعلى جهة مخاطرة", mAvgLbl: "متوسط المخاطر", mEscLbl: "تصعيدات",
    dailyTitle: "الملخص اليومي لمعالي الوزير",
    govTitle: "حوكمة وثقة",
    tSov: "سيادي", tSovTxt: "تشغيل محلي داخل الجهة",
    tAud: "قابل للتدقيق", tAudTxt: "مخرجات مع أسباب وأعلام",
    tSafe: "آمن", tSafeTxt: "دعم قرار فقط — التحقيق بيد الإنسان",
    tProc: "سهل التعاقد", tProcTxt: "إثبات قيمة سريع",
    toastNeedText: "اكتب نص بلاغ حقيقي (15+ حرف).",
    toastSubmitted: "تم الإرسال والفرز ✅",
    toastSample: "تمت تعبئة مثال ✅",
    toastGenerated: (n: number) => `تم توليد ${n} بلاغات ✅`,
    toastReset: "تمت إعادة الضبط ✅",
    toastPick: "اختر بلاغاً أولاً.",
    toastMarked: (id: string, s: string) => `تم تحديث ${id} إلى ${s}`,
    toastReport: "تم إنشاء التقرير ✅",
    statusNew: "جديد", statusInv: "قيد التحقيق", statusClosed: "مغلق",
    riskHigh: "عالي", riskMed: "متوسط", riskLow: "منخفض",
    backHome: "العودة للرئيسية",
  },
  en: {
    appTitle: "Complaint-Case Registry",
    appSub: "Complaints Intelligence • Risk Scoring • Dashboard • Daily Minister Brief",
    pillMode: "Mode:", pillOffline: "Demo", pillData: "Data:",
    btnSeed: "Generate Demo Data", btnReset: "Reset", btnPrint: "Print Report",
    opsTitle: "Ruzn-Lite Operations", opsMeta: "Intake • Triage • Investigate • Follow-up",
    tabIntake: "Complaints Intake", tabQueue: "Triage Queue", tabEntities: "Entity Map", tabSchemas: "Schemas",
    lblChannel: "Complaint Channel", lblType: "Complainant Type",
    lblEntity: "Entity (Ministry / Unit / SOE)", lblGov: "Governorate",
    lblTopic: "Topic (Optional)", lblAmount: "Amount (OMR)",
    lblText: "Complaint Text (Arabic / English)",
    hintText: "Try keywords: tender • award • conflict • bribe • kickback • embezzlement",
    btnSubmit: "Submit & Triage", btnSample: "Fill Sample",
    previewTitle: "Auto-Triage Output (Preview)",
    tagClass: "Classification", tagRisk: "Risk", tagRoute: "Suggested Routing", tagFlags: "Evidence Flags",
    kTotalLbl: "Total Complaints", kHighLbl: "High Risk", kSlaLbl: "SLA On-Time", kSavedLbl: "Hours Saved",
    fAll: "All", fHigh: "High", fMed: "Medium", fLow: "Low",
    btnInv: "Mark Investigating", btnClosed: "Mark Closed",
    thId: "ID", thDate: "Date", thEntity: "Entity", thClass: "Class", thRisk: "Risk", thStatus: "Status", thRoute: "Routing",
    caseTitle: "Case Pack", entityPill: "Entity Intelligence • Link Signals",
    ehEntity: "Entity", ehCount: "Complaints", ehHigh: "High Risk", ehTopics: "Top Topics", ehAction: "Suggested Action",
    minTitle: "Minister Dashboard", btnGen: "Generate Daily Report",
    mNewLbl: "New Today", mTopLbl: "Top Risk Entity", mAvgLbl: "Avg Risk", mEscLbl: "Escalations",
    dailyTitle: "Daily Minister Brief",
    govTitle: "Governance & Trust Controls",
    tSov: "Sovereign", tSovTxt: "Runs on-prem/offline",
    tAud: "Auditable", tAudTxt: "Outputs include rationale and trails",
    tSafe: "Safe", tSafeTxt: "Decision-support only; humans remain authority",
    tProc: "Procurement-Friendly", tProcTxt: "Quick proof of value",
    toastNeedText: "Add complaint text (15+ chars).",
    toastSubmitted: "Submitted + triaged ✅",
    toastSample: "Sample filled ✅",
    toastGenerated: (n: number) => `Generated ${n} demo complaints ✅`,
    toastReset: "Reset ✅",
    toastPick: "Select a complaint first.",
    toastMarked: (id: string, s: string) => `Marked ${id} as ${s}`,
    toastReport: "Daily report generated ✅",
    statusNew: "New", statusInv: "Investigating", statusClosed: "Closed",
    riskHigh: "HIGH", riskMed: "MED", riskLow: "LOW",
    backHome: "Back to Home",
  }
};

// Triage keywords
const KEYWORDS = {
  procurement: ["مناقصة", "ترسية", "عطاء", "مشتريات", "tender", "procurement", "award"],
  conflict: ["تضارب", "محاباة", "واسطة", "nepotism", "conflict"],
  bribery: ["رشوة", "عمولة", "إكرامية", "bribe", "kickback"],
  funds: ["اختلاس", "هدر", "مال عام", "تحويل", "embezzlement", "public funds"],
  fraud: ["تزوير", "تلاعب", "fraud", "forgery"],
  delay: ["تأخير", "تعطيل", "إهمال", "delay", "negligence"],
};

interface Triage {
  classification: string;
  risk_score_0_100: number;
  risk_level: 'low' | 'med' | 'high';
  routing: string;
  flags: string[];
  rationale: string;
  status: 'New' | 'Investigating' | 'Closed';
  sla_target_days: number;
}

interface Complaint {
  id: string;
  created_at: string;
  channel: string;
  complainant_type: string;
  entity: string;
  governorate: string;
  topic: string | null;
  amount_omr: number | null;
  text: string;
  triage: Triage;
}

interface EntityStats {
  entity: string;
  complaints: number;
  high: number;
  topics: Record<string, number>;
}

export default function ComplaintRegistry() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [activeTab, setActiveTab] = useState<'intake' | 'triage' | 'entities' | 'schema'>('intake');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'high' | 'med' | 'low'>('all');
  const [toast, setToast] = useState<string | null>(null);
  const [dailyReport, setDailyReport] = useState<string | null>(null);

  // Form state
  const [channel, setChannel] = useState('app');
  const [complainantType, setComplainantType] = useState('citizen');
  const [entity, setEntity] = useState('');
  const [governorate, setGovernorate] = useState('muscat');
  const [topic, setTopic] = useState('');
  const [amount, setAmount] = useState('');
  const [text, setText] = useState('');

  // Preview state
  const [preview, setPreview] = useState<Triage | null>(null);
  
  // Assignment state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedForAssignment, setSelectedForAssignment] = useState<string | null>(null);
  const [selectedAssignee, setSelectedAssignee] = useState<number | null>(null);

  const t = I18N[lang];
  const { user } = useAuth();

  // tRPC queries and mutations for assignment
  const { data: assignees } = trpc.registry.getAssignees.useQuery(undefined, {
    enabled: !!user
  });
  const { data: assignmentStats } = trpc.registry.getAssignmentStats.useQuery(undefined, {
    enabled: !!user
  });
  const assignMutation = trpc.registry.assignComplaint.useMutation({
    onSuccess: () => {
      showToast(lang === 'ar' ? 'تم تعيين البلاغ بنجاح ✅' : 'Complaint assigned successfully ✅');
      setShowAssignModal(false);
      setSelectedForAssignment(null);
      setSelectedAssignee(null);
    },
    onError: () => {
      showToast(lang === 'ar' ? 'حدث خطأ في التعيين' : 'Error assigning complaint');
    }
  });

  // Show toast
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // Generate unique ID
  const uid = () => "RUZN-" + Math.floor(100000 + Math.random() * 900000);

  // Count keyword hits
  const countHits = (text: string, arr: string[]) => {
    let c = 0;
    const t = text.toLowerCase();
    for (const k of arr) {
      if (t.includes(k.toLowerCase())) c++;
    }
    return c;
  };

  // Detect topic from text
  const detectTopic = (text: string): string => {
    const t = text.toLowerCase();
    const score = {
      topic_proc: countHits(t, KEYWORDS.procurement),
      topic_conf: countHits(t, KEYWORDS.conflict),
      topic_brib: countHits(t, KEYWORDS.bribery),
      topic_fund: countHits(t, KEYWORDS.funds),
      topic_fraud: countHits(t, KEYWORDS.fraud),
      topic_delay: countHits(t, KEYWORDS.delay),
    };
    let best = { k: "topic_fraud", v: 0 };
    for (const k of Object.keys(score) as (keyof typeof score)[]) {
      if (score[k] > best.v) best = { k, v: score[k] };
    }
    if (best.v === 0) best.k = "topic_fraud";

    if (lang === "ar") {
      return ({
        topic_proc: "المناقصات والمشتريات",
        topic_conf: "تضارب المصالح",
        topic_brib: "رشوة / فساد",
        topic_fund: "هدر / اختلاس مال عام",
        topic_fraud: "مخالفة إدارية",
        topic_delay: "تأخير / إهمال خدمة",
      } as Record<string, string>)[best.k];
    } else {
      return ({
        topic_proc: "Procurement / Tender",
        topic_conf: "Conflict of Interest",
        topic_brib: "Bribery / Corruption",
        topic_fund: "Public Funds Misuse",
        topic_fraud: "Administrative Violation",
        topic_delay: "Service Delay / Negligence",
      } as Record<string, string>)[best.k];
    }
  };

  // Triage complaint
  const triageComplaint = (text: string, topicOverride: string | null, amountStr: string): Triage => {
    const detected = topicOverride || detectTopic(text);
    const t = text.toLowerCase();

    const flags: string[] = [];
    let risk = 12;

    const kProc = countHits(t, KEYWORDS.procurement);
    const kBrib = countHits(t, KEYWORDS.bribery);
    const kFund = countHits(t, KEYWORDS.funds);
    const kFraud = countHits(t, KEYWORDS.fraud);
    const kConf = countHits(t, KEYWORDS.conflict);

    risk += kProc * 10 + kBrib * 16 + kFund * 18 + kFraud * 14 + kConf * 12;

    const flagPush = (ar: string, en: string) => flags.push(lang === "ar" ? ar : en);
    if (kBrib > 0) flagPush("إشارة محتملة للرشوة", "Possible bribery signal");
    if (kFund > 0) flagPush("مؤشر على المال العام", "Public funds keyword");
    if (kProc > 0) flagPush("إشارة لمخالفة مشتريات", "Procurement signal");
    if (kConf > 0) flagPush("إشارة لتضارب مصالح", "Conflict-of-interest signal");
    if (kFraud > 0) flagPush("إشارة لتزوير/تلاعب", "Fraud/forgery signal");

    const a = Number(amountStr || 0);
    if (!isNaN(a) && a > 0) {
      if (a >= 100000) { risk += 22; flagPush("مبلغ عالي القيمة", "High-value amount"); }
      else if (a >= 25000) { risk += 14; flagPush("مبلغ جوهري", "Material amount"); }
      else if (a >= 5000) { risk += 8; flagPush("مبلغ غير بسيط", "Non-trivial amount"); }
    }

    if (t.includes("anonymous") || t.includes("مجهول") || t.includes("سري")) {
      risk += 6; flagPush("بلاغ مجهول/حساس", "Anonymous submission");
    }

    risk = Math.max(0, Math.min(100, risk));

    let level: 'low' | 'med' | 'high' = "low";
    if (risk >= 70) level = "high";
    else if (risk >= 40) level = "med";

    let routing: string;
    if (lang === "ar") {
      routing = "دائرة البلاغات والتقارير";
      if (detected.includes("المناقصات")) routing = "فريق رقابة المناقصات";
      if (detected.includes("رشوة") || detected.includes("اختلاس")) routing = "خلية النزاهة والتحري";
      if (detected.includes("تضارب")) routing = "مراجعة الحوكمة";
      if (detected.includes("تأخير")) routing = "تدقيق الأداء";
    } else {
      routing = "Complaints & Reports Directorate";
      if (detected.includes("Procurement")) routing = "Procurement Oversight Team";
      if (detected.includes("Bribery") || detected.includes("Funds")) routing = "Integrity & Investigation Cell";
      if (detected.includes("Conflict")) routing = "Governance & Ethics Review";
      if (detected.includes("Delay")) routing = "Service Performance Audit";
    }

    const sla = level === "high" ? 2 : (level === "med" ? 5 : 10);

    const rationale = (lang === "ar")
      ? `التصنيف: ${detected} | إشارات: مشتريات=${kProc} رشوة=${kBrib} مال عام=${kFund}`
      : `Topic: ${detected} | signals: procurement=${kProc}, bribery=${kBrib}, funds=${kFund}`;

    return {
      classification: detected,
      risk_score_0_100: risk,
      risk_level: level,
      routing,
      flags: flags.length ? flags : [(lang === "ar" ? "لا توجد مؤشرات عالية" : "No high-risk keywords")],
      rationale,
      status: "New",
      sla_target_days: sla
    };
  };

  // Submit complaint
  const submitComplaint = () => {
    if (!text || text.length < 15) {
      showToast(t.toastNeedText);
      return;
    }

    const triage = triageComplaint(text, topic || null, amount);
    const item: Complaint = {
      id: uid(),
      created_at: new Date().toISOString(),
      channel,
      complainant_type: complainantType,
      entity: entity || (lang === "ar" ? "جهة غير محددة" : "Unknown Entity"),
      governorate,
      topic: topic || null,
      amount_omr: amount ? Number(amount) : null,
      text,
      triage
    };

    setComplaints(prev => [item, ...prev]);
    setPreview(triage);
    setText('');
    showToast(t.toastSubmitted);
  };

  // Fill sample
  const fillSample = () => {
    setEntity(lang === "ar" ? "هيئة المشتريات العامة (تجريبي)" : "Public Procurement Authority (Demo)");
    setAmount("45000");
    setText(lang === "ar"
      ? "وردت معلومات عن تلاعب في ترسية مناقصة، ووجود تضارب مصالح بين مسؤول وشركة مقاولات. هناك طلب عمولة غير رسمية."
      : "Information indicates irregularities in tender award, possible conflict of interest, and an unofficial kickback request.");
    showToast(t.toastSample);
  };

  // Seed demo data
  const seedDemo = () => {
    const entities_ar = ["بلدية مسقط", "وزارة النقل", "شركة حكومية", "مديرية صحية", "وحدة الضرائب"];
    const entities_en = ["Muscat Municipality", "Ministry of Transport", "SOE Logistics", "Health Directorate", "Tax Unit"];
    const texts_ar = [
      "شبهة تلاعب في ترسية مناقصة وطلب عمولة.",
      "تضارب مصالح بين مسؤول وشركة مقاولات.",
      "هدر في المال العام بأسعار مبالغ فيها.",
      "شبهة تزوير في مستندات توريد.",
      "تأخير متعمد مع طلب إكرامية.",
    ];
    const texts_en = [
      "Possible tender manipulation and kickback.",
      "Conflict-of-interest with preferential treatment.",
      "Public funds wastage via inflated pricing.",
      "Possible forgery in procurement documents.",
      "Deliberate delay with payment request.",
    ];
    const channels = lang === "ar" ? ["التطبيق", "واتساب", "الخط الساخن"] : ["App", "WhatsApp", "Hotline"];
    const types = lang === "ar" ? ["مواطن", "موظف", "مجهول"] : ["Citizen", "Employee", "Anonymous"];
    const govs = lang === "ar" ? ["مسقط", "ظفار", "الداخلية"] : ["Muscat", "Dhofar", "Al Dakhiliyah"];

    const n = 9 + Math.floor(Math.random() * 7);
    const newComplaints: Complaint[] = [];

    for (let i = 0; i < n; i++) {
      const textVal = (lang === "ar" ? texts_ar : texts_en)[Math.floor(Math.random() * 5)];
      const entityVal = (lang === "ar" ? entities_ar : entities_en)[Math.floor(Math.random() * 5)];
      const amountVal = [0, 1500, 8000, 25000, 65000, 120000][Math.floor(Math.random() * 6)];
      const triage = triageComplaint(textVal, null, String(amountVal));

      newComplaints.push({
        id: uid(),
        created_at: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 48).toISOString(),
        channel: channels[Math.floor(Math.random() * channels.length)],
        complainant_type: types[Math.floor(Math.random() * types.length)],
        entity: entityVal,
        governorate: govs[Math.floor(Math.random() * govs.length)],
        topic: null,
        amount_omr: amountVal || null,
        text: textVal,
        triage
      });
    }

    setComplaints(prev => [...newComplaints, ...prev].sort((a, b) => b.created_at.localeCompare(a.created_at)));
    showToast(t.toastGenerated(n));
  };

  // Reset all
  const resetAll = () => {
    setComplaints([]);
    setSelectedId(null);
    setFilter('all');
    setPreview(null);
    setDailyReport(null);
    showToast(t.toastReset);
  };

  // Mark selected
  const markSelected = (status: 'Investigating' | 'Closed') => {
    if (!selectedId) {
      showToast(t.toastPick);
      return;
    }
    setComplaints(prev => prev.map(c =>
      c.id === selectedId ? { ...c, triage: { ...c.triage, status } } : c
    ));
    showToast(t.toastMarked(selectedId, status === 'Closed' ? t.statusClosed : t.statusInv));
  };

  // Compute entity map
  const computeEntityMap = (): EntityStats[] => {
    const map = new Map<string, EntityStats>();
    complaints.forEach(c => {
      const k = c.entity || (lang === "ar" ? "غير معروف" : "Unknown");
      if (!map.has(k)) map.set(k, { entity: k, complaints: 0, high: 0, topics: {} });
      const obj = map.get(k)!;
      obj.complaints++;
      if (c.triage.risk_level === "high") obj.high++;
      const topic = c.triage.classification;
      obj.topics[topic] = (obj.topics[topic] || 0) + 1;
    });
    return Array.from(map.values()).sort((a, b) => (b.high * 100 + b.complaints) - (a.high * 100 + a.complaints));
  };

  // Compute KPIs
  const computeKPIs = () => {
    const total = complaints.length;
    const high = complaints.filter(c => c.triage.risk_level === "high").length;
    const sla = total ? Math.min(99, Math.round(86 + Math.random() * 12)) : 0;
    const saved = Math.round(total * 1.2);
    const today = new Date().toISOString().slice(0, 10);
    const newToday = complaints.filter(c => c.created_at.slice(0, 10) === today).length;
    const avgRisk = total ? Math.round(complaints.reduce((s, c) => s + c.triage.risk_score_0_100, 0) / total) : 0;
    const escalations = complaints.filter(c => c.triage.risk_level === "high" && c.triage.status !== "Closed").length;

    const entityMap = computeEntityMap();
    const topEntity = entityMap.length > 0 ? entityMap[0].entity : "—";

    return { total, high, sla, saved, newToday, avgRisk, escalations, topEntity };
  };

  // Generate daily report
  const generateDailyReport = () => {
    const date = new Date().toISOString().slice(0, 10);
    const open = complaints.filter(c => c.triage.status !== "Closed");
    const totalOpen = open.length;
    const highOpen = open.filter(c => c.triage.risk_level === "high").length;
    const avgRisk = complaints.length ? Math.round(complaints.reduce((s, c) => s + c.triage.risk_score_0_100, 0) / complaints.length) : 0;

    const entityMap = computeEntityMap();
    const hotspots = entityMap.slice(0, 5).map(e => ({
      entity: e.entity,
      complaints: e.complaints,
      high_risk: e.high,
      top_topics: Object.entries(e.topics).sort((a, b) => b[1] - a[1]).slice(0, 2).map(x => x[0])
    }));

    const actions: string[] = [];
    if (highOpen > 0) actions.push(lang === "ar"
      ? "اعتماد توسيع عينة التدقيق على الجهات الأعلى مخاطرة."
      : "Authorize targeted audit sampling on top risk entities.");
    if (avgRisk >= 50) actions.push(lang === "ar"
      ? "توجيه اجتماع أسبوعي لمراجعة اتجاهات المخاطر."
      : "Request weekly risk trend review.");
    if (totalOpen >= 10) actions.push(lang === "ar"
      ? "تعزيز قدرة الفرز وتقصير SLA."
      : "Increase triage capacity / tighten SLA.");

    const report = `
${lang === "ar" ? "التاريخ" : "Date"}: ${date}
${lang === "ar" ? "السرية" : "Confidentiality"}: ${lang === "ar" ? "سري — للاستخدام الداخلي فقط" : "CONFIDENTIAL — Internal Use Only"}

${lang === "ar" ? "مؤشرات" : "KPIs"}:
• ${lang === "ar" ? "جديد اليوم" : "New Today"}: ${complaints.filter(c => c.created_at.slice(0, 10) === date).length}
• ${lang === "ar" ? "المفتوح" : "Total Open"}: ${totalOpen}
• ${lang === "ar" ? "عالي المخاطر" : "High Risk Open"}: ${highOpen}
• ${lang === "ar" ? "متوسط المخاطر" : "Avg Risk"}: ${avgRisk}%

${lang === "ar" ? "أبرز الجهات" : "Hotspots"}:
${hotspots.map(h => `• ${h.entity} — ${lang === "ar" ? "مفتوح" : "Open"}: ${h.complaints}, ${lang === "ar" ? "عالي" : "High"}: ${h.high_risk}`).join('\n')}

${lang === "ar" ? "إجراءات مقترحة" : "Recommended Actions"}:
${actions.length ? actions.map(a => `• ${a}`).join('\n') : `• ${lang === "ar" ? "الاستمرار في المراقبة" : "Maintain monitoring cadence"}`}
    `.trim();

    setDailyReport(report);
    showToast(t.toastReport);
  };

  // Filter complaints
  const filteredComplaints = complaints.filter(c => {
    if (filter === "all") return true;
    return c.triage.risk_level === filter;
  });

  const kpis = computeKPIs();
  const entityStats = computeEntityMap();

  // Risk tag component
  const RiskTag = ({ level }: { level: 'low' | 'med' | 'high' }) => {
    const colors = {
      high: 'border-red-500/35 text-red-400 bg-red-500/10',
      med: 'border-yellow-500/35 text-yellow-400 bg-yellow-500/10',
      low: 'border-green-500/30 text-green-400 bg-green-500/10'
    };
    const labels = {
      high: t.riskHigh,
      med: t.riskMed,
      low: t.riskLow
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs ${colors[level]}`}>
        {labels[level]}
      </span>
    );
  };

  // Status tag component
  const StatusTag = ({ status }: { status: 'New' | 'Investigating' | 'Closed' }) => {
    const colors = {
      New: 'border-blue-500/30 text-blue-400 bg-blue-500/10',
      Investigating: 'border-yellow-500/35 text-yellow-400 bg-yellow-500/10',
      Closed: 'border-green-500/30 text-green-400 bg-green-500/10'
    };
    const labels = {
      New: t.statusNew,
      Investigating: t.statusInv,
      Closed: t.statusClosed
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs ${colors[status]}`}>
        {labels[status]}
      </span>
    );
  };

  // Initialize with demo data
  useEffect(() => {
    if (complaints.length === 0) {
      seedDemo();
    }
  }, []);

  return (
    <div className="min-h-screen" style={{
      background: 'radial-gradient(1200px 600px at 60% 18%, rgba(214,179,106,.16), transparent 55%), radial-gradient(900px 500px at 20% 80%, rgba(96,165,250,.10), transparent 60%), linear-gradient(180deg, #050506, #0a0a0c)'
    }}>
      <div className="max-w-[1200px] mx-auto px-4 py-6 pb-20">
        {/* Header */}
        <header className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-[14px] flex items-center justify-center border border-[rgba(214,179,106,.25)]"
              style={{
                background: 'radial-gradient(circle at 30% 30%, rgba(214,179,106,.35), rgba(214,179,106,.10) 45%, rgba(255,255,255,.05) 70%, transparent 75%), linear-gradient(135deg, rgba(214,179,106,.22), rgba(255,255,255,.04))'
              }}>
              <span className="text-[rgba(214,179,106,.92)] font-bold text-sm">رُزن</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white/90">{t.appTitle}</h1>
              <p className="text-xs text-white/60">{t.appSub}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Language toggle */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-full border border-white/10 bg-white/5">
              <button
                onClick={() => setLang('ar')}
                className={`px-3 py-1 rounded-full text-xs transition ${lang === 'ar' ? 'border border-[rgba(214,179,106,.35)] bg-[rgba(214,179,106,.12)] text-[rgba(214,179,106,.95)] font-bold' : 'text-white/60'}`}
              >
                العربية
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-3 py-1 rounded-full text-xs transition ${lang === 'en' ? 'border border-[rgba(214,179,106,.35)] bg-[rgba(214,179,106,.12)] text-[rgba(214,179,106,.95)] font-bold' : 'text-white/60'}`}
              >
                English
              </button>
            </div>

            {/* Pills */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-full border border-white/10 bg-white/5 text-xs text-white/60">
              <span>{t.pillMode}</span>
              <span className="text-[rgba(214,179,106,.95)] font-bold">{t.pillOffline}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-full border border-white/10 bg-white/5 text-xs text-white/60">
              <span>{t.pillData}</span>
              <span className="text-[rgba(214,179,106,.95)] font-bold">{complaints.length}</span>
            </div>

            {/* Action buttons */}
            <button onClick={seedDemo} className="ruzn-btn text-xs">{t.btnSeed}</button>
            <button onClick={resetAll} className="ruzn-btn text-xs border-red-500/35 bg-gradient-to-b from-red-500/20 to-white/5">{t.btnReset}</button>
            <button onClick={() => window.print()} className="ruzn-btn text-xs"><Printer className="w-4 h-4" /></button>
          </div>
        </header>

        {/* Back to Home */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[rgba(214,179,106,.95)] hover:underline mb-4">
          {lang === 'ar' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          {t.backHome}
        </Link>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_.85fr] gap-4">
          {/* Left Column - Operations */}
          <div className="ruzn-card">
            <div className="p-4 border-b border-white/10" style={{ background: 'linear-gradient(90deg, rgba(214,179,106,.10), transparent 35%)' }}>
              <h2 className="text-sm font-semibold text-white/90">{t.opsTitle}</h2>
              <p className="text-xs text-white/60 mt-1">{t.opsMeta}</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-4 flex-wrap">
              {(['intake', 'triage', 'entities', 'schema'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-2 rounded-xl border text-xs transition ${activeTab === tab
                    ? 'border-[rgba(214,179,106,.35)] text-[rgba(214,179,106,.95)] bg-[rgba(214,179,106,.12)]'
                    : 'border-white/10 text-white/60 bg-white/5 hover:border-white/20'
                    }`}
                >
                  {tab === 'intake' && t.tabIntake}
                  {tab === 'triage' && t.tabQueue}
                  {tab === 'entities' && t.tabEntities}
                  {tab === 'schema' && t.tabSchemas}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-4">
              {/* Intake Tab */}
              {activeTab === 'intake' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-white/60 mb-2">{t.lblChannel}</label>
                      <select
                        value={channel}
                        onChange={e => setChannel(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/30 text-white/90 px-3 py-2 text-sm outline-none focus:border-[rgba(214,179,106,.35)]"
                      >
                        <option value="app">{lang === 'ar' ? 'التطبيق' : 'Mobile App'}</option>
                        <option value="whatsapp">{lang === 'ar' ? 'واتساب' : 'WhatsApp'}</option>
                        <option value="hotline">{lang === 'ar' ? 'الخط الساخن' : 'Hotline'}</option>
                        <option value="email">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</option>
                        <option value="walkin">{lang === 'ar' ? 'حضورياً' : 'Walk-in'}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-white/60 mb-2">{t.lblType}</label>
                      <select
                        value={complainantType}
                        onChange={e => setComplainantType(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/30 text-white/90 px-3 py-2 text-sm outline-none focus:border-[rgba(214,179,106,.35)]"
                      >
                        <option value="citizen">{lang === 'ar' ? 'مواطن' : 'Citizen'}</option>
                        <option value="employee">{lang === 'ar' ? 'موظف' : 'Employee'}</option>
                        <option value="vendor">{lang === 'ar' ? 'مورد / مقاول' : 'Vendor / Contractor'}</option>
                        <option value="anonymous">{lang === 'ar' ? 'مجهول' : 'Anonymous'}</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-white/60 mb-2">{t.lblEntity}</label>
                      <input
                        type="text"
                        value={entity}
                        onChange={e => setEntity(e.target.value)}
                        placeholder={lang === 'ar' ? 'مثال: وزارة/هيئة/شركة' : 'e.g., Ministry / Authority'}
                        className="w-full rounded-xl border border-white/10 bg-black/30 text-white/90 px-3 py-2 text-sm outline-none focus:border-[rgba(214,179,106,.35)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/60 mb-2">{t.lblGov}</label>
                      <select
                        value={governorate}
                        onChange={e => setGovernorate(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/30 text-white/90 px-3 py-2 text-sm outline-none focus:border-[rgba(214,179,106,.35)]"
                      >
                        <option value="muscat">{lang === 'ar' ? 'مسقط' : 'Muscat'}</option>
                        <option value="dhofar">{lang === 'ar' ? 'ظفار' : 'Dhofar'}</option>
                        <option value="dakhiliyah">{lang === 'ar' ? 'الداخلية' : 'Al Dakhiliyah'}</option>
                        <option value="batinah_north">{lang === 'ar' ? 'شمال الباطنة' : 'Al Batinah North'}</option>
                        <option value="sharqiyah_north">{lang === 'ar' ? 'شمال الشرقية' : 'Al Sharqiyah North'}</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-white/60 mb-2">{t.lblTopic}</label>
                      <select
                        value={topic}
                        onChange={e => setTopic(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/30 text-white/90 px-3 py-2 text-sm outline-none focus:border-[rgba(214,179,106,.35)]"
                      >
                        <option value="">{lang === 'ar' ? '— تلقائي —' : '— Auto-detect —'}</option>
                        <option value={lang === 'ar' ? 'المناقصات والمشتريات' : 'Procurement / Tender'}>{lang === 'ar' ? 'المناقصات والمشتريات' : 'Procurement / Tender'}</option>
                        <option value={lang === 'ar' ? 'تضارب المصالح' : 'Conflict of Interest'}>{lang === 'ar' ? 'تضارب المصالح' : 'Conflict of Interest'}</option>
                        <option value={lang === 'ar' ? 'رشوة / فساد' : 'Bribery / Corruption'}>{lang === 'ar' ? 'رشوة / فساد' : 'Bribery / Corruption'}</option>
                        <option value={lang === 'ar' ? 'هدر / اختلاس مال عام' : 'Public Funds Misuse'}>{lang === 'ar' ? 'هدر / اختلاس مال عام' : 'Public Funds Misuse'}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-white/60 mb-2">{t.lblAmount}</label>
                      <input
                        type="number"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder={lang === 'ar' ? 'مثال: 25000' : 'e.g., 25000'}
                        className="w-full rounded-xl border border-white/10 bg-black/30 text-white/90 px-3 py-2 text-sm outline-none focus:border-[rgba(214,179,106,.35)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-white/60 mb-2">{t.lblText}</label>
                    <textarea
                      value={text}
                      onChange={e => setText(e.target.value)}
                      placeholder={lang === 'ar' ? 'اكتب البلاغ هنا...' : 'Write complaint here...'}
                      className="w-full rounded-xl border border-white/10 bg-black/30 text-white/90 px-3 py-2 text-sm outline-none focus:border-[rgba(214,179,106,.35)] min-h-[110px] resize-y"
                    />
                    <p className="text-xs text-white/50 mt-1">{t.hintText}</p>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={submitComplaint} className="ruzn-btn-gold text-sm">{t.btnSubmit}</button>
                    <button onClick={fillSample} className="ruzn-btn text-sm">{t.btnSample}</button>
                  </div>

                  {/* Preview */}
                  {preview && (
                    <div className="mt-4 p-4 rounded-2xl border border-[rgba(214,179,106,.25)]" style={{ background: 'linear-gradient(180deg, rgba(214,179,106,.12), rgba(255,255,255,.03))' }}>
                      <h3 className="text-sm font-semibold text-[rgba(214,179,106,.95)] mb-3">{t.previewTitle}</h3>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div><span className="text-white/60">{t.tagClass}:</span> <span className="text-white/90">{preview.classification}</span></div>
                        <div><span className="text-white/60">{t.tagRisk}:</span> <RiskTag level={preview.risk_level} /> <span className="font-mono text-white/70 ml-1">{preview.risk_score_0_100}/100</span></div>
                        <div><span className="text-white/60">{t.tagRoute}:</span> <span className="text-white/90">{preview.routing}</span></div>
                        <div><span className="text-white/60">{t.tagFlags}:</span> <span className="text-white/90">{preview.flags.join(' • ')}</span></div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Triage Queue Tab */}
              {activeTab === 'triage' && (
                <div className="space-y-4">
                  {/* KPIs */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { val: kpis.total, lbl: t.kTotalLbl },
                      { val: kpis.high, lbl: t.kHighLbl },
                      { val: `${kpis.sla}%`, lbl: t.kSlaLbl },
                      { val: `${kpis.saved}h`, lbl: t.kSavedLbl },
                    ].map((k, i) => (
                      <div key={i} className="p-3 rounded-2xl border border-white/10 bg-white/5 relative overflow-hidden">
                        <div className="absolute -top-10 -right-20 w-44 h-44 rounded-full opacity-50" style={{ background: 'radial-gradient(circle at 30% 30%, rgba(214,179,106,.25), transparent 60%)' }} />
                        <div className="text-lg font-black text-[rgba(214,179,106,.95)]">{k.val}</div>
                        <div className="text-xs text-white/60 mt-1">{k.lbl}</div>
                      </div>
                    ))}
                  </div>

                  {/* Filters */}
                  <div className="flex gap-2 flex-wrap items-center">
                    {(['all', 'high', 'med', 'low'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-xl border text-xs transition ${filter === f
                          ? 'border-[rgba(214,179,106,.35)] text-[rgba(214,179,106,.95)] bg-[rgba(214,179,106,.12)]'
                          : 'border-white/10 text-white/60 bg-white/5'
                          }`}
                      >
                        {f === 'all' && t.fAll}
                        {f === 'high' && t.fHigh}
                        {f === 'med' && t.fMed}
                        {f === 'low' && t.fLow}
                      </button>
                    ))}
                    <div className="flex-1" />
                    <button onClick={() => markSelected('Investigating')} className="ruzn-btn text-xs">{t.btnInv}</button>
                    <button onClick={() => markSelected('Closed')} className="ruzn-btn text-xs">{t.btnClosed}</button>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-white/60">
                          <th className="p-2 text-start"></th>
                          <th className="p-2 text-start">{t.thId}</th>
                          <th className="p-2 text-start">{t.thDate}</th>
                          <th className="p-2 text-start">{t.thEntity}</th>
                          <th className="p-2 text-start">{t.thClass}</th>
                          <th className="p-2 text-start">{t.thRisk}</th>
                          <th className="p-2 text-start">{t.thStatus}</th>
                          <th className="p-2 text-start">{t.thRoute}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredComplaints.map(c => (
                          <tr key={c.id} className="border-t border-white/10">
                            <td className="p-2">
                              <input
                                type="radio"
                                name="sel"
                                checked={selectedId === c.id}
                                onChange={() => setSelectedId(c.id)}
                                className="accent-[rgba(214,179,106,.95)]"
                              />
                            </td>
                            <td className="p-2 font-mono text-white/80">{c.id}</td>
                            <td className="p-2 text-white/70">{c.created_at.slice(0, 10)}</td>
                            <td className="p-2 text-white/90">{c.entity}</td>
                            <td className="p-2 text-white/80">{c.triage.classification}</td>
                            <td className="p-2"><RiskTag level={c.triage.risk_level} /> <span className="font-mono text-white/60 ml-1">{c.triage.risk_score_0_100}</span></td>
                            <td className="p-2"><StatusTag status={c.triage.status} /></td>
                            <td className="p-2 text-white/70">{c.triage.routing}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Case Pack */}
                  {selectedId && (
                    <div className="mt-4 p-4 rounded-2xl border border-white/10 bg-white/5">
                      <h3 className="text-sm font-semibold text-white/90 mb-2">{t.caseTitle}</h3>
                      <pre className="text-xs text-white/70 overflow-x-auto whitespace-pre-wrap font-mono">
                        {JSON.stringify(complaints.find(c => c.id === selectedId), null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Entity Map Tab */}
              {activeTab === 'entities' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-full border border-white/10 bg-white/5 text-xs text-white/60 w-fit">
                    {t.entityPill}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-white/60">
                          <th className="p-2 text-start">{t.ehEntity}</th>
                          <th className="p-2 text-start">{t.ehCount}</th>
                          <th className="p-2 text-start">{t.ehHigh}</th>
                          <th className="p-2 text-start">{t.ehTopics}</th>
                          <th className="p-2 text-start">{t.ehAction}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entityStats.map((e, i) => {
                          const topTopics = Object.entries(e.topics).sort((a, b) => b[1] - a[1]).slice(0, 2).map(x => x[0]).join(', ');
                          const action = lang === 'ar'
                            ? (e.high >= 2 ? 'تصعيد وتوسيع عينة التدقيق' : (e.complaints >= 3 ? 'زيادة المراقبة' : 'مراقبة قياسية'))
                            : (e.high >= 2 ? 'Escalate audit sampling' : (e.complaints >= 3 ? 'Increase monitoring' : 'Standard monitoring'));
                          return (
                            <tr key={i} className="border-t border-white/10">
                              <td className="p-2 text-white/90">{e.entity}</td>
                              <td className="p-2 font-mono text-white/80">{e.complaints}</td>
                              <td className="p-2 font-mono text-white/80">{e.high}</td>
                              <td className="p-2 text-white/70">{topTopics || '—'}</td>
                              <td className="p-2 text-white/70">{action}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Schemas Tab */}
              {activeTab === 'schema' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-2 rounded-full border border-white/10 bg-white/5 text-xs text-white/60">
                      {lang === 'ar' ? 'مخططات جاهزة (POC)' : 'Preset Schemas (POC)'}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify({
                          complaint_schema_v1: {
                            required: ["id", "created_at", "channel", "complainant_type", "entity", "governorate", "text"],
                            fields: {
                              id: "string", created_at: "ISO8601 string", channel: "string",
                              triage: { classification: "string", risk_score_0_100: "number", risk_level: "low|med|high" }
                            }
                          }
                        }, null, 2));
                        showToast(lang === 'ar' ? 'تم نسخ المخططات ✅' : 'Schemas copied ✅');
                      }}
                      className="ruzn-btn text-xs"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <pre className="text-xs text-white/70 p-4 rounded-xl border border-white/10 bg-black/30 overflow-x-auto font-mono">
                    {JSON.stringify({
                      complaint_schema_v1: {
                        required: ["id", "created_at", "channel", "complainant_type", "entity", "governorate", "text"],
                        fields: {
                          id: "string",
                          created_at: "ISO8601 string",
                          channel: "string",
                          complainant_type: "string",
                          entity: "string",
                          governorate: "string",
                          topic: "string|null",
                          amount_omr: "number|null",
                          text: "string",
                          triage: {
                            classification: "string",
                            risk_score_0_100: "number",
                            risk_level: "low|med|high",
                            routing: "string",
                            flags: "string[]",
                            rationale: "string",
                            status: "New|Investigating|Closed",
                            sla_target_days: "number"
                          }
                        }
                      }
                    }, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Minister Dashboard */}
          <div className="space-y-4">
            {/* Minister Dashboard Card */}
            <div className="ruzn-card">
              <div className="p-4 border-b border-white/10" style={{ background: 'linear-gradient(90deg, rgba(214,179,106,.10), transparent 35%)' }}>
                <h2 className="text-sm font-semibold text-white/90">{t.minTitle}</h2>
                <p className="text-xs text-white/60 mt-1">{lang === 'ar' ? 'ملخص يومي • مؤشرات رقابية' : 'Daily Brief • Oversight KPIs'}</p>
              </div>

              <div className="p-4 space-y-4">
                {/* Minister KPIs */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { val: kpis.newToday, lbl: t.mNewLbl },
                    { val: kpis.topEntity.slice(0, 20), lbl: t.mTopLbl },
                    { val: `${kpis.avgRisk}%`, lbl: t.mAvgLbl },
                    { val: kpis.escalations, lbl: t.mEscLbl },
                  ].map((k, i) => (
                    <div key={i} className="p-3 rounded-2xl border border-white/10 bg-white/5">
                      <div className="text-lg font-black text-[rgba(214,179,106,.95)]">{k.val}</div>
                      <div className="text-xs text-white/60 mt-1">{k.lbl}</div>
                    </div>
                  ))}
                </div>

                <button onClick={generateDailyReport} className="ruzn-btn-gold w-full text-sm">{t.btnGen}</button>

                {/* Daily Report */}
                {dailyReport && (
                  <div className="p-4 rounded-2xl border border-[rgba(214,179,106,.25)]" style={{ background: 'linear-gradient(180deg, rgba(214,179,106,.12), rgba(255,255,255,.03))' }}>
                    <h3 className="text-sm font-semibold text-[rgba(214,179,106,.95)] mb-3">{t.dailyTitle}</h3>
                    <pre className="text-xs text-white/80 whitespace-pre-wrap font-mono">{dailyReport}</pre>
                  </div>
                )}
              </div>
            </div>

            {/* Governance Card */}
            <div className="ruzn-card">
              <div className="p-4 border-b border-white/10" style={{ background: 'linear-gradient(90deg, rgba(214,179,106,.10), transparent 35%)' }}>
                <h2 className="text-sm font-semibold text-white/90">{t.govTitle}</h2>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3">
                {[
                  { title: t.tSov, desc: t.tSovTxt },
                  { title: t.tAud, desc: t.tAudTxt },
                  { title: t.tSafe, desc: t.tSafeTxt },
                  { title: t.tProc, desc: t.tProcTxt },
                ].map((g, i) => (
                  <div key={i} className="p-3 rounded-xl border border-white/10 bg-white/5">
                    <div className="text-xs font-semibold text-[rgba(214,179,106,.95)]">{g.title}</div>
                    <div className="text-xs text-white/60 mt-1">{g.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Nav */}
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setActiveTab('intake')} className="ruzn-btn text-xs">{lang === 'ar' ? 'الذهاب للاستقبال' : 'Go Intake'}</button>
              <button onClick={() => setActiveTab('triage')} className="ruzn-btn text-xs">{lang === 'ar' ? 'الذهاب للقائمة' : 'Go Queue'}</button>
              <button onClick={() => setActiveTab('entities')} className="ruzn-btn text-xs">{lang === 'ar' ? 'الذهاب للجهات' : 'Go Entity Map'}</button>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 px-4 py-3 rounded-2xl border border-white/15 bg-black/60 backdrop-blur-lg shadow-2xl text-white/90 text-sm max-w-[380px] animate-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
    </div>
  );
}
