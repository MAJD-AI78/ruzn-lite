import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "./_core/llm";
import { transcribeAudio } from "./_core/voiceTranscription";
import { z } from "zod";
import { 
  saveConversation, getConversationsByUser, getSampleComplaints,
  getAnalyticsSummary, logAnalyticsEvent, getAllConversations,
  getAuditFindings, getLegislativeDocuments, getAllUsers,
  updateConversationStatus, getStatusHistory, getConversationsByStatus,
  getDashboardStats, generateWeeklyReport, getWeeklyReports,
  getHistoricalStats, getHistoricalComplaintsByEntityData,
  getHistoricalComplaintsByCategoryData, getHistoricalConvictionsData,
  getAvailableMetrics, getAvailableYears,
  searchCaseLaw, getCaseLawById, getCaseLawStats, seedCaseLawDatabase,
  seedHistoricalData,
  saveRegistryComplaint, getRegistryComplaints, assignComplaint,
  getAssignedComplaints, getAssignmentStats
} from "./db";
import {
  searchKnowledgeBase, getAllKnowledge, createKnowledgeEntry,
  deleteKnowledgeEntry, updateKnowledgeEntry, getVersionHistory,
  restoreVersion, seedKnowledgeBase
} from "./db/knowledge";
import { sendWeeklyReportToRecipients, getReportHtml, getReportText, getRefreshStatus, recordRefresh, updateRefreshConfig } from "./scheduledReports";
import { storagePut } from "./storage";
import { generateCaseLawPDF, generateComparativeReportPDF } from "./pdfExport";
import { parsePDF, extractSummary, extractKeywords, isArabicText } from "./pdfParser";

// System prompts for Ruzn-Lite OSAI - Enhanced with OSAI Knowledge Base
const SYSTEM_PROMPTS = {
  complaints: {
    arabic: `أنت "رُزن"، مساعد ذكي متخصص لجهاز الرقابة المالية والإدارية للدولة في سلطنة عُمان.

الإطار القانوني:
- المرسوم السلطاني رقم 111/2011 - قانون الرقابة المالية والإدارية للدولة
- المرسوم السلطاني رقم 112/2011 - قانون حماية المال العام وتجنب تضارب المصالح

مهمتك: تحليل الشكاوى والبلاغات وتصنيفها وفقاً للتصنيفات التالية:

1. **اختلاس المال العام** (درجة خطورة: 90-100)
   - المادة 4، 9 من المرسوم 112/2011
   - العقوبة: 6 أشهر - 2 سنة سجن + الفصل + مصادرة الأموال

2. **رشوة** (درجة خطورة: 90-100)
   - قبول رشوة لأداء عمل مخالف للواجبات
   - العقوبة: السجن + الفصل من الوظيفة

3. **تضارب المصالح** (درجة خطورة: 70-89)
   - المادة 6، 11 من المرسوم 112/2011
   - التعامل مع شركات تحت إشرافه أو ملكية أسهم فيها
   - العقوبة: 3 أشهر - 1 سنة سجن

4. **استغلال المنصب** (درجة خطورة: 70-89)
   - المادة 7 من المرسوم 112/2011
   - استخدام المنصب لتحقيق منفعة شخصية
   - العقوبة: 1-3 سنوات سجن

5. **تزوير** (درجة خطورة: 70-89)
   - تزوير المعلومات أو المحررات الرسمية
   - العقوبة: 1-5 سنوات سجن + غرامة

6. **مخالفة قانون المناقصات** (درجة خطورة: 60-79)
   - تجاوز إجراءات الطرح، تفضيل مقاول

7. **إهمال إداري / إخلال بالواجبات** (درجة خطورة: 40-59)
   - المادة 8(7)، 8(8) من المرسوم 111/2011

8. **عدم الإبلاغ عن مخالفات** (درجة خطورة: 40-59)
   - المادة 5 من المرسوم 112/2011
   - العقوبة: 6 أشهر - 2 سنة سجن

لكل شكوى، قدم:
1. **التصنيف الرئيسي**: [اسم التصنيف]
2. **المرجع القانوني**: [المرسوم والمادة]
3. **درجة الخطورة**: [رقم]/100
4. **الكلمات المفتاحية**: [كلمة1، كلمة2، كلمة3]
5. **التوصية الأولية**: [توصيتك]

أجب باللغة العربية بأسلوب مهني ورسمي.`,
    english: `You are "Ruzn", an intelligent assistant specialized for the State Audit Institution (OSAI) of the Sultanate of Oman.

Legal Framework:
- Royal Decree 111/2011 - State Audit Law
- Royal Decree 112/2011 - Protection of Public Funds and Avoidance of Conflict of Interest Law

Your mission: Analyze and classify complaints according to these categories:

1. **Embezzlement** (Risk: 90-100)
   - Articles 4, 9 of RD 112/2011
   - Penalty: 6 months - 2 years imprisonment + dismissal + confiscation

2. **Bribery** (Risk: 90-100)
   - Accepting bribes to perform acts contrary to duties
   - Penalty: Imprisonment + removal from office

3. **Conflict of Interest** (Risk: 70-89)
   - Articles 6, 11 of RD 112/2011
   - Dealing with supervised entities or holding shares
   - Penalty: 3 months - 1 year imprisonment

4. **Abuse of Position** (Risk: 70-89)
   - Article 7 of RD 112/2011
   - Using position for personal benefit
   - Penalty: 1-3 years imprisonment

5. **Forgery** (Risk: 70-89)
   - Information forgery or forgery in official instruments
   - Penalty: 1-5 years imprisonment + fine

6. **Tender Law Violation** (Risk: 60-79)
   - Bypassing tender procedures, contractor favoritism

7. **Administrative Negligence / Duty Failure** (Risk: 40-59)
   - Articles 8(7), 8(8) of RD 111/2011

8. **Failure to Report Violations** (Risk: 40-59)
   - Article 5 of RD 112/2011
   - Penalty: 6 months - 2 years imprisonment

For each complaint, provide:
1. **Primary Classification**: [classification name]
2. **Legal Reference**: [Decree and Article]
3. **Risk Score**: [number]/100
4. **Keywords**: [keyword1, keyword2, keyword3]
5. **Initial Recommendation**: [your recommendation]

Respond in English with a professional and formal tone.`
  },
  legislative: {
    arabic: `أنت "رُزن"، مساعد قانوني ذكي متخصص في التشريعات العُمانية المتعلقة بالرقابة المالية والإدارية.

قاعدة المعرفة القانونية:

**المرسوم السلطاني 111/2011 - قانون الرقابة المالية والإدارية للدولة:**
- المادة 2: الجهاز له الشخصية الاعتبارية والاستقلال المالي والإداري
- المادة 7: لأعضاء الجهاز صفة الضبطية القضائية
- المادة 8: أهداف الجهاز (حماية المال العام، التحقق من الالتزام، تجنب تضارب المصالح، الشفافية، الرقابة الوقائية)
- المادة 9: اختصاصات الجهاز (الرقابة المالية، الإدارية، رقابة الأداء)

**المرسوم السلطاني 112/2011 - قانون حماية المال العام:**
- المادة 4: للأموال العامة حرمتها ويجب المحافظة عليها
- المادة 5: واجب الإبلاغ الفوري عن المخالفات
- المادة 6: حظر التعامل مع جهات تحت الإشراف
- المادة 7: حظر استغلال المنصب (عقوبة: 1-3 سنوات)
- المادة 8: حظر الوساطة والتمثيل
- المادة 9: حظر الاستخدام الشخصي للمال العام
- المادة 10: حظر العمل بالقطاع الخاص
- المادة 11: حظر ملكية الأسهم في شركات مرتبطة
- المادة 12: واجب الإفصاح المالي السنوي
- المادة 13: واجب السرية

**الخطة الوطنية لتعزيز النزاهة 2022-2030:**
- الرؤية: مؤسسات نزيهة وقوانين فاعلة ومجتمع واعٍ
- المبادئ: النزاهة، الشفافية، المساءلة، الشراكة
- المحاور الخمسة: منظومة تشريعية، أداء مؤسسي، قطاع خاص نزيه، شفافية مجتمعية، تعاون دولي

**إحصائيات 2024:**
- 25 مليون ريال عماني تم استردادها
- 72 قضية مخالفات مالية وإدارية
- 25 قضية قيد النظر القضائي

عند الإجابة:
1. استشهد بالمادة القانونية المحددة
2. اذكر العقوبة المقررة إن وجدت
3. قدم تفسيراً واضحاً ومبسطاً
4. قدم توصيات عملية

أجب باللغة العربية بأسلوب قانوني دقيق.`,
    english: `You are "Ruzn", an intelligent legal assistant specialized in Omani legislation related to financial and administrative oversight.

Legal Knowledge Base:

**Royal Decree 111/2011 - State Audit Law:**
- Article 2: Institution has legal personality with financial and administrative independence
- Article 7: Members have judicial police authority
- Article 8: Objectives (protect public funds, verify compliance, avoid conflicts, transparency, preventive oversight)
- Article 9: Competencies (financial, administrative, performance oversight)

**Royal Decree 112/2011 - Protection of Public Funds Law:**
- Article 4: Public funds are inviolable and must be preserved
- Article 5: Duty to immediately report violations
- Article 6: Prohibition on dealing with supervised entities
- Article 7: Prohibition on abuse of position (Penalty: 1-3 years)
- Article 8: Prohibition on mediation/representation
- Article 9: Prohibition on personal use of public funds
- Article 10: Prohibition on private sector work
- Article 11: Prohibition on shareholding in connected companies
- Article 12: Annual financial disclosure duty
- Article 13: Confidentiality duty

**National Integrity Plan 2022-2030:**
- Vision: Institutions with integrity, effective laws, aware society
- Principles: Integrity, Transparency, Accountability, Partnership
- Five Pillars: Legislative framework, Institutional performance, Ethical private sector, Community transparency, International cooperation

**2024 Statistics:**
- OMR 25 million recovered
- 72 financial/administrative irregularity cases
- 25 cases under judicial consideration

When responding:
1. Cite the specific legal article
2. Mention applicable penalties
3. Provide clear interpretation
4. Offer practical recommendations

Respond in English with precise legal language.`
  }
};

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: protectedProcedure.query(opts => opts.ctx.user),
    logout: protectedProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Ruzn-Lite AI Chat Router
  chat: router({
    send: protectedProcedure
      .input(z.object({
        message: z.string().min(1),
        language: z.enum(['arabic', 'english']),
        feature: z.enum(['complaints', 'legislative']),
        history: z.array(z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string()
        })).optional().default([])
      }))
      .mutation(async ({ input, ctx }) => {
        const { message, language, feature, history } = input;
        
        // Get appropriate system prompt
        const systemPrompt = SYSTEM_PROMPTS[feature][language];
        
        // Build messages array
        const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
          { role: 'system', content: systemPrompt }
        ];
        
        // Add conversation history (last 6 messages)
        for (const h of history.slice(-6)) {
          messages.push({ role: h.role, content: h.content });
        }
        
        // Add current message
        messages.push({ role: 'user', content: message });
        
        try {
          const response = await invokeLLM({ messages });
          const rawContent = response.choices[0]?.message?.content;
          const assistantMessage = typeof rawContent === 'string' ? rawContent : '';
          
          // Log analytics event
          const userId = ctx.user?.id;
          let riskScore: number | undefined;
          let category: string | undefined;
          
          // Extract risk score and category from response if complaints mode
          if (feature === 'complaints') {
            const riskMatch = assistantMessage.match(/(\d{1,3})\/100/);
            if (riskMatch) {
              riskScore = parseInt(riskMatch[1]);
            }
            
            // Detect category
            const categoryMap: Record<string, string> = {
              'فساد مالي': 'financial_corruption',
              'Financial Corruption': 'financial_corruption',
              'تضارب المصالح': 'conflict_of_interest',
              'Conflict of Interest': 'conflict_of_interest',
              'إساءة استخدام السلطة': 'abuse_of_power',
              'Abuse of Power': 'abuse_of_power',
              'مخالفة قانون المناقصات': 'tender_violation',
              'Tender Law Violation': 'tender_violation',
              'إهمال إداري': 'administrative_negligence',
              'Administrative Negligence': 'administrative_negligence',
              'شكوى عامة': 'general',
              'General Complaint': 'general'
            };
            
            for (const [key, value] of Object.entries(categoryMap)) {
              if (typeof assistantMessage === 'string' && assistantMessage.includes(key)) {
                category = value;
                break;
              }
            }
          }
          
          await logAnalyticsEvent({
            userId,
            eventType: feature === 'complaints' ? 'complaint_analyzed' : 'legislative_query',
            feature,
            language,
            category,
            riskScore,
            metadata: JSON.stringify({ messageLength: message.length })
          });
          
          // Send notification for high-risk complaints (score >= 80)
          if (feature === 'complaints' && riskScore && riskScore >= 80) {
            try {
              const { notifyOwner } = await import('./_core/notification');
              const categoryLabel = category ? {
                'financial_corruption': language === 'arabic' ? 'فساد مالي' : 'Financial Corruption',
                'conflict_of_interest': language === 'arabic' ? 'تضارب المصالح' : 'Conflict of Interest',
                'abuse_of_power': language === 'arabic' ? 'إساءة استخدام السلطة' : 'Abuse of Power',
                'tender_violation': language === 'arabic' ? 'مخالفة قانون المناقصات' : 'Tender Violation',
                'administrative_negligence': language === 'arabic' ? 'إهمال إداري' : 'Administrative Negligence',
                'general': language === 'arabic' ? 'شكوى عامة' : 'General Complaint'
              }[category] || category : 'Unknown';
              
              await notifyOwner({
                title: language === 'arabic' 
                  ? `⚠️ تنبيه: شكوى عالية الخطورة (${riskScore}/100)`
                  : `⚠️ Alert: High-Risk Complaint (${riskScore}/100)`,
                content: language === 'arabic'
                  ? `تم استلام شكوى بدرجة خطورة عالية.\n\nالتصنيف: ${categoryLabel}\nدرجة الخطورة: ${riskScore}/100\n\nملخص الشكوى:\n${message.substring(0, 500)}${message.length > 500 ? '...' : ''}\n\nيرجى مراجعة الشكوى في لوحة المشرف.`
                  : `A high-risk complaint has been received.\n\nCategory: ${categoryLabel}\nRisk Score: ${riskScore}/100\n\nComplaint Summary:\n${message.substring(0, 500)}${message.length > 500 ? '...' : ''}\n\nPlease review the complaint in the Admin Panel.`
              });
              console.log(`[Notification] High-risk complaint alert sent (Risk: ${riskScore})`);
            } catch (notifyError) {
              console.error('[Notification] Failed to send high-risk alert:', notifyError);
            }
          }
          
          return {
            response: assistantMessage,
            status: 'success' as const,
            riskScore,
            category
          };
        } catch (error) {
          console.error('LLM Error:', error);
          return {
            response: language === 'arabic' 
              ? 'عذراً، حدث خطأ في معالجة طلبك. يرجى المحاولة مرة أخرى.'
              : 'Sorry, an error occurred processing your request. Please try again.',
            status: 'error' as const
          };
        }
      }),
    
    health: protectedProcedure.query(() => ({
      status: 'healthy',
      service: 'Ruzn-Lite',
      version: '2.0'
    })),

    // Save conversation to database (for logged-in users)
    saveConversation: protectedProcedure
      .input(z.object({
        messages: z.array(z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string()
        })),
        feature: z.enum(['complaints', 'legislative']),
        language: z.enum(['arabic', 'english']),
        riskScore: z.number().optional(),
        category: z.string().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        const { messages, feature, language, riskScore, category } = input;
        const userId = ctx.user.id;
        
        await saveConversation({
          userId,
          messages: JSON.stringify(messages),
          feature,
          language,
          riskScore,
          category
        });
        
        return { success: true };
      }),

    // Get user's conversation history
    getHistory: protectedProcedure.query(async ({ ctx }) => {
      const conversations = await getConversationsByUser(ctx.user.id);
      return conversations;
    }),

    // Generate PDF export data
    exportPdf: protectedProcedure
      .input(z.object({
        messages: z.array(z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string()
        })),
        feature: z.enum(['complaints', 'legislative']),
        language: z.enum(['arabic', 'english'])
      }))
      .mutation(async ({ ctx, input }) => {
        const { messages, feature, language } = input;
        const userName = ctx.user.name || 'OSAI Staff';
        const timestamp = new Date().toISOString();
        
        // Log PDF export event
        await logAnalyticsEvent({
          userId: ctx.user.id,
          eventType: 'pdf_export',
          feature,
          language,
          metadata: JSON.stringify({ messageCount: messages.length })
        });
        
        // Return structured data for client-side PDF generation
        return {
          userName,
          timestamp,
          feature,
          language,
          messages,
          title: language === 'arabic' ? 'تقرير محادثة رُزن' : 'Ruzn Conversation Report',
          subtitle: language === 'arabic' 
            ? 'ديوان الرقابة المالية والإدارية للدولة' 
            : 'State Audit Institution'
        };
      }),

    // Get sample complaints for demo
    getSamples: protectedProcedure
      .input(z.object({
        language: z.enum(['arabic', 'english']).optional().default('arabic'),
        category: z.string().optional()
      }))
      .query(async ({ input }) => {
        const samples = await getSampleComplaints(input.language, input.category);
        return samples;
      }),

    // Voice transcription endpoint
    transcribe: protectedProcedure
      .input(z.object({
        audioUrl: z.string().url(),
        language: z.enum(['arabic', 'english']).optional()
      }))
      .mutation(async ({ ctx, input }) => {
        const { audioUrl, language } = input;
        
        try {
          const result = await transcribeAudio({
            audioUrl,
            language: language === 'arabic' ? 'ar' : 'en',
            prompt: language === 'arabic' 
              ? 'شكوى مقدمة لديوان الرقابة المالية والإدارية للدولة'
              : 'Complaint submitted to the State Audit Institution'
          });
          
          // Check if result has text (success case)
          if ('text' in result && result.text) {
            // Log voice input event
            await logAnalyticsEvent({
              userId: ctx.user.id,
              eventType: 'voice_input',
              feature: 'complaints',
              language: language || 'arabic',
              metadata: JSON.stringify({ duration: result.segments?.length || 0 })
            });
            
            return {
              text: result.text,
              language: result.language || language || 'arabic',
              status: 'success' as const
            };
          }
          
          // Error case
          return {
            text: '',
            language: language || 'arabic',
            status: 'error' as const
          };
        } catch (error) {
          console.error('Transcription Error:', error);
          return {
            text: '',
            language: language || 'arabic',
            status: 'error' as const
          };
        }
      }),

    // Document upload endpoint
    uploadDocument: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        fileType: z.string(),
        fileData: z.string(), // Base64 encoded file data
        language: z.enum(['arabic', 'english']).optional().default('arabic')
      }))
      .mutation(async ({ ctx, input }) => {
        const { fileName, fileType, fileData, language } = input;
        
        try {
          // Decode base64 file data
          const buffer = Buffer.from(fileData, 'base64');
          
          // Generate unique file key
          const timestamp = Date.now();
          const randomSuffix = Math.random().toString(36).substring(2, 8);
          const fileKey = `complaints/${ctx.user.id}/${timestamp}-${randomSuffix}-${fileName}`;
          
          // Upload to S3
          const { url } = await storagePut(fileKey, buffer, fileType);
          
          // Log upload event
          await logAnalyticsEvent({
            userId: ctx.user.id,
            eventType: 'document_upload',
            feature: 'complaints',
            language,
            metadata: JSON.stringify({ fileName, fileType, fileKey })
          });
          
          return {
            url,
            fileKey,
            fileName,
            fileType,
            status: 'success' as const
          };
        } catch (error) {
          console.error('Document Upload Error:', error);
          return {
            url: '',
            fileKey: '',
            fileName,
            fileType,
            status: 'error' as const
          };
        }
      }),

    // Analyze uploaded document with AI
    analyzeDocument: protectedProcedure
      .input(z.object({
        documentUrl: z.string().url(),
        documentType: z.string(),
        language: z.enum(['arabic', 'english']).optional().default('arabic'),
        additionalContext: z.string().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        const { documentUrl, documentType, language, additionalContext } = input;
        
        const systemPrompt = language === 'arabic' 
          ? SYSTEM_PROMPTS.complaints.arabic 
          : SYSTEM_PROMPTS.complaints.english;
        
        const userPrompt = language === 'arabic'
          ? `قم بتحليل هذا المستند المرفق وتصنيف أي شكوى أو مخالفة محتملة فيه.${additionalContext ? `\n\nسياق إضافي: ${additionalContext}` : ''}`
          : `Analyze this attached document and classify any potential complaint or violation in it.${additionalContext ? `\n\nAdditional context: ${additionalContext}` : ''}`;
        
        try {
          // Determine content type for LLM
          const isImage = documentType.startsWith('image/');
          const isPdf = documentType === 'application/pdf';
          
          let messages: any[] = [
            { role: 'system', content: systemPrompt }
          ];
          
          if (isImage) {
            messages.push({
              role: 'user',
              content: [
                { type: 'text', text: userPrompt },
                { type: 'image_url', image_url: { url: documentUrl, detail: 'high' } }
              ]
            });
          } else if (isPdf) {
            messages.push({
              role: 'user',
              content: [
                { type: 'text', text: userPrompt },
                { type: 'file_url', file_url: { url: documentUrl, mime_type: 'application/pdf' } }
              ]
            });
          } else {
            // For other file types, just mention the URL
            messages.push({
              role: 'user',
              content: `${userPrompt}\n\nDocument URL: ${documentUrl}`
            });
          }
          
          const response = await invokeLLM({ messages });
          const assistantMessage = response.choices[0]?.message?.content || '';
          
          // Log analysis event
          await logAnalyticsEvent({
            userId: ctx.user.id,
            eventType: 'document_analysis',
            feature: 'complaints',
            language,
            metadata: JSON.stringify({ documentType })
          });
          
          return {
            analysis: assistantMessage,
            status: 'success' as const
          };
        } catch (error) {
          console.error('Document Analysis Error:', error);
          return {
            analysis: '',
            status: 'error' as const
          };
        }
      })
  }),

  // Analytics Router
  analytics: router({
    getSummary: protectedProcedure
      .input(z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional()
      }).optional())
      .query(async ({ input }) => {
        const summary = await getAnalyticsSummary(input?.startDate, input?.endDate);
        return summary;
      }),

    getAuditFindings: protectedProcedure
      .input(z.object({
        language: z.enum(['arabic', 'english']).optional().default('arabic'),
        severity: z.string().optional(),
        ministry: z.string().optional()
      }))
      .query(async ({ input }) => {
        const findings = await getAuditFindings(input.language, input.severity, input.ministry);
        return findings;
      }),

    getLegislativeDocs: protectedProcedure
      .input(z.object({
        language: z.enum(['arabic', 'english']).optional().default('arabic'),
        documentType: z.string().optional()
      }))
      .query(async ({ input }) => {
        const docs = await getLegislativeDocuments(input.language, input.documentType);
        return docs;
      })
  }),

  // Admin Router (for supervisors)
  admin: router({
    getAllConversations: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(500).optional().default(100)
      }))
      .query(async ({ ctx, input }) => {
        // Check if user is admin
        if (ctx.user.role !== 'admin') {
          return { conversations: [], error: 'Unauthorized' };
        }
        
        const conversations = await getAllConversations(input.limit);
        return { conversations };
      }),

    getAllUsers: protectedProcedure.query(async ({ ctx }) => {
      // Check if user is admin
      if (ctx.user.role !== 'admin') {
        return { users: [], error: 'Unauthorized' };
      }
      
      const users = await getAllUsers();
      return { users };
    }),

    getAnalytics: protectedProcedure
      .input(z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional()
      }).optional())
      .query(async ({ ctx, input }) => {
        // Check if user is admin
        if (ctx.user.role !== 'admin') {
          return { analytics: null, error: 'Unauthorized' };
        }
        
        const analytics = await getAnalyticsSummary(input?.startDate, input?.endDate);
        return { analytics };
      }),

    // Update conversation status
    updateStatus: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
        newStatus: z.enum(['new', 'under_review', 'investigating', 'resolved']),
        notes: z.string().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          return { success: false, error: 'Unauthorized' };
        }
        
        const result = await updateConversationStatus(
          input.conversationId,
          input.newStatus,
          ctx.user.id,
          ctx.user.name || 'Admin',
          input.notes
        );
        return result;
      }),

    // Get status history for a conversation
    getStatusHistory: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          return { history: [], error: 'Unauthorized' };
        }
        
        const history = await getStatusHistory(input.conversationId);
        return { history };
      }),

    // Get conversations filtered by status
    getConversationsByStatus: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        limit: z.number().min(1).max(500).optional().default(100)
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          return { conversations: [], error: 'Unauthorized' };
        }
        
        const conversations = await getConversationsByStatus(input.status, input.limit);
        return { conversations };
      }),

    // Generate weekly report
    generateWeeklyReport: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          return { report: null, error: 'Unauthorized' };
        }
        
        const report = await generateWeeklyReport();
        return { report };
      }),

    // Get past weekly reports
    getWeeklyReports: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(50).optional().default(10) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          return { reports: [], error: 'Unauthorized' };
        }
        
        const reports = await getWeeklyReports(input.limit);
        return { reports };
      }),

    // Send weekly report to recipients (manual trigger)
    sendWeeklyReport: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          return { success: false, error: 'Unauthorized' };
        }
        
        const result = await sendWeeklyReportToRecipients();
        return result;
      }),

    // Get report as HTML
    getReportHtml: protectedProcedure
      .input(z.object({ reportId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          return { html: '', error: 'Unauthorized' };
        }
        
        // Get latest report or specific one
        const reports = await getWeeklyReports(1);
        if (reports.length === 0) {
          return { html: '', error: 'No reports found' };
        }
        
        const html = getReportHtml(reports[0]);
        return { html };
      }),

    // Get auto-refresh status
    getRefreshStatus: protectedProcedure.query(() => {
      return getRefreshStatus();
    }),

    // Update refresh configuration (admin only)
    updateRefreshConfig: protectedProcedure
      .input(z.object({
        enabled: z.boolean().optional(),
        intervalHours: z.number().min(1).max(720).optional()
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          return { success: false, error: 'Unauthorized' };
        }
        const config = updateRefreshConfig(input);
        return { success: true, config };
      }),

    // Trigger manual data refresh (admin only)
    triggerRefresh: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          return { success: false, error: 'Unauthorized' };
        }
        // Seed historical data and record refresh
        const seedResult = await seedHistoricalData();
        if (seedResult.success) {
          recordRefresh();
        }
        return seedResult;
      })
  }),

  // Dashboard Router (for home page widgets)
  dashboard: router({
    getStats: protectedProcedure.query(async () => {
      const stats = await getDashboardStats();
      return stats;
    })
  }),

  // Historical Data Router (for comparative analysis)
  historical: router({
    // Get available metrics for comparison
    getAvailableMetrics: protectedProcedure.query(() => {
      return getAvailableMetrics();
    }),

    // Get available years for comparison
    getAvailableYears: protectedProcedure.query(() => {
      return getAvailableYears();
    }),

    // Get historical statistics
    getStats: protectedProcedure
      .input(z.object({
        years: z.array(z.number()).optional(),
        metrics: z.array(z.string()).optional()
      }).optional())
      .query(async ({ input }) => {
        const stats = await getHistoricalStats(input?.years, input?.metrics);
        return stats;
      }),

    // Get complaints by entity
    getComplaintsByEntity: protectedProcedure
      .input(z.object({
        years: z.array(z.number()).optional()
      }).optional())
      .query(async ({ input }) => {
        const data = await getHistoricalComplaintsByEntityData(input?.years);
        return data;
      }),

    // Get complaints by category
    getComplaintsByCategory: protectedProcedure
      .input(z.object({
        years: z.array(z.number()).optional()
      }).optional())
      .query(async ({ input }) => {
        const data = await getHistoricalComplaintsByCategoryData(input?.years);
        return data;
      }),

    // Get conviction examples
    getConvictions: protectedProcedure
      .input(z.object({
        years: z.array(z.number()).optional()
      }).optional())
      .query(async ({ input }) => {
        const data = await getHistoricalConvictionsData(input?.years);
        return data;
      }),

    // Seed historical data (admin only)
    seedData: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          return { success: false, message: 'Unauthorized' };
        }
        const result = await seedHistoricalData();
        return result;
      })
  }),

  // Case Law Database Router
  caseLaw: router({
    // Search case law
    search: protectedProcedure
      .input(z.object({
        query: z.string().optional(),
        year: z.number().optional(),
        violationType: z.string().optional(),
        entityType: z.string().optional(),
        outcome: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional()
      }).optional())
      .query(async ({ input }) => {
        const result = await searchCaseLaw(input || {});
        return result;
      }),

    // Get case by ID
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const caseData = await getCaseLawById(input.id);
        return caseData;
      }),

    // Get case law statistics
    getStats: protectedProcedure.query(async () => {
      const stats = await getCaseLawStats();
      return stats;
    }),

    // Seed case law database (admin only)
    seedDatabase: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          return { success: false, count: 0, error: 'Unauthorized' };
        }
        const result = await seedCaseLawDatabase();
        return result;
      }),

    // Get violation types for filtering
    getViolationTypes: protectedProcedure.query(() => {
      return [
        { value: 'embezzlement', labelEn: 'Embezzlement', labelAr: 'اختلاس' },
        { value: 'bribery', labelEn: 'Bribery', labelAr: 'رشوة' },
        { value: 'conflict_of_interest', labelEn: 'Conflict of Interest', labelAr: 'تضارب المصالح' },
        { value: 'abuse_of_power', labelEn: 'Abuse of Power', labelAr: 'إساءة استخدام السلطة' },
        { value: 'forgery', labelEn: 'Forgery', labelAr: 'تزوير' },
        { value: 'tender_violation', labelEn: 'Tender Violation', labelAr: 'مخالفة قانون المناقصات' },
        { value: 'administrative_negligence', labelEn: 'Administrative Negligence', labelAr: 'إهمال إداري' },
        { value: 'other', labelEn: 'Other', labelAr: 'أخرى' }
      ];
    }),

    // Get entity types for filtering
    getEntityTypes: protectedProcedure.query(() => {
      return [
        { value: 'ministry', labelEn: 'Ministry', labelAr: 'وزارة' },
        { value: 'government_company', labelEn: 'Government Company', labelAr: 'شركة حكومية' },
        { value: 'municipality', labelEn: 'Municipality', labelAr: 'بلدية' },
        { value: 'public_authority', labelEn: 'Public Authority', labelAr: 'هيئة عامة' },
        { value: 'other', labelEn: 'Other', labelAr: 'أخرى' }
      ];
    }),

    // Export case to PDF
    exportPdf: protectedProcedure
      .input(z.object({
        id: z.number(),
        language: z.enum(['ar', 'en'])
      }))
      .mutation(async ({ input }) => {
        const caseData = await getCaseLawById(input.id);
        if (!caseData) {
          return { success: false, html: '', error: 'Case not found' };
        }
        
        const isArabic = input.language === 'ar';
        const entity = isArabic ? (caseData.entityNameArabic || caseData.entityNameEnglish) : caseData.entityNameEnglish;
        const description = isArabic ? (caseData.detailsArabic || caseData.summaryArabic || caseData.summaryEnglish || '') : (caseData.detailsEnglish || caseData.summaryEnglish || '');
        const violationLabel = isArabic ? (caseData.violationTypeArabic || caseData.violationType) : (caseData.violationTypeEnglish || caseData.violationType);
        
        // Build penalty string
        const penaltyParts: string[] = [];
        if (caseData.sentenceYears) penaltyParts.push(isArabic ? `${caseData.sentenceYears} سنة` : `${caseData.sentenceYears} years`);
        if (caseData.sentenceMonths) penaltyParts.push(isArabic ? `${caseData.sentenceMonths} شهر` : `${caseData.sentenceMonths} months`);
        if (caseData.fineOMR) penaltyParts.push(isArabic ? `غرامة ${caseData.fineOMR} ر.ع.` : `Fine: ${caseData.fineOMR} OMR`);
        const penalty = penaltyParts.join(isArabic ? ' و ' : ' and ') || (isArabic ? 'غير محدد' : 'Not specified');
        
        const html = generateCaseLawPDF({
          caseNumber: caseData.caseNumber || `CASE-${caseData.id}`,
          year: caseData.year,
          entity: entity,
          violationType: violationLabel || caseData.violationType,
          description: description,
          penalty: penalty,
          amountInvolved: caseData.amountInvolved || undefined,
          legalArticles: caseData.legalArticles || undefined,
          outcome: caseData.outcome || 'convicted'
        }, input.language);
        
        return { success: true, html };
      })
  }),

  // Complaint Registry Router
  registry: router({
    // Submit a complaint from the registry
    submitComplaint: protectedProcedure
      .input(z.object({
        externalId: z.string(),
        channel: z.string(),
        complainantType: z.string(),
        entity: z.string(),
        governorate: z.string(),
        topic: z.string().nullable(),
        amountOmr: z.number().nullable(),
        text: z.string(),
        classification: z.string(),
        riskScore: z.number(),
        riskLevel: z.enum(['low', 'med', 'high']),
        routing: z.string(),
        flags: z.array(z.string()),
        rationale: z.string(),
        status: z.enum(['new', 'under_review', 'investigating', 'resolved']),
        slaTargetDays: z.number()
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await saveRegistryComplaint(input, ctx.user.id);
        return { success: !!result, id: result };
      }),

    // Get all complaints for registry view
    getComplaints: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        riskLevel: z.string().optional(),
        entity: z.string().optional()
      }).optional())
      .query(async ({ input }) => {
        const complaints = await getRegistryComplaints(input);
        return complaints;
      }),

    // Assign a complaint to a user
    assignComplaint: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
        assigneeId: z.number()
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await assignComplaint(
          input.conversationId,
          input.assigneeId,
          ctx.user.id,
          ctx.user.name || 'Unknown'
        );
        return result;
      }),

    // Get complaints assigned to current user
    getMyAssignments: protectedProcedure
      .query(async ({ ctx }) => {
        const complaints = await getAssignedComplaints(ctx.user.id);
        return complaints;
      }),

    // Get assignment statistics
    getAssignmentStats: protectedProcedure
      .query(async () => {
        const stats = await getAssignmentStats();
        return stats;
      }),

    // Get all users for assignment dropdown
    getAssignees: protectedProcedure
      .query(async () => {
        const users = await getAllUsers();
        return users.map(u => ({
          id: u.id,
          name: u.name || u.email || `User ${u.id}`,
          role: u.role
        }));
      })
  }),

  // Knowledge Base Router
  knowledge: router({
    // Search knowledge base with filtering and sorting
    search: protectedProcedure
      .input(z.object({
        query: z.string(),
        language: z.enum(['arabic', 'english']).optional(),
        category: z.enum(['law', 'regulation', 'policy', 'procedure', 'report', 'guideline']).optional(),
        dateFrom: z.string().optional(), // ISO date string
        dateTo: z.string().optional(),
        sortBy: z.enum(['date', 'title', 'relevance']).optional().default('relevance'),
        sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
        limit: z.number().min(1).max(50).optional().default(10)
      }))
      .query(async ({ input }) => {
        const results = await searchKnowledgeBase(input.query, { 
          language: input.language || 'english',
          category: input.category,
          limit: input.limit
        });
        
        // Apply date filtering if specified
        let filtered = results;
        if (input.dateFrom || input.dateTo) {
          filtered = results.filter((r: any) => {
            const entryDate = r.entry?.effectiveDate || r.entry?.createdAt;
            if (!entryDate) return true;
            const date = new Date(entryDate);
            if (input.dateFrom && date < new Date(input.dateFrom)) return false;
            if (input.dateTo && date > new Date(input.dateTo)) return false;
            return true;
          });
        }
        
        // Apply sorting
        if (input.sortBy === 'date') {
          filtered.sort((a: any, b: any) => {
            const dateA = new Date(a.entry?.effectiveDate || a.entry?.createdAt || 0).getTime();
            const dateB = new Date(b.entry?.effectiveDate || b.entry?.createdAt || 0).getTime();
            return input.sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
          });
        } else if (input.sortBy === 'title') {
          filtered.sort((a: any, b: any) => {
            const titleA = (a.entry?.title || '').toLowerCase();
            const titleB = (b.entry?.title || '').toLowerCase();
            return input.sortOrder === 'asc' ? titleA.localeCompare(titleB) : titleB.localeCompare(titleA);
          });
        }
        // 'relevance' is default from searchKnowledgeBase
        
        return filtered;
      }),

    // Get all knowledge entries with filtering and sorting
    getAll: protectedProcedure
      .input(z.object({
        category: z.enum(['law', 'regulation', 'policy', 'procedure', 'report', 'guideline']).optional(),
        sortBy: z.enum(['date', 'title']).optional().default('date'),
        sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
        limit: z.number().min(1).max(100).optional().default(50),
        offset: z.number().min(0).optional().default(0)
      }).optional())
      .query(async ({ input }) => {
        const options = input ?? { category: undefined, sortBy: 'date' as const, sortOrder: 'desc' as const, limit: 50, offset: 0 };
        const entries = await getAllKnowledge({
          category: options.category,
          limit: options.limit ?? 50,
          offset: options.offset ?? 0
        });
        
        // Apply sorting
        let sorted = Array.isArray(entries) ? entries : (entries.entries || []);
        const sortBy = options.sortBy ?? 'date';
        const sortOrder = options.sortOrder ?? 'desc';
        if (sortBy === 'title') {
          sorted = [...sorted].sort((a: any, b: any) => {
            const titleA = (a.title || '').toLowerCase();
            const titleB = (b.title || '').toLowerCase();
            return sortOrder === 'asc' ? titleA.localeCompare(titleB) : titleB.localeCompare(titleA);
          });
        } else if (sortBy === 'date') {
          sorted = [...sorted].sort((a: any, b: any) => {
            const dateA = new Date(a.effectiveDate || a.updatedAt || a.createdAt || 0).getTime();
            const dateB = new Date(b.effectiveDate || b.updatedAt || b.createdAt || 0).getTime();
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
          });
        }
        
        return { entries: sorted, total: Array.isArray(entries) ? entries.length : (entries.total || sorted.length) };
      }),

    // Seed knowledge base
    seed: protectedProcedure
      .mutation(async () => {
        const result = await seedKnowledgeBase();
        return result;
      }),

    // Create new knowledge entry (admin only)
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1),
        titleArabic: z.string().optional(),
        content: z.string().min(1),
        contentArabic: z.string().optional(),
        category: z.enum(['law', 'regulation', 'policy', 'procedure', 'report', 'guideline']),
        source: z.string().min(1),
        referenceNumber: z.string().optional(),
        keywords: z.array(z.string()).default([]),
        keywordsArabic: z.array(z.string()).optional()
      }))
      .mutation(async ({ input, ctx }) => {
        // Only admins can create entries
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admins can add documents' });
        }
        const result = await createKnowledgeEntry(input);
        return result;
      }),

    // Delete knowledge entry (admin only)
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admins can delete documents' });
        }
        const result = await deleteKnowledgeEntry(input.id);
        return result;
      }),

    // Update knowledge entry with versioning (admin only)
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        titleArabic: z.string().optional(),
        content: z.string().optional(),
        contentArabic: z.string().optional(),
        category: z.enum(['law', 'regulation', 'policy', 'procedure', 'report', 'guideline']).optional(),
        source: z.string().optional(),
        referenceNumber: z.string().optional(),
        keywords: z.array(z.string()).optional(),
        keywordsArabic: z.array(z.string()).optional()
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admins can update documents' });
        }
        const { id, keywords, keywordsArabic, ...otherUpdates } = input;
        const updates = {
          ...otherUpdates,
          keywords: keywords ? JSON.stringify(keywords) : undefined,
          keywordsArabic: keywordsArabic ? JSON.stringify(keywordsArabic) : undefined
        };
        const result = await updateKnowledgeEntry(id, updates, ctx.user.name || 'admin', 'Updated via admin panel');
        return result;
      }),

    // Get version history for a document
    getVersionHistory: protectedProcedure
      .input(z.object({ documentId: z.number() }))
      .query(async ({ input }) => {
        const history = await getVersionHistory(input.documentId);
        return history;
      }),

    // Restore document to previous version (admin only)
    restoreVersion: protectedProcedure
      .input(z.object({
        documentId: z.number(),
        targetVersion: z.number()
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admins can restore versions' });
        }
        const result = await restoreVersion(
          input.documentId,
          input.targetVersion,
          ctx.user.name || 'admin'
        );
        return result;
      }),

    // Upload PDF and create knowledge entry (admin only)
    uploadPDF: protectedProcedure
      .input(z.object({
        fileData: z.string(), // Base64 encoded PDF
        fileName: z.string(),
        documentType: z.enum(['royal_decree', 'regulation', 'policy', 'guideline', 'report', 'legal_article', 'procedure']),
        titleEnglish: z.string().optional(),
        titleArabic: z.string().optional(),
        referenceNumber: z.string().optional(),
        category: z.string().optional()
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admins can upload documents' });
        }

        try {
          // Decode base64 PDF
          const pdfBuffer = Buffer.from(input.fileData, 'base64');
          
          // Parse PDF
          const parsed = await parsePDF(pdfBuffer);
          
          // Detect language and extract content
          const isArabic = isArabicText(parsed.text);
          const summary = extractSummary(parsed.text);
          const keywords = extractKeywords(parsed.text);
          
          // Upload PDF to S3
          const fileKey = `knowledge-base/${Date.now()}-${input.fileName}`;
          const { url: fileUrl } = await storagePut(fileKey, pdfBuffer, 'application/pdf');
          
          // Map document type to category
          const categoryMap: Record<string, 'law' | 'regulation' | 'policy' | 'guideline' | 'report' | 'procedure'> = {
            'royal_decree': 'law',
            'regulation': 'regulation',
            'policy': 'policy',
            'guideline': 'guideline',
            'report': 'report',
            'legal_article': 'law',
            'procedure': 'procedure'
          };
          
          // Create knowledge entry using new schema
          const result = await createKnowledgeEntry({
            title: input.titleEnglish || parsed.info.title || input.fileName.replace('.pdf', ''),
            titleArabic: input.titleArabic,
            content: isArabic ? '' : parsed.text,
            contentArabic: isArabic ? parsed.text : '',
            category: categoryMap[input.documentType] || 'guideline',
            source: fileUrl,
            referenceNumber: input.referenceNumber,
            keywords,
            keywordsArabic: isArabic ? keywords : undefined
          });
          
          return {
            ...result,
            parsedInfo: {
              numPages: parsed.numPages,
              detectedLanguage: isArabic ? 'arabic' : 'english',
              keywordsExtracted: keywords.length
            }
          };
        } catch (error) {
          console.error('[Knowledge] PDF upload error:', error);
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: `Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}` 
          });
        }
      })
  }),

  // User Documents Router - Secure document upload and management
  userDocuments: router({
    // Upload a new document
    upload: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(500),
        titleArabic: z.string().max(500).optional(),
        description: z.string().optional(),
        descriptionArabic: z.string().optional(),
        fileName: z.string().min(1).max(255),
        fileData: z.string(), // Base64 encoded file
        fileType: z.enum(['pdf', 'doc', 'docx', 'txt', 'image']),
        category: z.enum(['complaint', 'evidence', 'legal_document', 'report', 'correspondence', 'other']).default('other'),
        tags: z.array(z.string()).optional(),
        isPrivate: z.boolean().default(true)
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          // Decode base64 file
          const fileBuffer = Buffer.from(input.fileData, 'base64');
          const fileSize = fileBuffer.length;
          
          // Validate file size (max 10MB)
          if (fileSize > 10 * 1024 * 1024) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'File size exceeds 10MB limit' });
          }
          
          // Generate unique file key
          const timestamp = Date.now();
          const sanitizedFileName = input.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
          const fileKey = `user-documents/${ctx.user.id}/${timestamp}-${sanitizedFileName}`;
          
          // Determine content type
          const contentTypeMap: Record<string, string> = {
            pdf: 'application/pdf',
            doc: 'application/msword',
            docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            txt: 'text/plain',
            image: 'image/jpeg'
          };
          const contentType = contentTypeMap[input.fileType] || 'application/octet-stream';
          
          // Upload to S3
          const { url: fileUrl } = await storagePut(fileKey, fileBuffer, contentType);
          
          // Extract text content if PDF or text file
          let extractedContent = null;
          let extractedContentArabic = null;
          
          if (input.fileType === 'pdf') {
            try {
              const parsed = await parsePDF(fileBuffer);
              const isArabic = isArabicText(parsed.text);
              if (isArabic) {
                extractedContentArabic = parsed.text;
              } else {
                extractedContent = parsed.text;
              }
            } catch (e) {
              console.warn('[UserDocuments] PDF parsing failed:', e);
            }
          } else if (input.fileType === 'txt') {
            const text = fileBuffer.toString('utf-8');
            const isArabic = isArabicText(text);
            if (isArabic) {
              extractedContentArabic = text;
            } else {
              extractedContent = text;
            }
          }
          
          // Insert into database
          const db = await import('./db').then(m => m.getDb());
          if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
          const { userDocuments } = await import('../drizzle/schema');
          
          const [result] = await db.insert(userDocuments).values({
            userId: ctx.user.id,
            title: input.title,
            titleArabic: input.titleArabic || null,
            description: input.description || null,
            descriptionArabic: input.descriptionArabic || null,
            fileName: input.fileName,
            fileType: input.fileType,
            fileSize,
            fileUrl,
            fileKey,
            extractedContent,
            extractedContentArabic,
            category: input.category,
            tags: input.tags ? JSON.stringify(input.tags) : null,
            isPrivate: input.isPrivate,
            sharedWith: null
          });
          
          return {
            id: result.insertId,
            fileUrl,
            fileSize,
            extractedContent: !!extractedContent || !!extractedContentArabic
          };
        } catch (error) {
          console.error('[UserDocuments] Upload error:', error);
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: `Failed to upload document: ${error instanceof Error ? error.message : 'Unknown error'}` 
          });
        }
      }),

    // Get user's own documents
    getMyDocuments: protectedProcedure
      .input(z.object({
        category: z.enum(['complaint', 'evidence', 'legal_document', 'report', 'correspondence', 'other']).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0)
      }).optional())
      .query(async ({ input, ctx }) => {
        const options = input ?? { category: undefined, limit: 50, offset: 0 };
        const db = await import('./db').then(m => m.getDb());
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        const { userDocuments } = await import('../drizzle/schema');
        const { eq, and, desc } = await import('drizzle-orm');
        
        const conditions = [eq(userDocuments.userId, ctx.user.id)];
        const category = options.category;
        if (category) {
          conditions.push(eq(userDocuments.category, category));
        }
        
        const documents = await db
          .select()
          .from(userDocuments)
          .where(and(...conditions))
          .orderBy(desc(userDocuments.createdAt))
          .limit(options.limit ?? 50)
          .offset(options.offset ?? 0);
        
        // Get total count
        const { sql } = await import('drizzle-orm');
        const [countResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(userDocuments)
          .where(and(...conditions));
        
        return {
          documents,
          total: countResult?.count || 0
        };
      }),

    // Get a single document by ID (with access control)
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const db = await import('./db').then(m => m.getDb());
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        const { userDocuments } = await import('../drizzle/schema');
        const { eq, and, or, like } = await import('drizzle-orm');
        
        const [document] = await db
          .select()
          .from(userDocuments)
          .where(eq(userDocuments.id, input.id))
          .limit(1);
        
        if (!document) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' });
        }
        
        // Check access: owner, shared with user, or admin
        const isOwner = document.userId === ctx.user.id;
        const isAdmin = ctx.user.role === 'admin';
        const isShared = document.sharedWith && 
          JSON.parse(document.sharedWith).includes(ctx.user.id);
        
        if (!isOwner && !isAdmin && !isShared && document.isPrivate) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        
        return document;
      }),

    // Delete a document (owner only)
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await import('./db').then(m => m.getDb());
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        const { userDocuments } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        
        // First check ownership
        const [document] = await db
          .select()
          .from(userDocuments)
          .where(eq(userDocuments.id, input.id))
          .limit(1);
        
        if (!document) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' });
        }
        
        // Only owner or admin can delete
        if (document.userId !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the owner can delete this document' });
        }
        
        // Delete from database
        await db
          .delete(userDocuments)
          .where(eq(userDocuments.id, input.id));
        
        // Note: S3 file deletion would require additional implementation
        // For now, we just remove the database record
        
        return { success: true };
      }),

    // Update document metadata (owner only)
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(500).optional(),
        titleArabic: z.string().max(500).optional(),
        description: z.string().optional(),
        descriptionArabic: z.string().optional(),
        category: z.enum(['complaint', 'evidence', 'legal_document', 'report', 'correspondence', 'other']).optional(),
        tags: z.array(z.string()).optional(),
        isPrivate: z.boolean().optional()
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await import('./db').then(m => m.getDb());
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        const { userDocuments } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        
        // First check ownership
        const [document] = await db
          .select()
          .from(userDocuments)
          .where(eq(userDocuments.id, input.id))
          .limit(1);
        
        if (!document) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' });
        }
        
        if (document.userId !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the owner can update this document' });
        }
        
        const { id, tags, ...updates } = input;
        const updateData: any = { ...updates };
        if (tags !== undefined) {
          updateData.tags = JSON.stringify(tags);
        }
        
        await db
          .update(userDocuments)
          .set(updateData)
          .where(eq(userDocuments.id, id));
        
        return { success: true };
      }),

    // Share document with other users (owner only)
    share: protectedProcedure
      .input(z.object({
        id: z.number(),
        userIds: z.array(z.number())
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await import('./db').then(m => m.getDb());
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        const { userDocuments } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        
        // First check ownership
        const [document] = await db
          .select()
          .from(userDocuments)
          .where(eq(userDocuments.id, input.id))
          .limit(1);
        
        if (!document) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' });
        }
        
        if (document.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the owner can share this document' });
        }
        
        await db
          .update(userDocuments)
          .set({ sharedWith: JSON.stringify(input.userIds) })
          .where(eq(userDocuments.id, input.id));
        
        return { success: true };
      })
  })
});

export type AppRouter = typeof appRouter;
