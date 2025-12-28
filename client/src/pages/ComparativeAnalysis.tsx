import { useState, useEffect, useRef } from 'react';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  BarChart3, 
  TrendingUp, 
  Scale, 
  FileText,
  Download,
  RefreshCw,
  ChevronDown,
  AlertTriangle,
  Building2,
  Gavel,
  DollarSign
} from 'lucide-react';
import Chart from 'chart.js/auto';

// UI Text
const UI_TEXT = {
  title: 'التحليل المقارن',
  titleEn: 'Comparative Analysis',
  subtitle: 'مقارنة بيانات جهاز الرقابة المالية والإدارية للدولة عبر السنوات',
  subtitleEn: 'Compare OSAI data across years (2021-2024)',
  backToHome: 'العودة للرئيسية',
  selectYears: 'اختر السنوات',
  selectMetrics: 'اختر المقاييس',
  generateReport: 'إنشاء تقرير',
  exportPdf: 'تصدير PDF',
  tabs: {
    overview: 'نظرة عامة',
    entities: 'الجهات',
    categories: 'التصنيفات',
    convictions: 'الإدانات',
    insights: 'الرؤى'
  },
  metrics: {
    directAddedValue: 'القيمة المضافة المباشرة',
    legalCases: 'القضايا القانونية',
    complaints: 'الشكاوى',
    maxFine: 'أقصى غرامة',
    maxImprisonment: 'أقصى عقوبة سجن'
  },
  loading: 'جاري التحميل...',
  noData: 'لا توجد بيانات'
};

// Tab type
type TabType = 'overview' | 'entities' | 'categories' | 'convictions' | 'insights';

export default function ComparativeAnalysis() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedYears, setSelectedYears] = useState<number[]>([2021, 2022, 2023, 2024]);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['directAddedValue', 'legalCases', 'complaints']);
  
  // Chart refs
  const lineChartRef = useRef<HTMLCanvasElement>(null);
  const barChartRef = useRef<HTMLCanvasElement>(null);
  const entityChartRef = useRef<HTMLCanvasElement>(null);
  const categoryChartRef = useRef<HTMLCanvasElement>(null);
  const lineChartInstance = useRef<Chart | null>(null);
  const barChartInstance = useRef<Chart | null>(null);
  const entityChartInstance = useRef<Chart | null>(null);
  const categoryChartInstance = useRef<Chart | null>(null);
  
  // Fetch data
  const { data: availableMetrics } = trpc.historical.getAvailableMetrics.useQuery();
  const { data: availableYears } = trpc.historical.getAvailableYears.useQuery();
  const { data: historicalStats, isLoading: statsLoading } = trpc.historical.getStats.useQuery({ 
    years: selectedYears, 
    metrics: selectedMetrics 
  });
  const { data: complaintsByEntity, isLoading: entityLoading } = trpc.historical.getComplaintsByEntity.useQuery({ 
    years: selectedYears 
  });
  const { data: complaintsByCategory, isLoading: categoryLoading } = trpc.historical.getComplaintsByCategory.useQuery({ 
    years: selectedYears 
  });
  const { data: convictions, isLoading: convictionsLoading } = trpc.historical.getConvictions.useQuery({ 
    years: selectedYears 
  });

  // Toggle year selection
  const toggleYear = (year: number) => {
    setSelectedYears(prev => 
      prev.includes(year) 
        ? prev.filter(y => y !== year)
        : [...prev, year].sort()
    );
  };

  // Toggle metric selection
  const toggleMetric = (metric: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metric) 
        ? prev.filter(m => m !== metric)
        : [...prev, metric]
    );
  };

  // Create line chart for trends
  useEffect(() => {
    if (!lineChartRef.current || !historicalStats || activeTab !== 'overview') return;

    // Destroy existing chart
    if (lineChartInstance.current) {
      lineChartInstance.current.destroy();
    }

    const ctx = lineChartRef.current.getContext('2d');
    if (!ctx) return;

    // Prepare data by metric
    const metricData: Record<string, { year: number; value: number }[]> = {};
    historicalStats.forEach((stat: any) => {
      if (!metricData[stat.metric]) {
        metricData[stat.metric] = [];
      }
      const value = stat.valueDecimal ? parseFloat(stat.valueDecimal) : stat.value;
      if (value !== null) {
        metricData[stat.metric].push({ year: stat.year, value });
      }
    });

    const colors = ['#d6b36a', '#4ade80', '#60a5fa', '#f472b6', '#a78bfa'];
    const datasets = Object.entries(metricData).map(([metric, data], index) => {
      const metricInfo = availableMetrics?.find((m: any) => m.id === metric);
      return {
        label: metricInfo?.labelArabic || metric,
        data: selectedYears.map(year => {
          const point = data.find(d => d.year === year);
          return point?.value || null;
        }),
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length] + '33',
        tension: 0.3,
        fill: false
      };
    });

    lineChartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: selectedYears.map(String),
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#d6b36a', font: { family: 'Tajawal' } }
          },
          title: {
            display: true,
            text: 'اتجاهات المقاييس عبر السنوات',
            color: '#d6b36a',
            font: { size: 16, family: 'Tajawal' }
          }
        },
        scales: {
          x: { 
            ticks: { color: '#9ca3af' },
            grid: { color: '#374151' }
          },
          y: { 
            ticks: { color: '#9ca3af' },
            grid: { color: '#374151' }
          }
        }
      }
    });

    return () => {
      if (lineChartInstance.current) {
        lineChartInstance.current.destroy();
      }
    };
  }, [historicalStats, selectedYears, activeTab, availableMetrics]);

  // Create bar chart for year-over-year comparison
  useEffect(() => {
    if (!barChartRef.current || !historicalStats || activeTab !== 'overview') return;

    if (barChartInstance.current) {
      barChartInstance.current.destroy();
    }

    const ctx = barChartRef.current.getContext('2d');
    if (!ctx) return;

    // Get direct added value data
    const davData = historicalStats.filter((s: any) => s.metric === 'directAddedValue');
    
    barChartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: selectedYears.map(String),
        datasets: [{
          label: 'القيمة المضافة المباشرة (مليون ريال)',
          data: selectedYears.map(year => {
            const stat = davData.find((s: any) => s.year === year);
            return stat?.valueDecimal ? parseFloat(stat.valueDecimal) : 0;
          }),
          backgroundColor: selectedYears.map((_, i) => {
            const colors = ['#d6b36a', '#b8924d', '#9a7a3f', '#7c6231'];
            return colors[i % colors.length];
          }),
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'القيمة المضافة المباشرة (الاسترداد والتحصيل)',
            color: '#d6b36a',
            font: { size: 16, family: 'Tajawal' }
          }
        },
        scales: {
          x: { 
            ticks: { color: '#9ca3af' },
            grid: { display: false }
          },
          y: { 
            ticks: { color: '#9ca3af' },
            grid: { color: '#374151' }
          }
        }
      }
    });

    return () => {
      if (barChartInstance.current) {
        barChartInstance.current.destroy();
      }
    };
  }, [historicalStats, selectedYears, activeTab]);

  // Create entity comparison chart
  useEffect(() => {
    if (!entityChartRef.current || !complaintsByEntity || activeTab !== 'entities') return;

    if (entityChartInstance.current) {
      entityChartInstance.current.destroy();
    }

    const ctx = entityChartRef.current.getContext('2d');
    if (!ctx) return;

    // Group by entity and create datasets per year
    const entityMap = new Map<string, Record<number, number>>();
    complaintsByEntity.forEach((item: any) => {
      const entity = item.entityNameEnglish;
      if (!entityMap.has(entity)) {
        entityMap.set(entity, {});
      }
      entityMap.get(entity)![item.year] = item.complaintCount;
    });

    // Get top 8 entities by total complaints
    const entityTotals = Array.from(entityMap.entries())
      .map(([entity, years]) => ({
        entity,
        total: Object.values(years).reduce((a, b) => a + b, 0),
        years
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    const colors = ['#d6b36a', '#4ade80', '#60a5fa', '#f472b6'];
    const datasets = selectedYears.map((year, index) => ({
      label: String(year),
      data: entityTotals.map(e => e.years[year] || 0),
      backgroundColor: colors[index % colors.length],
      borderRadius: 4
    }));

    entityChartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: entityTotals.map(e => e.entity.length > 25 ? e.entity.substring(0, 25) + '...' : e.entity),
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#d6b36a', font: { family: 'Tajawal' } }
          },
          title: {
            display: true,
            text: 'الشكاوى حسب الجهة',
            color: '#d6b36a',
            font: { size: 16, family: 'Tajawal' }
          }
        },
        scales: {
          x: { 
            stacked: false,
            ticks: { color: '#9ca3af' },
            grid: { color: '#374151' }
          },
          y: { 
            stacked: false,
            ticks: { color: '#9ca3af', font: { size: 10 } },
            grid: { display: false }
          }
        }
      }
    });

    return () => {
      if (entityChartInstance.current) {
        entityChartInstance.current.destroy();
      }
    };
  }, [complaintsByEntity, selectedYears, activeTab]);

  // Create category comparison chart
  useEffect(() => {
    if (!categoryChartRef.current || !complaintsByCategory || activeTab !== 'categories') return;

    if (categoryChartInstance.current) {
      categoryChartInstance.current.destroy();
    }

    const ctx = categoryChartRef.current.getContext('2d');
    if (!ctx) return;

    // Group by category
    const categoryMap = new Map<string, Record<number, number>>();
    complaintsByCategory.forEach((item: any) => {
      const category = item.categoryArabic || item.categoryEnglish;
      if (!categoryMap.has(category)) {
        categoryMap.set(category, {});
      }
      categoryMap.get(category)![item.year] = item.complaintCount;
    });

    const categories = Array.from(categoryMap.keys());
    const colors = ['#d6b36a', '#4ade80', '#60a5fa', '#f472b6'];
    const datasets = selectedYears.map((year, index) => ({
      label: String(year),
      data: categories.map(cat => categoryMap.get(cat)?.[year] || 0),
      backgroundColor: colors[index % colors.length],
      borderRadius: 4
    }));

    categoryChartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: categories,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#d6b36a', font: { family: 'Tajawal' } }
          },
          title: {
            display: true,
            text: 'الشكاوى حسب التصنيف',
            color: '#d6b36a',
            font: { size: 16, family: 'Tajawal' }
          }
        },
        scales: {
          x: { 
            ticks: { color: '#9ca3af', font: { size: 10 } },
            grid: { display: false }
          },
          y: { 
            ticks: { color: '#9ca3af' },
            grid: { color: '#374151' }
          }
        }
      }
    });

    return () => {
      if (categoryChartInstance.current) {
        categoryChartInstance.current.destroy();
      }
    };
  }, [complaintsByCategory, selectedYears, activeTab]);

  // Generate AI insights
  const generateInsights = () => {
    if (!historicalStats) return [];
    
    const insights: { type: 'positive' | 'negative' | 'neutral'; text: string; textEn: string }[] = [];
    
    // Check direct added value trend
    const davData = historicalStats.filter((s: any) => s.metric === 'directAddedValue');
    if (davData.length >= 2) {
      const sorted = [...davData].sort((a: any, b: any) => a.year - b.year);
      const first = parseFloat(sorted[0]?.valueDecimal || '0');
      const last = parseFloat(sorted[sorted.length - 1]?.valueDecimal || '0');
      if (last > first) {
        const increase = ((last - first) / first * 100).toFixed(0);
        insights.push({
          type: 'positive',
          text: `ارتفعت القيمة المضافة المباشرة بنسبة ${increase}% من ${first} إلى ${last} مليون ريال`,
          textEn: `Direct Added Value increased by ${increase}% from ${first} to ${last} million OMR`
        });
      }
    }

    // Check legal cases trend
    const legalData = historicalStats.filter((s: any) => s.metric === 'legalCases');
    if (legalData.length >= 2) {
      const sorted = [...legalData].sort((a: any, b: any) => a.year - b.year);
      const first = sorted[0]?.value || 0;
      const last = sorted[sorted.length - 1]?.value || 0;
      if (last > first) {
        insights.push({
          type: 'neutral',
          text: `زادت القضايا القانونية من ${first} إلى ${last} قضية، مما يشير إلى تعزيز الرقابة`,
          textEn: `Legal cases increased from ${first} to ${last}, indicating enhanced oversight`
        });
      }
    }

    // Check prosecution referrals
    const prosecutionData = historicalStats.filter((s: any) => s.metric === 'referredToProsecution');
    if (prosecutionData.length >= 2) {
      const y2022 = prosecutionData.find((s: any) => s.year === 2022)?.value || 0;
      const y2023 = prosecutionData.find((s: any) => s.year === 2023)?.value || 0;
      if (y2023 > y2022) {
        insights.push({
          type: 'negative',
          text: `تضاعفت الإحالات للادعاء العام من ${y2022} إلى ${y2023} قضية (زيادة 100%)`,
          textEn: `Prosecution referrals doubled from ${y2022} to ${y2023} cases (100% increase)`
        });
      }
    }

    // Entity pattern
    if (complaintsByEntity && complaintsByEntity.length > 0) {
      const housingComplaints = complaintsByEntity.filter((e: any) => 
        e.entityNameEnglish.includes('Housing')
      );
      if (housingComplaints.length > 0) {
        insights.push({
          type: 'negative',
          text: 'وزارة الإسكان والتخطيط العمراني تتصدر قائمة الشكاوى باستمرار عبر السنوات',
          textEn: 'Ministry of Housing & Urban Planning consistently leads in complaints across years'
        });
      }
    }

    return insights;
  };

  const insights = generateInsights();

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg, #070708)' }}>
      {/* Header */}
      <header className="ruzn-card border-b border-[#d6b36a]/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-[#d6b36a] hover:bg-[#d6b36a]/10">
                  <ArrowLeft className="h-4 w-4 ml-2" />
                  {UI_TEXT.backToHome}
                </Button>
              </Link>
              <div className="h-6 w-px bg-[#d6b36a]/30" />
              <div>
                <h1 className="text-xl font-bold text-[#d6b36a]">{UI_TEXT.title}</h1>
                <p className="text-sm text-gray-400">{UI_TEXT.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="border-[#d6b36a]/30 text-[#d6b36a] hover:bg-[#d6b36a]/10"
                onClick={() => window.print()}
              >
                <Download className="h-4 w-4 ml-2" />
                {UI_TEXT.exportPdf}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Filters */}
        <div className="ruzn-card p-4 mb-6">
          <div className="flex flex-wrap gap-6">
            {/* Year Selection */}
            <div>
              <label className="block text-sm text-[#d6b36a] mb-2">{UI_TEXT.selectYears}</label>
              <div className="flex gap-2">
                {(availableYears || [2021, 2022, 2023, 2024]).map((year: number) => (
                  <button
                    key={year}
                    onClick={() => toggleYear(year)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedYears.includes(year)
                        ? 'bg-[#d6b36a] text-black'
                        : 'bg-[#1a1a1c] text-gray-400 hover:bg-[#2a2a2c]'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>

            {/* Metric Selection */}
            <div className="flex-1">
              <label className="block text-sm text-[#d6b36a] mb-2">{UI_TEXT.selectMetrics}</label>
              <div className="flex flex-wrap gap-2">
                {(availableMetrics || []).map((metric: any) => (
                  <button
                    key={metric.id}
                    onClick={() => toggleMetric(metric.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedMetrics.includes(metric.id)
                        ? 'bg-[#d6b36a]/20 text-[#d6b36a] border border-[#d6b36a]'
                        : 'bg-[#1a1a1c] text-gray-400 hover:bg-[#2a2a2c] border border-transparent'
                    }`}
                  >
                    {metric.labelArabic}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {Object.entries(UI_TEXT.tabs).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as TabType)}
              className={`ruzn-tab px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === key ? 'active' : ''
              }`}
            >
              {key === 'overview' && <BarChart3 className="h-4 w-4 inline ml-2" />}
              {key === 'entities' && <Building2 className="h-4 w-4 inline ml-2" />}
              {key === 'categories' && <FileText className="h-4 w-4 inline ml-2" />}
              {key === 'convictions' && <Gavel className="h-4 w-4 inline ml-2" />}
              {key === 'insights' && <TrendingUp className="h-4 w-4 inline ml-2" />}
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {historicalStats && (
                <>
                  <div className="ruzn-kpi">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-5 w-5 text-[#d6b36a]" />
                      <span className="text-sm text-gray-400">إجمالي الاسترداد</span>
                    </div>
                    <div className="text-2xl font-bold text-[#d6b36a]">
                      {historicalStats
                        .filter((s: any) => s.metric === 'directAddedValue')
                        .reduce((sum: number, s: any) => sum + (parseFloat(s.valueDecimal || '0')), 0)
                        .toFixed(1)} M
                    </div>
                    <div className="text-xs text-gray-500">ريال عماني</div>
                  </div>
                  <div className="ruzn-kpi">
                    <div className="flex items-center gap-2 mb-2">
                      <Scale className="h-5 w-5 text-[#4ade80]" />
                      <span className="text-sm text-gray-400">القضايا القانونية</span>
                    </div>
                    <div className="text-2xl font-bold text-[#4ade80]">
                      {historicalStats
                        .filter((s: any) => s.metric === 'legalCases')
                        .reduce((sum: number, s: any) => sum + (s.value || 0), 0)}
                    </div>
                    <div className="text-xs text-gray-500">قضية</div>
                  </div>
                  <div className="ruzn-kpi">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-5 w-5 text-[#f472b6]" />
                      <span className="text-sm text-gray-400">أقصى غرامة</span>
                    </div>
                    <div className="text-2xl font-bold text-[#f472b6]">
                      {Math.max(...historicalStats
                        .filter((s: any) => s.metric === 'maxFine')
                        .map((s: any) => s.value || 0)
                      ).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">ريال عماني</div>
                  </div>
                  <div className="ruzn-kpi">
                    <div className="flex items-center gap-2 mb-2">
                      <Gavel className="h-5 w-5 text-[#60a5fa]" />
                      <span className="text-sm text-gray-400">أقصى سجن</span>
                    </div>
                    <div className="text-2xl font-bold text-[#60a5fa]">
                      {Math.max(...historicalStats
                        .filter((s: any) => s.metric === 'maxImprisonment')
                        .map((s: any) => s.value || 0)
                      )}
                    </div>
                    <div className="text-xs text-gray-500">سنوات</div>
                  </div>
                </>
              )}
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="ruzn-card p-4">
                <div style={{ height: '300px' }}>
                  <canvas ref={lineChartRef}></canvas>
                </div>
              </div>
              <div className="ruzn-card p-4">
                <div style={{ height: '300px' }}>
                  <canvas ref={barChartRef}></canvas>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'entities' && (
          <div className="ruzn-card p-4">
            {entityLoading ? (
              <div className="text-center py-8 text-gray-400">{UI_TEXT.loading}</div>
            ) : (
              <div style={{ height: '500px' }}>
                <canvas ref={entityChartRef}></canvas>
              </div>
            )}
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="ruzn-card p-4">
            {categoryLoading ? (
              <div className="text-center py-8 text-gray-400">{UI_TEXT.loading}</div>
            ) : (
              <div style={{ height: '400px' }}>
                <canvas ref={categoryChartRef}></canvas>
              </div>
            )}
          </div>
        )}

        {activeTab === 'convictions' && (
          <div className="space-y-4">
            {convictionsLoading ? (
              <div className="text-center py-8 text-gray-400">{UI_TEXT.loading}</div>
            ) : (
              convictions?.map((conviction: any, index: number) => (
                <div key={index} className="ruzn-card p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="ruzn-tag-high">{conviction.year}</span>
                        <span className="text-[#d6b36a] font-semibold">
                          {conviction.entityNameArabic || conviction.entityNameEnglish}
                        </span>
                      </div>
                      <p className="text-gray-300 mb-2">{conviction.position}</p>
                      <p className="text-sm text-gray-400">{conviction.violationType}</p>
                    </div>
                    <div className="text-left">
                      {conviction.sentenceYears && (
                        <div className="text-[#f472b6] font-bold">
                          {conviction.sentenceYears} سنوات سجن
                        </div>
                      )}
                      {conviction.fineOMR && (
                        <div className="text-[#d6b36a]">
                          غرامة {conviction.fineOMR.toLocaleString()} ر.ع
                        </div>
                      )}
                      {conviction.amountInvolved && (
                        <div className="text-sm text-gray-400">
                          المبلغ: {conviction.amountInvolved.toLocaleString()} ر.ع
                        </div>
                      )}
                    </div>
                  </div>
                  {conviction.summaryArabic && (
                    <p className="mt-3 text-sm text-gray-400 border-t border-[#d6b36a]/20 pt-3">
                      {conviction.summaryArabic}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="space-y-4">
            <div className="ruzn-card p-4">
              <h3 className="text-lg font-bold text-[#d6b36a] mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                الرؤى والأنماط المكتشفة
              </h3>
              {insights.length === 0 ? (
                <p className="text-gray-400">{UI_TEXT.noData}</p>
              ) : (
                <div className="space-y-3">
                  {insights.map((insight, index) => (
                    <div 
                      key={index}
                      className={`p-3 rounded-lg border ${
                        insight.type === 'positive' 
                          ? 'bg-green-500/10 border-green-500/30' 
                          : insight.type === 'negative'
                          ? 'bg-red-500/10 border-red-500/30'
                          : 'bg-blue-500/10 border-blue-500/30'
                      }`}
                    >
                      <p className="text-gray-200">{insight.text}</p>
                      <p className="text-sm text-gray-400 mt-1">{insight.textEn}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pattern Summary */}
            <div className="ruzn-card p-4">
              <h3 className="text-lg font-bold text-[#d6b36a] mb-4">ملخص الأنماط</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-3 bg-[#1a1a1c] rounded-lg">
                  <h4 className="text-[#d6b36a] font-semibold mb-2">الجهات الأكثر شكاوى</h4>
                  <ol className="text-sm text-gray-300 space-y-1">
                    <li>1. وزارة الإسكان والتخطيط العمراني</li>
                    <li>2. قطاع البلديات</li>
                    <li>3. وزارة الصحة</li>
                  </ol>
                </div>
                <div className="p-3 bg-[#1a1a1c] rounded-lg">
                  <h4 className="text-[#d6b36a] font-semibold mb-2">أنواع المخالفات الشائعة</h4>
                  <ol className="text-sm text-gray-300 space-y-1">
                    <li>1. المخالفات المالية والإدارية (78-80%)</li>
                    <li>2. الإضرار بمصالح المواطنين</li>
                    <li>3. مخالفات المناقصات</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
