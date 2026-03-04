import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { scanDocuments, getDocsDir } from '@/lib/docs/scanner';
import { buildIndex } from '@/lib/docs/indexer';
import { getDocumentContent } from '@/lib/docs/metadata';

const DOCS_DIR = getDocsDir();

// In-memory cache
let documentCache: any[] = [];
let contentCache: Map<string, string> = new Map();

export async function GET() {
  try {
    // Scan documents
    const documents = scanDocuments();
    
    // Cache contents for search
    contentCache.clear();
    documents.forEach(doc => {
      const content = fs.readFileSync(path.join(DOCS_DIR, doc.filename), 'utf-8');
      contentCache.set(doc.filename, content);
    });
    
    // Build search index
    buildIndex(documents, contentCache);
    
    documentCache = documents;
    
    return NextResponse.json({
      success: true,
      count: documents.length,
      documents,
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}
