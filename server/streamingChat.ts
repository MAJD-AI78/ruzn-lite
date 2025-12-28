import { Request, Response } from 'express';
import { invokeLLMStream, Message } from './_core/llm';
import { logAnalyticsEvent } from './db';
import { searchKnowledgeBase } from './db/knowledge';
import { notifyOwner } from './_core/notification';
import { shouldSearchWeb, searchAndScrape, formatSearchResultsForAI } from './webSearch';

// System prompts for streaming (simplified version)
const SYSTEM_PROMPTS = {
  complaints: {
    arabic: `أنت "رُزن"، مساعد ذكي متخصص لجهاز الرقابة المالية والإدارية للدولة في سلطنة عُمان.

الإطار القانوني:
- المرسوم السلطاني رقم 111/2011 - قانون الرقابة المالية والإدارية للدولة
- المرسوم السلطاني رقم 112/2011 - قانون حماية المال العام وتجنب تضارب المصالح

مهمتك: تحليل الشكاوى والبلاغات وتصنيفها. قدم تحليلاً شاملاً يتضمن:
1. التصنيف الرئيسي
2. المرجع القانوني
3. درجة الخطورة (0-100)
4. التوصية الأولية

أجب باللغة العربية بأسلوب مهني ورسمي.`,
    english: `You are "Ruzn", an intelligent assistant specialized for the State Audit Institution (OSAI) of the Sultanate of Oman.

Legal Framework:
- Royal Decree 111/2011 - State Audit Law
- Royal Decree 112/2011 - Protection of Public Funds and Avoidance of Conflict of Interest Law

Your mission: Analyze and classify complaints. Provide comprehensive analysis including:
1. Primary Classification
2. Legal Reference
3. Risk Score (0-100)
4. Initial Recommendation

Respond professionally and formally.`
  },
  legislative: {
    arabic: `أنت "رُزن"، مساعد قانوني متخصص في التشريعات العُمانية المتعلقة بالرقابة المالية والإدارية.

مصادرك الرئيسية:
- المرسوم السلطاني رقم 111/2011 (قانون الرقابة المالية والإدارية للدولة)
- المرسوم السلطاني رقم 112/2011 (قانون حماية المال العام وتجنب تضارب المصالح)
- الخطة الوطنية لتعزيز النزاهة ومكافحة الفساد 2022-2030

أجب بدقة مع ذكر المراجع القانونية المحددة.`,
    english: `You are "Ruzn", a legal assistant specialized in Omani legislation related to financial and administrative oversight.

Your main sources:
- Royal Decree 111/2011 (State Audit Law)
- Royal Decree 112/2011 (Protection of Public Funds and Avoidance of Conflict of Interest Law)
- National Integrity Promotion and Anti-Corruption Plan 2022-2030

Respond accurately with specific legal references.`
  }
};

export interface StreamChatRequest {
  message: string;
  feature: 'complaints' | 'legislative';
  language: 'arabic' | 'english';
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  userId?: number;
}

export async function handleStreamingChat(req: Request, res: Response) {
  try {
    const { message, feature, language, history, userId } = req.body as StreamChatRequest;

    if (!message || !feature || !language) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Build messages array
    const systemPrompt = SYSTEM_PROMPTS[feature][language];
    const messages: Message[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history
    if (history && history.length > 0) {
      for (const msg of history.slice(-10)) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Search knowledge base first
    let knowledgeContext = '';
    try {
      const knowledgeResults = await searchKnowledgeBase(message, { limit: 3, language: language === 'arabic' ? 'arabic' : 'english' });
      if (knowledgeResults.length > 0) {
        knowledgeContext = '\n\n--- OSAI Knowledge Base ---\n';
        for (const result of knowledgeResults) {
          const doc = result.entry;
          const title = language === 'arabic' ? (doc.titleArabic || doc.title) : doc.title;
          const content = language === 'arabic' ? (doc.contentArabic || doc.content) : doc.content;
          knowledgeContext += `\n### ${title}\n`;
          if (doc.referenceNumber) knowledgeContext += `Reference: ${doc.referenceNumber}\n`;
          knowledgeContext += `${content?.substring(0, 1500) || ''}\n`;
        }
        knowledgeContext += '\n--- End of Knowledge Base ---\n';
      }
    } catch (kbError) {
      console.error('[KnowledgeBase] Error searching:', kbError);
    }

    // Check if web search is needed
    let webSearchContext = '';
    if (shouldSearchWeb(message)) {
      try {
        // Send searching status to client
        res.write(`data: ${JSON.stringify({ type: 'status', status: 'searching' })}

`);
        
        const { searchResults, scrapedContent } = await searchAndScrape(message);
        
        if (searchResults.length > 0) {
          webSearchContext = '\n\n--- Web Search Results ---\n';
          webSearchContext += formatSearchResultsForAI(searchResults);
          
          if (scrapedContent?.success && scrapedContent.content) {
            webSearchContext += `\n--- Detailed Content from ${scrapedContent.title || scrapedContent.url} ---\n`;
            webSearchContext += scrapedContent.content.substring(0, 2000);
          }
          webSearchContext += '\n--- End of Web Search Results ---\n';
          webSearchContext += '\nUse the above web search results to inform your response. Cite sources when using this information.';
        }
      } catch (searchError) {
        console.error('[WebSearch] Error during search:', searchError);
        // Continue without web search results
      }
    }

    // Add current message with knowledge base and web search context if available
    let userMessageWithContext = message;
    if (knowledgeContext) {
      userMessageWithContext += knowledgeContext;
    }
    if (webSearchContext) {
      userMessageWithContext += webSearchContext;
    }
    messages.push({ role: 'user', content: userMessageWithContext });

    // Log analytics event
    if (userId) {
      await logAnalyticsEvent({ userId, eventType: 'chat_message', feature, language });
    }

    let fullResponse = '';
    let riskScore = 0;

    // Stream the response
    try {
      for await (const chunk of invokeLLMStream({ messages })) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          fullResponse += content;
          
          // Send the chunk to client
          res.write(`data: ${JSON.stringify({ type: 'chunk', content })}\n\n`);
        }

        // Check for completion
        if (chunk.choices[0]?.finish_reason === 'stop') {
          break;
        }
      }

      // Extract risk score from response
      const riskMatch = fullResponse.match(/(?:درجة الخطورة|Risk Score|Risk)[:\s]*(\d+)/i);
      if (riskMatch) {
        riskScore = parseInt(riskMatch[1], 10);
      }

      // Send completion event with metadata
      res.write(`data: ${JSON.stringify({ 
        type: 'done', 
        riskScore,
        fullResponse 
      })}\n\n`);

      // Notify owner for high-risk complaints
      if (riskScore >= 80 && feature === 'complaints') {
        await notifyOwner({
          title: language === 'arabic' ? 'تنبيه: شكوى عالية الخطورة' : 'Alert: High-Risk Complaint',
          content: language === 'arabic' 
            ? `تم استلام شكوى بدرجة خطورة ${riskScore}/100\n\nملخص: ${message.substring(0, 200)}...`
            : `Received complaint with risk score ${riskScore}/100\n\nSummary: ${message.substring(0, 200)}...`
        });
        console.log(`[Notification] High-risk streaming complaint alert sent (Risk: ${riskScore})`);
      }

    } catch (streamError) {
      console.error('Streaming error:', streamError);
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Stream interrupted' })}\n\n`);
    }

    res.end();

  } catch (error) {
    console.error('Stream chat error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Internal server error' })}\n\n`);
      res.end();
    }
  }
}
