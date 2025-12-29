// PDF Export Utility for Multi-language Support (Arabic/English)
// Uses HTML-to-PDF approach for proper RTL support

export interface PDFExportOptions {
  title: string;
  subtitle?: string;
  language: 'ar' | 'en';
  content: PDFSection[];
  footer?: string;
  headerLogo?: string;
}

export interface PDFSection {
  type: 'heading' | 'paragraph' | 'table' | 'list' | 'kpi' | 'divider';
  content: string | string[] | TableData | KPIData[];
  level?: 1 | 2 | 3;
}

export interface TableData {
  headers: string[];
  rows: string[][];
}

export interface KPIData {
  label: string;
  value: string | number;
  change?: string;
}

// Generate HTML for PDF export with proper Arabic/RTL support
export function generatePDFHtml(options: PDFExportOptions): string {
  const { title, subtitle, language, content, footer } = options;
  const isRTL = language === 'ar';
  const dir = isRTL ? 'rtl' : 'ltr';
  const fontFamily = isRTL 
    ? "'Noto Naskh Arabic', 'Tajawal', 'Arial', sans-serif"
    : "'Inter', 'Arial', sans-serif";

  const renderSection = (section: PDFSection): string => {
    switch (section.type) {
      case 'heading':
        const level = section.level || 1;
        const fontSize = level === 1 ? '24px' : level === 2 ? '18px' : '14px';
        const marginTop = level === 1 ? '24px' : level === 2 ? '18px' : '12px';
        return `<h${level} style="font-size: ${fontSize}; color: #8B7355; margin-top: ${marginTop}; margin-bottom: 8px; border-bottom: ${level === 1 ? '2px solid #8B7355' : 'none'}; padding-bottom: ${level === 1 ? '8px' : '0'};">${section.content}</h${level}>`;
      
      case 'paragraph':
        return `<p style="margin: 12px 0; line-height: 1.8; color: #333;">${section.content}</p>`;
      
      case 'table':
        const tableData = section.content as TableData;
        return `
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <thead>
              <tr style="background: #f5f5f5;">
                ${tableData.headers.map(h => `<th style="border: 1px solid #ddd; padding: 10px; text-align: ${isRTL ? 'right' : 'left'}; font-weight: bold;">${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${tableData.rows.map(row => `
                <tr>
                  ${row.map(cell => `<td style="border: 1px solid #ddd; padding: 8px; text-align: ${isRTL ? 'right' : 'left'};">${cell}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      
      case 'list':
        const items = section.content as string[];
        return `
          <ul style="margin: 12px 0; padding-${isRTL ? 'right' : 'left'}: 24px;">
            ${items.map(item => `<li style="margin: 6px 0; line-height: 1.6;">${item}</li>`).join('')}
          </ul>
        `;
      
      case 'kpi':
        const kpis = section.content as KPIData[];
        return `
          <div style="display: flex; flex-wrap: wrap; gap: 16px; margin: 16px 0;">
            ${kpis.map(kpi => `
              <div style="flex: 1; min-width: 150px; border: 2px solid #8B7355; border-radius: 8px; padding: 16px; text-align: center;">
                <div style="font-size: 28px; font-weight: bold; color: #8B7355;">${kpi.value}</div>
                <div style="font-size: 12px; color: #666; margin-top: 4px;">${kpi.label}</div>
                ${kpi.change ? `<div style="font-size: 11px; color: ${kpi.change.startsWith('+') ? '#22c55e' : '#ef4444'}; margin-top: 4px;">${kpi.change}</div>` : ''}
              </div>
            `).join('')}
          </div>
        `;
      
      case 'divider':
        return `<hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;" />`;
      
      default:
        return '';
    }
  };

  return `
    <!DOCTYPE html>
    <html dir="${dir}" lang="${language}">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;700&family=Tajawal:wght@400;700&family=Inter:wght@400;600;700&display=swap');
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          font-family: ${fontFamily};
          font-size: 12pt;
          line-height: 1.6;
          color: #333;
          background: white;
          padding: 40px;
          direction: ${dir};
        }
        
        .header {
          text-align: center;
          border-bottom: 3px solid #8B7355;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        
        .header h1 {
          font-size: 28px;
          color: #8B7355;
          margin-bottom: 8px;
        }
        
        .header .subtitle {
          font-size: 14px;
          color: #666;
        }
        
        .header .date {
          font-size: 12px;
          color: #999;
          margin-top: 8px;
        }
        
        .content {
          min-height: 600px;
        }
        
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          text-align: center;
          font-size: 10px;
          color: #999;
        }
        
        @media print {
          body {
            padding: 20px;
          }
          
          @page {
            margin: 2cm;
            size: A4;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${title}</h1>
        ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
        <div class="date">${new Date().toLocaleDateString(language === 'ar' ? 'ar-OM' : 'en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</div>
      </div>
      
      <div class="content">
        ${content.map(renderSection).join('')}
      </div>
      
      ${footer ? `<div class="footer">${footer}</div>` : ''}
    </body>
    </html>
  `;
}

// Generate Case Law PDF
export function generateCaseLawPDF(caseData: {
  caseNumber: string;
  year: number;
  entity: string;
  violationType: string;
  description: string;
  penalty: string;
  amountInvolved?: number;
  legalArticles?: string;
  outcome: string;
}, language: 'ar' | 'en'): string {
  const isArabic = language === 'ar';
  
  const labels = isArabic ? {
    title: 'سجل القضية',
    caseNumber: 'رقم القضية',
    year: 'السنة',
    entity: 'الجهة',
    violationType: 'نوع المخالفة',
    description: 'الوصف',
    penalty: 'العقوبة',
    amount: 'المبلغ المتورط',
    legalArticles: 'المواد القانونية',
    outcome: 'النتيجة',
    footer: 'الحوكمة والنزاهة والامتثال'
  } : {
    title: 'Case Record',
    caseNumber: 'Case Number',
    year: 'Year',
    entity: 'Entity',
    violationType: 'Violation Type',
    description: 'Description',
    penalty: 'Penalty',
    amount: 'Amount Involved',
    legalArticles: 'Legal Articles',
    outcome: 'Outcome',
    footer: 'Governance, Integrity, and Compliance'
  };

  const content: PDFSection[] = [
    { type: 'heading', content: `${labels.caseNumber}: ${caseData.caseNumber}`, level: 2 },
    { type: 'divider', content: '' },
    { type: 'table', content: {
      headers: [isArabic ? 'البيان' : 'Field', isArabic ? 'القيمة' : 'Value'],
      rows: [
        [labels.year, caseData.year.toString()],
        [labels.entity, caseData.entity],
        [labels.violationType, caseData.violationType],
        [labels.penalty, caseData.penalty],
        ...(caseData.amountInvolved ? [[labels.amount, `${caseData.amountInvolved.toLocaleString()} ${isArabic ? 'ر.ع.' : 'OMR'}`]] : []),
        ...(caseData.legalArticles ? [[labels.legalArticles, caseData.legalArticles]] : []),
        [labels.outcome, caseData.outcome],
      ]
    }},
    { type: 'heading', content: labels.description, level: 3 },
    { type: 'paragraph', content: caseData.description },
  ];

  return generatePDFHtml({
    title: labels.title,
    subtitle: caseData.entity,
    language,
    content,
    footer: labels.footer
  });
}

// Generate Comparative Analysis Report PDF
export function generateComparativeReportPDF(data: {
  years: number[];
  metrics: { year: number; complaints: number; recovered: number; cases: number }[];
  topEntities: { entity: string; complaints: number }[];
  insights: string[];
}, language: 'ar' | 'en'): string {
  const isArabic = language === 'ar';
  
  const labels = isArabic ? {
    title: 'تقرير التحليل المقارن',
    subtitle: 'الحوكمة والنزاهة والامتثال',
    yearRange: 'الفترة الزمنية',
    overview: 'نظرة عامة',
    complaints: 'البلاغات',
    recovered: 'المبالغ المستردة',
    cases: 'القضايا',
    topEntities: 'أعلى الجهات',
    insights: 'الرؤى والتحليلات',
    footer: 'تم إنشاء هذا التقرير بواسطة رُزن - منصة الذكاء التشغيلي'
  } : {
    title: 'Comparative Analysis Report',
    subtitle: 'Governance, Integrity, and Compliance',
    yearRange: 'Time Period',
    overview: 'Overview',
    complaints: 'Complaints',
    recovered: 'Recovered Amount',
    cases: 'Cases',
    topEntities: 'Top Entities',
    insights: 'Insights & Analysis',
    footer: 'This report was generated by Ruzn - Operational Intelligence Platform'
  };

  const content: PDFSection[] = [
    { type: 'heading', content: `${labels.yearRange}: ${data.years.join(' - ')}`, level: 2 },
    { type: 'heading', content: labels.overview, level: 2 },
    { type: 'kpi', content: [
      { label: labels.complaints, value: data.metrics.reduce((sum, m) => sum + m.complaints, 0) },
      { label: labels.recovered, value: `${(data.metrics.reduce((sum, m) => sum + m.recovered, 0) / 1000000).toFixed(1)}M` },
      { label: labels.cases, value: data.metrics.reduce((sum, m) => sum + m.cases, 0) },
    ]},
    { type: 'heading', content: labels.topEntities, level: 2 },
    { type: 'table', content: {
      headers: [isArabic ? 'الجهة' : 'Entity', isArabic ? 'عدد البلاغات' : 'Complaints'],
      rows: data.topEntities.map(e => [e.entity, e.complaints.toString()])
    }},
    { type: 'heading', content: labels.insights, level: 2 },
    { type: 'list', content: data.insights },
  ];

  return generatePDFHtml({
    title: labels.title,
    subtitle: labels.subtitle,
    language,
    content,
    footer: labels.footer
  });
}
