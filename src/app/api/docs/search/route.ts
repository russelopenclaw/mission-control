import { NextRequest, NextResponse } from 'next/server';
import { searchDocuments } from '@/lib/docs/indexer';
import { scanDocuments, getDocsDir } from '@/lib/docs/scanner';
import { buildIndex } from '@/lib/docs/indexer';
import fs from 'fs';
import path from 'path';

const DOCS_DIR = getDocsDir();

// Ensure index is built
function ensureIndexBuilt() {
  const documents = scanDocuments();
  const contentCache = new Map<string, string>();
  
  documents.forEach(doc => {
    const content = fs.readFileSync(path.join(DOCS_DIR, doc.filename), 'utf-8');
    contentCache.set(doc.filename, content);
  });
  
  buildIndex(documents, contentCache);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    
    if (!query.trim()) {
      return NextResponse.json({
        success: true,
        query: '',
        results: [],
        count: 0,
      });
    }

    // Ensure index is built
    ensureIndexBuilt();
    
    // Search
    const results = searchDocuments(query);
    
    return NextResponse.json({
      success: true,
      query,
      results,
      count: results.length,
    });
  } catch (error) {
    console.error('Error searching documents:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search documents' },
      { status: 500 }
    );
  }
}
