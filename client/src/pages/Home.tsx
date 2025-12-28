import { useState, useRef, useEffect, useCallback } from "react";
import DemoWalkthrough, { useWalkthrough } from "@/components/DemoWalkthrough";
import MobileBottomNav from "@/components/MobileBottomNav";
import PullToRefreshIndicator from "@/components/PullToRefreshIndicator";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
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
  Trash2,
  BarChart3,
  Settings,
  Mic,
  MicOff,
  Clock,
  CheckCircle,
  FileText,
  TrendingUp,
  ClipboardList,
  Map,
  Paperclip,
  Volume2,
  VolumeX,
  X,
  Image,
  FileUp
} from "lucide-react";
import { Link } from "wouter";

type Language = "arabic" | "english";
type Feature = "complaints" | "legislative";
type MessageRole = "user" | "assistant";

interface Message {
  role: MessageRole;
  content: string;
  attachment?: {
    url: string;
    fileName: string;
    fileType: string;
  };
}

interface UploadedFile {
  url: string;
  fileName: string;
  fileType: string;
  preview?: string;
}

// Sample queries based on real OSAI cases and laws
const PRESET_QUERIES = {
  complaints: {
    arabic: [
      "موظف في هيئة البيئة يستغل منصبه للسماح بنقل مواد الردم دون تصريح",
      "موظف في هيئة الاستثمار يتلاعب بفواتير السفر بالتواطؤ مع وكالة سفر يملكها قريبه",
      "موظف في بلدية صحار يجمع غرامات المخالفات نقداً دون إيداعها"
    ],
    english: [
      "Environment Authority employee permitting transport of filling materials without approval",
      "Oman Investment Authority employee manipulating travel invoices in collusion with relative's travel agency",
      "Sohar Municipality employee collecting violation fines in cash without depositing them"
    ]
  },
  legislative: {
    arabic: [
      "ما هي صلاحيات جهاز الرقابة المالية وفقاً للمرسوم 111/2011؟",
      "ما هي عقوبة استغلال المنصب حسب المادة 7 من قانون حماية المال العام؟",
      "ما هو واجب الإبلاغ عن المخالفات وفقاً للمادة 5؟"
    ],
    english: [
      "What are OSAI's powers under Royal Decree 111/2011?",
      "What is the penalty for abuse of position under Article 7 of the Public Funds Law?",
      "What is the duty to report violations under Article 5?"
    ]
  }
};

const UI_TEXT = {
  arabic: {
    title: "رُزن",
    subtitle: "مساعدك الذكي لجهاز الرقابة المالية والإدارية للدولة",
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
    sampleComplaints: "نماذج الشكاوى",
    analytics: "التحليلات",
    admin: "لوحة المشرف",
    operations: "مركز العمليات",
    entityMap: "خريطة الجهات",
    comparativeAnalysis: "التحليل المقارن",
    caseLaw: "السوابق القضائية",
    complaintRegistry: "سجل البلاغات",
    knowledgeBase: "قاعدة المعرفة",
    voiceInput: "إدخال صوتي",
    recording: "جاري التسجيل...",
    attachFile: "إرفاق ملف",
    uploadingFile: "جاري رفع الملف...",
    fileUploaded: "تم رفع الملف",
    analyzingDocument: "جاري تحليل المستند...",
    removeFile: "إزالة الملف",
    speakResponse: "قراءة الرد",
    stopSpeaking: "إيقاف القراءة"
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
    sampleComplaints: "Sample Complaints",
    analytics: "Analytics",
    admin: "Admin Panel",
    operations: "Operations",
    entityMap: "Entity Map",
    comparativeAnalysis: "Comparative Analysis",
    caseLaw: "Case Law",
    complaintRegistry: "Complaint Registry",
    knowledgeBase: "Knowledge Base",
    voiceInput: "Voice Input",
    recording: "Recording...",
    attachFile: "Attach File",
    uploadingFile: "Uploading file...",
    fileUploaded: "File uploaded",
    analyzingDocument: "Analyzing document...",
    removeFile: "Remove file",
    speakResponse: "Speak Response",
    stopSpeaking: "Stop Speaking"
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
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState<number | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { user, isAuthenticated, logout } = useAuth();
  const { shouldShow: showWalkthrough, setShouldShow: setShowWalkthrough, resetWalkthrough } = useWalkthrough();
  const haptic = useHapticFeedback();
  
  // Pull-to-refresh for chat history
  const utils = trpc.useUtils();
  const handleRefresh = useCallback(async () => {
    // Refresh dashboard stats and samples
    await Promise.all([
      utils.dashboard.getStats.invalidate(),
      utils.chat.getSamples.invalidate()
    ]);
    haptic.triggerSuccess();
  }, [utils, haptic]);
  
  const {
    pullDistance,
    isRefreshing,
    containerRef: pullRefreshContainerRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80
  });
  
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
  
  const uploadDocumentMutation = trpc.chat.uploadDocument.useMutation({
    onSuccess: (data) => {
      if (data.status === 'success') {
        setUploadedFile({
          url: data.url,
          fileName: data.fileName,
          fileType: data.fileType
        });
        toast.success(text.fileUploaded);
      } else {
        toast.error(language === 'arabic' ? 'فشل رفع الملف' : 'File upload failed');
      }
      setIsUploading(false);
    },
    onError: () => {
      toast.error(language === 'arabic' ? 'فشل رفع الملف' : 'File upload failed');
      setIsUploading(false);
    }
  });
  
  const analyzeDocumentMutation = trpc.chat.analyzeDocument.useMutation({
    onSuccess: (data) => {
      if (data.status === 'success') {
        const analysisContent = typeof data.analysis === 'string' ? data.analysis : String(data.analysis);
        setMessages(prev => [...prev, { role: 'assistant', content: analysisContent }]);
      } else {
        toast.error(language === 'arabic' ? 'فشل تحليل المستند' : 'Document analysis failed');
      }
    }
  });
  
  const { data: samples } = trpc.chat.getSamples.useQuery({ 
    language,
    category: undefined 
  });
  
  // Dashboard stats query
  const { data: dashboardStats } = trpc.dashboard.getStats.useQuery();
  
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
    if ((!input.trim() && !uploadedFile) || chatMutation.isPending || analyzeDocumentMutation.isPending || isStreaming) return;
    
    haptic.triggerLight(); // Haptic feedback on send
    const userMessage = input.trim();
    setInput("");
    
    // If there's an uploaded file, analyze it with the AI
    if (uploadedFile) {
      const messageWithAttachment: Message = {
        role: "user",
        content: userMessage || (language === 'arabic' ? 'تحليل المستند المرفق' : 'Analyze attached document'),
        attachment: uploadedFile
      };
      setMessages(prev => [...prev, messageWithAttachment]);
      
      analyzeDocumentMutation.mutate({
        documentUrl: uploadedFile.url,
        documentType: uploadedFile.fileType,
        language,
        additionalContext: userMessage || undefined
      });
      
      setUploadedFile(null);
    } else {
      // Add user message
      setMessages(prev => [...prev, { role: "user", content: userMessage }]);
      
      // Use streaming for chat
      setIsStreaming(true);
      setStreamingContent("");
      
      try {
        const response = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage,
            feature,
            language,
            history: messages.slice(-10),
            userId: user?.id
          })
        });
        
        if (!response.ok) throw new Error('Stream failed');
        
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No reader');
        
        const decoder = new TextDecoder();
        let accumulatedContent = "";
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'status' && data.status === 'searching') {
                  setIsSearchingWeb(true);
                } else if (data.type === 'chunk' && data.content) {
                  setIsSearchingWeb(false);
                  accumulatedContent += data.content;
                  setStreamingContent(accumulatedContent);
                } else if (data.type === 'done') {
                  // Stream complete, add final message
                  setIsSearchingWeb(false);
                  setMessages(prev => [...prev, { role: "assistant", content: accumulatedContent }]);
                  setStreamingContent("");
                } else if (data.type === 'error') {
                  setIsSearchingWeb(false);
                  throw new Error(data.error);
                }
              } catch (e) {
                // Skip malformed JSON
              }
            }
          }
        }
      } catch (error) {
        console.error('Streaming error:', error);
        toast.error(language === 'arabic' ? 'فشل الاتصال بالخادم' : 'Failed to connect to server');
        // Fallback to non-streaming
        chatMutation.mutate({
          message: userMessage,
          language,
          feature,
          history: messages
        });
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
        setIsSearchingWeb(false);
      }
    }
  };
  
  // File upload handling
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!isAuthenticated) {
      toast.error(text.loginRequired);
      return;
    }
    
    // Check file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(language === 'arabic' ? 'نوع الملف غير مدعوم. يرجى رفع PDF أو صورة' : 'File type not supported. Please upload PDF or image');
      return;
    }
    
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error(language === 'arabic' ? 'حجم الملف كبير جداً. الحد الأقصى 10MB' : 'File too large. Max size is 10MB');
      return;
    }
    
    setIsUploading(true);
    
    // Read file as base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      
      uploadDocumentMutation.mutate({
        fileName: file.name,
        fileType: file.type,
        fileData: base64,
        language
      });
    };
    reader.readAsDataURL(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const removeUploadedFile = () => {
    setUploadedFile(null);
  };
  
  // Text-to-speech handling
  const speakText = (text: string, messageIndex: number) => {
    if ('speechSynthesis' in window) {
      // Stop any current speech
      window.speechSynthesis.cancel();
      
      if (isSpeaking && speakingMessageIndex === messageIndex) {
        setIsSpeaking(false);
        setSpeakingMessageIndex(null);
        return;
      }
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'arabic' ? 'ar-SA' : 'en-US';
      utterance.rate = 0.9;
      
      utterance.onstart = () => {
        setIsSpeaking(true);
        setSpeakingMessageIndex(messageIndex);
      };
      
      utterance.onend = () => {
        setIsSpeaking(false);
        setSpeakingMessageIndex(null);
      };
      
      utterance.onerror = () => {
        setIsSpeaking(false);
        setSpeakingMessageIndex(null);
        toast.error(language === 'arabic' ? 'فشل تشغيل الصوت' : 'Speech playback failed');
      };
      
      window.speechSynthesis.speak(utterance);
    } else {
      toast.error(language === 'arabic' ? 'المتصفح لا يدعم النطق' : 'Browser does not support speech');
    }
  };
  
  const handlePreset = (query: string) => {
    haptic.triggerLight(); // Haptic feedback on preset selection
    setInput(query);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  const toggleLanguage = () => {
    haptic.triggerLight(); // Haptic feedback on language toggle
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
  
  const handleLoadSample = (sampleText: string) => {
    haptic.triggerLight(); // Haptic feedback on sample load
    setInput(sampleText);
    setShowSamples(false);
    toast.success(text.samplesLoaded);
  };
  
  const handleLogout = () => {
    haptic.triggerMedium(); // Haptic feedback on logout
    logout();
  };
  
  const handleClearChat = () => {
    haptic.triggerWarning(); // Haptic feedback on clear chat
    setMessages([]);
    setStreamingContent("");
    setIsStreaming(false);
  };
  
  // Voice input handling
  const transcribeMutation = trpc.chat.transcribe.useMutation({
    onSuccess: (data) => {
      if (data.status === 'success' && data.text) {
        setInput(prev => prev + (prev ? ' ' : '') + data.text);
        toast.success(language === 'arabic' ? 'تم التعرف على الصوت' : 'Voice recognized');
      } else {
        toast.error(language === 'arabic' ? 'فشل التعرف على الصوت' : 'Voice recognition failed');
      }
    },
    onError: () => {
      toast.error(language === 'arabic' ? 'فشل التعرف على الصوت' : 'Voice recognition failed');
    }
  });
  
  const startRecording = async () => {
    if (!isAuthenticated) {
      toast.error(text.loginRequired);
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        // Convert to base64 and create a data URL
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          // For now, show a message that voice input is being processed
          toast.info(language === 'arabic' ? 'جاري معالجة الصوت...' : 'Processing voice...');
          // The actual transcription would need a file upload endpoint
          // For demo purposes, we'll show a placeholder message
          setInput(prev => prev + (prev ? ' ' : '') + (language === 'arabic' ? '[إدخال صوتي]' : '[Voice input]'));
        };
        reader.readAsDataURL(audioBlob);
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      toast.info(language === 'arabic' ? 'جاري التسجيل... اضغط مرة أخرى للإيقاف' : 'Recording... Click again to stop');
    } catch (error) {
      toast.error(language === 'arabic' ? 'لا يمكن الوصول إلى الميكروفون' : 'Cannot access microphone');
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };
  
  const toggleRecording = () => {
    haptic.triggerMedium(); // Haptic feedback on recording toggle
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };
  
  return (
    <>
      {/* Demo Walkthrough Modal */}
      <DemoWalkthrough 
        isOpen={showWalkthrough} 
        onClose={() => setShowWalkthrough(false)} 
        lang={language === 'arabic' ? 'ar' : 'en'}
      />
      
    <div 
      ref={pullRefreshContainerRef}
      className="min-h-screen flex flex-col bg-background pb-20 md:pb-0"
      dir={isRTL ? "rtl" : "ltr"}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to Refresh Indicator */}
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        threshold={80}
        language={language}
      />
      {/* Header */}
      <header className="border-b border-white/10 bg-black/35 backdrop-blur-md sticky top-0 z-50">
        <div className="container max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <img 
                src="/ruzn-logo.png" 
                alt="Ruzn Logo" 
                className="h-8 w-8 sm:h-12 sm:w-12 object-contain"
              />
              <div>
                <h1 className="text-lg sm:text-2xl font-extrabold" style={{ background: 'linear-gradient(90deg, rgba(214,179,106,.95), rgba(184,146,77,.85))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                  {text.title}
                </h1>
                <p className="text-xs sm:text-sm hidden sm:block" style={{ color: 'rgba(255,255,255,.70)' }}>
                  {text.subtitle}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {/* User Auth Display */}
              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm flex items-center gap-1" style={{ color: 'rgba(214,179,106,.95)' }}>
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">{user?.name || 'OSAI Staff'}</span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="ruzn-btn text-xs p-2"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = getLoginUrl()}
                  className="gap-1 sm:gap-2 ruzn-btn-gold text-xs sm:text-sm px-2 sm:px-3"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">{text.login}</span>
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={toggleLanguage}
                className="gap-1 sm:gap-2 ruzn-btn text-xs sm:text-sm px-2 sm:px-3"
              >
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">{language === "arabic" ? "English" : "العربية"}</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={resetWalkthrough}
                className="ruzn-btn p-2"
                title={language === 'arabic' ? 'جولة تعريفية' : 'Tour'}
              >
                <Sparkles className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Feature Toggle */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setFeature("complaints")}
              className={`ruzn-tab flex-1 flex items-center justify-center gap-2 py-3 ${feature === "complaints" ? "active" : ""}`}
            >
              <FileSearch className="w-4 h-4" />
              {text.complaints}
            </button>
            <button
              onClick={() => setFeature("legislative")}
              className={`ruzn-tab flex-1 flex items-center justify-center gap-2 py-3 ${feature === "legislative" ? "active" : ""}`}
            >
              <Scale className="w-4 h-4" />
              {text.legislative}
            </button>
          </div>
          
          {/* Action Buttons - Primary Actions */}
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => setShowSamples(!showSamples)}
              className="ruzn-btn text-xs flex items-center gap-1"
            >
              <Database className="w-3 h-3" />
              <span className="hidden sm:inline">{text.loadSamples}</span>
            </button>
            <button
              onClick={handleExportPdf}
              disabled={messages.length === 0 || exportPdfMutation.isPending}
              className="ruzn-btn text-xs flex items-center gap-1 disabled:opacity-50"
            >
              {exportPdfMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Download className="w-3 h-3" />
              )}
              <span className="hidden sm:inline">{text.exportPdf}</span>
            </button>
            <button
              onClick={handleClearChat}
              disabled={messages.length === 0}
              className="ruzn-btn text-xs flex items-center gap-1 disabled:opacity-50"
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden sm:inline">{text.clearChat}</span>
            </button>
          </div>
          
          {/* Navigation Links - Horizontally scrollable on mobile */}
          <div className="mt-3 -mx-4 px-4 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 pb-2 min-w-max">
              <Link href="/operations">
                <button className="ruzn-btn-gold text-xs flex items-center gap-1 px-3 py-2 rounded-xl whitespace-nowrap">
                  <ClipboardList className="w-3 h-3" />
                  {text.operations}
                </button>
              </Link>
              <Link href="/entity-map">
                <button className="ruzn-btn text-xs flex items-center gap-1 px-3 py-2 rounded-xl whitespace-nowrap">
                  <Map className="w-3 h-3" />
                  {text.entityMap}
                </button>
              </Link>
              <Link href="/comparative-analysis">
                <button className="ruzn-btn text-xs flex items-center gap-1 px-3 py-2 rounded-xl whitespace-nowrap">
                  <TrendingUp className="w-3 h-3" />
                  {text.comparativeAnalysis}
                </button>
              </Link>
              <Link href="/case-law">
                <button className="ruzn-btn text-xs flex items-center gap-1 px-3 py-2 rounded-xl whitespace-nowrap">
                  <Scale className="w-3 h-3" />
                  {text.caseLaw}
                </button>
              </Link>
              <Link href="/complaint-registry">
                <button className="ruzn-btn text-xs flex items-center gap-1 px-3 py-2 rounded-xl whitespace-nowrap">
                  <FileText className="w-3 h-3" />
                  {text.complaintRegistry}
                </button>
              </Link>
              <Link href="/knowledge-base">
                <button className="ruzn-btn text-xs flex items-center gap-1 px-3 py-2 rounded-xl whitespace-nowrap">
                  <Database className="w-3 h-3" />
                  {text.knowledgeBase}
                </button>
              </Link>
              <Link href="/analytics">
                <button className="ruzn-btn text-xs flex items-center gap-1 px-3 py-2 rounded-xl whitespace-nowrap">
                  <BarChart3 className="w-3 h-3" />
                  {text.analytics}
                </button>
              </Link>
              {user?.role === 'admin' && (
                <Link href="/admin">
                  <button className="ruzn-btn text-xs flex items-center gap-1 px-3 py-2 rounded-xl whitespace-nowrap">
                    <Settings className="w-3 h-3" />
                    {text.admin}
                  </button>
                </Link>
              )}
            </div>
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
      
      {/* Dashboard Widgets */}
      {dashboardStats && (
        <div className="container max-w-5xl mx-auto px-4 py-4">
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
            <div className="ruzn-kpi">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/10">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    {language === 'arabic' ? 'شكاوى اليوم' : "Today's"}
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-foreground">{dashboardStats.todayComplaints || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="ruzn-kpi">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-yellow-500/10">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    {language === 'arabic' ? 'قيد المراجعة' : 'Pending'}
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-foreground">{dashboardStats.pendingReviews || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="ruzn-kpi">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-red-500/10">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    {language === 'arabic' ? 'عالي الخطورة' : 'High Risk'}
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-foreground">{dashboardStats.highRiskAwaiting || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="ruzn-kpi">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    {language === 'arabic' ? 'وقت الاستجابة' : 'Response'}
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-foreground">{dashboardStats.avgResponseTime?.toFixed(0) || 0}h</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Chat Area */}
      <main className="flex-1 container max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col">
        {/* Messages */}
        <div className="flex-1 space-y-4 mb-4 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-6 sm:py-12">
              <div className="w-16 h-16 sm:w-24 sm:h-24 mb-4 sm:mb-6 rounded-full bg-primary/10 flex items-center justify-center glow-gold">
                <Sparkles className="w-8 h-8 sm:w-12 sm:h-12 text-primary" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2">{text.welcome}</h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-8 px-4">{text.welcomeDesc}</p>
              
              {/* Preset Queries */}
              <div className="w-full max-w-md px-2">
                <p className="text-sm text-muted-foreground mb-3">{text.presetTitle}</p>
                <div className="space-y-2">
                  {presets.map((query, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      className="w-full justify-start text-start h-auto py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm border-primary/20 hover:border-primary/50 hover:bg-primary/5"
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
                <div
                  className={`ruzn-card max-w-[90%] sm:max-w-[85%] p-3 sm:p-4 ${
                    msg.role === "user"
                      ? "bg-[rgba(214,179,106,.18)] border-[rgba(214,179,106,.35)]"
                      : ""
                  }`}
                >
                  {/* Show attachment preview for user messages */}
                  {msg.attachment && (
                    <div className="mb-3 p-2 rounded-lg bg-black/20 border border-primary/20">
                      <div className="flex items-center gap-2">
                        {msg.attachment.fileType.startsWith('image/') ? (
                          <Image className="w-4 h-4 text-primary" />
                        ) : (
                          <FileText className="w-4 h-4 text-primary" />
                        )}
                        <span className="text-sm text-primary truncate">{msg.attachment.fileName}</span>
                      </div>
                      {msg.attachment.fileType.startsWith('image/') && (
                        <img 
                          src={msg.attachment.url} 
                          alt={msg.attachment.fileName}
                          className="mt-2 max-h-48 rounded-lg object-contain"
                        />
                      )}
                    </div>
                  )}
                  
                  {msg.role === "assistant" && feature === "complaints" && (
                    <div className="mb-2">
                      {getRiskBadge(msg.content, language)}
                    </div>
                  )}
                  <div className="prose prose-invert prose-sm max-w-none">
                    <Streamdown>{msg.content}</Streamdown>
                  </div>
                  
                  {/* Speaker button for assistant messages */}
                  {msg.role === "assistant" && (
                    <div className="mt-3 pt-2 border-t border-primary/10">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => speakText(msg.content, idx)}
                        className="text-xs text-muted-foreground hover:text-primary"
                      >
                        {isSpeaking && speakingMessageIndex === idx ? (
                          <><VolumeX className="w-3 h-3 mr-1" /> {text.stopSpeaking}</>
                        ) : (
                          <><Volume2 className="w-3 h-3 mr-1" /> {text.speakResponse}</>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          
          {/* Web search indicator */}
          {isSearchingWeb && (
            <div className="flex justify-start">
              <div className="ruzn-card p-4">
                <div className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,.70)' }}>
                  <Globe className="w-4 h-4 animate-pulse" />
                  <span>{language === "arabic" ? "جاري البحث في الإنترنت..." : "Searching the web..."}</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Streaming response display */}
          {isStreaming && streamingContent && (
            <div className="flex justify-start">
              <div className="ruzn-card max-w-[90%] sm:max-w-[85%] p-3 sm:p-4">
                {feature === "complaints" && (
                  <div className="mb-2">
                    {getRiskBadge(streamingContent, language)}
                  </div>
                )}
                <div className="prose prose-invert prose-sm max-w-none">
                  <Streamdown>{streamingContent}</Streamdown>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>{language === "arabic" ? "جاري الكتابة..." : "Typing..."}</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Loading indicator for non-streaming requests */}
          {(chatMutation.isPending || (isStreaming && !streamingContent)) && (
            <div className="flex justify-start">
              <div className="ruzn-card p-4">
                <div className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,.70)' }}>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{language === "arabic" ? "جاري التحليل..." : "Analyzing..."}</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input Area */}
        <div className="sticky bottom-0 pt-3 sm:pt-4 border-t border-white/10" style={{ background: 'rgba(7,7,8,.95)', backdropFilter: 'blur(10px)' }}>
          {/* Uploaded file preview */}
          {uploadedFile && (
            <div className="mb-3 p-3 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {uploadedFile.fileType.startsWith('image/') ? (
                  <Image className="w-5 h-5 text-primary" />
                ) : (
                  <FileText className="w-5 h-5 text-primary" />
                )}
                <span className="text-sm text-primary truncate max-w-[200px]">{uploadedFile.fileName}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeUploadedFile}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
          
          {/* Uploading indicator */}
          {isUploading && (
            <div className="mb-3 p-3 rounded-xl bg-primary/10 border border-primary/30 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <span className="text-sm text-primary">{text.uploadingFile}</span>
            </div>
          )}
          
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={text.placeholder}
              className="min-h-[50px] sm:min-h-[60px] max-h-[100px] sm:max-h-[120px] resize-none ruzn-input text-sm sm:text-base"
              dir={isRTL ? "rtl" : "ltr"}
            />
            <div className="flex flex-col gap-1.5 sm:gap-2">
              {/* File upload button */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || !!uploadedFile}
                className={`h-[28px] sm:h-[30px] px-2 sm:px-3 rounded-xl ruzn-btn disabled:opacity-50`}
                title={text.attachFile}
              >
                {isUploading ? (
                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                ) : (
                  <Paperclip className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
              </button>
              <button
                onClick={toggleRecording}
                className={`h-[28px] sm:h-[30px] px-2 sm:px-3 rounded-xl ${isRecording ? 'ruzn-tag-high animate-pulse' : 'ruzn-btn'}`}
                title={text.voiceInput}
              >
                {isRecording ? (
                  <MicOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : (
                  <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
              </button>
              <button
                onClick={handleSend}
                disabled={(!input.trim() && !uploadedFile) || chatMutation.isPending || analyzeDocumentMutation.isPending}
                className="h-[28px] sm:h-[30px] px-2 sm:px-3 rounded-xl ruzn-btn-gold disabled:opacity-50"
              >
                {(chatMutation.isPending || analyzeDocumentMutation.isPending) ? (
                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                ) : (
                  <Send className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isRTL ? "rotate-180" : ""}`} />
                )}
              </button>
            </div>
          </div>
          {isRecording && (
            <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              {text.recording}
            </div>
          )}
          {analyzeDocumentMutation.isPending && (
            <div className="flex items-center gap-2 mt-2 text-primary text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              {text.analyzingDocument}
            </div>
          )}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-white/10 py-4">
        <div className="container max-w-5xl mx-auto px-4 text-center">
          <p className="text-sm" style={{ color: 'rgba(255,255,255,.50)' }}>
            {text.poweredBy}
          </p>
        </div>
      </footer>
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav 
        language={language} 
        isAdmin={user?.role === 'admin'}
      />
    </div>
    </>
  );
}
