/**
 * Brain Item Type Detection
 * Auto-detect if a URL is an article, video, or general link
 */

export type BrainItemType = 'link' | 'article' | 'video' | 'note';

export interface TypeDetectionResult {
  type: BrainItemType;
  domain: string;
  isYouTube: boolean;
  isArticle: boolean;
}

/**
 * Detect the type of content based on URL
 */
export function detectType(url: string): TypeDetectionResult {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();
    
    // Check for YouTube videos
    if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
      return {
        type: 'video',
        domain,
        isYouTube: true,
        isArticle: false,
      };
    }
    
    // Check for other video platforms
    if (
      domain.includes('vimeo.com') ||
      domain.includes('twitch.tv') ||
      domain.includes('tiktok.com')
    ) {
      return {
        type: 'video',
        domain,
        isYouTube: false,
        isArticle: false,
      };
    }
    
    // Check for common article/blog platforms
    const articleDomains = [
      'medium.com',
      'dev.to',
      'hashnode.com',
      'substack.com',
      'ghost.io',
      'wordpress.com',
    ];
    
    const articleExtensions = [
      '.html',
      '.htm',
      '.md',
      '.markdown',
    ];
    
    const articlePaths = ['/blog', '/article', '/post', '/news', '/story'];
    
    const hasArticleExtension = articleExtensions.some(ext => 
      urlObj.pathname.toLowerCase().endsWith(ext)
    );
    
    const hasArticlePath = articlePaths.some(path => 
      urlObj.pathname.toLowerCase().includes(path)
    );
    
    const isArticleDomain = articleDomains.some(d => domain.includes(d));
    
    if (isArticleDomain || hasArticleExtension || hasArticlePath) {
      return {
        type: 'article',
        domain,
        isYouTube: false,
        isArticle: true,
      };
    }
    
    // Default to link
    return {
      type: 'link',
      domain,
      isYouTube: false,
      isArticle: false,
    };
  } catch {
    // Invalid URL, treat as note
    return {
      type: 'note',
      domain: '',
      isYouTube: false,
      isArticle: false,
    };
  }
}

/**
 * Get type badge emoji
 */
export function getTypeBadge(type: BrainItemType): string {
  switch (type) {
    case 'note':
      return '📝';
    case 'link':
      return '🔗';
    case 'article':
      return '📄';
    case 'video':
      return '🎥';
    default:
      return '🔗';
  }
}

/**
 * Get type display name
 */
export function getTypeDisplayName(type: BrainItemType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}
