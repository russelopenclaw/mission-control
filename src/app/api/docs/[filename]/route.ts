import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { getDocumentContent } from '@/lib/docs/metadata';
import { getDocsDir } from '@/lib/docs/scanner';

const DOCS_DIR = getDocsDir();

interface RouteParams {
  params: Promise<{ filename: string }>;
}

export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { filename } = await params;
    
    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json(
        { success: false, error: 'Invalid filename' },
        { status: 400 }
      );
    }

    const filePath = path.join(DOCS_DIR, filename);
    
    // Check file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    const content = getDocumentContent(filePath);
    const stat = fs.statSync(filePath);

    return NextResponse.json({
      success: true,
      filename,
      content,
      metadata: {
        modifiedAt: stat.mtime,
        size: stat.size,
      },
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch document' },
      { status: 500 }
    );
  }
}
