import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { extractKeywordsCombined } from '@/lib/brain/keywords';

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
 * Write items to file
 */
function writeItems(data: any): void {
  fs.writeFileSync(ITEMS_FILE, JSON.stringify(data, null, 2));
}

/**
 * POST /api/brain/items/[id]/reextract - Re-extract keywords for an item
 * Updates the keywords field with fresh extraction
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Item ID is required' },
        { status: 400 }
      );
    }
    
    const data = readItems();
    const item = data.items.find((item: any) => item.id === id);
    
    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      );
    }
    
    // Re-extract keywords
    const newKeywords = extractKeywordsCombined(
      item.content || '',
      item.title || '',
      item.url || ''
    );
    
    // Update item with new keywords
    item.keywords = newKeywords;
    
    // Save
    writeItems(data);
    
    return NextResponse.json({
      success: true,
      message: 'Keywords re-extracted successfully',
      item,
    });
  } catch (error) {
    console.error('Error re-extracting keywords:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to re-extract keywords' },
      { status: 500 }
    );
  }
}
