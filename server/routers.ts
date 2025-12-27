import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { z } from "zod";

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
      .mutation(async ({ input }) => {
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
          const assistantMessage = response.choices[0]?.message?.content || '';
          
          return {
            response: assistantMessage,
            status: 'success' as const
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
      version: '1.0'
    }))
  })
});

export type AppRouter = typeof appRouter;
