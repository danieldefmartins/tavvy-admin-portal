/**
 * Smart Query Parser for Natural Language Place Search
 * 
 * Parses queries like:
 * - "Starbucks Newark NJ"
 * - "Starbucks near Newark, NJ"
 * - "coffee shops in Manhattan"
 * - "pizza New York"
 * 
 * Extracts: place name, city, state/region, country
 */

// US State abbreviations and full names
const US_STATES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
]);

const US_STATE_NAMES: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
  'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
  'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
  'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
  'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
  'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
  'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
  'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
  'wisconsin': 'WI', 'wyoming': 'WY'
};

// Common country codes
const COUNTRY_CODES = new Set([
  'US', 'USA', 'UK', 'GB', 'CA', 'AU', 'NZ', 'DE', 'FR', 'ES', 'IT', 'JP', 'CN', 'IN', 'BR', 'MX'
]);

export interface ParsedQuery {
  placeName: string;
  city?: string;
  region?: string;  // State for US, province for others
  country?: string;
  isParsed: boolean;  // True if we successfully extracted entities
  originalQuery: string;
}

/**
 * Parse a natural language search query
 */
export function parseSearchQuery(query: string): ParsedQuery {
  const trimmed = query.trim();
  
  if (!trimmed) {
    return {
      placeName: '',
      isParsed: false,
      originalQuery: query
    };
  }

  // Pattern 1: "Place near City State" or "Place near City, State"
  // Example: "Starbucks near Newark NJ" or "coffee shops in Manhattan, NY"
  // Supports both "near Newark NJ" and "near Newark, NJ"
  const nearPattern = /^(.+?)\s+(?:near|in|at)\s+(.+?)(?:(?:,\s*|\s+)([a-zA-Z]{2}))?$/i;
  const nearMatch = trimmed.match(nearPattern);
  
  if (nearMatch) {
    const [_, placeName, cityPart, statePart] = nearMatch;
    const result: ParsedQuery = {
      placeName: placeName.trim(),
      city: cityPart.trim(),
      isParsed: true,
      originalQuery: query
    };
    
    if (statePart) {
      const stateUpper = statePart.trim().toUpperCase();
      if (US_STATES.has(stateUpper)) {
        result.region = stateUpper;
        result.country = 'US';
      } else {
        // Try to match full state name
        const stateLower = statePart.trim().toLowerCase();
        if (US_STATE_NAMES[stateLower]) {
          result.region = US_STATE_NAMES[stateLower];
          result.country = 'US';
        }
      }
    }
    
    return result;
  }

  // Pattern 2: "Place City State" (no preposition)
  // Example: "Starbucks Newark NJ" or "pizza Manhattan NY" or "starbucks newark nj"
  // Look for 2-letter state code at the end (case-insensitive)
  const cityStatePattern = /^(.+?)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s+([a-zA-Z]{2})$/;
  const cityStateMatch = trimmed.match(cityStatePattern);
  
  if (cityStateMatch) {
    const [_, placeName, city, state] = cityStateMatch;
    const stateUpper = state.toUpperCase();
    if (US_STATES.has(stateUpper)) {
      return {
        placeName: placeName.trim(),
        city: city.trim(),
        region: stateUpper,
        country: 'US',
        isParsed: true,
        originalQuery: query
      };
    }
  }

  // Pattern 3: "Place City" (just city, no state)
  // Example: "Starbucks Manhattan" or "pizza Newark"
  // This is tricky - we'll only match if the last word looks like a city (capitalized)
  const cityPattern = /^(.+?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)$/;
  const cityMatch = trimmed.match(cityPattern);
  
  if (cityMatch) {
    const [_, placeName, city] = cityMatch;
    // Only parse if city looks like a proper noun (2+ chars, capitalized)
    if (city.length >= 2) {
      return {
        placeName: placeName.trim(),
        city: city.trim(),
        isParsed: true,
        originalQuery: query
      };
    }
  }

  // Pattern 4: "Place, City, State" (comma-separated)
  // Example: "Starbucks, Newark, NJ"
  const commaPattern = /^(.+?),\s*(.+?)(?:,\s*(.+))?$/;
  const commaMatch = trimmed.match(commaPattern);
  
  if (commaMatch) {
    const [_, placeName, cityPart, statePart] = commaMatch;
    const result: ParsedQuery = {
      placeName: placeName.trim(),
      city: cityPart.trim(),
      isParsed: true,
      originalQuery: query
    };
    
    if (statePart) {
      const stateUpper = statePart.trim().toUpperCase();
      if (US_STATES.has(stateUpper)) {
        result.region = stateUpper;
        result.country = 'US';
      }
    }
    
    return result;
  }

  // No pattern matched - return as plain place name
  return {
    placeName: trimmed,
    isParsed: false,
    originalQuery: query
  };
}

/**
 * Get a user-friendly description of what was parsed
 */
export function getParseDescription(parsed: ParsedQuery): string | null {
  if (!parsed.isParsed) return null;
  
  const parts: string[] = [];
  
  if (parsed.placeName) {
    parts.push(`"${parsed.placeName}"`);
  }
  
  if (parsed.city) {
    parts.push(`in ${parsed.city}`);
  }
  
  if (parsed.region) {
    parts.push(parsed.region);
  }
  
  if (parsed.country && parsed.country !== 'US') {
    parts.push(parsed.country);
  }
  
  return parts.length > 0 ? `Searching for ${parts.join(', ')}` : null;
}

/**
 * Example queries for placeholder text
 */
export const EXAMPLE_QUERIES = [
  '"Starbucks Newark NJ"',
  '"coffee shops in Manhattan"',
  '"pizza near Brooklyn, NY"',
  '"Whole Foods"'
];
