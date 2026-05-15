import { NextResponse } from 'next/server';

const GEO_OPTIONS = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'JP', 'BR', 'IN', 'KR'];

interface TrendItem {
  source: 'google' | 'x';
  title: string;
  traffic?: string;
  rank?: number;
  pubDate?: string;
  picture?: string;
  pictureSource?: string;
  newsItems?: {
    title: string;
    url: string;
    source: string;
    picture?: string;
  }[];
}

interface IdeaSuggestion {
  trend: string;
  source: 'google' | 'x';
  traffic?: string;
  ideas: {
    name: string;
    description: string;
    type: 'app' | 'website' | 'tool' | 'content';
    difficulty: 'easy' | 'medium' | 'hard';
  }[];
}

function parseGoogleRSS(xml: string): TrendItem[] {
  const items: TrendItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = block.match(/<title>(.*?)<\/title>/)?.[1] || '';
    const traffic = block.match(/<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/)?.[1] || '';
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
    const picture = block.match(/<ht:picture>(.*?)<\/ht:picture>/)?.[1] || undefined;
    const pictureSource = block.match(/<ht:picture_source>(.*?)<\/ht:picture_source>/)?.[1] || undefined;
    
    const newsItems: TrendItem['newsItems'] = [];
    const newsRegex = /<ht:news_item>([\s\S]*?)<\/ht:news_item>/g;
    let newsMatch;
    while ((newsMatch = newsRegex.exec(block)) !== null) {
      const nb = newsMatch[1];
      newsItems.push({
        title: nb.match(/<ht:news_item_title>(.*?)<\/ht:news_item_title>/)?.[1] || '',
        url: nb.match(/<ht:news_item_url>(.*?)<\/ht:news_item_url>/)?.[1] || '',
        source: nb.match(/<ht:news_item_source>(.*?)<\/ht:news_item_source>/)?.[1] || '',
        picture: nb.match(/<ht:news_item_picture>(.*?)<\/ht:news_item_picture>/)?.[1] || undefined,
      });
    }
    
    items.push({ 
      source: 'google',
      title, 
      traffic, 
      pubDate, 
      picture, 
      pictureSource, 
      newsItems 
    });
  }
  
  return items;
}

function parseXTrends(html: string): TrendItem[] {
  const items: TrendItem[] = [];
  
  // Extract trending topics from trends24.in HTML
  // Look for pattern: twitter.com/search?q=TREND
  const trendRegex = /twitter\.com\/search\?q=([^"'>\s]+)/g;
  let match;
  let rank = 1;
  const seen = new Set<string>();
  
  while ((match = trendRegex.exec(html)) !== null) {
    const encoded = match[1];
    const title = decodeURIComponent(encoded);
    
    // Skip duplicates and empty
    if (!title || seen.has(title)) continue;
    seen.add(title);
    
    items.push({
      source: 'x',
      title,
      rank,
    });
    
    rank++;
    if (rank > 25) break; // Cap at 25 X trends
  }
  
  return items;
}

function generateIdeas(trend: TrendItem): IdeaSuggestion {
  const t = trend.title.toLowerCase();
  const ideas: IdeaSuggestion['ideas'] = [];
  
  const newsContext = trend.newsItems?.map(n => n.title.toLowerCase()).join(' ') || '';
  const context = `${t} ${newsContext}`;
  
  // Sports
  if (context.match(/nba|nfl|mlb|nhl|draft|playoff|game|score|win|champion|warriors|lakers|celtics/)) {
    ideas.push(
      { name: `${trend.title} Tracker`, description: `Live scores, stats, and updates. Push notifications for key moments.`, type: 'app', difficulty: 'medium' },
      { name: `${trend.title} Fan Hub`, description: `Community discussion, predictions, reaction feeds. Real-time game thread.`, type: 'website', difficulty: 'easy' },
      { name: `Trade/Draft Simulator`, description: `Interactive simulator: make trades, pick draft picks, compare results.`, type: 'tool', difficulty: 'medium' },
    );
  }
  
  // Politics
  if (context.match(/senat|congress|supreme court|president|law|bill|vote|justice|policy|regulation|tax/)) {
    ideas.push(
      { name: `${trend.title} Explainer`, description: `Break down what's happening in plain English. Timeline, key players, impact.`, type: 'website', difficulty: 'easy' },
      { name: `Bill Tracker`, description: `Track legislation or case. Timeline, voting records, impact analysis.`, type: 'tool', difficulty: 'medium' },
      { name: `Civic Action Hub`, description: `What can you do? Contact reps, find orgs, understand timelines.`, type: 'app', difficulty: 'medium' },
    );
  }
  
  // Tech
  if (context.match(/launch|release|update|iphone|android|ai|chatgpt|app|software|feature|beta|opus|model/)) {
    ideas.push(
      { name: `${trend.title} Review Hub`, description: `Aggregate reviews, first impressions, comparisons. User ratings.`, type: 'website', difficulty: 'easy' },
      { name: `${trend.title} Tips & Tricks`, description: `Curated tips, hidden features, setup guides. Community-contributed.`, type: 'content', difficulty: 'easy' },
      { name: `Feature Comparison Tool`, description: `Side-by-side with competitors. Filter by what matters.`, type: 'tool', difficulty: 'medium' },
    );
  }
  
  // Entertainment
  if (context.match(/movie|film|show|series|netflix|hulu|album|music|concert|celebrit|star|actor|pulp fiction|top gun/)) {
    ideas.push(
      { name: `${trend.title} Watch Guide`, description: `Where to stream, episode guide, release schedule, recommendations.`, type: 'website', difficulty: 'easy' },
      { name: `${trend.title} Buzz`, description: `Fan reactions, memes, hot takes, Easter eggs. Real-time social pulse.`, type: 'app', difficulty: 'easy' },
    );
  }
  
  // Finance
  if (context.match(/stock|market|crypto|bitcoin|mortgage|rate|fed|inflation|price|cost|economy/)) {
    ideas.push(
      { name: `${trend.title} Impact Calculator`, description: `How does this affect your wallet? Personalized impact assessment.`, type: 'tool', difficulty: 'medium' },
      { name: `${trend.title} Dashboard`, description: `Real-time tracking, historical context, predictions. Alerts on changes.`, type: 'website', difficulty: 'medium' },
    );
  }
  
  // Health/Science
  if (context.match(/health|study|research|disease|vaccine|doctor|medical|symptom|outbreak/)) {
    ideas.push(
      { name: `${trend.title} Health Brief`, description: `What research says vs headlines. Plain-language breakdown.`, type: 'content', difficulty: 'easy' },
      { name: `Symptom Checker Lite`, description: `Quick assessment tool related to the topic. Disclaimer-driven.`, type: 'tool', difficulty: 'hard' },
    );
  }
  
  // Fallback
  if (ideas.length < 3) {
    ideas.push(
      { name: `${trend.title} Dashboard`, description: `Real-time tracking, timeline, key metrics. Auto-updating.`, type: 'website', difficulty: 'easy' },
      { name: `${trend.title} Newsletter`, description: `Daily digest of latest developments. Curated links and analysis.`, type: 'content', difficulty: 'easy' },
    );
  }
  
  ideas.push(
    { name: `TrendMatch`, description: `Match users interested in ${trend.title}. Local events, communities, discussion.`, type: 'app', difficulty: 'medium' },
  );
  
  return {
    trend: trend.title,
    source: trend.source,
    traffic: trend.traffic || trend.rank ? `#${trend.rank}` : undefined,
    ideas: ideas.slice(0, 4),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const geo = searchParams.get('geo') || 'US';
  const mode = searchParams.get('mode') || 'trends';
  const source = searchParams.get('source') || 'all'; // 'google', 'x', 'all'
  
  const googleTrends: TrendItem[] = [];
  const xTrends: TrendItem[] = [];
  
  // Fetch Google Trends (RSS)
  if (source === 'all' || source === 'google') {
    try {
      const response = await fetch(`https://trends.google.com/trending/rss?geo=${geo}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      
      if (response.ok) {
        const xml = await response.text();
        googleTrends.push(...parseGoogleRSS(xml));
      }
    } catch (error) {
      console.error('[API /trends] Google RSS error:', error);
    }
  }
  
  // Fetch X/Twitter trends (trends24.in scrape)
  if (source === 'all' || source === 'x') {
    try {
      const geoLower = geo.toLowerCase();
      const geoMap: Record<string, string> = {
        US: 'united-states',
        GB: 'united-kingdom',
        CA: 'canada',
        AU: 'australia',
        DE: 'germany',
        FR: 'france',
        JP: 'japan',
        BR: 'brazil',
        IN: 'india',
        KR: 'south-korea',
      };
      const geoSlug = geoMap[geo] || 'united-states';
      
      const response = await fetch(`https://trends24.in/${geoSlug}/`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      
      if (response.ok) {
        const html = await response.text();
        xTrends.push(...parseXTrends(html));
      }
    } catch (error) {
      console.error('[API /trends] X trends error:', error);
    }
  }
  
  // Merge and sort by traffic/rank
  let allTrends = [...googleTrends, ...xTrends];
  
  // Sort: Google trends with traffic first, then X trends by rank
  allTrends = allTrends.sort((a, b) => {
    const aTraffic = parseInt(a.traffic?.replace(/[^0-9]/g, '') || '0');
    const bTraffic = parseInt(b.traffic?.replace(/[^0-9]/g, '') || '0');
    const aRank = a.rank || 999;
    const bRank = b.rank || 999;
    
    // Google trends with traffic take priority
    if (a.source === 'google' && b.source === 'x' && aTraffic > 0) return -1;
    if (b.source === 'google' && a.source === 'x' && bTraffic > 0) return 1;
    
    // Within same source, sort by traffic/rank
    if (a.source === b.source) {
      if (a.source === 'google') return bTraffic - aTraffic;
      return aRank - bRank;
    }
    
    return 0;
  });
  
  if (mode === 'ideas') {
    const suggestions = allTrends.slice(0, 15).map(generateIdeas);
    return NextResponse.json({ 
      geo, 
      generatedAt: new Date().toISOString(), 
      suggestions,
      counts: { google: googleTrends.length, x: xTrends.length, total: allTrends.length }
    });
  }
  
  return NextResponse.json({ 
    geo, 
    generatedAt: new Date().toISOString(), 
    trends: allTrends,
    counts: { google: googleTrends.length, x: xTrends.length, total: allTrends.length }
  });
}