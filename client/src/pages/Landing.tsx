import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Shield,
  Brain,
  FileSearch,
  Scale,
  Lock,
  ArrowRight,
  Sparkles,
  CheckCircle,
  Mail,
  Building2,
  Users,
  Layers,
  Radar,
  ScrollText,
  BarChart3,
  ServerCog,
  Network,
  Globe,
} from "lucide-react";

type Language = "arabic" | "english";

const UI_TEXT = {
  arabic: {
    title: "رُزن",
    tagline: "ذكاء سيادي للحوكمة والنزاهة والامتثال",
    subtitle:
      "منصة ذكاء تشغيلي تجمع البلاغات والامتثال والبحث القانوني في طبقة واحدة قابلة للتدقيق",
    description:
      "رُزن هو نظام ذكاء اصطناعي متقدم يدعم الجهات والمؤسسات في تحويل البيانات المعقدة إلى قرارات واضحة وقابلة للتوثيق — مع الحفاظ على السيادة والخصوصية والحَوكمة.",
    // NEW: value bullets (public-safe)
    valueBullets: [
      "مخرجات قابلة للتفسير وليست صندوقاً أسود",
      "دعم قرار (Human-in-the-loop) — القرار النهائي بيد المختص",
      "أثر تدقيقي كامل (Audit Trail) وحزم أدلة قابلة للتصدير",
      "إتاحة التشغيل محلياً/سيادياً وبيئات عالية الحساسية عند الحاجة",
    ],
    sections: {
      capabilities: "قدرات رُزن الأساسية",
      howItWorks: "كيف يعمل رُزن",
      productPath: "مسار المنتج: رُزن لايت → رُزن-ASI",
      governance: "حوكمة وثقة",
      clients: "القطاعات المستهدفة",
      contact: "تواصل معنا",
    },
    capabilities: [
      {
        icon: "complaints",
        title: "ذكاء البلاغات والتقارير",
        desc: "تصنيف وفرز تلقائي، تقييم مخاطر، إحالة ذكية، وحزم حالة جاهزة للمحققين."
      },
      {
        icon: "integrity",
        title: "تحليلات النزاهة والمخاطر",
        desc: "اكتشاف أنماط المخاطر، مؤشرات التلاعب/تضارب المصالح، وبؤر المخاطر عبر الجهات."
      },
      {
        icon: "legal",
        title: "ذكاء قانوني وتشريعي سيادي",
        desc: "بحث وتفسير قانوني/تنظيمي، مقارنة نصوص، وإعداد ملخصات أثر وامتثال قابلة للتوثيق."
      },
      {
        icon: "briefs",
        title: "لوحات مؤشرات وتقارير قيادية",
        desc: "لوحة تنفيذية + موجز يومي/أسبوعي قابل للطباعة للمسؤولين وصانعي القرار."
      },
    ],
    how: [
      {
        title: "١) إدخال بيانات من قنوات متعددة",
        desc: "استقبال بلاغات/مستندات/مراسلات/سجلات — ثم توحيدها ضمن نموذج بيانات منضبط."
      },
      {
        title: "٢) فرز وتحليل وإسناد",
        desc: "توليد تصنيف + درجة مخاطر + مؤشرات + إحالة مقترحة، مع تفسير واضح لأسباب القرار."
      },
      {
        title: "٣) حزمة أدلة + أثر تدقيقي",
        desc: "إنشاء Case Pack: ملخص، مؤشرات، توصيات، وروابط/مرفقات — مع سجل كامل للأحداث."
      },
      {
        title: "٤) لوحة قيادة + موجز يومي",
        desc: "تحويل النتائج إلى لوحات مؤشرات وبؤر مخاطر وإجراءات مقترحة قابلة للتنفيذ."
      },
    ],
    productPath: {
      lite: {
        title: "رُزن لايت (Proof-of-Value)",
        desc: "نطاق بسيط وسريع لإثبات الأثر خلال أيام ببيانات منضبطة ومؤشرات قابلة للقياس."
      },
      asi: {
        title: "رُزن-ASI (المنصة الكاملة)",
        desc: "أتمتة متعددة الدوائر، تكاملات أعمق، إدارة سياسات، قدرات بحث قانوني موسعة، وتشغيل سيادي."
      },
      note:
        "المبدأ: نبدأ صغيراً — نثبت الأثر — ثم نوسع النطاق بثقة وبحوكمة."
    },
    governance: [
      {
        icon: "sov",
        title: "سيادة التشغيل",
        desc: "خيارات تشغيل محلي/سيادي، وملاءمة لبيئات عالية الحساسية عند الحاجة."
      },
      {
        icon: "audit",
        title: "قابل للتدقيق",
        desc: "كل مخرج يتضمن أسباباً، مؤشرات، وسجل أحداث — لتقليل المخاطر وتعزيز الثقة."
      },
      {
        icon: "safe",
        title: "دعم قرار لا اتهام",
        desc: "رُزن يرشّح ويصنف ويقترح — لكنه لا يستبدل الحكم المهني ولا يصدر أحكاماً."
      },
      {
        icon: "deploy",
        title: "قابل للنشر بسرعة",
        desc: "حزمة PoV سريعة، ثم قابلية توسع تدريجية حسب السياسات والحوكمة."
      },
    ],
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
    clients: "القطاعات المستهدفة",
    clientTypes: ["الجهات الحكومية", "المؤسسات المالية", "الشركات الكبرى", "القطاعات المنظمة"]
  },
  english: {
    title: "Ruzn",
    tagline: "Sovereign Intelligence for Governance, Integrity & Compliance",
    subtitle:
      "An auditable operations layer unifying complaints, compliance signals, and legal intelligence",
    description:
      "Ruzn is an advanced AI system that turns complex institutional data into clear, defensible decisions—built around sovereignty, privacy, and governance.",
    valueBullets: [
      "Explainable outputs (not black-box magic)",
      "Human-in-the-loop decision support",
      "Exportable evidence packs + full audit trail",
      "On-prem / sovereign deployment options for sensitive environments",
    ],
    sections: {
      capabilities: "Core Capabilities",
      howItWorks: "How Ruzn Works",
      productPath: "Product Path: Ruzn-Lite → Ruzn-ASI",
      governance: "Governance & Trust",
      clients: "Who It’s For",
      contact: "Contact",
    },
    capabilities: [
      {
        icon: "complaints",
        title: "Complaints & Reports Intelligence",
        desc: "Auto classification, risk scoring, smart routing, and investigator-ready case packs."
      },
      {
        icon: "integrity",
        title: "Integrity & Risk Analytics",
        desc: "Pattern detection, conflict-of-interest signals, and entity hotspot monitoring."
      },
      {
        icon: "legal",
        title: "Sovereign Legal & Legislative Intelligence",
        desc: "Legal/regulatory research, text comparison, and defensible compliance briefs."
      },
      {
        icon: "briefs",
        title: "Executive Dashboards & Briefing",
        desc: "Leadership dashboards + printable daily/weekly decision briefs."
      },
    ],
    how: [
      {
        title: "1) Multi-channel intake",
        desc: "Ingest complaints/documents/messages/records, then normalize into a governed schema."
      },
      {
        title: "2) Triage + analysis + routing",
        desc: "Generate classification, risk score, evidence flags, and suggested routing—with rationale."
      },
      {
        title: "3) Evidence pack + audit trail",
        desc: "Produce case packs: summaries, signals, recommended actions, and full event logs."
      },
      {
        title: "4) Dashboards + daily briefs",
        desc: "Convert results into KPIs, hotspots, and leadership-ready briefings."
      },
    ],
    productPath: {
      lite: {
        title: "Ruzn-Lite (Proof of Value)",
        desc: "A minimal, fast deployment to prove impact in days with measurable KPIs."
      },
      asi: {
        title: "Ruzn-ASI (Full Platform)",
        desc: "Multi-directorate workflows, deeper integrations, policy governance, and sovereign-scale deployment."
      },
      note: "Start small → prove impact → scale safely under governance."
    },
    governance: [
      {
        icon: "sov",
        title: "Sovereign deployment",
        desc: "On-prem / sovereign options designed for high-sensitivity environments."
      },
      {
        icon: "audit",
        title: "Auditable by design",
        desc: "Every output includes rationale, flags, and traceable event logs."
      },
      {
        icon: "safe",
        title: "Decision support, not accusation",
        desc: "Ruzn recommends and prioritizes—professionals remain the authority."
      },
      {
        icon: "deploy",
        title: "Rapid rollout",
        desc: "Fast PoV package with a controlled scale-up roadmap."
      },
    ],
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
    clients: "Who It’s For",
    clientTypes: ["Government Entities", "Financial Institutions", "Large Corporations", "Regulated Sectors"]
  }
};

interface LandingProps {
  onAccessGranted: () => void;
}

export default function Landing({ onAccessGranted }: LandingProps) {
  const [language, setLanguage] = useState<Language>("arabic");
  const [accessCode, setAccessCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Request access form state
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestName, setRequestName] = useState("");
  const [requestEmail, setRequestEmail] = useState("");
  const [requestOrg, setRequestOrg] = useState("");
  const [requestReason, setRequestReason] = useState("");

  const isRTL = language === "arabic";
  const text = UI_TEXT[language];

  // Server-side validation mutation
  const validateCodeMutation = trpc.access.validateCode.useMutation({
    onSuccess: (data) => {
      if (data.valid) {
        toast.success(text.accessSection.success);
        sessionStorage.setItem("ruzn_access", "granted");
        onAccessGranted();
      } else {
        toast.error(data.message || text.accessSection.error);
      }
      setIsVerifying(false);
    },
    onError: (error) => {
      toast.error(error.message || text.accessSection.error);
      setIsVerifying(false);
    }
  });

  // Request access mutation
  const requestAccessMutation = trpc.access.requestAccess.useMutation({
    onSuccess: (data) => {
      toast.success(language === "arabic" 
        ? "تم إرسال طلبك بنجاح. سيتم إعلامك عند الموافقة."
        : "Your request has been submitted. You will be notified once approved.");
      setShowRequestForm(false);
      setRequestName("");
      setRequestEmail("");
      setRequestOrg("");
      setRequestReason("");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handleAccessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) return;
    setIsVerifying(true);
    validateCodeMutation.mutate({ code: accessCode.trim().toUpperCase() });
  };

  const handleRequestAccess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestName.trim() || !requestEmail.trim()) {
      toast.error(language === "arabic" ? "يرجى إدخال الاسم والبريد الإلكتروني" : "Please enter name and email");
      return;
    }
    requestAccessMutation.mutate({
      name: requestName.trim(),
      email: requestEmail.trim(),
      organization: requestOrg.trim() || undefined,
      reason: requestReason.trim() || undefined
    });
  };

  const bgStyle = useMemo(
    () => ({
      background:
        "radial-gradient(1200px 600px at 60% 18%, rgba(214,179,106,.16), transparent 55%)," +
        "radial-gradient(900px 500px at 20% 80%, rgba(96,165,250,.10), transparent 60%)," +
        "linear-gradient(180deg, #050506, #0a0a0c)",
    }),
    []
  );

  return (
    <div
      className="min-h-screen text-foreground"
      dir={isRTL ? "rtl" : "ltr"}
      style={bgStyle}
    >
      {/* Global font + subtle glass tokens (matches ruzn-lite_poc_osai_demo_bilingual.html vibe) */}
      <style>
        {`
          :root{
            --ruzn-bg:#070708;
            --ruzn-text: rgba(255,255,255,.92);
            --ruzn-muted: rgba(255,255,255,.70);
            --ruzn-stroke: rgba(255,255,255,.10);
            --ruzn-gold: #d6b36a;
            --ruzn-gold2: #b8924d;
            --ruzn-shadow: 0 18px 60px rgba(0,0,0,.55);
          }
          .ruzn-font { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; }
          [dir="rtl"] .ruzn-font { font-family: "Noto Naskh Arabic","Noto Kufi Arabic","Geeza Pro","Tahoma","Arial",sans-serif; }
          .ruzn-glass {
            background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.03));
            border: 1px solid rgba(255,255,255,.10);
            box-shadow: var(--ruzn-shadow);
            backdrop-filter: blur(10px);
          }
          .ruzn-glass-soft {
            background: rgba(255,255,255,.04);
            border: 1px solid rgba(255,255,255,.08);
            backdrop-filter: blur(10px);
          }
          .ruzn-gold-gradient {
            background: linear-gradient(90deg, rgba(214,179,106,.95), rgba(184,146,77,.85));
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
          }
        `}
      </style>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/35 backdrop-blur-md border-b border-white/10">
        <div className="container max-w-6xl mx-auto px-4 py-4 ruzn-font">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src="/ruzn-logo.png"
                alt="Ruzn Logo"
                className="h-10 w-10 object-contain"
              />
              <span className="text-2xl font-extrabold ruzn-gold-gradient">
                {text.title}
              </span>
            </div>

            {/* Language toggle styled like the POC segmented control */}
            <div className="flex items-center gap-2">
              <div className="ruzn-glass-soft rounded-full p-1 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setLanguage("arabic")}
                  className={`px-3 py-1.5 rounded-full text-xs transition ${
                    language === "arabic"
                      ? "bg-[rgba(214,179,106,.12)] border border-[rgba(214,179,106,.35)] text-[rgba(214,179,106,.95)] font-extrabold"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  العربية
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("english")}
                  className={`px-3 py-1.5 rounded-full text-xs transition ${
                    language === "english"
                      ? "bg-[rgba(214,179,106,.12)] border border-[rgba(214,179,106,.35)] text-[rgba(214,179,106,.95)] font-extrabold"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  English
                </button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setLanguage(language === "arabic" ? "english" : "arabic")
                }
                className="gap-2 border-white/15 bg-white/5 hover:bg-white/10"
              >
                <Globe className="w-4 h-4" />
                {language === "arabic" ? "EN" : "AR"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-14 px-4">
        <div className="container max-w-6xl mx-auto text-center ruzn-font">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
            <Sparkles className="w-4 h-4 text-[rgba(214,179,106,.95)]" />
            <span className="text-sm text-[rgba(214,179,106,.95)]">
              {text.tagline}
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 ruzn-gold-gradient">
            {text.title}
          </h1>

          <p className="text-xl md:text-2xl text-white/85 mb-4">
            {text.subtitle}
          </p>

          <p className="text-base text-white/70 max-w-3xl mx-auto mb-10 leading-relaxed">
            {text.description}
          </p>

          {/* Value bullets */}
          <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-3 mb-10">
            {text.valueBullets.map((b, i) => (
              <div
                key={i}
                className="ruzn-glass-soft rounded-2xl px-4 py-3 text-white/80 flex items-start gap-3"
              >
                <CheckCircle className="w-5 h-5 text-[rgba(214,179,106,.95)] mt-0.5" />
                <span className="text-sm leading-relaxed">{b}</span>
              </div>
            ))}
          </div>

          {/* Access Code Form - Server-side validated */}
          <Card className="max-w-md mx-auto p-6 ruzn-glass border-[rgba(214,179,106,.25)]">
            <div className="flex items-center gap-2 mb-4 justify-center">
              <Lock className="w-5 h-5 text-[rgba(214,179,106,.95)]" />
              <h3 className="font-bold text-white/90">
                {text.accessSection.title}
              </h3>
            </div>
            <p className="text-sm text-white/70 mb-4">
              {text.accessSection.subtitle}
            </p>
            
            {!showRequestForm ? (
              <>
                <form onSubmit={handleAccessSubmit} className="flex gap-2">
                  <Input
                    type="password"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    placeholder={text.accessSection.placeholder}
                    className="flex-1 bg-black/30 border-white/15 text-white placeholder:text-white/40 focus-visible:ring-[rgba(214,179,106,.35)]"
                  />
                  <Button
                    type="submit"
                    disabled={isVerifying || !accessCode}
                    className="gap-2 bg-[rgba(214,179,106,.18)] border border-[rgba(214,179,106,.35)] text-[rgba(214,179,106,.95)] hover:bg-[rgba(214,179,106,.26)]"
                  >
                    {text.accessSection.button}
                    <ArrowRight className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
                  </Button>
                </form>
                <div className="mt-4 pt-4 border-t border-white/10 text-center">
                  <p className="text-sm text-white/50 mb-2">
                    {language === "arabic" ? "ليس لديك رمز وصول؟" : "Don't have an access code?"}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowRequestForm(true)}
                    className="text-sm bg-transparent border-white/20 text-white/70 hover:bg-white/5 hover:text-white"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    {language === "arabic" ? "طلب صلاحية الوصول" : "Request Access"}
                  </Button>
                </div>
              </>
            ) : (
              <form onSubmit={handleRequestAccess} className="space-y-3">
                <Input
                  type="text"
                  value={requestName}
                  onChange={(e) => setRequestName(e.target.value)}
                  placeholder={language === "arabic" ? "الاسم الكامل *" : "Full Name *"}
                  required
                  className="bg-black/30 border-white/15 text-white placeholder:text-white/40"
                />
                <Input
                  type="email"
                  value={requestEmail}
                  onChange={(e) => setRequestEmail(e.target.value)}
                  placeholder={language === "arabic" ? "البريد الإلكتروني *" : "Email Address *"}
                  required
                  className="bg-black/30 border-white/15 text-white placeholder:text-white/40"
                />
                <Input
                  type="text"
                  value={requestOrg}
                  onChange={(e) => setRequestOrg(e.target.value)}
                  placeholder={language === "arabic" ? "المؤسسة / الجهة" : "Organization (optional)"}
                  className="bg-black/30 border-white/15 text-white placeholder:text-white/40"
                />
                <Textarea
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder={language === "arabic" ? "سبب طلب الوصول" : "Reason for access (optional)"}
                  rows={2}
                  className="bg-black/30 border-white/15 text-white placeholder:text-white/40 resize-none"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowRequestForm(false)}
                    className="flex-1 bg-transparent border-white/20 text-white/70 hover:bg-white/5"
                  >
                    {language === "arabic" ? "رجوع" : "Back"}
                  </Button>
                  <Button
                    type="submit"
                    disabled={requestAccessMutation.isPending || !requestName || !requestEmail}
                    className="flex-1 gap-2 bg-[rgba(214,179,106,.18)] border border-[rgba(214,179,106,.35)] text-[rgba(214,179,106,.95)] hover:bg-[rgba(214,179,106,.26)]"
                  >
                    {requestAccessMutation.isPending 
                      ? (language === "arabic" ? "جاري الإرسال..." : "Submitting...")
                      : (language === "arabic" ? "إرسال الطلب" : "Submit Request")}
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-16 px-4">
        <div className="container max-w-6xl mx-auto ruzn-font">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white/90">
              {text.sections.capabilities}
            </h2>
            <p className="text-white/65 mt-2">
              {language === "arabic"
                ? "طبقة ذكاء واحدة لعمليات عالية الحساسية — مع حوكمة قابلة للتدقيق."
                : "One intelligence layer for high-stakes operations—auditable under governance."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <CapabilityCard
              icon={<FileSearch className="w-8 h-8" />}
              title={text.capabilities[0].title}
              description={text.capabilities[0].desc}
            />
            <CapabilityCard
              icon={<Radar className="w-8 h-8" />}
              title={text.capabilities[1].title}
              description={text.capabilities[1].desc}
            />
            <CapabilityCard
              icon={<ScrollText className="w-8 h-8" />}
              title={text.capabilities[2].title}
              description={text.capabilities[2].desc}
            />
            <CapabilityCard
              icon={<BarChart3 className="w-8 h-8" />}
              title={text.capabilities[3].title}
              description={text.capabilities[3].desc}
            />
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16 px-4">
        <div className="container max-w-6xl mx-auto ruzn-font">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white/90">
              {text.sections.howItWorks}
            </h2>
            <p className="text-white/65 mt-2">
              {language === "arabic"
                ? "تصميم تشغيلي: من الإدخال إلى الحزمة إلى التقرير — بدون ضجيج."
                : "Operational design: intake → case pack → brief. No noise."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {text.how.map((step, i) => (
              <Card
                key={i}
                className="p-6 ruzn-glass border-white/10"
              >
                <div className="flex items-start gap-4">
                  <div className="h-11 w-11 rounded-2xl flex items-center justify-center border border-[rgba(214,179,106,.25)] bg-[rgba(214,179,106,.10)]">
                    <Layers className="w-5 h-5 text-[rgba(214,179,106,.95)]" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white/90 mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-white/70 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Product Path */}
      <section className="py-16 px-4">
        <div className="container max-w-6xl mx-auto ruzn-font">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white/90">
              {text.sections.productPath}
            </h2>
            <p className="text-white/65 mt-2">{text.productPath.note}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 ruzn-glass border-[rgba(214,179,106,.20)]">
              <div className="flex items-start gap-4">
                <div className="h-11 w-11 rounded-2xl flex items-center justify-center border border-white/10 bg-white/5">
                  <ServerCog className="w-5 h-5 text-[rgba(214,179,106,.95)]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white/90">
                    {text.productPath.lite.title}
                  </h3>
                  <p className="text-sm text-white/70 mt-2 leading-relaxed">
                    {text.productPath.lite.desc}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 ruzn-glass border-white/10">
              <div className="flex items-start gap-4">
                <div className="h-11 w-11 rounded-2xl flex items-center justify-center border border-white/10 bg-white/5">
                  <Network className="w-5 h-5 text-[rgba(214,179,106,.95)]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white/90">
                    {text.productPath.asi.title}
                  </h3>
                  <p className="text-sm text-white/70 mt-2 leading-relaxed">
                    {text.productPath.asi.desc}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <div className="mt-6 text-center text-white/70 text-sm">
            {language === "arabic"
              ? "رُزن جزء من منظومة Acuterium: منصة سيادية للذكاء والتنسيق الآمن عبر القطاعات المنظمة."
              : "Ruzn is part of the Acuterium ecosystem: sovereign-grade intelligence and secure orchestration for regulated sectors."}
          </div>
        </div>
      </section>

      {/* Governance & Trust */}
      <section className="py-16 px-4">
        <div className="container max-w-6xl mx-auto ruzn-font">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white/90">
              {text.sections.governance}
            </h2>
            <p className="text-white/65 mt-2">
              {language === "arabic"
                ? "الثقة تُبنى بالحوكمة والأثر التدقيقي، لا بالشعارات."
                : "Trust comes from governance and auditability—not slogans."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {text.governance.map((g, i) => (
              <Card key={i} className="p-6 ruzn-glass border-white/10">
                <div className="flex items-start gap-4">
                  <div className="h-11 w-11 rounded-2xl flex items-center justify-center border border-[rgba(214,179,106,.25)] bg-[rgba(214,179,106,.10)]">
                    {g.icon === "sov" && <Globe className="w-5 h-5 text-[rgba(214,179,106,.95)]" />}
                    {g.icon === "audit" && <FileSearch className="w-5 h-5 text-[rgba(214,179,106,.95)]" />}
                    {g.icon === "safe" && <Shield className="w-5 h-5 text-[rgba(214,179,106,.95)]" />}
                    {g.icon === "deploy" && <ArrowRight className="w-5 h-5 text-[rgba(214,179,106,.95)]" />}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white/90 mb-2">
                      {g.title}
                    </h3>
                    <p className="text-sm text-white/70 leading-relaxed">
                      {g.desc}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Clients */}
      <section className="py-16 px-4">
        <div className="container max-w-6xl mx-auto text-center ruzn-font">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-8 text-white/90">
            {text.sections.clients}
          </h2>

          <div className="flex flex-wrap justify-center gap-4">
            {text.clientTypes.map((client, index) => (
              <div
                key={index}
                className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 border border-white/10"
              >
                {index === 0 && <Building2 className="w-5 h-5 text-[rgba(214,179,106,.95)]" />}
                {index === 1 && <Scale className="w-5 h-5 text-[rgba(214,179,106,.95)]" />}
                {index === 2 && <Users className="w-5 h-5 text-[rgba(214,179,106,.95)]" />}
                {index === 3 && <Brain className="w-5 h-5 text-[rgba(214,179,106,.95)]" />}
                <span className="text-white/75">{client}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-16 px-4">
        <div className="container max-w-6xl mx-auto text-center ruzn-font">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-4 text-white/90">
            {text.contact.title}
          </h2>
          <p className="text-white/70 mb-6">{text.contact.subtitle}</p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={`mailto:${text.contact.email}`}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <Mail className="w-5 h-5 text-[rgba(214,179,106,.95)]" />
              <span className="text-white/85">{text.contact.email}</span>
            </a>

            <Button
              className="gap-2 bg-[rgba(214,179,106,.18)] border border-[rgba(214,179,106,.35)] text-[rgba(214,179,106,.95)] hover:bg-[rgba(214,179,106,.26)]"
            >
              <CheckCircle className="w-4 h-4" />
              {text.contact.cta}
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/10">
        <div className="container max-w-6xl mx-auto text-center ruzn-font">
          <p className="text-sm text-white/60">
            {text.footer.poweredBy} • © 2024 {text.footer.rights}
          </p>
        </div>
      </footer>
    </div>
  );
}

function CapabilityCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="p-6 ruzn-glass border-white/10 hover:border-[rgba(214,179,106,.25)] transition-colors">
      <div className="text-[rgba(214,179,106,.95)] mb-4">{icon}</div>
      <h3 className="font-extrabold mb-2 text-white/90">{title}</h3>
      <p className="text-sm text-white/70 leading-relaxed">{description}</p>
    </Card>
  );
}
