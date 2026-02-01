/**
 * Search History Management
 * Stores recent searches in localStorage for quick access
 */

const STORAGE_KEY = 'tavvy_search_history';
const MAX_HISTORY = 10;

export interface SearchHistoryItem {
  query: string;
  timestamp: number;
  country?: string;
  region?: string;
  city?: string;
}

/**
 * Get search history from localStorage
 */
export function getSearchHistory(): SearchHistoryItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load search history:', error);
    return [];
  }
}

/**
 * Add a search to history
 */
export function addToSearchHistory(item: Omit<SearchHistoryItem, 'timestamp'>): void {
  try {
    const history = getSearchHistory();
    
    // Remove duplicate if exists
    const filtered = history.filter(h => 
      h.query !== item.query || 
      h.country !== item.country || 
      h.region !== item.region ||
      h.city !== item.city
    );
    
    // Add new item at the beginning
    const newHistory = [
      { ...item, timestamp: Date.now() },
      ...filtered
    ].slice(0, MAX_HISTORY);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
  } catch (error) {
    console.error('Failed to save search history:', error);
  }
}

/**
 * Clear all search history
 */
export function clearSearchHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear search history:', error);
  }
}

/**
 * Format a history item for display
 */
export function formatHistoryItem(item: SearchHistoryItem): string {
  const parts = [item.query];
  if (item.city) parts.push(item.city);
  if (item.region) parts.push(item.region);
  if (item.country) parts.push(item.country);
  return parts.filter(Boolean).join(', ');
}

/**
 * Get relative time string
 */
export function getRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
