/**
 * Citation URL Mapper
 * 
 * Maps Freshdesk article IDs to Javelina-domain URLs
 * so that citations never expose external Freshdesk URLs to users.
 */

/**
 * Maps a Freshdesk article ID to a Javelina help center URL
 * 
 * Options:
 * 1. Proxy route: /help/kb/:articleId (fetches from Freshdesk server-side)
 * 2. Direct mapping if Javelina has its own help center with matching article IDs
 * 
 * For now, using proxy route approach
 */
export function mapArticleIdToJavelinaUrl(articleId: string): string {
  // Option 1: Proxy route (recommended for security)
  return `/help/kb/${articleId}`;
  
  // Option 2: Direct to Javelina help center (if you have one)
  // return `https://help.javelina.com/articles/${articleId}`;
}

/**
 * Validates that a citation URL is Javelina-domain only
 */
export function isJavelinaDomainUrl(url: string): boolean {
  try {
    const urlObj = new URL(url, window.location.origin);
    
    // Allow same-origin URLs (proxy routes)
    if (urlObj.origin === window.location.origin) {
      return true;
    }
    
    // Allow explicit Javelina help domain and Freshdesk knowledge base
    const allowedDomains = [
      'help.javelina.com', 
      'docs.javelina.com',
      'javelina-help.freshdesk.com'
    ];
    return allowedDomains.some(domain => urlObj.hostname === domain);
  } catch {
    return false;
  }
}
