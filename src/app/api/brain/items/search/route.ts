import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const BRAIN_DIR = path.join(process.cwd(), '../../workspace/brain');
const ITEMS_FILE = path.join(BRAIN_DIR, 'items.json');

/**
 * Read items from file
 */
function readItems(): any {
  const data = fs.readFileSync(ITEMS_FILE, 'utf-8');
  return JSON.parse(data);
}

/**
 * Simple full-text search across title, keywords, and content
 */
function searchItems(items: any[], query: string): any[] {
  if (!query.trim()) {
    return [];
  }
  
  const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
  
  return items
    .map(item => {
      let score = 0;
      const searchFields = [
        item.title?.toLowerCase() || '',
        item.content?.toLowerCase() || '',
        ...(item.keywords?.map((k: string) => k.toLowerCase()) || []),
      ].join(' ');
      
      // Calculate relevance score
      searchTerms.forEach(term => {
        // Exact match in title = high score
        if (item.title?.toLowerCase().includes(term)) {
          score += 10;
        }
        
        // Match in keywords = medium score
        if (item.keywords?.some((k: string) => k.toLowerCase().includes(term))) {
          score += 5;
        }
        
        // Match in content = low score
        if (item.content?.toLowerCase().includes(term)) {
          score += 2;
        }
      });
      
      return { ...item, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);
}

/**
 * GET /api/brain/items/search?q=... - Search items
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    
    if (!query.trim()) {
      return NextResponse.json({
        success: true,
        items: [],
        count: 0,
        query: '',
      });
    }
    
    const data = readItems();
    const results = searchItems(data.items, query);
    
    return NextResponse.json({
      success: true,
      items: results,
      count: results.length,
      query,
    });
  } catch (error) {
    console.error('Error searching brain items:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search brain items' },
      { status: 500 }
    );
  }
}
