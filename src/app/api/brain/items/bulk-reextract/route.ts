import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { extractKeywordsCombined } from '@/lib/brain/keywords';

const BRAIN_DIR = path.join(process.cwd(), '../../workspace/brain');
const ITEMS_FILE = path.join(BRAIN_DIR, 'items.json');

interface ItemsData {
  items: any[];
  metadata?: {
    lastUpdated?: string;
    version?: string;
  };
}

function readItems(): ItemsData {
  const data = fs.readFileSync(ITEMS_FILE, 'utf-8');
  return JSON.parse(data);
}

function writeItems(data: ItemsData): void {
  fs.writeFileSync(ITEMS_FILE, JSON.stringify(data, null, 2));
}

/**
 * POST /api/brain/items/bulk/reextract - Re-extract keywords for all items
 * Body: { limit?: number } - Optional limit to re-extract only N items
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const limit = body.limit || 50; // Default to 50 items
    
    const data = readItems();
    const totalItems = data.items.length;
    const itemsToProcess = Math.min(limit, totalItems);
    const results: any[] = [];
    
    // Process items
    for (let i = 0; i < itemsToProcess; i++) {
      const item = data.items[i];
      const oldKeywords = item.keywords || [];
      
      // Re-extract keywords
      const newKeywords = extractKeywordsCombined(
        item.content || '',
        item.title || '',
        item.url || ''
      );
      
      // Only update if keywords changed
      const keywordsChanged = 
        JSON.stringify(oldKeywords.sort()) !== JSON.stringify(newKeywords.sort());
      
      if (keywordsChanged) {
        item.keywords = newKeywords;
        results.push({
          id: item.id,
          title: item.title,
          oldKeywords,
          newKeywords,
        });
      }
    }
    
    // Save updated items
    writeItems(data);
    
    // Update metadata
    data.metadata = {
      ...data.metadata,
      lastUpdated: new Date().toISOString(),
    };
    writeItems(data);
    
    return NextResponse.json({
      success: true,
      message: `Re-extracted keywords for ${results.length} items`,
      totalProcessed: itemsToProcess,
      totalItems,
      updated: results.length,
      results,
    });
  } catch (error) {
    console.error('Error bulk re-extracting keywords:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to bulk re-extract keywords' },
      { status: 500 }
    );
  }
}
