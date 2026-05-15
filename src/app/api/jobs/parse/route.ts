import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch URL: ${response.status}` }, { status: 502 });
    }

    const html = await response.text();

    // Extract metadata from HTML
    const getMeta = (name: string): string | null => {
      // Try og: tags first, then name/meta
      const ogMatch = html.match(new RegExp(`<meta\\s+(?:content="([^"]*)"\\s+)?property="og:${name}"[^>]*>`, 'i'))
        || html.match(new RegExp(`<meta\\s+property="og:${name}"\\s+content="([^"]*)"[^>]*>`, 'i'));
      if (ogMatch) return ogMatch[1];
      const nameMatch = html.match(new RegExp(`<meta\\s+name="${name}"\\s+content="([^"]*)"[^>]*>`, 'i'));
      if (nameMatch) return nameMatch[1];
      return null;
    };

    const getTitle = (): string => {
      // Try og:title, then <title>
      const ogTitle = getMeta('title');
      if (ogTitle) return ogTitle.replace(/\s*[|\-–].*$/, '').trim(); // Remove site suffix
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) return titleMatch[1].replace(/\s*[|\-–].*$/, '').trim();
      return '';
    };

    const getDescription = (): string => {
      const ogDesc = getMeta('description');
      if (ogDesc) return ogDesc;
      const metaDesc = html.match(/<meta\s+name="description"\s+content="([^"]*)"[^>]*>/i);
      if (metaDesc) return metaDesc[1];
      return '';
    };

    // Try to extract company from page content
    const getCompany = (): string => {
      // LinkedIn: company in URL or meta
      const linkedInMatch = url.match(/linkedin\.com\/company\/([^/]+)/i);
      if (linkedInMatch) return linkedInMatch[1].replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

      // Try JSON-LD
      const jsonLdMatch = html.match(/<script\s+type="application\/ld\+json"[^>]*>([^<]+)<\/script>/i);
      if (jsonLdMatch) {
        try {
          const ld = JSON.parse(jsonLdMatch[1]);
          if (ld.hiringOrganization?.name) return ld.hiringOrganization.name;
          if (ld.author?.name) return ld.author.name;
        } catch {}
      }

      return '';
    };

    const getLocation = (): string => {
      // Try JSON-LD
      const jsonLdMatch = html.match(/<script\s+type="application\/ld\+json"[^>]*>([^<]+)<\/script>/i);
      if (jsonLdMatch) {
        try {
          const ld = JSON.parse(jsonLdMatch[1]);
          if (ld.jobLocation?.address?.addressLocality) {
            const addr = ld.jobLocation.address;
            const parts = [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean);
            return parts.join(', ');
          }
        } catch {}
      }

      // Try to find remote/hybrid indicators
      const remoteMatch = html.match(/\b(remote|hybrid|work\s+from\s+home)\b/i);
      if (remoteMatch) return 'Remote';

      return '';
    };

    const getSalaryRange = (): string => {
      const jsonLdMatch = html.match(/<script\s+type="application\/ld\+json"[^>]*>([^<]+)<\/script>/i);
      if (jsonLdMatch) {
        try {
          const ld = JSON.parse(jsonLdMatch[1]);
          if (ld.baseSalary) {
            const { minValue, maxValue, currency } = ld.baseSalary;
            if (minValue && maxValue) {
              return `${currency || '$'}${minValue} - ${maxValue}`;
            }
          }
        } catch {}
      }

      // Try regex patterns for salary in text
      const salaryPatterns = [
        /\$[\d,]+[\s\-–to]+\$[\d,]+/i,
        /\$[\d,]+\s*(?:per\s+year|annually|\/year)/i,
      ];
      for (const pattern of salaryPatterns) {
        const match = html.match(pattern);
        if (match) return match[0];
      }

      return '';
    };

    const result = {
      title: getTitle(),
      company: getCompany(),
      location: getLocation(),
      description: getDescription().slice(0, 2000), // Limit description
      salary_range: getSalaryRange(),
      url,
      source: new URL(url).hostname.includes('linkedin') ? 'LinkedIn' : new URL(url).hostname,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Jobs Parse] Error:', error);
    return NextResponse.json({ error: 'Failed to parse job URL' }, { status: 500 });
  }
}