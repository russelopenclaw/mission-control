import fs from 'fs';
import path from 'path';
import { getFileMetadata, type DocumentMetadata } from './metadata';

// Try multiple possible paths
function findDocsDir(): string {
  const possiblePaths = [
    path.resolve(process.cwd(), 'docs'), // mission-control/docs
    path.resolve(process.cwd(), '../../docs'), // workspace/docs (relative from mission-control)
    '/home/kevin/.openclaw/workspace/docs', // absolute path to workspace/docs
    path.resolve(process.cwd(), '../docs'), // sibling directory
  ];
  
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  
  // Default to mission-control/docs
  return path.resolve(process.cwd(), 'docs');
}

const DOCS_DIR = findDocsDir();
const SUPPORTED_EXTENSIONS = ['.md', '.mdx', '.txt'];

/**
 * Scan the docs directory for all supported files
 */
export function scanDocuments(): DocumentMetadata[] {
  if (!fs.existsSync(DOCS_DIR)) {
    console.warn('Docs directory does not exist:', DOCS_DIR);
    return [];
  }

  const files = fs.readdirSync(DOCS_DIR);
  const documents: DocumentMetadata[] = [];

  files.forEach(file => {
    const ext = path.extname(file).toLowerCase();
    if (SUPPORTED_EXTENSIONS.includes(ext)) {
      const filePath = path.join(DOCS_DIR, file);
      try {
        const metadata = getFileMetadata(filePath);
        documents.push(metadata);
      } catch (error) {
        console.error(`Error reading file ${file}:`, error);
      }
    }
  });

  return documents;
}

/**
 * Get the docs directory path
 */
export function getDocsDir(): string {
  return DOCS_DIR;
}

/**
 * Check if docs directory exists
 */
export function docsDirExists(): boolean {
  return fs.existsSync(DOCS_DIR);
}
