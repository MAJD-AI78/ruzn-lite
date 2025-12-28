/**
 * Web Search and Scraping Module for Ruzn
 * Enables the AI to fetch live information from the internet
 */

// Web search module - no external dependencies required

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface WebSearchResponse {
  success: boolean;
  results: SearchResult[];
  error?: string;
}

interface ScrapedContent {
  success: boolean;
  title?: string;
  content?: string;
  url: string;
  error?: string;
}

/**
 * Perform a web search using DuckDuckGo HTML search
 * This is a simple implementation that doesn't require API keys
 */
export async function webSearch(query: string, maxResults: number = 5): Promise<WebSearchResponse> {
  try {
    // Use DuckDuckGo HTML search (no API key required)
    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5,ar;q=0.3',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Search failed with status ${response.status}`);
    }
    
    const html = await response.text();
    
    // Parse search results from HTML
    const results: SearchResult[] = [];
    
    // Extract result blocks - DuckDuckGo uses class="result"
    const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([^<]*)<\/a>/gi;
    
    let match;
    while ((match = resultRegex.exec(html)) !== null && results.length < maxResults) {
      const [, url, title, snippet] = match;
      if (url && title) {
        results.push({
          url: decodeURIComponent(url.replace(/.*uddg=([^&]*).*/, '$1') || url),
          title: title.trim(),
          snippet: snippet?.trim() || ''
        });
      }
    }
    
    // Fallback: try alternative parsing if no results found
    if (results.length === 0) {
      const altRegex = /<a[^>]*href="(https?:\/\/[^"]*)"[^>]*class="[^"]*result[^"]*"[^>]*>[\s\S]*?<\/a>/gi;
      const titleRegex = /<a[^>]*class="result__a"[^>]*>([^<]*)<\/a>/gi;
      
      // Simple extraction of links that look like search results
      const linkMatches = html.match(/href="(https?:\/\/(?!duckduckgo)[^"]+)"/gi) || [];
      const uniqueUrls = new Set<string>();
      
      for (const linkMatch of linkMatches) {
        if (results.length >= maxResults) break;
        const urlMatch = linkMatch.match(/href="([^"]+)"/);
        if (urlMatch && urlMatch[1] && !uniqueUrls.has(urlMatch[1])) {
          const url = urlMatch[1];
          // Skip DuckDuckGo internal links
          if (!url.includes('duckduckgo.com') && !url.includes('duck.co')) {
            uniqueUrls.add(url);
            results.push({
              url,
              title: url.split('/')[2] || url,
              snippet: ''
            });
          }
        }
      }
    }
    
    return {
      success: true,
      results
    };
  } catch (error) {
    console.error('[WebSearch] Error:', error);
    return {
      success: false,
      results: [],
      error: error instanceof Error ? error.message : 'Search failed'
    };
  }
}

/**
 * Scrape content from a URL
 * Extracts main text content from a webpage
 */
export async function scrapeUrl(url: string): Promise<ScrapedContent> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5,ar;q=0.3',
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    
    // Remove script and style tags
    let cleanHtml = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');
    
    // Extract text content
    // Try to find main content area first
    const mainContentMatch = cleanHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
                            cleanHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                            cleanHtml.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    
    const contentHtml = mainContentMatch ? mainContentMatch[1] : cleanHtml;
    
    // Remove HTML tags and clean up whitespace
    let content = contentHtml
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
    
    // Limit content length to avoid overwhelming the AI
    if (content.length > 5000) {
      content = content.substring(0, 5000) + '...';
    }
    
    return {
      success: true,
      title,
      content,
      url
    };
  } catch (error) {
    console.error('[Scrape] Error:', error);
    return {
      success: false,
      url,
      error: error instanceof Error ? error.message : 'Failed to scrape URL'
    };
  }
}

/**
 * Detect if a query requires web search
 * Returns true if the query seems to need live/current information
 */
export function shouldSearchWeb(message: string): boolean {
  const searchTriggers = [
    // English triggers
    /\b(search|find|look up|google|what is the latest|current|today|recent|news|update)\b/i,
    /\b(who is|what happened|when did|where is|how to)\b/i,
    /\b(website|url|link|online|internet)\b/i,
    // Arabic triggers (no word boundaries - they don't work well with Arabic)
    /(ابحث|بحث|جوجل|أخبار|حديث|اليوم|الآن|الأخير|الجديد)/,
    /(من هو|ما هو|متى|أين|كيف)/,
    /(موقع|رابط|انترنت|اونلاين)/,
    // Question patterns
    /\?$/,
  ];
  
  return searchTriggers.some(trigger => trigger.test(message));
}

/**
 * Format search results for AI context
 */
export function formatSearchResultsForAI(results: SearchResult[]): string {
  if (results.length === 0) {
    return "No search results found.";
  }
  
  let formatted = "Web Search Results:\n\n";
  results.forEach((result, index) => {
    formatted += `${index + 1}. ${result.title}\n`;
    formatted += `   URL: ${result.url}\n`;
    if (result.snippet) {
      formatted += `   Summary: ${result.snippet}\n`;
    }
    formatted += '\n';
  });
  
  return formatted;
}

/**
 * Perform search and scrape top result for detailed information
 */
export async function searchAndScrape(query: string): Promise<{
  searchResults: SearchResult[];
  scrapedContent?: ScrapedContent;
}> {
  const searchResponse = await webSearch(query, 3);
  
  let scrapedContent: ScrapedContent | undefined;
  
  // Try to scrape the first result for more detailed content
  if (searchResponse.success && searchResponse.results.length > 0) {
    const topResult = searchResponse.results[0];
    scrapedContent = await scrapeUrl(topResult.url);
  }
  
  return {
    searchResults: searchResponse.results,
    scrapedContent
  };
}
