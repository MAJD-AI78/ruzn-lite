import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, MessageSquare, Mic, Scale, BarChart3, FileText, Users } from 'lucide-react';

interface WalkthroughStep {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  icon: React.ReactNode;
  targetSelector?: string;
  position: 'center' | 'top' | 'bottom' | 'left' | 'right';
}

const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: 'welcome',
    titleAr: 'مرحباً بك في رُزن',
    titleEn: 'Welcome to Ruzn',
    descriptionAr: 'منصة ذكاء تشغيلي للحوكمة والنزاهة والامتثال. دعنا نأخذك في جولة سريعة لاكتشاف الميزات الرئيسية.',
    descriptionEn: 'An operational intelligence platform for governance, integrity, and compliance. Let us take you on a quick tour to discover the key features.',
    icon: <MessageSquare className="w-8 h-8" />,
    position: 'center'
  },
  {
    id: 'chat',
    titleAr: 'تقديم البلاغات',
    titleEn: 'Submit Complaints',
    descriptionAr: 'يمكنك تقديم البلاغات والشكاوى بسهولة عبر المحادثة. اكتب وصفاً للمشكلة وسيقوم رُزن بتحليلها وتصنيفها تلقائياً.',
    descriptionEn: 'You can easily submit complaints through the chat. Describe the issue and Ruzn will automatically analyze and classify it.',
    icon: <MessageSquare className="w-8 h-8" />,
    position: 'center'
  },
  {
    id: 'voice',
    titleAr: 'الإدخال الصوتي',
    titleEn: 'Voice Input',
    descriptionAr: 'استخدم زر الميكروفون للإدخال الصوتي باللغة العربية أو الإنجليزية. رُزن يدعم التعرف على الكلام لتسهيل تقديم البلاغات.',
    descriptionEn: 'Use the microphone button for voice input in Arabic or English. Ruzn supports speech recognition to make complaint submission easier.',
    icon: <Mic className="w-8 h-8" />,
    position: 'bottom'
  },
  {
    id: 'legislative',
    titleAr: 'الذكاء التشريعي',
    titleEn: 'Legislative Intelligence',
    descriptionAr: 'استفسر عن القوانين واللوائح المتعلقة بالرقابة المالية. رُزن يستند إلى المرسوم السلطاني 111/2011 و 112/2011.',
    descriptionEn: 'Inquire about laws and regulations related to financial oversight. Ruzn is based on Royal Decree 111/2011 and 112/2011.',
    icon: <Scale className="w-8 h-8" />,
    position: 'center'
  },
  {
    id: 'analytics',
    titleAr: 'التحليلات والإحصائيات',
    titleEn: 'Analytics & Statistics',
    descriptionAr: 'اطلع على إحصائيات البلاغات والتحليلات التفصيلية. تتبع الاتجاهات وحدد الأنماط في البلاغات المقدمة.',
    descriptionEn: 'View complaint statistics and detailed analytics. Track trends and identify patterns in submitted complaints.',
    icon: <BarChart3 className="w-8 h-8" />,
    position: 'center'
  },
  {
    id: 'caselaw',
    titleAr: 'قاعدة بيانات السوابق',
    titleEn: 'Case Law Database',
    descriptionAr: 'ابحث في أرشيف الإدانات والأحكام السابقة. استخدم الفلاتر للبحث حسب السنة ونوع المخالفة والجهة.',
    descriptionEn: 'Search the archive of past convictions and judgments. Use filters to search by year, violation type, and entity.',
    icon: <FileText className="w-8 h-8" />,
    position: 'center'
  },
  {
    id: 'registry',
    titleAr: 'سجل البلاغات',
    titleEn: 'Complaint Registry',
    descriptionAr: 'إدارة شاملة للبلاغات مع نظام الفرز التلقائي وتعيين المحققين ولوحة مؤشرات لمعالي الوزير.',
    descriptionEn: 'Comprehensive complaint management with auto-triage, investigator assignment, and Minister dashboard.',
    icon: <Users className="w-8 h-8" />,
    position: 'center'
  },
  {
    id: 'complete',
    titleAr: 'أنت جاهز!',
    titleEn: 'You\'re Ready!',
    descriptionAr: 'لقد أكملت الجولة التعريفية. يمكنك الآن البدء في استخدام رُزن. إذا احتجت مساعدة، اضغط على زر "جولة تعريفية" في أي وقت.',
    descriptionEn: 'You\'ve completed the walkthrough. You can now start using Ruzn. If you need help, click the "Tour" button anytime.',
    icon: <MessageSquare className="w-8 h-8" />,
    position: 'center'
  }
];

interface DemoWalkthroughProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'ar' | 'en';
}

export default function DemoWalkthrough({ isOpen, onClose, lang }: DemoWalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  const handleNext = () => {
    if (currentStep < WALKTHROUGH_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    // Mark walkthrough as completed in localStorage
    localStorage.setItem('ruzn_walkthrough_completed', 'true');
    onClose();
  };

  const handleSkip = () => {
    handleClose();
  };

  if (!isVisible) return null;

  const step = WALKTHROUGH_STEPS[currentStep];
  const isRTL = lang === 'ar';
  const title = isRTL ? step.titleAr : step.titleEn;
  const description = isRTL ? step.descriptionAr : step.descriptionEn;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleSkip}
      />
      
      {/* Modal */}
      <div 
        className={`relative z-10 w-full max-w-lg mx-4 ruzn-card p-6 ${isRTL ? 'rtl' : 'ltr'}`}
        style={{ direction: isRTL ? 'rtl' : 'ltr' }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 left-4 text-white/60 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Progress indicator */}
        <div className="flex justify-center gap-1.5 mb-6">
          {WALKTHROUGH_STEPS.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === currentStep 
                  ? 'w-6 bg-amber-500' 
                  : index < currentStep 
                    ? 'w-3 bg-amber-500/50' 
                    : 'w-3 bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center text-amber-500">
            {step.icon}
          </div>
        </div>

        {/* Content */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-white mb-3">{title}</h2>
          <p className="text-white/70 leading-relaxed">{description}</p>
        </div>

        {/* Step counter */}
        <div className="text-center text-white/40 text-sm mb-4">
          {currentStep + 1} / {WALKTHROUGH_STEPS.length}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between items-center gap-3">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              currentStep === 0
                ? 'text-white/30 cursor-not-allowed'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            <span>{isRTL ? 'السابق' : 'Previous'}</span>
          </button>

          <button
            onClick={handleSkip}
            className="text-white/50 hover:text-white/70 text-sm transition-colors"
          >
            {isRTL ? 'تخطي' : 'Skip'}
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 text-black font-medium hover:from-amber-500 hover:to-amber-400 transition-all"
          >
            <span>
              {currentStep === WALKTHROUGH_STEPS.length - 1 
                ? (isRTL ? 'ابدأ الآن' : 'Get Started') 
                : (isRTL ? 'التالي' : 'Next')
              }
            </span>
            {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook to check if walkthrough should be shown
export function useWalkthrough() {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem('ruzn_walkthrough_completed');
    if (!completed) {
      // Show walkthrough for first-time users after a short delay
      const timer = setTimeout(() => {
        setShouldShow(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const resetWalkthrough = () => {
    localStorage.removeItem('ruzn_walkthrough_completed');
    setShouldShow(true);
  };

  return { shouldShow, setShouldShow, resetWalkthrough };
}
