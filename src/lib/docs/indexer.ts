import type { DocumentMetadata } from './metadata';

export interface SearchIndex {
  documents: Map<string, DocumentMetadata>;
  contentIndex: Map<string, string>; // filename -> full content
  keywordIndex: Map<string, Set<string>>; // keyword -> set of filenames
}

let searchIndex: SearchIndex | null = null;
let lastScanTime: number = 0;

/**
 * Build the search index from documents
 */
export function buildIndex(documents: DocumentMetadata[], contents: Map<string, string>): SearchIndex {
  const index: SearchIndex = {
    documents: new Map(),
    contentIndex: new Map(),
    keywordIndex: new Map(),
  };

  documents.forEach(doc => {
    index.documents.set(doc.filename, doc);
    
    // Store content for full-text search
    const content = contents.get(doc.filename) || '';
    index.contentIndex.set(doc.filename, content);
    
    // Build keyword index
    doc.keywords.forEach(keyword => {
      if (!index.keywordIndex.has(keyword)) {
        index.keywordIndex.set(keyword, new Set());
      }
      index.keywordIndex.get(keyword)!.add(doc.filename);
    });
  });

  searchIndex = index;
  lastScanTime = Date.now();
  return index;
}

/**
 * Search documents by query
 */
export function searchDocuments(query: string): DocumentMetadata[] {
  if (!searchIndex) {
    return [];
  }

  const queryLower = query.toLowerCase().trim();
  if (!queryLower) {
    return Array.from(searchIndex.documents.values());
  }

  const results = new Map<string, { doc: DocumentMetadata; score: number }>();

  // Search in keywords
  searchIndex.keywordIndex.forEach((filenames, keyword) => {
    if (keyword.includes(queryLower)) {
      filenames.forEach(filename => {
        const doc = searchIndex!.documents.get(filename);
        if (doc) {
          if (!results.has(filename)) {
            results.set(filename, { doc, score: 0 });
          }
          results.get(filename)!.score += 10; // High weight for keyword match
        }
      });
    }
  });

  // Search in titles
  searchIndex.documents.forEach((doc, filename) => {
    if (doc.title.toLowerCase().includes(queryLower)) {
      if (!results.has(filename)) {
        results.set(filename, { doc, score: 0 });
      }
      results.get(filename)!.score += 5; // Medium weight for title match
    }
  });

  // Search in filenames
  searchIndex.documents.forEach((doc, filename) => {
    if (filename.toLowerCase().includes(queryLower)) {
      if (!results.has(filename)) {
        results.set(filename, { doc, score: 0 });
      }
      results.get(filename)!.score += 3; // Lower weight for filename match
    }
  });

  // Full-text search in content
  searchIndex.contentIndex.forEach((content, filename) => {
    const contentLower = content.toLowerCase();
    const occurrences = (contentLower.match(new RegExp(queryLower, 'g')) || []).length;
    
    if (occurrences > 0) {
      if (!results.has(filename)) {
        results.set(filename, { doc: searchIndex!.documents.get(filename)!, score: 0 });
      }
      results.get(filename)!.score += occurrences; // Weight by occurrence count
    }
  });

  // Sort by score (descending) and return
  return Array.from(results.values())
    .sort((a, b) => b.score - a.score)
    .map(result => result.doc);
}

/**
 * Get current index
 */
export function getIndex(): SearchIndex | null {
  return searchIndex;
}

/**
 * Get last scan time
 */
export function getLastScanTime(): number {
  return lastScanTime;
}

/**
 * Clear the index
 */
export function clearIndex(): void {
  searchIndex = null;
  lastScanTime = 0;
}
