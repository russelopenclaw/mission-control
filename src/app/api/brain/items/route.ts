import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { detectType } from '@/lib/brain/types';
import { extractKeywordsCombined } from '@/lib/brain/keywords';

const BRAIN_DIR = path.join(process.cwd(), '../../workspace/brain');
const ITEMS_FILE = path.join(BRAIN_DIR, 'items.json');

interface BrainItem {
  id: string;
  type: 'link' | 'article' | 'video' | 'note';
  title: string;
  url: string;
  content: string;
  keywords: string[];
  createdAt: string;
  metadata: {
    domain: string;
    author?: string;
  };
}

interface ItemsData {
  items: BrainItem[];
  metadata?: {
    lastUpdated?: string;
    version?: string;
  };
}

/**
 * Ensure the brain directory and items file exist
 */
function ensureBrainDataExists(): void {
  if (!fs.existsSync(BRAIN_DIR)) {
    fs.mkdirSync(BRAIN_DIR, { recursive: true });
  }
  
  if (!fs.existsSync(ITEMS_FILE)) {
    fs.writeFileSync(ITEMS_FILE, JSON.stringify({
      items: [],
      metadata: {
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      }
    }, null, 2));
  }
}

/**
 * Read items from file
 */
function readItems(): ItemsData {
  ensureBrainDataExists();
  const data = fs.readFileSync(ITEMS_FILE, 'utf-8');
  return JSON.parse(data);
}

/**
 * Write items to file with metadata update
 */
function writeItems(data: ItemsData): void {
  ensureBrainDataExists();
  // Update metadata
  data.metadata = {
    lastUpdated: new Date().toISOString(),
    version: data.metadata?.version || '1.0'
  };
  fs.writeFileSync(ITEMS_FILE, JSON.stringify(data, null, 2));
}

/**
 * GET /api/brain/items - List all saved items
 * Query params:
 *   - limit?: number - Maximum number of items to return
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    
    const data = readItems();
    let items = data.items;
    
    // Apply limit if specified
    if (limit && limit > 0) {
      items = items.slice(0, limit);
    }
    
    return NextResponse.json({
      success: true,
      count: items.length,
      total: data.items.length,
      items,
      metadata: data.metadata,
    });
  } catch (error) {
    console.error('Error fetching brain items:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch brain items' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/brain/items - Save new item
 * Body: { type?, title?, url?, content, keywords?, metadata? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, content, title: userTitle, type: userType, metadata: userMetadata } = body;
    
    // Validate required fields
    if (!content && !url) {
      return NextResponse.json(
        { success: false, error: 'Either content or url is required' },
        { status: 400 }
      );
    }
    
    const data = readItems();
    
    // Detect type from URL if not provided
    let detectedType = userType;
    let domain = '';
    let isYouTube = false;
    
    if (url) {
      const detection = detectType(url);
      detectedType = detectedType || detection.type;
      domain = detection.domain;
      isYouTube = detection.isYouTube;
    } else {
      detectedType = 'note';
    }
    
    // Auto-generate title if not provided
    let title = userTitle;
    if (!title && url) {
      // Extract title from URL
      try {
        const urlObj = new URL(url);
        title = urlObj.hostname.replace('www.', '');
        const pathSegments = urlObj.pathname.split('/').filter(s => s);
        if (pathSegments.length > 0) {
          title += ' - ' + pathSegments[pathSegments.length - 1];
        }
      } catch {
        title = 'Untitled';
      }
    } else if (!title) {
      // Generate from content
      title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
    }
    
    // Extract keywords if not provided
    const keywords = body.keywords || extractKeywordsCombined(content || '', title, url || '');
    
    // Create new item
    const newItem: BrainItem = {
      id: uuidv4(),
      type: detectedType,
      title,
      url: url || '',
      content: content || '',
      keywords,
      createdAt: new Date().toISOString(),
      metadata: {
        domain: domain || userMetadata?.domain || '',
        author: userMetadata?.author,
      },
    };
    
    // Add to items
    data.items.unshift(newItem); // Add to beginning for newest first
    
    // Save
    writeItems(data);
    
    return NextResponse.json({
      success: true,
      item: newItem,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating brain item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create brain item' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/brain/items/:id - Delete item (handled in [id]/route.ts)
 * This route doesn't support DELETE
 */
export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Use DELETE /api/brain/items/[id] to delete an item' },
    { status: 405 }
  );
}
