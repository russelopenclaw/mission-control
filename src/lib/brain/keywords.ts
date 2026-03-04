/**
 * Keyword Extraction for Brain Items
 * Analyzes content and extracts 3-5 relevant keywords/topics
 */

export interface KeywordExtractionResult {
  keywords: string[];
  topics: string[];
}

/**
 * Common stop words to filter out
 */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else',
  'when', 'at', 'from', 'by', 'on', 'off', 'for', 'in', 'out',
  'over', 'to', 'into', 'with', 'of', 'as', 'is', 'was', 'are',
  'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'must',
  'that', 'this', 'these', 'those', 'it', 'its', 'what', 'which',
  'who', 'whom', 'whose', 'where', 'how', 'why', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
  'very', 'just', 'also', 'now', 'about', 'after', 'before',
  'between', 'through', 'during', 'while', 'until', 'unless',
]);

/**
 * Tech-related common terms that add less value as keywords
 */
const TECH_STOP_WORDS = new Set([
  'tutorial', 'guide', 'introduction', 'beginner', 'advanced',
  'learn', 'learning', 'tips', 'review', 'overview', 'example',
  'examples', 'code', 'coding', 'programming', 'developer',
  'development', 'software', 'technology', 'tech', 'article',
  'blog', 'post', 'page', 'website', 'online', 'internet', 'web',
]);

/**
 * Additional common verbs and weak words to filter out
 */
const WEAK_WORDS = new Set([
  'allow', 'allows', 'using', 'use', 'used', 'get', 'getting',
  'make', 'makes', 'take', 'takes', 'come', 'comes', 'go', 'goes',
  'set', 'setting', 'work', 'works', 'help', 'helps', 'need', 'needs',
  'want', 'wants', 'like', 'likes', 'look', 'looks', 'see', 'sees',
  'know', 'knows', 'think', 'thinks', 'say', 'says', 'tell', 'tells',
  'put', 'puts', 'turn', 'turns', 'become', 'becomes',
]);

/**
 * Extract keywords from text content
 * Returns individual words based on frequency and relevance
 */
export function extractKeywords(content: string, title: string = ''): string[] {
  // Combine title and content
  const text = `${title} ${content}`.toLowerCase();
  
  // Remove URLs
  const noUrls = text.replace(/https?:\/\/\S+/g, '');
  
  // Tokenize: split on whitespace and punctuation (except hyphens in compound words)
  const tokens = noUrls
    .split(/\s+/)
    .map(t => {
      // Remove leading/trailing punctuation from each word
      return t.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');
    })
    .filter(t => t.length > 2);
  
  // Remove stop words and weak words
  const filtered = tokens.filter(token => {
    const lower = token.toLowerCase();
    return !STOP_WORDS.has(lower) &&
           !TECH_STOP_WORDS.has(lower) &&
           !WEAK_WORDS.has(lower);
  });
  
  // Count word frequencies
  const frequency: Record<string, number> = {};
  filtered.forEach(token => {
    frequency[token] = (frequency[token] || 0) + 1;
  });
  
  // Get top keywords by frequency
  const sorted = Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  // Extract top 3-5 keywords
  const keywords = sorted
    .slice(0, 5)
    .map(([word]) => word)
    .filter(word => word.length >= 3);
  
  return keywords.slice(0, 5);
}

/**
 * Extract relevant multi-word phrases from text
 */
function extractPhrases(text: string): string[] {
  // Remove URLs and clean the text
  const noUrls = text.replace(/https?:\/\/\S+/g, '');
  
  // Filter to only significant words
  const words = noUrls
    .split(/\s+/)
    .filter(w => {
      const clean = w.split(/[^a-z0-9]/i)[0].toLowerCase();
      return clean.length > 2 && !STOP_WORDS.has(clean) && !TECH_STOP_WORDS.has(clean);
    });
  
  const bigrams: string[] = [];
  for (let i = 0; i < Math.min(words.length - 1, 20); i++) {
    // Extract only the word part (remove punctuation)
    const word1 = words[i].split(/[^a-z0-9]/i)[0];
    const word2 = words[i + 1].split(/[^a-z0-9]/i)[0];
    
    if (word1.length > 2 && word2.length > 2) {
      const bigram = `${word1} ${word2}`;
      // Only keep bigrams that are reasonable length
      if (bigram.length > 5 && bigram.length < 50) {
        bigrams.push(bigram);
      }
    }
  }
  
  // Count bigram frequency
  const frequency: Record<string, number> = {};
  bigrams.forEach(bigram => {
    frequency[bigram] = (frequency[bigram] || 0) + 1;
  });
  
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([phrase]) => phrase);
}

/**
 * Extract keywords from URL domain and path
 */
export function extractKeywordsFromUrl(url: string): string[] {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    const pathSegments = urlObj.pathname.split('/').filter(s => s.length > 0);
    
    const keywords: string[] = [];
    
    // Add domain (without TLD)
    const domainParts = domain.split('.');
    if (domainParts.length >= 2) {
      const mainDomain = domainParts[domainParts.length - 2];
      if (mainDomain.length > 2 && mainDomain !== 'www') {
        keywords.push(mainDomain);
      }
    }
    
    // Add relevant path segments
    pathSegments.forEach(segment => {
      const cleanSegment = segment.replace(/[-_]/g, ' ');
      if (cleanSegment.length > 3 && !STOP_WORDS.has(cleanSegment)) {
        keywords.push(cleanSegment);
      }
    });
    
    return keywords.slice(0, 3);
  } catch {
    return [];
  }
}

/**
 * Extract technical terms and compound words (camelCase, kebab-case, snake_case)
 */
function extractTechnicalTerms(text: string): string[] {
  const terms: string[] = [];
  
  // Match camelCase compounds
  const camelCase = text.match(/[a-z]+[A-Z][a-zA-Z]+/g) || [];
  camelCase.forEach(term => {
    // Split camelCase into words
    const words = term.split(/(?=[A-Z])/).map(w => w.toLowerCase());
    words.forEach(w => {
      if (w.length > 3 && !STOP_WORDS.has(w) && !TECH_STOP_WORDS.has(w)) {
        terms.push(w);
      }
    });
  });
  
  // Match kebab-case and snake_case
  const dashed = text.match(/[a-z0-9]+[-_][a-z0-9]+/g) || [];
  dashed.forEach(term => {
    const words = term.split(/[-_]/);
    words.forEach(w => {
      if (w.length > 3 && !STOP_WORDS.has(w) && !TECH_STOP_WORDS.has(w)) {
        terms.push(w);
      }
    });
  });
  
  return Array.from(new Set(terms));
}

/**
 * Boost keywords based on title occurrence (titles are more important)
 */
function boostTitleKeywords(
  frequency: Record<string, number>,
  title: string
): Record<string, number> {
  const titleWords = title
    .toLowerCase()
    .split(/[^a-z0-9\s]/)
    .map(w => w.trim())
    .filter(w => w.length > 2 && !STOP_WORDS.has(w) && !TECH_STOP_WORDS.has(w));
  
  const boosted = { ...frequency };
  titleWords.forEach(word => {
    if (boosted[word]) {
      boosted[word] += 2; // Double weight for title words
    }
  });
  
  return boosted;
}

/**
 * Main keyword extraction function combining all strategies
 */
export function extractKeywordsCombined(
  content: string,
  title: string = '',
  url: string = ''
): string[] {
  // Combine title and content
  const text = `${title} ${content}`.toLowerCase();
  
  // Remove URLs from content for cleaner extraction
  const noUrls = text.replace(/https?:\/\/\S+/g, '');
  
  // Tokenize: split on whitespace, then clean each word
  const tokens = noUrls
    .split(/\s+/)
    .map(t => {
      // Remove leading/trailing punctuation from each word
      return t.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');
    })
    .filter(t => t.length > 2);
  
  // Remove stop words and weak words
  const filtered = tokens.filter(token => {
    const lower = token.toLowerCase();
    return !STOP_WORDS.has(lower) &&
           !TECH_STOP_WORDS.has(lower) &&
           !WEAK_WORDS.has(lower);
  });
  
  // Count word frequencies
  const frequency: Record<string, number> = {};
  filtered.forEach(token => {
    frequency[token] = (frequency[token] || 0) + 1;
  });
  
  // Boost keywords that appear in title
  const boosted = boostTitleKeywords(frequency, title);
  
  // Extract technical terms
  const techTerms = extractTechnicalTerms(noUrls);
  techTerms.forEach(term => {
    boosted[term] = (boosted[term] || 0) + 2; // Boost technical terms
  });
  
  // Get top keywords by weighted frequency
  const sorted = Object.entries(boosted)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  // Extract top 3-5 keywords
  const keywords = sorted
    .slice(0, 5)
    .map(([word]) => word)
    .filter(word => word.length >= 3);
  
  return keywords.slice(0, 5);
}
