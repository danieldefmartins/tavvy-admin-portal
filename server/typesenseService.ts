import Typesense from 'typesense';
import { cache } from './cache';

/**
 * Typesense Search Service for Tavvy Admin Portal
 * 
 * Provides fast search across 65.7M places with <50ms response times.
 * Replaces slow Supabase ILIKE queries that search multiple tables.
 */

// Initialize Typesense client
const typesenseClient = new Typesense.Client({
  nodes: [
    {
      host: 'tavvy-typesense-production.up.railway.app',
      port: 443,
      protocol: 'https',
    },
  ],
  apiKey: '231eb42383d0a3a2832f47ec44b817e33692211d9cf2d158f49e5c3e608e6277',
  connectionTimeoutSeconds: 10,
  numRetries: 3,
  retryIntervalSeconds: 0.5,
});

export interface TypesensePlace {
  fsq_place_id: string;
  name: string;
  categories?: string[];
  address?: string;
  locality?: string;
  region?: string;
  country?: string;
  postcode?: string;
  latitude?: number;
  longitude?: number;
  tel?: string;
  website?: string;
  email?: string;
  instagram?: string;
  facebook_id?: string;
  popularity: number;
}

export interface SearchOptions {
  query: string;
  country?: string;
  region?: string;
  locality?: string;
  categories?: string[];
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  places: TypesensePlace[];
  totalFound: number;
  searchTimeMs: number;
}

/**
 * Search places using Typesense (fast!)
 * 
 * @param options Search options
 * @returns Search results with places and metadata
 */
export async function searchPlacesTypesense(
  options: SearchOptions
): Promise<SearchResult> {
  const {
    query,
    country,
    region,
    locality,
    categories,
    limit = 50,
    offset = 0,
  } = options;

  // Build filter query
  const filters: string[] = [];
  
  if (country) {
    filters.push(`country:=${country}`);
  }
  
  if (region) {
    filters.push(`region:=${region}`);
  }
  
  if (locality) {
    filters.push(`locality:=${locality}`);
  }

  if (categories && categories.length > 0) {
    const categoryFilter = categories.map(c => `categories:=${c}`).join(' || ');
    filters.push(`(${categoryFilter})`);
  }

  // Calculate page number (Typesense uses 1-indexed pages)
  const page = Math.floor(offset / limit) + 1;

  // Build search parameters
  const searchParameters: any = {
    q: query || '*',
    query_by: 'name,categories,address,locality,region',
    filter_by: filters.length > 0 ? filters.join(' && ') : undefined,
    sort_by: 'popularity:desc',
    per_page: limit,
    page: page,
    // ENHANCED TYPO TOLERANCE:
    // - Allow up to 2 typos per token
    // - Start typo tolerance after 1 token (so even single-word queries get typo correction)
    // - Drop tokens if no results after 2 attempts (helps with multi-word queries)
    // - Allow 1 typo for words with 4+ characters ("starbcks" -> "starbucks")
    // - Split/join tokens to handle compound words
    // - Use "always" mode to ensure typo correction is attempted
    num_typos: 2,
    typo_tokens_threshold: 0,  // Changed from 1 to 0 to enable typo correction for all queries
    drop_tokens_threshold: 2,
    min_len_1typo: 4,
    min_len_2typo: 7,
    split_join_tokens: 'always',  // Help with compound words
    // Search highlighting: show why results matched
    highlight_fields: 'name,address,categories,locality',
    highlight_full_fields: 'name,address',
  };

  try {
    const startTime = Date.now();
    const searchResults = await typesenseClient
      .collections('places')
      .documents()
      .search(searchParameters);
    const searchTimeMs = Date.now() - startTime;

    const places: TypesensePlace[] = (searchResults.hits || []).map(
      (hit: any) => hit.document
    );

    console.log(`[Typesense] Found ${searchResults.found} places in ${searchTimeMs}ms`);

    return {
      places,
      totalFound: searchResults.found || 0,
      searchTimeMs,
    };
  } catch (error) {
    console.error('[Typesense] Search error:', error);
    // Return empty results on error (fallback to Supabase)
    return {
      places: [],
      totalFound: 0,
      searchTimeMs: 0,
    };
  }
}

/**
 * Get autocomplete suggestions
 */
export async function getAutocompleteSuggestions(
  query: string,
  limit: number = 10
): Promise<string[]> {
  if (!query || query.length < 2) {
    return [];
  }

  try {
    const searchResults = await typesenseClient
      .collections('places')
      .documents()
      .search({
        q: query,
        query_by: 'name,categories',
        per_page: limit,
        prefix: true,
      });

    const suggestions = new Set<string>();
    
    (searchResults.hits || []).forEach((hit: any) => {
      const doc = hit.document;
      suggestions.add(doc.name);
      if (doc.categories) {
        doc.categories.forEach((cat: string) => suggestions.add(cat));
      }
    });

    return Array.from(suggestions).slice(0, limit);
  } catch (error) {
    console.error('[Typesense] Autocomplete error:', error);
    return [];
  }
}

/**
 * Get place by Foursquare ID
 */
export async function getPlaceByIdTypesense(
  fsqPlaceId: string
): Promise<TypesensePlace | null> {
  try {
    const result = await typesenseClient
      .collections('places')
      .documents()
      .search({
        q: fsqPlaceId,
        query_by: 'fsq_place_id',
        filter_by: `fsq_place_id:=${fsqPlaceId}`,
        per_page: 1,
      });

    if (result.hits && result.hits.length > 0) {
      return result.hits[0].document as TypesensePlace;
    }

    return null;
  } catch (error) {
    console.error('[Typesense] Get place by ID error:', error);
    return null;
  }
}

/**
 * Get distinct countries from Typesense (cached for 1 hour)
 */
export async function getDistinctCountriesTypesense(): Promise<string[]> {
  const cacheKey = 'countries';
  const cached = cache.get<string[]>(cacheKey);
  if (cached) {
    console.log('[Typesense] Returning cached countries');
    return cached;
  }

  try {
    const result = await typesenseClient
      .collections('places')
      .documents()
      .search({
        q: '*',
        query_by: 'name',
        facet_by: 'country',
        per_page: 0,
        max_facet_values: 300,
      });

    if (result.facet_counts && result.facet_counts.length > 0) {
      const countryFacet = result.facet_counts.find((f: any) => f.field_name === 'country');
      if (countryFacet && countryFacet.counts) {
        const countries = countryFacet.counts
          .map((c: any) => c.value)
          .filter((v: string) => v && v.trim().length > 0);
        cache.set(cacheKey, countries);
        console.log(`[Typesense] Cached ${countries.length} countries`);
        return countries;
      }
    }

    return [];
  } catch (error) {
    console.error('[Typesense] Get distinct countries error:', error);
    return [];
  }
}

/**
 * Get distinct regions for a country (cached for 1 hour)
 */
export async function getDistinctRegionsTypesense(country: string): Promise<string[]> {
  const cacheKey = `regions:${country}`;
  const cached = cache.get<string[]>(cacheKey);
  if (cached) {
    console.log(`[Typesense] Returning cached regions for ${country}`);
    return cached;
  }

  try {
    const result = await typesenseClient
      .collections('places')
      .documents()
      .search({
        q: '*',
        query_by: 'name',
        filter_by: `country:=${country}`,
        facet_by: 'region',
        per_page: 0,
        max_facet_values: 500,
      });

    if (result.facet_counts && result.facet_counts.length > 0) {
      const regionFacet = result.facet_counts.find((f: any) => f.field_name === 'region');
      if (regionFacet && regionFacet.counts) {
        const regions = regionFacet.counts
          .map((c: any) => c.value)
          .filter((v: string) => v && v.trim().length > 0);
        cache.set(cacheKey, regions);
        console.log(`[Typesense] Cached ${regions.length} regions for ${country}`);
        return regions;
      }
    }

    return [];
  } catch (error) {
    console.error('[Typesense] Get distinct regions error:', error);
    return [];
  }
}

/**
 * Get distinct cities for a region (cached for 1 hour)
 */
export async function getDistinctCitiesTypesense(
  country: string,
  region: string
): Promise<string[]> {
  const cacheKey = `cities:${country}:${region}`;
  const cached = cache.get<string[]>(cacheKey);
  if (cached) {
    console.log(`[Typesense] Returning cached cities for ${country}/${region}`);
    return cached;
  }

  try {
    const result = await typesenseClient
      .collections('places')
      .documents()
      .search({
        q: '*',
        query_by: 'name',
        filter_by: `country:=${country} && region:=${region}`,
        facet_by: 'locality',
        per_page: 0,
        max_facet_values: 1000,
      });

    if (result.facet_counts && result.facet_counts.length > 0) {
      const cityFacet = result.facet_counts.find((f: any) => f.field_name === 'locality');
      if (cityFacet && cityFacet.counts) {
        const cities = cityFacet.counts
          .map((c: any) => c.value)
          .filter((v: string) => v && v.trim().length > 0);
        cache.set(cacheKey, cities);
        console.log(`[Typesense] Cached ${cities.length} cities for ${country}/${region}`);
        return cities;
      }
    }

    return [];
  } catch (error) {
    console.error('[Typesense] Get distinct cities error:', error);
    return [];
  }
}

/**
 * Get distinct categories
 */
export async function getDistinctCategoriesTypesense(): Promise<string[]> {
  try {
    const result = await typesenseClient
      .collections('places')
      .documents()
      .search({
        q: '*',
        query_by: 'name',
        facet_by: 'categories',
        per_page: 0,
        max_facet_values: 500,
      });

    if (result.facet_counts && result.facet_counts.length > 0) {
      const categoryFacet = result.facet_counts.find((f: any) => f.field_name === 'categories');
      if (categoryFacet && categoryFacet.counts) {
        return categoryFacet.counts
          .map((c: any) => c.value)
          .filter((v: string) => v && v.trim().length > 0);
      }
    }

    return [];
  } catch (error) {
    console.error('[Typesense] Get distinct categories error:', error);
    return [];
  }
}

/**
 * Health check
 */
export async function typesenseHealthCheck(): Promise<boolean> {
  try {
    const health = await typesenseClient.health.retrieve();
    return health.ok === true;
  } catch (error) {
    console.error('[Typesense] Health check failed:', error);
    return false;
  }
}

/**
 * Get collection stats
 */
export async function getTypesenseStats(): Promise<{
  numDocuments: number;
  isHealthy: boolean;
} | null> {
  try {
    const collection = await typesenseClient.collections('places').retrieve();
    const health = await typesenseHealthCheck();
    
    return {
      numDocuments: collection.num_documents || 0,
      isHealthy: health,
    };
  } catch (error) {
    console.error('[Typesense] Get stats error:', error);
    return null;
  }
}

export { typesenseClient };
