import { describe, it, expect } from 'vitest';
import { shouldSearchWeb, formatSearchResultsForAI } from './webSearch';

describe('Web Search Module', () => {
  describe('shouldSearchWeb', () => {
    it('detects English search triggers', () => {
      expect(shouldSearchWeb('search for information about OSAI')).toBe(true);
      expect(shouldSearchWeb('what is the latest news about Oman?')).toBe(true);
      expect(shouldSearchWeb('find me the website for government services')).toBe(true);
      expect(shouldSearchWeb('who is the current chairman of OSAI?')).toBe(true);
    });

    it('detects Arabic search triggers', () => {
      expect(shouldSearchWeb('ابحث عن معلومات حول جهاز الرقابة')).toBe(true);
      expect(shouldSearchWeb('ما هو آخر أخبار عمان؟')).toBe(true);
      expect(shouldSearchWeb('من هو رئيس الجهاز؟')).toBe(true);
    });

    it('detects question patterns', () => {
      expect(shouldSearchWeb('What are the penalties for embezzlement?')).toBe(true);
      expect(shouldSearchWeb('How to report corruption?')).toBe(true);
    });

    it('returns false for non-search queries', () => {
      expect(shouldSearchWeb('تحليل هذه الشكوى')).toBe(false);
      expect(shouldSearchWeb('Analyze this complaint about an employee')).toBe(false);
      expect(shouldSearchWeb('شكوى ضد موظف')).toBe(false);
    });
  });

  describe('formatSearchResultsForAI', () => {
    it('formats search results correctly', () => {
      const results = [
        { title: 'Test Result', url: 'https://example.com', snippet: 'This is a test' },
        { title: 'Another Result', url: 'https://example2.com', snippet: 'Another snippet' }
      ];
      
      const formatted = formatSearchResultsForAI(results);
      
      expect(formatted).toContain('Web Search Results');
      expect(formatted).toContain('Test Result');
      expect(formatted).toContain('https://example.com');
      expect(formatted).toContain('This is a test');
    });

    it('handles empty results', () => {
      const formatted = formatSearchResultsForAI([]);
      expect(formatted).toBe('No search results found.');
    });
  });
});
