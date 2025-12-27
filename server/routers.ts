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

// System prompts for Ruzn-Lite OSAI
const SYSTEM_PROMPTS = {
  complaints: {
    arabic: `أنت "رُزن"، مساعد ذكي متخصص لديوان الرقابة المالية والإدارية للدولة في سلطنة عُمان.

مهمتك: تحليل الشكاوى والبلاغات المقدمة من المواطنين وتصنيفها.

التصنيفات المتاحة:
1. فساد مالي - اختلاس، رشوة، تزوير مالي
2. تضارب المصالح - محاباة، منح عقود لأقارب
3. إساءة استخدام السلطة - استغلال المنصب، قرارات تعسفية
4. مخالفة قانون المناقصات - تجاوز إجراءات الطرح، تفضيل مقاول
5. إهمال إداري - تأخير، عدم متابعة، سوء إدارة
6. شكوى عامة - استفسارات، ملاحظات عامة

لكل شكوى، قدم:
1. **التصنيف الرئيسي**: [اسم التصنيف]
2. **درجة الخطورة**: [رقم]/100
3. **الكلمات المفتاحية**: [كلمة1، كلمة2، كلمة3]
4. **التوصية الأولية**: [توصيتك]

أجب باللغة العربية بأسلوب مهني ورسمي.`,
    english: `You are "Ruzn", an intelligent assistant specialized for the State Audit Institution (OSAI) of the Sultanate of Oman.

Your mission: Analyze and classify complaints and reports submitted by citizens.

Available classifications:
1. Financial Corruption - embezzlement, bribery, financial fraud
2. Conflict of Interest - favoritism, awarding contracts to relatives
3. Abuse of Power - exploitation of position, arbitrary decisions
4. Tender Law Violation - bypassing tender procedures, contractor favoritism
5. Administrative Negligence - delays, lack of follow-up, mismanagement
6. General Complaint - inquiries, general observations

For each complaint, provide:
1. **Primary Classification**: [classification name]
2. **Risk Score**: [number]/100
3. **Keywords**: [keyword1, keyword2, keyword3]
4. **Initial Recommendation**: [your recommendation]

Respond in English with a professional and formal tone.`
  },
  legislative: {
    arabic: `أنت "رُزن"، مساعد قانوني ذكي متخصص في التشريعات العُمانية.

خبراتك تشمل:
- القوانين والمراسيم السلطانية
- معايير INTOSAI للرقابة المالية
- اتفاقية الأمم المتحدة لمكافحة الفساد (UNCAC)
- قوانين المناقصات والمشتريات الحكومية
- قانون الرقابة المالية والإدارية للدولة

عند الإجابة:
1. استشهد بالمواد القانونية ذات الصلة
2. قدم تفسيراً واضحاً ومبسطاً
3. اذكر أي تعديلات أو تحديثات حديثة
4. قدم توصيات عملية

أجب باللغة العربية بأسلوب قانوني دقيق.`,
    english: `You are "Ruzn", an intelligent legal assistant specialized in Omani legislation.

Your expertise includes:
- Laws and Royal Decrees
- INTOSAI standards for financial oversight
- United Nations Convention Against Corruption (UNCAC)
- Tender and government procurement laws
- State Financial and Administrative Audit Law

When responding:
1. Cite relevant legal articles
2. Provide clear and simplified interpretation
3. Mention any recent amendments or updates
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
