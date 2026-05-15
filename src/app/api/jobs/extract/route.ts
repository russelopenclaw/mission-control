import { NextRequest, NextResponse } from 'next/server';

// POST /api/jobs/extract - Extract job info from a URL
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: true, errorMessage: 'URL is required' }, { status: 400 });
    }

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json({ error: true, errorMessage: `Failed to fetch: ${response.status}` }, { status: 200 });
    }

    const html = await response.text();
    
    // Extract Open Graph / meta tags
    const getMeta = (name: string) => {
      const regex = new RegExp(`<meta[^>]*(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i');
      const match = html.match(regex);
      if (match) return match[1];
      // Try content before property/name
      const regex2 = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${name}["']`, 'i');
      const match2 = html.match(regex2);
      return match2 ? match2[1] : '';
    };

    const getTitle = () => {
      // og:title first, then <title>
      const og = getMeta('og:title');
      if (og) return og;
      const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      return match ? match[1].trim() : '';
    };

    // LinkedIn-specific extraction
    const isLinkedIn = url.includes('linkedin.com');
    let extracted = {
      title: '',
      company: '',
      location: '',
      description: '',
      source: isLinkedIn ? 'LinkedIn' : 'Web',
    };

    if (isLinkedIn) {
      // LinkedIn job postings
      const titleMatch = html.match(/<h1[^>]*class="[^"]*top-card-layout__title[^"]*"[^>]*>([^<]+)/i) 
        || html.match(/"title":"([^"]+)"/)
        || html.match(/class="[^"]*job-details-jobs-unified-top-card__job-title[^"]*"[^>]*>([^<]+)/i);
      extracted.title = titleMatch ? titleMatch[1].trim() : getMeta('og:title') || getTitle();
      
      const companyMatch = html.match(/"companyName":"([^"]+)"/) 
        || html.match(/class="[^"]*top-card-layout__second-subline[^"]*"[^>]*>([^<]+)/i);
      extracted.company = companyMatch ? companyMatch[1].trim() : '';

      const locationMatch = html.match(/"formattedLocation":"([^"]+)"/) 
        || html.match(/class="[^"]*top-card-layout__third-subline[^"]*"[^>]*>([^<]+)/i);
      extracted.location = locationMatch ? locationMatch[1].trim() : '';

      const descMatch = html.match(/"description":{"text":"([^"]+)"/);
      extracted.description = descMatch ? descMatch[1].replace(/\\n/g, '\n').slice(0, 500) : getMeta('og:description') || '';
    } else {
      // Generic extraction
      extracted.title = getMeta('og:title') || getTitle();
      extracted.description = getMeta('og:description') || '';
      
      // Try to extract company from description or title
      const companyPatterns = [
        /at\s+([A-Z][A-Za-z0-9 &]+)/,
        /\|\s*([A-Z][A-Za-z0-9 &]+)\s*$/,
        /^([A-Z][A-Za-z0-9 &]+)\s*[-–—]\s*/,
      ];
      for (const pattern of companyPatterns) {
        const match = extracted.title.match(pattern);
        if (match) {
          extracted.company = match[1].trim();
          break;
        }
      }
    }

    // Clean up title - remove " | LinkedIn" etc
    extracted.title = extracted.title
      .replace(/\s*[|–—]\s*LinkedIn\s*$/i, '')
      .replace(/\s*[|–—]\s*Glassdoor\s*$/i, '')
      .replace(/\s*[|–—]\s*Indeed\s*$/i, '')
      .replace(/\s*-\s*Jobs\s*$/i, '')
      .trim();

    // Try to extract company and location from og:title pattern: "Company hiring Title in Location | LinkedIn"
    const ogTitle = getMeta('og:title') || getTitle();
    if (!extracted.company) {
      // Pattern: "Company hiring Title in Location | LinkedIn"
      const hiringMatch = ogTitle.match(/^(.+?)\s+hiring\s+(.+?)\s+in\s+(.+?)(?:\s*[|–—]\s*LinkedIn)?$/i);
      if (hiringMatch) {
        extracted.company = extracted.company || hiringMatch[1].trim();
        extracted.title = extracted.title || hiringMatch[2].trim();
        extracted.location = extracted.location || hiringMatch[3].trim();
      }
      // Pattern: "Title at Company - Location"
      const atMatch = extracted.title.match(/^(.+?)\s+at\s+(.+?)(?:\s*-\s*(.+))?$/i);
      if (atMatch) {
        extracted.company = extracted.company || atMatch[2].trim();
        extracted.location = extracted.location || (atMatch[3] ? atMatch[3].trim() : '');
      }
    }

    return NextResponse.json({ success: true, extracted });
  } catch (error) {
    console.error('[API /jobs/extract] Error:', error);
    return NextResponse.json(
      { error: true, errorMessage: (error as Error).message },
      { status: 200 }
    );
  }
}