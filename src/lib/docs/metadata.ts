import fs from 'fs';
import path from 'path';

export interface DocumentMetadata {
  filename: string;
  title: string;
  wordCount: number;
  createdAt: Date | null;
  modifiedAt: Date;
  filePath: string;
  keywords: string[];
}

/**
 * Extract title from markdown content (first H1 heading)
 */
export function extractTitle(content: string): string {
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) {
    return h1Match[1].trim();
  }
  return 'Untitled';
}

/**
 * Count words in content
 */
export function countWords(content: string): number {
  return content.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Extract keywords from content (simple implementation)
 */
export function extractKeywords(content: string, filename: string): string[] {
  const keywords = new Set<string>();
  
  // Add filename as keyword (without extension)
  const baseName = path.basename(filename, path.extname(filename));
  keywords.add(baseName.toLowerCase());
  
  // Extract potential keywords from headings
  const headingMatches = content.match(/^(#{1,6})\s+(.+)$/gm);
  if (headingMatches) {
    headingMatches.forEach(heading => {
      const text = heading.replace(/^#{1,6}\s+/, '').trim();
      text.split(/[\s,-]+/).forEach(word => {
        if (word.length > 3) {
          keywords.add(word.toLowerCase());
        }
      });
    });
  }
  
  return Array.from(keywords);
}

/**
 * Get file metadata
 */
export function getFileMetadata(filePath: string): DocumentMetadata {
  const stat = fs.statSync(filePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  
  return {
    filename: path.basename(filePath),
    title: extractTitle(content),
    wordCount: countWords(content),
    createdAt: stat.birthtime,
    modifiedAt: stat.mtime,
    filePath: filePath,
    keywords: extractKeywords(content, path.basename(filePath)),
  };
}

/**
 * Get document content
 */
export function getDocumentContent(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}
