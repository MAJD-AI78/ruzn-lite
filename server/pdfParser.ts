import * as pdfParseModule from 'pdf-parse';
const pdfParse = (pdfParseModule as any).default || pdfParseModule;

export interface ParsedPDF {
  text: string;
  numPages: number;
  info: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
    creationDate?: Date;
    modificationDate?: Date;
  };
  metadata?: Record<string, any>;
}

/**
 * Parse a PDF file and extract text content and metadata
 */
export async function parsePDF(buffer: Buffer): Promise<ParsedPDF> {
  try {
    const data = await pdfParse(buffer);
    
    return {
      text: data.text,
      numPages: data.numpages,
      info: {
        title: data.info?.Title,
        author: data.info?.Author,
        subject: data.info?.Subject,
        keywords: data.info?.Keywords,
        creationDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
        modificationDate: data.info?.ModDate ? new Date(data.info.ModDate) : undefined,
      },
      metadata: data.metadata?._metadata || {}
    };
  } catch (error) {
    console.error('[PDFParser] Error parsing PDF:', error);
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract a summary from the first portion of the PDF text
 */
export function extractSummary(text: string, maxLength: number = 500): string {
  // Clean up the text
  const cleaned = text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim();
  
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  
  // Try to cut at a sentence boundary
  const truncated = cleaned.substring(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastNewline = truncated.lastIndexOf('\n');
  
  const cutPoint = Math.max(lastPeriod, lastNewline);
  if (cutPoint > maxLength * 0.5) {
    return truncated.substring(0, cutPoint + 1).trim();
  }
  
  return truncated.trim() + '...';
}

/**
 * Detect if text is primarily Arabic
 */
export function isArabicText(text: string): boolean {
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g;
  const arabicMatches = text.match(arabicPattern) || [];
  const totalChars = text.replace(/\s/g, '').length;
  
  if (totalChars === 0) return false;
  
  return arabicMatches.length / totalChars > 0.3;
}

/**
 * Extract keywords from text (simple implementation)
 */
export function extractKeywords(text: string, maxKeywords: number = 10): string[] {
  // Common stop words to filter out
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'this', 'that', 'these',
    'those', 'it', 'its', 'they', 'them', 'their', 'we', 'our', 'you', 'your',
    'he', 'she', 'him', 'her', 'his', 'hers', 'who', 'which', 'what', 'when',
    'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'not', 'only', 'same', 'so',
    'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there', 'then'
  ]);
  
  // Extract words and count frequency
  const words = text.toLowerCase()
    .replace(/[^\w\s\u0600-\u06FF]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));
  
  const wordCount = new Map<string, number>();
  for (const word of words) {
    wordCount.set(word, (wordCount.get(word) || 0) + 1);
  }
  
  // Sort by frequency and return top keywords
  return Array.from(wordCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}
