import { NextResponse } from 'next/server';
import { scanDocuments } from '@/lib/docs/scanner';
import { buildIndex, clearIndex } from '@/lib/docs/indexer';
import fs from 'fs';
import path from 'path';

const DOCS_DIR = path.resolve(process.cwd(), '../../docs');

export async function POST() {
  try {
    // Clear existing index
    clearIndex();
    
    // Scan documents
    const documents = scanDocuments();
    
    // Cache contents for search
    const contentCache = new Map<string, string>();
    documents.forEach(doc => {
      const content = fs.readFileSync(path.join(DOCS_DIR, doc.filename), 'utf-8');
      contentCache.set(doc.filename, content);
    });
    
    // Build search index
    buildIndex(documents, contentCache);
    
    return NextResponse.json({
      success: true,
      message: 'Documents rescanned successfully',
      count: documents.length,
      documents,
    });
  } catch (error) {
    console.error('Error scanning documents:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to scan documents' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Allow GET to also trigger a scan for simplicity
  return POST();
}
