import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { transcribeAudio } from "./_core/voiceTranscription";
import { z } from "zod";
import { 
  saveConversation, getConversationsByUser, getSampleComplaints,
  getAnalyticsSummary, logAnalyticsEvent, getAllConversations,
  getAuditFindings, getLegislativeDocuments, getAllUsers,
  updateConversationStatus, getStatusHistory, getConversationsByStatus,
  getDashboardStats, generateWeeklyReport, getWeeklyReports
} from "./db";
import { sendWeeklyReportToRecipients, getReportHtml, getReportText } from "./scheduledReports";

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
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Ruzn-Lite AI Chat Router
  chat: router({
    send: publicProcedure
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
    
    health: publicProcedure.query(() => ({
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
    getSamples: publicProcedure
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

    getAuditFindings: publicProcedure
      .input(z.object({
        language: z.enum(['arabic', 'english']).optional().default('arabic'),
        severity: z.string().optional(),
        ministry: z.string().optional()
      }))
      .query(async ({ input }) => {
        const findings = await getAuditFindings(input.language, input.severity, input.ministry);
        return findings;
      }),

    getLegislativeDocs: publicProcedure
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
      })
  }),

  // Dashboard Router (for home page widgets)
  dashboard: router({
    getStats: publicProcedure.query(async () => {
      const stats = await getDashboardStats();
      return stats;
    })
  })
});

export type AppRouter = typeof appRouter;
