import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, FileText, Scale, BookOpen, FileWarning, ClipboardList, Shield, Loader2, ChevronDown, ChevronUp, Upload } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// Document type icons and colors
const documentTypeConfig: Record<string, { icon: React.ReactNode; color: string; label: string; labelAr: string }> = {
  royal_decree: { icon: <Scale className="w-5 h-5" />, color: "bg-amber-500/20 text-amber-400 border-amber-500/30", label: "Royal Decree", labelAr: "مرسوم سلطاني" },
  regulation: { icon: <Shield className="w-5 h-5" />, color: "bg-blue-500/20 text-blue-400 border-blue-500/30", label: "Regulation", labelAr: "لائحة" },
  policy: { icon: <FileText className="w-5 h-5" />, color: "bg-purple-500/20 text-purple-400 border-purple-500/30", label: "Policy", labelAr: "سياسة" },
  guideline: { icon: <BookOpen className="w-5 h-5" />, color: "bg-green-500/20 text-green-400 border-green-500/30", label: "Guideline", labelAr: "دليل" },
  report: { icon: <ClipboardList className="w-5 h-5" />, color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30", label: "Report", labelAr: "تقرير" },
  legal_article: { icon: <FileWarning className="w-5 h-5" />, color: "bg-red-500/20 text-red-400 border-red-500/30", label: "Legal Article", labelAr: "مادة قانونية" },
  procedure: { icon: <ClipboardList className="w-5 h-5" />, color: "bg-orange-500/20 text-orange-400 border-orange-500/30", label: "Procedure", labelAr: "إجراء" },
};

interface KnowledgeEntry {
  id: number;
  documentType: string;
  titleArabic: string | null;
  titleEnglish: string;
  referenceNumber: string | null;
  contentArabic: string | null;
  contentEnglish: string | null;
  summaryArabic: string | null;
  summaryEnglish: string | null;
  keywords: string | null;
  category: string | null;
  sourceFile: string | null;
}

export default function KnowledgeBase() {
  const [language, setLanguage] = useState<"arabic" | "english">("arabic");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // Fetch all knowledge base entries
  const { data: allEntries, isLoading, refetch } = trpc.knowledge.getAll.useQuery();
  
  // Seed mutation for admins
  const seedMutation = trpc.knowledge.seed.useMutation({
    onSuccess: () => {
      refetch();
    }
  });

  // Filter entries based on search and type
  const filteredEntries = allEntries?.filter((entry: KnowledgeEntry) => {
    const matchesSearch = !searchQuery || 
      entry.titleEnglish?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.titleArabic?.includes(searchQuery) ||
      entry.contentEnglish?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.contentArabic?.includes(searchQuery) ||
      entry.referenceNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = !selectedType || entry.documentType === selectedType;
    
    return matchesSearch && matchesType;
  }) || [];

  // Group entries by category
  const entriesByCategory = filteredEntries.reduce((acc: Record<string, KnowledgeEntry[]>, entry: KnowledgeEntry) => {
    const category = entry.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(entry);
    return acc;
  }, {});

  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const getTitle = (entry: KnowledgeEntry) => language === "arabic" ? (entry.titleArabic || entry.titleEnglish) : entry.titleEnglish;
  const getSummary = (entry: KnowledgeEntry) => language === "arabic" ? (entry.summaryArabic || entry.summaryEnglish) : entry.summaryEnglish;
  const getContent = (entry: KnowledgeEntry) => language === "arabic" ? (entry.contentArabic || entry.contentEnglish) : entry.contentEnglish;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#12121a]" dir={language === "arabic" ? "rtl" : "ltr"}>
      {/* Header */}
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-amber-500" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  {language === "arabic" ? "قاعدة المعرفة" : "Knowledge Base"}
                </h1>
                <p className="text-sm text-white/60">
                  {language === "arabic" ? "الوثائق والتشريعات القانونية" : "Legal Documents & Legislation"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Language Toggle */}
              <div className="flex rounded-lg overflow-hidden border border-white/20">
                <button
                  onClick={() => setLanguage("english")}
                  className={`px-3 py-1.5 text-sm transition-colors ${language === "english" ? "bg-amber-500 text-black" : "bg-transparent text-white/70 hover:text-white"}`}
                >
                  English
                </button>
                <button
                  onClick={() => setLanguage("arabic")}
                  className={`px-3 py-1.5 text-sm transition-colors ${language === "arabic" ? "bg-amber-500 text-black" : "bg-transparent text-white/70 hover:text-white"}`}
                >
                  العربية
                </button>
              </div>
              
              {/* Admin: Seed Button */}
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => seedMutation.mutate()}
                  disabled={seedMutation.isPending}
                  className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                >
                  {seedMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Seed DB"}
                </Button>
              )}
              
              {/* Admin: Upload Button */}
              {isAdmin && (
                <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {language === "arabic" ? "إضافة وثيقة" : "Add Document"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#1a1a24] border-white/10 text-white max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{language === "arabic" ? "إضافة وثيقة جديدة" : "Add New Document"}</DialogTitle>
                      <DialogDescription className="text-white/60">
                        {language === "arabic" ? "أدخل تفاصيل الوثيقة الجديدة" : "Enter the details of the new document"}
                      </DialogDescription>
                    </DialogHeader>
                    <UploadForm language={language} onSuccess={() => { setIsUploadOpen(false); refetch(); }} />
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <Input
              placeholder={language === "arabic" ? "البحث في الوثائق..." : "Search documents..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>
          
          {/* Document Type Filters */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedType === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType(null)}
              className={selectedType === null ? "bg-amber-500 text-black" : "border-white/20 text-white/70"}
            >
              {language === "arabic" ? "الكل" : "All"}
            </Button>
            {Object.entries(documentTypeConfig).map(([type, config]) => (
              <Button
                key={type}
                variant={selectedType === type ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType(type)}
                className={selectedType === type ? "bg-amber-500 text-black" : `border-white/20 text-white/70 hover:${config.color}`}
              >
                {config.icon}
                <span className="ml-1">{language === "arabic" ? config.labelAr : config.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredEntries.length === 0 && (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 mx-auto text-white/20 mb-4" />
            <h3 className="text-xl font-semibold text-white/60 mb-2">
              {language === "arabic" ? "لا توجد وثائق" : "No Documents Found"}
            </h3>
            <p className="text-white/40">
              {language === "arabic" ? "جرب تغيير معايير البحث" : "Try adjusting your search criteria"}
            </p>
            {isAdmin && (
              <Button
                onClick={() => seedMutation.mutate()}
                disabled={seedMutation.isPending}
                className="mt-4 bg-amber-500 text-black hover:bg-amber-600"
              >
                {seedMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {language === "arabic" ? "تحميل الوثائق الأساسية" : "Load Base Documents"}
              </Button>
            )}
          </div>
        )}

        {/* Documents by Category */}
        {!isLoading && Object.entries(entriesByCategory).map(([category, entries]) => (
          <div key={category} className="mb-8">
            <h2 className="text-lg font-semibold text-amber-400 mb-4 flex items-center gap-2">
              <div className="w-1 h-6 bg-amber-500 rounded-full" />
              {category}
              <Badge variant="secondary" className="ml-2 bg-white/10 text-white/60">
                {entries.length}
              </Badge>
            </h2>
            
            <div className="grid gap-4">
              {entries.map((entry: KnowledgeEntry) => {
                const config = documentTypeConfig[entry.documentType] || documentTypeConfig.guideline;
                const isExpanded = expandedIds.has(entry.id);
                
                return (
                  <Card key={entry.id} className="bg-white/5 border-white/10 hover:border-white/20 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${config.color}`}>
                            {config.icon}
                          </div>
                          <div>
                            <CardTitle className="text-white text-lg leading-tight">
                              {getTitle(entry)}
                            </CardTitle>
                            <CardDescription className="text-white/50 mt-1">
                              {entry.referenceNumber && (
                                <Badge variant="outline" className="mr-2 border-white/20 text-white/60">
                                  {entry.referenceNumber}
                                </Badge>
                              )}
                              <Badge className={config.color}>
                                {language === "arabic" ? config.labelAr : config.label}
                              </Badge>
                            </CardDescription>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpand(entry.id)}
                          className="text-white/60 hover:text-white"
                        >
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </Button>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <p className="text-white/70 text-sm mb-2">{getSummary(entry)}</p>
                      
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <pre className="text-white/80 text-sm whitespace-pre-wrap font-sans leading-relaxed">
                            {getContent(entry)}
                          </pre>
                          
                          {entry.keywords && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {JSON.parse(entry.keywords).map((keyword: string, idx: number) => (
                                <Badge key={idx} variant="outline" className="border-white/20 text-white/50 text-xs">
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}

// Upload Form Component
function UploadForm({ language, onSuccess }: { language: "arabic" | "english"; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    documentType: "guideline" as const,
    titleEnglish: "",
    titleArabic: "",
    referenceNumber: "",
    contentEnglish: "",
    contentArabic: "",
    summaryEnglish: "",
    summaryArabic: "",
    category: "",
    keywords: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createMutation = trpc.knowledge.create.useMutation({
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createMutation.mutateAsync({
        documentType: formData.documentType as any,
        titleEnglish: formData.titleEnglish,
        titleArabic: formData.titleArabic || undefined,
        referenceNumber: formData.referenceNumber || undefined,
        contentEnglish: formData.contentEnglish,
        contentArabic: formData.contentArabic || undefined,
        summaryEnglish: formData.summaryEnglish || undefined,
        summaryArabic: formData.summaryArabic || undefined,
        keywords: formData.keywords ? formData.keywords.split(',').map(k => k.trim()) : undefined,
        category: formData.category || undefined
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{language === "arabic" ? "نوع الوثيقة" : "Document Type"}</Label>
          <Select value={formData.documentType} onValueChange={(v) => setFormData({...formData, documentType: v as typeof formData.documentType})}>
            <SelectTrigger className="bg-white/5 border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a24] border-white/10">
              {Object.entries(documentTypeConfig).map(([type, config]) => (
                <SelectItem key={type} value={type}>
                  {language === "arabic" ? config.labelAr : config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{language === "arabic" ? "الرقم المرجعي" : "Reference Number"}</Label>
          <Input
            value={formData.referenceNumber}
            onChange={(e) => setFormData({...formData, referenceNumber: e.target.value})}
            className="bg-white/5 border-white/10"
            placeholder="e.g., RD-111/2011"
          />
        </div>
      </div>
      
      <div>
        <Label>{language === "arabic" ? "العنوان (إنجليزي)" : "Title (English)"}</Label>
        <Input
          value={formData.titleEnglish}
          onChange={(e) => setFormData({...formData, titleEnglish: e.target.value})}
          className="bg-white/5 border-white/10"
          required
        />
      </div>
      
      <div>
        <Label>{language === "arabic" ? "العنوان (عربي)" : "Title (Arabic)"}</Label>
        <Input
          value={formData.titleArabic}
          onChange={(e) => setFormData({...formData, titleArabic: e.target.value})}
          className="bg-white/5 border-white/10"
          dir="rtl"
        />
      </div>
      
      <div>
        <Label>{language === "arabic" ? "المحتوى (إنجليزي)" : "Content (English)"}</Label>
        <Textarea
          value={formData.contentEnglish}
          onChange={(e) => setFormData({...formData, contentEnglish: e.target.value})}
          className="bg-white/5 border-white/10 min-h-[150px]"
          required
        />
      </div>
      
      <div>
        <Label>{language === "arabic" ? "المحتوى (عربي)" : "Content (Arabic)"}</Label>
        <Textarea
          value={formData.contentArabic}
          onChange={(e) => setFormData({...formData, contentArabic: e.target.value})}
          className="bg-white/5 border-white/10 min-h-[150px]"
          dir="rtl"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{language === "arabic" ? "الفئة" : "Category"}</Label>
          <Input
            value={formData.category}
            onChange={(e) => setFormData({...formData, category: e.target.value})}
            className="bg-white/5 border-white/10"
            placeholder="e.g., Legal Framework"
          />
        </div>
        <div>
          <Label>{language === "arabic" ? "الكلمات المفتاحية" : "Keywords (comma-separated)"}</Label>
          <Input
            value={formData.keywords}
            onChange={(e) => setFormData({...formData, keywords: e.target.value})}
            className="bg-white/5 border-white/10"
            placeholder="audit, compliance, law"
          />
        </div>
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" className="bg-amber-500 text-black hover:bg-amber-600" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {language === "arabic" ? "إضافة الوثيقة" : "Add Document"}
        </Button>
      </div>
    </form>
  );
}
