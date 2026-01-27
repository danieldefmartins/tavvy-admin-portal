import { supabaseAdmin } from "./supabaseAuth";

// Use the admin client with service role key for all database operations
// This bypasses RLS policies and allows full access to all tables
export const supabase = supabaseAdmin;

// ============ CONNECTION TEST ============
export async function testConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("review_items")
      .select("id")
      .limit(1);
    
    if (error) {
      console.error("[Supabase] Connection test failed:", error);
      return { success: false, error: error.message };
    }
    
    console.log("[Supabase] Connection test successful");
    return { success: true };
  } catch (error: any) {
    console.error("[Supabase] Connection test failed:", error);
    return { success: false, error: error.message || String(error) };
  }
}

// ============ PLACES ============
export interface Place {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  category: string | null;
  subcategory?: string | null;
  source: string;
  cover_image_url?: string | null;
  photos?: any;
  status?: string | null;
  is_active?: boolean;
}

export async function getPlaces(limit = 100, offset = 0) {
  const { data, error } = await supabase
    .from("fsq_places_raw")
    .select("*")
    .range(offset, offset + limit - 1)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function searchPlaces(
  query: string,
  limit: number = 50,
  offset: number = 0
): Promise<Place[]> {
  // Admin portal searches ALL 4 tables for complete coverage
  let placesFromPlacesTable: Place[] = [];
  let placesFromTavvyPlaces: Place[] = [];
  let placesFromFsqRaw: Place[] = [];
  let placesFromNrel: Place[] = [];

  try {
    // Sanitize query: escape special characters that could break filter parsing
    const sanitizedQuery = query
      .replace(/[%_\\]/g, '\\$&')  // Escape SQL LIKE wildcards
      .trim();
    
    if (!sanitizedQuery || sanitizedQuery.length < 2) {
      return [];
    }

    // ============================================
    // STEP 1: Search places table first (canonical data)
    // ============================================
    const { data: placesData, error: placesError } = await supabase
      .from("places")
      .select("*")
      .or(`name.ilike.%${sanitizedQuery}%,city.ilike.%${sanitizedQuery}%,street.ilike.%${sanitizedQuery}%`)
      .range(offset, offset + limit - 1)
      .order("name", { ascending: true });

    if (placesError) {
      console.error("[Supabase] Search places error:", placesError);
    } else {
      placesFromPlacesTable = (placesData || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        address: p.street,
        city: p.city,
        state: p.region,
        country: p.country,
        postal_code: p.postcode,
        lat: p.latitude,
        lng: p.longitude,
        phone: p.phone,
        website: p.website,
        category: p.tavvy_category,
        subcategory: p.tavvy_subcategory,
        source: p.source_type || 'tavvy',
        cover_image_url: p.cover_image_url,
        photos: p.photos,
        status: p.status,
        is_active: p.is_active,
      }));
      console.log(`[Supabase] Found ${placesFromPlacesTable.length} places from places table`);
    }

    // ============================================
    // STEP 2: Search tavvy_places table (Tavvy-created places)
    // ============================================
    try {
      const { data: tavvyData, error: tavvyError } = await supabase
        .from("tavvy_places")
        .select("*")
        .or(`name.ilike.%${sanitizedQuery}%,city.ilike.%${sanitizedQuery}%,address.ilike.%${sanitizedQuery}%`)
        .is("is_deleted", false)
        .limit(limit)
        .order("name", { ascending: true });

      if (tavvyError) {
        console.error("[Supabase] Search tavvy_places error:", tavvyError);
      } else {
        placesFromTavvyPlaces = (tavvyData || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          address: p.address || p.address_line1,
          city: p.city,
          state: p.region,
          country: p.country,
          postal_code: p.postcode,
          lat: p.latitude,
          lng: p.longitude,
          phone: p.phone,
          website: p.website,
          category: p.tavvy_category,
          subcategory: p.tavvy_subcategory,
          source: 'tavvy',
          cover_image_url: p.cover_image_url,
          photos: p.photos,
        }));
        console.log(`[Supabase] Found ${placesFromTavvyPlaces.length} places from tavvy_places table`);
      }
    } catch (tavvyError: any) {
      console.error("[Supabase] tavvy_places search caught error:", tavvyError?.message || tavvyError);
    }

    // ============================================
    // STEP 3: Search fsq_places_raw (full Foursquare dataset)
    // ============================================
    console.log(`[Supabase] Searching fsq_places_raw for: ${sanitizedQuery}`);
      
    try {
        // Get existing IDs to avoid duplicates from all sources
        const existingIds = new Set([
          ...placesFromPlacesTable.map(p => p.id),
          ...placesFromTavvyPlaces.map(p => p.id)
        ]);
        
        // Search fsq_places_raw using the same simple approach as mobile app
        // NOTE: No .order() to avoid slow sorting on 104M+ rows
        const startTime = Date.now();
        const { data: fsqData, error: fsqError } = await supabase
          .from("fsq_places_raw")
          .select("fsq_place_id, name, latitude, longitude, address, locality, region, country, postcode, tel, website, fsq_category_labels")
          .ilike("name", `%${sanitizedQuery}%`)
          .is("date_closed", null)
          .limit(limit - placesFromPlacesTable.length);
        const duration = Date.now() - startTime;
        console.log(`[Supabase] fsq_places_raw query took ${duration}ms`);

        if (fsqError) {
          console.error("[Supabase] fsq_places_raw search error:", fsqError);
        } else if (fsqData) {
          // Filter out duplicates and map to Place interface
          placesFromFsqRaw = (fsqData || [])
            .filter((p: any) => !existingIds.has(p.fsq_place_id))
            .map((p: any) => ({
              id: p.fsq_place_id,
              name: p.name,
              address: p.address,
              city: p.locality,
              state: p.region,
              country: p.country,
              postal_code: p.postcode,
              lat: p.latitude,
              lng: p.longitude,
              phone: p.tel,
              website: p.website,
              category: p.fsq_category_labels,
              source: 'fsq',
            }));
          console.log(`[Supabase] Found ${fsqData.length} from fsq_raw, ${placesFromFsqRaw.length} after dedup`);
        }
      } catch (fsqCatchError: any) {
        console.error("[Supabase] fsq_places_raw search caught error:", fsqCatchError?.message || fsqCatchError);
      }

    // ============================================
    // STEP 4: Search nrel_ev_stations (EV charging stations)
    // ============================================
    console.log(`[Supabase] Searching nrel_ev_stations for: ${sanitizedQuery}`);
    
    try {
      // Get existing IDs to avoid duplicates
      const existingIds = new Set([
        ...placesFromPlacesTable.map(p => p.id),
        ...placesFromTavvyPlaces.map(p => p.id),
        ...placesFromFsqRaw.map(p => p.id)
      ]);
      
      const startTime = Date.now();
      const { data: nrelData, error: nrelError } = await supabase
        .from("nrel_ev_stations")
        .select("id, station_name, street_address, city, state, country, zip, latitude, longitude, station_phone, ev_network, ev_network_web, ev_connector_types, ev_dc_fast_num, ev_level2_evse_num, ev_pricing, facility_type, status_code, tavvy_rating, tavvy_review_count")
        .or(`station_name.ilike.%${sanitizedQuery}%,city.ilike.%${sanitizedQuery}%,ev_network.ilike.%${sanitizedQuery}%`)
        .eq("is_active", true)
        .eq("status_code", "E") // E = Available
        .limit(limit)
        .order("station_name", { ascending: true });
      
      const duration = Date.now() - startTime;
      console.log(`[Supabase] nrel_ev_stations query took ${duration}ms`);
      
      if (nrelError) {
        console.error("[Supabase] nrel_ev_stations search error:", nrelError);
      } else if (nrelData) {
        placesFromNrel = (nrelData || [])
          .filter((p: any) => !existingIds.has(p.id))
          .map((p: any) => ({
            id: p.id,
            name: p.station_name,
            address: p.street_address,
            city: p.city,
            state: p.state,
            country: p.country || 'US',
            postal_code: p.zip,
            lat: p.latitude,
            lng: p.longitude,
            phone: p.station_phone,
            website: p.ev_network_web,
            category: 'EV Charging',
            subcategory: p.ev_network || 'EV Charging Station',
            source: 'nrel',
          }));
        console.log(`[Supabase] Found ${nrelData.length} from nrel_ev_stations, ${placesFromNrel.length} after dedup`);
      }
    } catch (nrelCatchError: any) {
      console.error("[Supabase] nrel_ev_stations search caught error:", nrelCatchError?.message || nrelCatchError);
    }

    // ============================================
    // STEP 5: Merge results from all 4 tables
    // ============================================
    const allPlaces = [...placesFromPlacesTable, ...placesFromTavvyPlaces, ...placesFromFsqRaw, ...placesFromNrel];
    console.log(`[Supabase] Total: ${allPlaces.length} places (${placesFromPlacesTable.length} from places, ${placesFromTavvyPlaces.length} from tavvy_places, ${placesFromFsqRaw.length} from fsq_raw, ${placesFromNrel.length} from nrel)`);
    return allPlaces;
  } catch (error) {
    console.error("[Supabase] Search places error:", error);
    return [];
  }
}

// ============ ADVANCED PLACES SEARCH ============
export interface PlaceSearchFilters {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  category?: string;
}

export async function searchPlacesAdvanced(
  filters: PlaceSearchFilters,
  limit: number = 50,
  offset: number = 0
): Promise<{ places: Place[]; total: number }> {
  // Admin portal searches ALL 4 tables for complete coverage
  let placesFromPlacesTable: Place[] = [];
  let placesFromTavvyPlaces: Place[] = [];
  let placesFromFsqRaw: Place[] = [];
  let placesFromNrel: Place[] = [];
  let totalFromPlaces = 0;

  try {
    // ============================================
    // STEP 1: Search places table first (canonical data)
    // ============================================
    let query = supabase
      .from("places")
      .select("*", { count: "exact" });

    // Apply filters
    if (filters.name) {
      query = query.ilike("name", `%${filters.name}%`);
    }
    if (filters.address) {
      query = query.ilike("street", `%${filters.address}%`);
    }
    if (filters.city) {
      query = query.ilike("city", `%${filters.city}%`);
    }
    if (filters.state) {
      // Handle state variations (e.g., FL/Florida, CA/Calif, NY/New York)
      const stateVariations: Record<string, string[]> = {
        "FL": ["FL", "Florida"],
        "Florida": ["FL", "Florida"],
        "CA": ["CA", "Calif", "California"],
        "Calif": ["CA", "Calif", "California"],
        "California": ["CA", "Calif", "California"],
        "NY": ["NY", "New York"],
        "New York": ["NY", "New York"],
        "TX": ["TX", "Texas"],
        "Texas": ["TX", "Texas"],
      };
      const variations = stateVariations[filters.state];
      if (variations) {
        query = query.or(variations.map(v => `region.eq.${v}`).join(','));
      } else {
        query = query.eq("region", filters.state);
      }
    }
    if (filters.country) {
      // Handle US/United States consolidation - search for both values
      if (filters.country === "US" || filters.country === "United States") {
        query = query.or('country.eq.US,country.eq.United States');
      } else {
        query = query.eq("country", filters.country);
      }
    }
    if (filters.category) {
      query = query.ilike("tavvy_category", `%${filters.category}%`);
    }

    const { data, error, count } = await query
      .range(offset, offset + limit - 1)
      .order("name", { ascending: true });

    if (error) {
      console.error("[Supabase] Advanced search places error:", error);
    } else {
      placesFromPlacesTable = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        address: p.street,
        city: p.city,
        state: p.region,
        country: p.country,
        postal_code: p.postcode,
        lat: p.latitude,
        lng: p.longitude,
        phone: p.phone,
        website: p.website,
        category: p.tavvy_category,
        subcategory: p.tavvy_subcategory,
        source: p.source_type || 'tavvy',
        cover_image_url: p.cover_image_url,
        photos: p.photos,
        status: p.status,
        is_active: p.is_active,
      }));
      totalFromPlaces = count || 0;
      console.log(`[Supabase] Found ${placesFromPlacesTable.length} places from places table (total: ${totalFromPlaces})`);
    }

    // ============================================
    // STEP 2: Search tavvy_places table (Tavvy-created places)
    // ============================================
    try {
      let tavvyQuery = supabase
        .from("tavvy_places")
        .select("*")
        .is("is_deleted", false);

      // Apply filters
      if (filters.name) {
        tavvyQuery = tavvyQuery.ilike("name", `%${filters.name}%`);
      }
      if (filters.address) {
        tavvyQuery = tavvyQuery.or(`address.ilike.%${filters.address}%,address_line1.ilike.%${filters.address}%`);
      }
      if (filters.city) {
        tavvyQuery = tavvyQuery.ilike("city", `%${filters.city}%`);
      }
      if (filters.state) {
        tavvyQuery = tavvyQuery.eq("region", filters.state);
      }
      if (filters.country) {
        tavvyQuery = tavvyQuery.eq("country", filters.country);
      }
      if (filters.category) {
        tavvyQuery = tavvyQuery.ilike("tavvy_category", `%${filters.category}%`);
      }

      const { data: tavvyData, error: tavvyError } = await tavvyQuery
        .limit(limit)
        .order("name", { ascending: true });

      if (tavvyError) {
        console.error("[Supabase] Search tavvy_places error:", tavvyError);
      } else {
        placesFromTavvyPlaces = (tavvyData || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          address: p.address || p.address_line1,
          city: p.city,
          state: p.region,
          country: p.country,
          postal_code: p.postcode,
          lat: p.latitude,
          lng: p.longitude,
          phone: p.phone,
          website: p.website,
          category: p.tavvy_category,
          subcategory: p.tavvy_subcategory,
          source: 'tavvy',
          cover_image_url: p.cover_image_url,
          photos: p.photos,
        }));
        console.log(`[Supabase] Found ${placesFromTavvyPlaces.length} places from tavvy_places table`);
      }
    } catch (tavvyError: any) {
      console.error("[Supabase] tavvy_places search caught error:", tavvyError?.message || tavvyError);
    }

    // ============================================
    // STEP 3: Search fsq_places_raw (full Foursquare dataset)
    // ============================================
    if (filters.name && filters.name.length >= 2) {
      console.log(`[Supabase] Searching fsq_places_raw for advanced filters`);
      
      // Get existing IDs to avoid duplicates from all sources
      const existingIds = new Set([
        ...placesFromPlacesTable.map(p => p.id),
        ...placesFromTavvyPlaces.map(p => p.id)
      ]);
      
      // Search fsq_places_raw using the same simple approach as mobile app
      let fsqQuery = supabase
        .from("fsq_places_raw")
        .select("fsq_place_id, name, latitude, longitude, address, locality, region, country, postcode, tel, website, fsq_category_labels")
        .ilike("name", `%${filters.name}%`)
        .is("date_closed", null);

      // Apply location filters if provided
      if (filters.country) {
        if (filters.country === "US" || filters.country === "United States") {
          fsqQuery = fsqQuery.eq("country", "US");
        } else {
          fsqQuery = fsqQuery.eq("country", filters.country);
        }
      }
      if (filters.state) {
        fsqQuery = fsqQuery.eq("region", filters.state);
      }
      if (filters.city) {
        fsqQuery = fsqQuery.ilike("locality", `%${filters.city}%`);
      }

      // NOTE: No .order() to avoid slow sorting on 104M+ rows
      const { data: fsqData, error: fsqError } = await fsqQuery
        .limit(limit - placesFromPlacesTable.length);

      if (fsqError) {
        console.error("[Supabase] fsq_places_raw search error:", fsqError);
      } else if (fsqData) {
        // Filter out duplicates and map to Place interface
        placesFromFsqRaw = (fsqData || [])
          .filter((p: any) => !existingIds.has(p.fsq_place_id))
          .map((p: any) => ({
            id: p.fsq_place_id,
            name: p.name,
            address: p.address,
            city: p.locality,
            state: p.region,
            country: p.country,
            postal_code: p.postcode,
            lat: p.latitude,
            lng: p.longitude,
            phone: p.tel,
            website: p.website,
            category: p.fsq_category_labels,
            source: 'fsq',
          }));
        console.log(`[Supabase] Found ${fsqData.length} from fsq_raw, ${placesFromFsqRaw.length} after dedup`);
      }
    }

    // ============================================
    // STEP 4: Merge results from all 3 tables
    // ============================================
    const allPlaces = [...placesFromPlacesTable, ...placesFromTavvyPlaces, ...placesFromFsqRaw];
    
    // Total is -1 if we used fsq_raw (can't count efficiently)
    const total = placesFromFsqRaw.length > 0 ? -1 : totalFromPlaces;
    
    console.log(`[Supabase] Advanced search total: ${allPlaces.length} places (${placesFromPlacesTable.length} from places, ${placesFromTavvyPlaces.length} from tavvy_places, ${placesFromFsqRaw.length} from fsq_raw)`);
    return { places: allPlaces, total };
  } catch (error) {
    console.error("[Supabase] Advanced search places error:", error);
    return { places: [], total: 0 };
  }
}

// Get distinct countries for dropdown - uses fsq_countries lookup table
export async function getDistinctCountries(): Promise<string[]> {
  try {
    // First try to get from fsq_countries lookup table (fast)
    const { data: lookupData, error: lookupError } = await supabase
      .from("fsq_countries")
      .select("code")
      .order("code", { ascending: true });

    if (!lookupError && lookupData && lookupData.length > 0) {
      console.log(`[Supabase] Got ${lookupData.length} countries from lookup table`);
      return lookupData.map((d: any) => d.code);
    }

    // Fallback to places table if lookup table is empty
    console.log("[Supabase] Falling back to places table for countries");
    const allCountries: string[] = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const { data, error } = await supabase
        .from("places")
        .select("country")
        .not("country", "is", null)
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error("[Supabase] Get distinct countries error:", error);
        break;
      }

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        data.forEach((d: any) => {
          if (d.country && !allCountries.includes(d.country)) {
            allCountries.push(d.country);
          }
        });
        offset += batchSize;
        // If we got less than batch size, we've reached the end
        if (data.length < batchSize) {
          hasMore = false;
        }
      }
    }

    // Sort alphabetically
    const sortedCountries = allCountries.sort();
    console.log(`[Supabase] Found ${sortedCountries.length} distinct countries`);
    return sortedCountries;
  } catch (error) {
    console.error("[Supabase] Get distinct countries error:", error);
    return [];
  }
}

// Get distinct regions/states for dropdown (optionally filtered by country)
export async function getDistinctRegions(country?: string): Promise<string[]> {
  try {
    const allRegions: string[] = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      let query = supabase
        .from("places")
        .select("region")
        .not("region", "is", null);

      // Handle US/United States consolidation
      if (country) {
        if (country === "US" || country === "United States") {
          query = query.or('country.eq.US,country.eq.United States');
        } else {
          query = query.eq("country", country);
        }
      }

      const { data, error } = await query.range(offset, offset + batchSize - 1);

      if (error) {
        console.error("[Supabase] Get distinct regions error:", error);
        break;
      }

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        data.forEach((d: any) => {
          if (d.region && !allRegions.includes(d.region)) {
            allRegions.push(d.region);
          }
        });
        offset += batchSize;
        if (data.length < batchSize) {
          hasMore = false;
        }
      }
    }

    const sortedRegions = allRegions.sort();
    console.log(`[Supabase] Found ${sortedRegions.length} distinct regions${country ? ` for ${country}` : ''}`);
    return sortedRegions;
  } catch (error) {
    console.error("[Supabase] Get distinct regions error:", error);
    return [];
  }
}

// Get distinct cities for dropdown (optionally filtered by country and/or region)
export async function getDistinctCities(country?: string, region?: string): Promise<string[]> {
  try {
    const allCities: string[] = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      let query = supabase
        .from("places")
        .select("city")
        .not("city", "is", null);

      // Handle US/United States consolidation
      if (country) {
        if (country === "US" || country === "United States") {
          query = query.or('country.eq.US,country.eq.United States');
        } else {
          query = query.eq("country", country);
        }
      }
      if (region) {
        query = query.eq("region", region);
      }

      const { data, error } = await query.range(offset, offset + batchSize - 1);

      if (error) {
        console.error("[Supabase] Get distinct cities error:", error);
        break;
      }

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        data.forEach((d: any) => {
          if (d.city && !allCities.includes(d.city)) {
            allCities.push(d.city);
          }
        });
        offset += batchSize;
        if (data.length < batchSize) {
          hasMore = false;
        }
      }
    }

    const sortedCities = allCities.sort();
    console.log(`[Supabase] Found ${sortedCities.length} distinct cities${country ? ` for ${country}` : ''}${region ? ` / ${region}` : ''}`);
    return sortedCities;
  } catch (error) {
    console.error("[Supabase] Get distinct cities error:", error);
    return [];
  }
}

// Get distinct categories for dropdown
export async function getDistinctCategories(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("places")
      .select("tavvy_category")
      .not("tavvy_category", "is", null)
      .order("tavvy_category", { ascending: true })
      .limit(50000); // Increase limit to capture all records

    if (error) {
      console.error("[Supabase] Get distinct categories error:", error);
      return [];
    }

    const categories = Array.from(new Set((data || []).map((d: any) => d.tavvy_category).filter(Boolean))).sort();
    console.log(`[Supabase] Found ${categories.length} distinct categories`);
    return categories;
  } catch (error) {
    console.error("[Supabase] Get distinct categories error:", error);
    return [];
  }
}

// Search fsq_places_raw with required country filter for efficient querying
export interface FsqPlaceSearchFilters {
  country?: string; // Optional - can search globally without country
  region?: string;
  city?: string;
  name?: string;
}

export async function searchFsqPlaces(
  filters: FsqPlaceSearchFilters,
  limit: number = 50,
  offset: number = 0
): Promise<{ places: Place[]; total: number }> {
  try {
    // Name is required for searching
    if (!filters.name || filters.name.trim().length < 2) {
      console.log("[Supabase] searchFsqPlaces requires at least 2 characters in name");
      return { places: [], total: 0 };
    }

    // Use the same approach as mobile app - simple ILIKE search with limit
    // This works because PostgreSQL can efficiently scan and return first N matches
    let query = supabase
      .from("fsq_places_raw")
      .select("fsq_place_id, name, latitude, longitude, address, locality, region, country, postcode, tel, website, fsq_category_labels")
      .ilike("name", `%${filters.name}%`)
      .is("date_closed", null);

    // Apply optional location filters to narrow down results
    if (filters.country) {
      query = query.eq("country", filters.country);
    }
    if (filters.region) {
      query = query.eq("region", filters.region);
    }
    if (filters.city) {
      query = query.ilike("locality", `%${filters.city}%`);
    }

    const { data, error } = await query
      .order("name", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[Supabase] searchFsqPlaces error:", error);
      return { places: [], total: 0 };
    }

    // Map fsq_places_raw to Place interface
    const places: Place[] = (data || []).map((p: any) => ({
      id: p.fsq_place_id || p.id,
      name: p.name,
      address: p.address,
      city: p.locality,
      state: p.region,
      country: p.country,
      postal_code: p.postcode,
      lat: p.latitude,
      lng: p.longitude,
      phone: p.tel,
      website: p.website,
      category: p.fsq_category_labels,
      source: 'fsq',
    }));

    console.log(`[Supabase] searchFsqPlaces found ${places.length} places for name: ${filters.name}${filters.country ? ` in ${filters.country}` : ''}`);
    // Return -1 for total to indicate we don't know the exact count (too slow to compute on 104M+ rows)
    return { places, total: places.length > 0 ? -1 : 0 };
  } catch (error) {
    console.error("[Supabase] searchFsqPlaces error:", error);
    return { places: [], total: 0 };
  }
}

// Get distinct regions from fsq_places_raw for a specific country
export async function getFsqRegions(country: string): Promise<string[]> {
  try {
    if (!country) return [];
    
    // Use a sample-based approach for large tables
    const { data, error } = await supabase
      .from("fsq_places_raw")
      .select("region")
      .eq("country", country)
      .not("region", "is", null)
      .limit(10000); // Get a sample

    if (error) {
      console.error("[Supabase] getFsqRegions error:", error);
      return [];
    }

    // Extract unique regions
    const regions = Array.from(new Set((data || []).map((d: any) => d.region).filter(Boolean))).sort();
    console.log(`[Supabase] Found ${regions.length} regions for ${country}`);
    return regions as string[];
  } catch (error) {
    console.error("[Supabase] getFsqRegions error:", error);
    return [];
  }
}

// Get distinct cities from fsq_places_raw for a specific country/region
export async function getFsqCities(country: string, region?: string): Promise<string[]> {
  try {
    if (!country) return [];
    
    let query = supabase
      .from("fsq_places_raw")
      .select("locality")
      .eq("country", country)
      .not("locality", "is", null);

    if (region) {
      query = query.eq("region", region);
    }

    const { data, error } = await query.limit(10000); // Get a sample

    if (error) {
      console.error("[Supabase] getFsqCities error:", error);
      return [];
    }

    // Extract unique cities
    const cities = Array.from(new Set((data || []).map((d: any) => d.locality).filter(Boolean))).sort();
    console.log(`[Supabase] Found ${cities.length} cities for ${country}${region ? '/' + region : ''}`);
    return cities as string[];
  } catch (error) {
    console.error("[Supabase] getFsqCities error:", error);
    return [];
  }
}

export async function getPlaceById(id: string) {
  // Validate id format to prevent injection
  if (!id || typeof id !== 'string') {
    return null;
  }
  
  // Sanitize: only allow alphanumeric, hyphens, and underscores
  const sanitizedId = id.replace(/[^a-zA-Z0-9\-_]/g, '');
  if (sanitizedId !== id) {
    console.warn(`[Supabase] Suspicious place ID rejected: ${id}`);
    return null;
  }

  // Try fsq_places_raw first
  const { data, error } = await supabase
    .from("fsq_places_raw")
    .select("*")
    .or(`fsq_place_id.eq.${sanitizedId},fsq_id.eq.${sanitizedId}`)
    .maybeSingle();

  if (error) {
    console.error("[Supabase] Get place by ID error:", error);
    return null;
  }
  
  if (data) return data;

  // Fallback: try by id column directly
  const { data: fallbackData, error: fallbackError } = await supabase
    .from("fsq_places_raw")
    .select("*")
    .eq("id", sanitizedId)
    .maybeSingle();

  if (fallbackError) {
    console.error("[Supabase] Get place by ID fallback error:", fallbackError);
    return null;
  }

  return fallbackData;
}

export async function getPlacesCount(): Promise<number> {
  try {
    // Count from all 4 tables for admin portal
    let totalCount = 0;
    
    // Count places table
    const { count: placesCount, error: placesError } = await supabase
      .from("places")
      .select("*", { count: "exact", head: true });
    if (placesError) {
      console.error("[Supabase] Get places count error:", placesError);
    } else {
      totalCount += placesCount || 0;
    }
    
    // Count tavvy_places table
    const { count: tavvyCount, error: tavvyError } = await supabase
      .from("tavvy_places")
      .select("*", { count: "exact", head: true })
      .is("is_deleted", false);
    if (tavvyError) {
      console.error("[Supabase] Get tavvy_places count error:", tavvyError);
    } else {
      totalCount += tavvyCount || 0;
    }
    
    // Count fsq_places_raw table using estimated count (104M records - exact count would timeout)
    // Use PostgreSQL's reltuples for instant estimate
    let fsqCount = 0;
    try {
      const { data: fsqEstimate, error: fsqError } = await supabase.rpc('get_table_estimate', {
        table_name: 'fsq_places_raw'
      });
      if (fsqError) {
        console.error("[Supabase] Get fsq_places_raw estimate error:", fsqError);
        // Fallback to hardcoded estimate if function doesn't exist
        fsqCount = 104000000; // 104M estimate
      } else {
        fsqCount = fsqEstimate || 104000000;
      }
    } catch (fsqCatchError) {
      console.error("[Supabase] fsq_places_raw count caught error:", fsqCatchError);
      fsqCount = 104000000; // 104M fallback estimate
    }
    totalCount += fsqCount;
    
    // Count nrel_ev_stations table
    const { count: nrelCount, error: nrelError } = await supabase
      .from("nrel_ev_stations")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("status_code", "E"); // E = Available
    if (nrelError) {
      console.error("[Supabase] Get nrel_ev_stations count error:", nrelError);
    } else {
      totalCount += nrelCount || 0;
    }
    
    console.log(`[Supabase] Total places count: ${totalCount} (places: ${placesCount}, tavvy: ${tavvyCount}, fsq: ${fsqCount}, nrel: ${nrelCount})`);
    return totalCount;
  } catch (error) {
    console.error("[Supabase] Get places count error:", error);
    return 0;
  }
}


// ============ SIGNALS / REVIEW ITEMS ============
export interface ReviewItem {
  id: string;
  slug: string;
  label: string;
  icon_emoji: string | null;
  signal_type: "best_for" | "vibe" | "heads_up";
  color: string | null;
  is_universal: boolean;
  sort_order: number;
  is_active: boolean;
}

export async function getSignals() {
  const { data, error } = await supabase
    .from("review_items")
    .select("*")
    .order("label", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getAllReviewItems(): Promise<ReviewItem[]> {
  try {
    const { data, error } = await supabase
      .from("review_items")
      .select("*")
      .eq("is_active", true)
      .order("signal_type", { ascending: true })
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[Supabase] Get all review items error:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[Supabase] Get all review items error:", error);
    return [];
  }
}

export async function getReviewItemsByType(signalType: string): Promise<ReviewItem[]> {
  try {
    const { data, error } = await supabase
      .from("review_items")
      .select("*")
      .eq("signal_type", signalType)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[Supabase] Get review items by type error:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[Supabase] Get review items by type error:", error);
    return [];
  }
}

export async function createSignal(signal: any) {
  const { data, error } = await supabase
    .from("review_items")
    .insert(signal)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSignal(id: string, updates: any) {
  const { data, error } = await supabase
    .from("review_items")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSignal(id: string) {
  const { error } = await supabase
    .from("review_items")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return { success: true };
}

// ============ PLACE SIGNAL AGGREGATES ============
export interface PlaceSignalAggregate {
  place_id: string;
  signal_id: string;
  signal_slug: string;
  signal_type: string;
  bucket: string;
  tap_total: number;
  review_count: number;
  last_tap_at: Date | null;
}

export async function getPlaceSignalAggregates(placeId: string): Promise<PlaceSignalAggregate[]> {
  try {
    const { data, error } = await supabase
      .from("place_signal_aggregates")
      .select(`
        *,
        review_items (
          slug,
          signal_type
        )
      `)
      .eq("place_id", placeId)
      .order("tap_total", { ascending: false });

    if (error) {
      console.error("[Supabase] Get place signal aggregates error:", error);
      return [];
    }

    // Map to PlaceSignalAggregate interface
    return (data || []).map((agg: any) => ({
      place_id: agg.place_id,
      signal_id: agg.signal_id,
      signal_slug: agg.review_items?.slug || '',
      signal_type: agg.review_items?.signal_type || '',
      bucket: agg.bucket,
      tap_total: agg.tap_total,
      review_count: agg.review_count,
      last_tap_at: agg.last_tap_at,
    }));
  } catch (error) {
    console.error("[Supabase] Get place signal aggregates error:", error);
    return [];
  }
}

export async function upsertPlaceSignalAggregate(
  placeId: string,
  signalId: string,
  bucket: string,
  tapCount: number
): Promise<void> {
  try {
    // First try to get existing aggregate
    const { data: existing } = await supabase
      .from("place_signal_aggregates")
      .select("*")
      .eq("place_id", placeId)
      .eq("signal_id", signalId)
      .eq("bucket", bucket)
      .single();

    if (existing) {
      // Update existing
      await supabase
        .from("place_signal_aggregates")
        .update({
          tap_total: existing.tap_total + tapCount,
          review_count: existing.review_count + 1,
          last_tap_at: new Date().toISOString(),
        })
        .eq("place_id", placeId)
        .eq("signal_id", signalId)
        .eq("bucket", bucket);
    } else {
      // Insert new
      await supabase
        .from("place_signal_aggregates")
        .insert({
          place_id: placeId,
          signal_id: signalId,
          bucket: bucket,
          tap_total: tapCount,
          review_count: 1,
          last_tap_at: new Date().toISOString(),
        });
    }
  } catch (error) {
    console.error("[Supabase] Upsert place signal aggregate error:", error);
  }
}

// ============ BATCH IMPORT ============
export interface BatchReviewInput {
  place_id: string;
  signal_slug: string;
  tap_count: number;
  rep_id?: string;
}

export async function batchImportReviews(
  reviews: BatchReviewInput[],
  repUserId: string
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const review of reviews) {
    try {
      // Get signal info by slug
      const { data: signalData, error: signalError } = await supabase
        .from("review_items")
        .select("id, signal_type")
        .eq("slug", review.signal_slug)
        .single();

      if (signalError || !signalData) {
        errors.push(`Signal not found: ${review.signal_slug}`);
        failed++;
        continue;
      }

      const signalId = signalData.id;
      const signalType = signalData.signal_type;

      // Determine bucket based on signal type
      const bucket = signalType === "best_for" ? "positive" :
                     signalType === "heads_up" ? "negative" : "neutral";

      // Create review
      const { data: reviewData, error: reviewError } = await supabase
        .from("reviews")
        .insert({
          place_id: review.place_id,
          user_id: repUserId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (reviewError || !reviewData) {
        errors.push(`Failed to create review for place: ${review.place_id}`);
        failed++;
        continue;
      }

      // Add review signal
      const { error: signalInsertError } = await supabase
        .from("review_signals")
        .insert({
          review_id: reviewData.id,
          signal_id: signalId,
          intensity: review.tap_count,
          created_at: new Date().toISOString(),
        });

      if (signalInsertError) {
        errors.push(`Failed to add signal for review: ${reviewData.id}`);
        failed++;
        continue;
      }

      // Update aggregates
      await upsertPlaceSignalAggregate(review.place_id, signalId, bucket, review.tap_count);

      success++;
    } catch (error) {
      errors.push(`Error processing review for place ${review.place_id}: ${error}`);
      failed++;
    }
  }

  return { success, failed, errors };
}

// ============ REP STATS ============
export interface RepStats {
  total_reviews: number;
  reviews_today: number;
  reviews_this_week: number;
  places_reviewed: number;
}

export async function getRepStats(userId: string): Promise<RepStats> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    // Get total reviews
    const { count: totalCount } = await supabase
      .from("reviews")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    // Get reviews today
    const { count: todayCount } = await supabase
      .from("reviews")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", today.toISOString());

    // Get reviews this week
    const { count: weekCount } = await supabase
      .from("reviews")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", weekAgo.toISOString());

    // Get distinct places reviewed
    const { data: placesData } = await supabase
      .from("reviews")
      .select("place_id")
      .eq("user_id", userId);

    const uniquePlaces = new Set(placesData?.map(r => r.place_id) || []);

    return {
      total_reviews: totalCount || 0,
      reviews_today: todayCount || 0,
      reviews_this_week: weekCount || 0,
      places_reviewed: uniquePlaces.size,
    };
  } catch (error) {
    console.error("[Supabase] Get rep stats error:", error);
    return { total_reviews: 0, reviews_today: 0, reviews_this_week: 0, places_reviewed: 0 };
  }
}

// ============ ARTICLES ============
// Matches your existing atlas_articles table structure
export async function getArticles() {
  const { data, error } = await supabase
    .from("atlas_articles")
    .select(`
      *,
      category:atlas_categories(id, name, slug),
      universe:atlas_universes(id, name, slug)
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  
  // Flatten the response for easier use
  return data?.map(article => ({
    ...article,
    category_name: article.category?.name || null,
    universe_name: article.universe?.name || null,
  }));
}

// Alias for router compatibility
export const getAllArticles = getArticles;

export async function getArticleById(id: string) {
  const { data, error } = await supabase
    .from("atlas_articles")
    .select(`
      *,
      category:atlas_categories(id, name, slug),
      universe:atlas_universes(id, name, slug)
    `)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createArticle(article: {
  title: string;
  slug: string;
  excerpt?: string | null;
  content?: string | null;
  cover_image_url?: string | null;
  author_name?: string | null;
  author_avatar_url?: string | null;
  category_id?: string | null;
  universe_id?: string | null;
  read_time_minutes?: number | null;
  is_featured?: boolean;
  status?: string;
  published_at?: string | null;
}) {
  const { data, error } = await supabase
    .from("atlas_articles")
    .insert({
      ...article,
      category_id: article.category_id || null,
      universe_id: article.universe_id || null,
      published_at: article.status === "published" ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) throw error;
  return data?.id || null;
}

export async function updateArticle(id: string, updates: any): Promise<boolean> {
  // If status is changing to published, set published_at
  if (updates.status === "published") {
    const { data: existing } = await supabase
      .from("atlas_articles")
      .select("published_at")
      .eq("id", id)
      .single();
    
    if (!existing?.published_at) {
      updates.published_at = new Date().toISOString();
    }
  }

  const { error } = await supabase
    .from("atlas_articles")
    .update({
      ...updates,
      category_id: updates.category_id || null,
      universe_id: updates.universe_id || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[Supabase] Update article error:", error);
    return false;
  }
  return true;
}

export async function deleteArticle(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("atlas_articles")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[Supabase] Delete article error:", error);
    return false;
  }
  return true;
}

export interface BulkArticleInput {
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  author_name?: string;
  category_id?: string | null;
  content_blocks?: any[];
  section_images?: any[];
  cover_image_url?: string;
  read_time_minutes?: number;
  article_template_type?: string;
  is_featured?: boolean;
  status?: string;
}

export async function bulkImportArticles(
  articles: BulkArticleInput[],
  updateExisting: boolean = false
): Promise<{ inserted: number; updated: number; skipped: number; errors: string[] }> {
  const result = { inserted: 0, updated: 0, skipped: 0, errors: [] as string[] };

  for (const article of articles) {
    try {
      // Check if article exists by slug
      const { data: existing } = await supabase
        .from("atlas_articles")
        .select("id")
        .eq("slug", article.slug)
        .single();

      if (existing) {
        if (updateExisting) {
          // Update existing article
          const { error } = await supabase
            .from("atlas_articles")
            .update({
              title: article.title,
              excerpt: article.excerpt || null,
              content: article.content || article.excerpt || '',
              author_name: article.author_name || "Tavvy Atlas Team",
              category_id: article.category_id || null,
              content_blocks: article.content_blocks || [],
              section_images: article.section_images || [],
              cover_image_url: article.cover_image_url || null,
              read_time_minutes: article.read_time_minutes || 5,
              article_template_type: article.article_template_type || "city_guide",
              is_featured: article.is_featured || false,
              status: article.status || "published",
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);

          if (error) {
            result.errors.push(`Failed to update ${article.slug}: ${error.message}`);
          } else {
            result.updated++;
          }
        } else {
          result.skipped++;
        }
      } else {
        // Insert new article
        const { error } = await supabase
          .from("atlas_articles")
          .insert({
            title: article.title,
            slug: article.slug,
            excerpt: article.excerpt || null,
            content: article.content || article.excerpt || '',
            author_name: article.author_name || "Tavvy Atlas Team",
            category_id: article.category_id || null,
            content_blocks: article.content_blocks || [],
            section_images: article.section_images || [],
            cover_image_url: article.cover_image_url || null,
            read_time_minutes: article.read_time_minutes || 5,
            article_template_type: article.article_template_type || "city_guide",
            is_featured: article.is_featured || false,
            status: article.status || "published",
            published_at: article.status === "published" ? new Date().toISOString() : null,
          });

        if (error) {
          result.errors.push(`Failed to insert ${article.slug}: ${error.message}`);
        } else {
          result.inserted++;
        }
      }
    } catch (err: any) {
      result.errors.push(`Error processing ${article.slug}: ${err.message}`);
    }
  }

  console.log(`[Supabase] Bulk import complete: ${result.inserted} inserted, ${result.updated} updated, ${result.skipped} skipped`);
  return result;
}

// ============ CATEGORIES (for articles) ============
// Matches your existing atlas_categories table structure
export async function getCategories() {
  const { data, error } = await supabase
    .from("atlas_categories")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) throw error;
  return data;
}

// Alias for router compatibility
export const getArticleCategories = getCategories;

export async function createCategory(category: {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  display_order?: number;
}) {
  const { data, error } = await supabase
    .from("atlas_categories")
    .insert(category)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCategory(id: string, updates: any) {
  const { data, error } = await supabase
    .from("atlas_categories")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCategory(id: string) {
  const { error } = await supabase
    .from("atlas_categories")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return { success: true };
}

// ============ UNIVERSES ============
// Matches your existing atlas_universes table structure
export async function getUniverses() {
  const { data, error } = await supabase
    .from("atlas_universes")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data;
}

// Alias for router compatibility
export const getAllUniverses = getUniverses;

export async function getUniverseById(id: string) {
  const { data, error } = await supabase
    .from("atlas_universes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createUniverse(universe: {
  name: string;
  slug: string;
  description?: string | null;
  thumbnail_image_url?: string | null;
  banner_image_url?: string | null;
  location?: string | null;
  is_featured?: boolean;
  status?: string;
}) {
  const { data, error } = await supabase
    .from("atlas_universes")
    .insert({
      ...universe,
    })
    .select()
    .single();

  if (error) throw error;
  return data?.id || null;
}

export async function updateUniverse(id: string, updates: any): Promise<boolean> {
  const { error } = await supabase
    .from("atlas_universes")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[Supabase] Update universe error:", error);
    return false;
  }
  return true;
}

export async function deleteUniverse(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("atlas_universes")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[Supabase] Delete universe error:", error);
    return false;
  }
  return true;
}

// ============ CITIES ============
// Uses the new tavvy_cities table with all rich content fields
export async function getCities() {
  const { data, error } = await supabase
    .from("tavvy_cities")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data;
}

// Alias for router compatibility
export const getAllCities = getCities;

export async function getCityById(id: string) {
  const { data, error } = await supabase
    .from("tavvy_cities")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createCity(city: {
  name: string;
  slug: string;
  state?: string | null;
  country?: string;
  region?: string;
  population?: number | null;
  timezone?: string;
  airport_code?: string;
  latitude?: number | null;
  longitude?: number | null;
  cover_image_url?: string | null;
  thumbnail_image_url?: string;
  description?: string | null;
  history?: string;
  culture?: string;
  famous_people?: string;
  local_economy?: string;
  major_companies?: string;
  political_leaning?: string;
  then_now_next?: string;
  weather_summary?: string;
  best_time_to_visit?: string;
  cost_of_living_index?: number;
  walkability_score?: number;
  sales_tax_rate?: number;
  avg_gas_price?: number;
  is_featured?: boolean;
  is_active?: boolean;
}) {
  const { data, error } = await supabase
    .from("tavvy_cities")
    .insert(city)
    .select()
    .single();

  if (error) throw error;
  return data?.id || null;
}

export async function updateCity(id: string, updates: any): Promise<boolean> {
  const { error } = await supabase
    .from("tavvy_cities")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[Supabase] Update city error:", error);
    return false;
  }
  return true;
}

export async function deleteCity(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("tavvy_cities")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[Supabase] Delete city error:", error);
    return false;
  }
  return true;
}

// ============ DASHBOARD STATS ============
export async function getDashboardStats() {
  const [places, signals, articles, universes, cities] = await Promise.all([
    supabase.from("fsq_places_raw").select("*", { count: "exact", head: true }),
    supabase.from("review_items").select("*", { count: "exact", head: true }),
    supabase.from("atlas_articles").select("*", { count: "exact", head: true }),
    supabase.from("atlas_universes").select("*", { count: "exact", head: true }),
    supabase.from("tavvy_cities").select("*", { count: "exact", head: true }),
  ]);

  return {
    placesCount: places.count || 0,
    signalsCount: signals.count || 0,
    articlesCount: articles.count || 0,
    universesCount: universes.count || 0,
    citiesCount: cities.count || 0,
  };
}


// ============ BUSINESS CLAIMS ============
export interface BusinessClaim {
  id: string;
  user_id: string;
  provider_id: string | null;
  place_id: string | null;
  business_name: string;
  business_phone: string | null;
  business_email: string | null;
  business_address: string | null;
  verification_code: string | null;
  verification_code_expires_at: string | null;
  verification_attempts: number;
  status: 'pending' | 'verified' | 'rejected' | 'expired';
  created_at: string;
  verified_at: string | null;
}

export async function getBusinessClaims(status?: string): Promise<BusinessClaim[]> {
  try {
    let query = supabase
      .from("pro_business_claims")
      .select("*")
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Supabase] Get business claims error:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[Supabase] Get business claims error:", error);
    return [];
  }
}

export async function getBusinessClaimById(id: string): Promise<BusinessClaim | null> {
  try {
    const { data, error } = await supabase
      .from("pro_business_claims")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("[Supabase] Get business claim by ID error:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("[Supabase] Get business claim by ID error:", error);
    return null;
  }
}

export async function updateBusinessClaimStatus(
  id: string,
  status: 'verified' | 'rejected',
  adminId: string
): Promise<boolean> {
  try {
    const updates: any = {
      status,
    };

    if (status === 'verified') {
      updates.verified_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("pro_business_claims")
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error("[Supabase] Update business claim status error:", error);
      return false;
    }

    // Log admin action
    await logAdminActivity(adminId, `claim_${status}`, id, 'business_claim');

    return true;
  } catch (error) {
    console.error("[Supabase] Update business claim status error:", error);
    return false;
  }
}

// ============ CONTENT FLAGS / MODERATION ============
export interface ContentFlag {
  id: string;
  content_type: string;
  content_id: string;
  flagged_by: string | null;
  reason: string;
  note: string | null;
  created_at: string;
  status: 'pending' | 'reviewed' | 'dismissed' | 'actioned';
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface ModerationQueueItem {
  id: string;
  item_type: string;
  item_id: string;
  submitted_by: string | null;
  content: any;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export async function getContentFlags(status?: string): Promise<ContentFlag[]> {
  try {
    let query = supabase
      .from("content_flags")
      .select("*")
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Supabase] Get content flags error:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[Supabase] Get content flags error:", error);
    return [];
  }
}

export async function getModerationQueue(status?: string): Promise<ModerationQueueItem[]> {
  try {
    let query = supabase
      .from("moderation_queue")
      .select("*")
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Supabase] Get moderation queue error:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[Supabase] Get moderation queue error:", error);
    return [];
  }
}

export async function reviewContentFlag(
  id: string,
  status: 'reviewed' | 'dismissed' | 'actioned',
  adminId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("content_flags")
      .update({
        status,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("[Supabase] Review content flag error:", error);
      return false;
    }

    // Log admin action
    await logAdminActivity(adminId, `flag_${status}`, id, 'content_flag');

    return true;
  } catch (error) {
    console.error("[Supabase] Review content flag error:", error);
    return false;
  }
}

export async function reviewModerationItem(
  id: string,
  status: 'approved' | 'rejected',
  adminId: string,
  rejectionReason?: string
): Promise<boolean> {
  try {
    const updates: any = {
      status,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    };

    if (status === 'rejected' && rejectionReason) {
      updates.rejection_reason = rejectionReason;
    }

    const { error } = await supabase
      .from("moderation_queue")
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error("[Supabase] Review moderation item error:", error);
      return false;
    }

    // Log admin action
    await logAdminActivity(adminId, `moderation_${status}`, id, 'moderation_item');

    return true;
  } catch (error) {
    console.error("[Supabase] Review moderation item error:", error);
    return false;
  }
}

// ============ ADMIN ACTIVITY LOG (AUDIT) ============
export interface AdminActivityLog {
  id: string;
  admin_id: string;
  action_type: string;
  target_id: string | null;
  target_type: string | null;
  notes: string | null;
  created_at: string;
}

export async function getAdminActivityLog(
  limit: number = 100,
  adminId?: string
): Promise<AdminActivityLog[]> {
  try {
    let query = supabase
      .from("admin_activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (adminId) {
      query = query.eq("admin_id", adminId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Supabase] Get admin activity log error:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[Supabase] Get admin activity log error:", error);
    return [];
  }
}

export async function logAdminActivity(
  adminId: string,
  actionType: string,
  targetId?: string,
  targetType?: string,
  notes?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("admin_activity_log")
      .insert({
        admin_id: adminId,
        action_type: actionType,
        target_id: targetId || null,
        target_type: targetType || null,
        notes: notes || null,
      });

    if (error) {
      console.error("[Supabase] Log admin activity error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Supabase] Log admin activity error:", error);
    return false;
  }
}

// ============ PLACE OVERRIDES ============
export interface PlaceOverride {
  id: string;
  place_id: string;
  field_name: string;
  override_value: string;
  override_by: string;
  override_reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function getPlaceOverrides(status?: string): Promise<PlaceOverride[]> {
  try {
    let query = supabase
      .from("place_overrides")
      .select("*")
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Supabase] Get place overrides error:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[Supabase] Get place overrides error:", error);
    return [];
  }
}

export async function createPlaceOverride(
  placeId: string,
  fieldName: string,
  overrideValue: string,
  overrideBy: string,
  overrideReason?: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("place_overrides")
      .insert({
        place_id: placeId,
        field_name: fieldName,
        override_value: overrideValue,
        override_by: overrideBy,
        override_reason: overrideReason || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error("[Supabase] Create place override error:", error);
      return null;
    }

    // Log admin action
    await logAdminActivity(overrideBy, 'override_created', data.id, 'place_override', `Field: ${fieldName}`);

    return data.id;
  } catch (error) {
    console.error("[Supabase] Create place override error:", error);
    return null;
  }
}

export async function reviewPlaceOverride(
  id: string,
  status: 'approved' | 'rejected',
  reviewedBy: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("place_overrides")
      .update({
        status,
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("[Supabase] Review place override error:", error);
      return false;
    }

    // Log admin action
    await logAdminActivity(reviewedBy, `override_${status}`, id, 'place_override');

    return true;
  } catch (error) {
    console.error("[Supabase] Review place override error:", error);
    return false;
  }
}

// ============ MODERATION STATS ============
export async function getModerationStats(): Promise<{
  pendingClaims: number;
  pendingFlags: number;
  pendingModeration: number;
  pendingOverrides: number;
}> {
  try {
    const [claims, flags, moderation, overrides] = await Promise.all([
      supabase.from("pro_business_claims").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("content_flags").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("moderation_queue").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("place_overrides").select("*", { count: "exact", head: true }).eq("status", "pending"),
    ]);

    return {
      pendingClaims: claims.count || 0,
      pendingFlags: flags.count || 0,
      pendingModeration: moderation.count || 0,
      pendingOverrides: overrides.count || 0,
    };
  } catch (error) {
    console.error("[Supabase] Get moderation stats error:", error);
    return {
      pendingClaims: 0,
      pendingFlags: 0,
      pendingModeration: 0,
      pendingOverrides: 0,
    };
  }
}


// ============ USER MANAGEMENT ============
export interface User {
  id: string;
  email: string | null;
  phone_e164: string | null;
  is_phone_verified: boolean;
  is_email_verified: boolean;
  created_at: string;
  last_login_at: string | null;
  // From profiles
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  is_pro?: boolean;
  trusted_contributor?: boolean;
  subscription_status?: string | null;
  subscription_plan?: string | null;
}

export interface UpdateUserData {
  display_name?: string;
  username?: string;
  bio?: string;
  is_pro?: boolean;
  trusted_contributor?: boolean;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: string;
  granted_by: string | null;
  granted_at: string;
  expires_at: string | null;
}

export interface UserStrike {
  id: string;
  user_id: string;
  reason: string;
  story_id: string | null;
  issued_by: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface UserGamification {
  id: string;
  user_id: string;
  total_points: number;
  total_taps: number;
  current_streak: number;
  longest_streak: number;
  last_tap_date: string | null;
  badges: string[];
  impact_count: number;
  created_at: string;
  updated_at: string;
}

export interface BlockedUser {
  user_id: string;
  blocked_user_id: string;
  created_at: string;
}

// Updated getUsers function - query profiles table directly
export async function getUsers(
  limit: number = 50,
  offset: number = 0,
  search?: string
): Promise<{ users: User[]; total: number }> {
  try {
    // Query profiles table directly since it has all user info we need
    // and is linked to auth.users via user_id
    let query = supabase
      .from("profiles")
      .select(`
        user_id,
        display_name,
        username,
        avatar_url,
        bio,
        is_pro,
        trusted_contributor,
        subscription_status,
        subscription_plan,
        created_at,
        updated_at
      `, { count: "exact" });

    if (search) {
      query = query.or(`display_name.ilike.%${search}%,username.ilike.%${search}%`);
    }

    const { data, error, count } = await query
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Supabase] Get users error:", error);
      return { users: [], total: 0 };
    }

    const users: User[] = (data || []).map((u: any) => ({
      id: u.user_id,
      email: null,
      phone_e164: null,
      is_phone_verified: false,
      is_email_verified: false,
      created_at: u.created_at,
      last_login_at: u.updated_at,
      display_name: u.display_name,
      avatar_url: u.avatar_url,
      bio: u.bio,
      username: u.username,
      is_pro: u.is_pro,
      trusted_contributor: u.trusted_contributor,
      subscription_status: u.subscription_status,
      subscription_plan: u.subscription_plan,
    }));

    return { users, total: count || 0 };
  } catch (error) {
    console.error("[Supabase] Get users error:", error);
    return { users: [], total: 0 };
  }
}

// Updated getUserStats function - query profiles table
export async function getUserStats(): Promise<{
  totalUsers: number;
  verifiedUsers: number;
  activeToday: number;
  newThisWeek: number;
}> {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [totalResult, prosResult, activeTodayResult, newThisWeekResult] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_pro", true),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("updated_at", todayStart),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
    ]);

    return {
      totalUsers: totalResult.count || 0,
      verifiedUsers: prosResult.count || 0, // Using is_pro as "verified" proxy
      activeToday: activeTodayResult.count || 0,
      newThisWeek: newThisWeekResult.count || 0,
    };
  } catch (error) {
    console.error("[Supabase] Get user stats error:", error);
    return { totalUsers: 0, verifiedUsers: 0, activeToday: 0, newThisWeek: 0 };
  }
}

// Updated getUserById function - query profiles table
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(`
        user_id,
        display_name,
        username,
        avatar_url,
        bio,
        is_pro,
        trusted_contributor,
        subscription_status,
        subscription_plan,
        created_at,
        updated_at
      `)
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("[Supabase] Get user by ID error:", error);
      return null;
    }

    return {
      id: data.user_id,
      email: null,
      phone_e164: null,
      is_phone_verified: false,
      is_email_verified: false,
      created_at: data.created_at,
      last_login_at: data.updated_at,
      display_name: data.display_name,
      avatar_url: data.avatar_url,
      bio: data.bio,
      username: data.username,
      is_pro: data.is_pro,
      trusted_contributor: data.trusted_contributor,
      subscription_status: data.subscription_status,
      subscription_plan: data.subscription_plan,
    };
  } catch (error) {
    console.error("[Supabase] Get user by ID error:", error);
    return null;
  }
}

// Update user profile data
export async function updateUser(
  userId: string,
  data: UpdateUserData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: data.display_name,
        username: data.username,
        bio: data.bio,
        is_pro: data.is_pro,
        trusted_contributor: data.trusted_contributor,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      console.error("[Supabase] Update user error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("[Supabase] Update user error:", error);
    return { success: false, error: "Failed to update user" };
  }
}

// Update user email (requires admin auth)
export async function updateUserEmail(
  userId: string,
  newEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Use Supabase Admin API to update auth.users email
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      email: newEmail,
      email_confirm: true, // Auto-confirm the new email
    });

    if (error) {
      console.error("[Supabase] Update user email error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("[Supabase] Update user email error:", error);
    return { success: false, error: "Failed to update email" };
  }
}

// Delete user (soft delete by deactivating)
export async function deleteUser(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Soft delete by setting a flag or you can use hard delete
    // For now, we'll use Supabase Admin to delete the user
    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) {
      console.error("[Supabase] Delete user error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("[Supabase] Delete user error:", error);
    return { success: false, error: "Failed to delete user" };
  }
}

export async function getUserRoles(userId: string): Promise<UserRole[]> {
  try {
    const { data, error } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", userId)
      .order("granted_at", { ascending: false });

    if (error) {
      console.error("[Supabase] Get user roles error:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[Supabase] Get user roles error:", error);
    return [];
  }
}

export async function addUserRole(
  userId: string,
  role: string,
  grantedBy: string,
  expiresAt?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("user_roles")
      .insert({
        user_id: userId,
        role,
        granted_by: grantedBy,
        granted_at: new Date().toISOString(),
        expires_at: expiresAt || null,
      });

    if (error) {
      console.error("[Supabase] Add user role error:", error);
      return false;
    }

    await logAdminActivity(grantedBy, "role_granted", userId, "user", `Role: ${role}`);
    return true;
  } catch (error) {
    console.error("[Supabase] Add user role error:", error);
    return false;
  }
}

export async function removeUserRole(
  userId: string,
  role: string,
  adminId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", role);

    if (error) {
      console.error("[Supabase] Remove user role error:", error);
      return false;
    }

    await logAdminActivity(adminId, "role_removed", userId, "user", `Role: ${role}`);
    return true;
  } catch (error) {
    console.error("[Supabase] Remove user role error:", error);
    return false;
  }
}

export async function getUserStrikes(userId: string): Promise<UserStrike[]> {
  try {
    const { data, error } = await supabase
      .from("user_strikes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Supabase] Get user strikes error:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[Supabase] Get user strikes error:", error);
    return [];
  }
}

export async function addUserStrike(
  userId: string,
  reason: string,
  issuedBy: string,
  storyId?: string,
  expiresAt?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("user_strikes")
      .insert({
        user_id: userId,
        reason,
        issued_by: issuedBy,
        story_id: storyId || null,
        created_at: new Date().toISOString(),
        expires_at: expiresAt || null,
      });

    if (error) {
      console.error("[Supabase] Add user strike error:", error);
      return false;
    }

    await logAdminActivity(issuedBy, "strike_issued", userId, "user", `Reason: ${reason}`);
    return true;
  } catch (error) {
    console.error("[Supabase] Add user strike error:", error);
    return false;
  }
}

export async function removeUserStrike(
  strikeId: string,
  adminId: string
): Promise<boolean> {
  try {
    // Get strike info first for logging
    const { data: strike } = await supabase
      .from("user_strikes")
      .select("user_id")
      .eq("id", strikeId)
      .single();

    const { error } = await supabase
      .from("user_strikes")
      .delete()
      .eq("id", strikeId);

    if (error) {
      console.error("[Supabase] Remove user strike error:", error);
      return false;
    }

    if (strike) {
      await logAdminActivity(adminId, "strike_removed", strike.user_id, "user");
    }
    return true;
  } catch (error) {
    console.error("[Supabase] Remove user strike error:", error);
    return false;
  }
}

export async function getUserGamification(userId: string): Promise<UserGamification | null> {
  try {
    const { data, error } = await supabase
      .from("user_gamification")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error("[Supabase] Get user gamification error:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("[Supabase] Get user gamification error:", error);
    return null;
  }
}

export async function blockUser(
  userId: string,
  adminId: string
): Promise<boolean> {
  try {
    // Add to blocked_users table (system-level block)
    const { error } = await supabase
      .from("blocked_users")
      .insert({
        user_id: adminId, // The admin blocking
        blocked_user_id: userId, // The user being blocked
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error("[Supabase] Block user error:", error);
      return false;
    }

    await logAdminActivity(adminId, "user_blocked", userId, "user");
    return true;
  } catch (error) {
    console.error("[Supabase] Block user error:", error);
    return false;
  }
}

export async function unblockUser(
  userId: string,
  adminId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("blocked_users")
      .delete()
      .eq("blocked_user_id", userId);

    if (error) {
      console.error("[Supabase] Unblock user error:", error);
      return false;
    }

    await logAdminActivity(adminId, "user_unblocked", userId, "user");
    return true;
  } catch (error) {
    console.error("[Supabase] Unblock user error:", error);
    return false;
  }
}

export async function isUserBlocked(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("blocked_users")
      .select("blocked_user_id")
      .eq("blocked_user_id", userId)
      .limit(1);

    if (error) {
      console.error("[Supabase] Check blocked user error:", error);
      return false;
    }

    return (data?.length || 0) > 0;
  } catch (error) {
    console.error("[Supabase] Check blocked user error:", error);
    return false;
  }
}

// ============ PRO PROVIDERS MANAGEMENT ============
export interface ProProvider {
  id: string;
  user_id: string;
  business_name: string | null;
  slug: string | null;
  description: string | null;
  short_description: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  latitude: number | null;
  longitude: number | null;
  service_radius: number | null;
  years_in_business: number | null;
  license_number: string | null;
  is_insured: boolean;
  is_licensed: boolean;
  is_verified: boolean;
  is_active: boolean;
  is_featured: boolean;
  average_rating: number | null;
  total_reviews: number | null;
  response_time: string | null;
  created_at: string;
  updated_at: string;
  verified_at: string | null;
  provider_type: string | null;
  first_name: string | null;
  last_name: string | null;
  bio: string | null;
  profile_photo_url: string | null;
  brokerage_name: string | null;
  mls_id: string | null;
  trade_category: string | null;
  specialties: string[] | null;
  years_experience: number | null;
  subscription_plan: string | null;
  subscription_status: string | null;
  subscription_started_at: string | null;
  subscription_expires_at: string | null;
  total_leads: number | null;
  active_leads: number | null;
  response_rate: number | null;
  review_count: number | null;
  service_areas: string[] | null;
}

export interface ProReview {
  id: string;
  pro_id: string;
  user_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  updated_at: string | null;
  is_verified: boolean;
}

export async function getProProviders(
  limit: number = 50,
  offset: number = 0,
  search?: string,
  providerType?: string,
  isVerified?: boolean,
  isActive?: boolean
): Promise<{ providers: ProProvider[]; total: number }> {
  try {
    let query = supabase
      .from("pro_providers")
      .select("*", { count: "exact" });

    if (search) {
      query = query.or(`business_name.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (providerType) {
      query = query.eq("provider_type", providerType);
    }

    if (isVerified !== undefined) {
      query = query.eq("is_verified", isVerified);
    }

    if (isActive !== undefined) {
      query = query.eq("is_active", isActive);
    }

    const { data, error, count } = await query
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Supabase] Get pro providers error:", error);
      return { providers: [], total: 0 };
    }

    return { providers: data || [], total: count || 0 };
  } catch (error) {
    console.error("[Supabase] Get pro providers error:", error);
    return { providers: [], total: 0 };
  }
}

export async function getProProviderById(proId: string): Promise<ProProvider | null> {
  try {
    const { data, error } = await supabase
      .from("pro_providers")
      .select("*")
      .eq("id", proId)
      .single();

    if (error) {
      console.error("[Supabase] Get pro provider by ID error:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("[Supabase] Get pro provider by ID error:", error);
    return null;
  }
}

export async function updateProProvider(
  proId: string,
  updates: Partial<ProProvider>,
  adminId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("pro_providers")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proId);

    if (error) {
      console.error("[Supabase] Update pro provider error:", error);
      return false;
    }

    await logAdminActivity(adminId, "pro_updated", proId, "pro_provider", JSON.stringify(updates));
    return true;
  } catch (error) {
    console.error("[Supabase] Update pro provider error:", error);
    return false;
  }
}

export async function verifyProProvider(
  proId: string,
  adminId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("pro_providers")
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", proId);

    if (error) {
      console.error("[Supabase] Verify pro provider error:", error);
      return false;
    }

    await logAdminActivity(adminId, "pro_verified", proId, "pro_provider");
    return true;
  } catch (error) {
    console.error("[Supabase] Verify pro provider error:", error);
    return false;
  }
}

export async function unverifyProProvider(
  proId: string,
  adminId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("pro_providers")
      .update({
        is_verified: false,
        verified_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proId);

    if (error) {
      console.error("[Supabase] Unverify pro provider error:", error);
      return false;
    }

    await logAdminActivity(adminId, "pro_unverified", proId, "pro_provider");
    return true;
  } catch (error) {
    console.error("[Supabase] Unverify pro provider error:", error);
    return false;
  }
}

export async function activateProProvider(
  proId: string,
  adminId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("pro_providers")
      .update({
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proId);

    if (error) {
      console.error("[Supabase] Activate pro provider error:", error);
      return false;
    }

    await logAdminActivity(adminId, "pro_activated", proId, "pro_provider");
    return true;
  } catch (error) {
    console.error("[Supabase] Activate pro provider error:", error);
    return false;
  }
}

export async function deactivateProProvider(
  proId: string,
  adminId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("pro_providers")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proId);

    if (error) {
      console.error("[Supabase] Deactivate pro provider error:", error);
      return false;
    }

    await logAdminActivity(adminId, "pro_deactivated", proId, "pro_provider");
    return true;
  } catch (error) {
    console.error("[Supabase] Deactivate pro provider error:", error);
    return false;
  }
}

export async function featureProProvider(
  proId: string,
  adminId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("pro_providers")
      .update({
        is_featured: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proId);

    if (error) {
      console.error("[Supabase] Feature pro provider error:", error);
      return false;
    }

    await logAdminActivity(adminId, "pro_featured", proId, "pro_provider");
    return true;
  } catch (error) {
    console.error("[Supabase] Feature pro provider error:", error);
    return false;
  }
}

export async function unfeatureProProvider(
  proId: string,
  adminId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("pro_providers")
      .update({
        is_featured: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proId);

    if (error) {
      console.error("[Supabase] Unfeature pro provider error:", error);
      return false;
    }

    await logAdminActivity(adminId, "pro_unfeatured", proId, "pro_provider");
    return true;
  } catch (error) {
    console.error("[Supabase] Unfeature pro provider error:", error);
    return false;
  }
}

export async function getProReviews(proId: string): Promise<ProReview[]> {
  try {
    const { data, error } = await supabase
      .from("pro_reviews")
      .select("*")
      .eq("pro_id", proId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Supabase] Get pro reviews error:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[Supabase] Get pro reviews error:", error);
    return [];
  }
}

export async function getProStats(): Promise<{
  totalPros: number;
  verifiedPros: number;
  activePros: number;
  featuredPros: number;
  realtors: number;
  contractors: number;
}> {
  try {
    const [totalResult, verifiedResult, activeResult, featuredResult, realtorResult, contractorResult] = await Promise.all([
      supabase.from("pro_providers").select("*", { count: "exact", head: true }),
      supabase.from("pro_providers").select("*", { count: "exact", head: true }).eq("is_verified", true),
      supabase.from("pro_providers").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("pro_providers").select("*", { count: "exact", head: true }).eq("is_featured", true),
      supabase.from("pro_providers").select("*", { count: "exact", head: true }).eq("provider_type", "realtor"),
      supabase.from("pro_providers").select("*", { count: "exact", head: true }).eq("provider_type", "contractor"),
    ]);

    return {
      totalPros: totalResult.count || 0,
      verifiedPros: verifiedResult.count || 0,
      activePros: activeResult.count || 0,
      featuredPros: featuredResult.count || 0,
      realtors: realtorResult.count || 0,
      contractors: contractorResult.count || 0,
    };
  } catch (error) {
    console.error("[Supabase] Get pro stats error:", error);
    return { totalPros: 0, verifiedPros: 0, activePros: 0, featuredPros: 0, realtors: 0, contractors: 0 };
  }
}

export async function getDistinctProviderTypes(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("pro_providers")
      .select("provider_type")
      .not("provider_type", "is", null);

    if (error) {
      console.error("[Supabase] Get provider types error:", error);
      return [];
    }

    const types = [...new Set((data || []).map((d: any) => d.provider_type).filter(Boolean))];
    return types;
  } catch (error) {
    console.error("[Supabase] Get provider types error:", error);
    return [];
  }
}


// ============ STORY MODERATION ============
export interface PlaceStory {
  id: string;
  place_id: string;
  user_id: string;
  media_url: string;
  media_type: string | null;
  caption: string | null;
  created_at: string;
  expires_at: string | null;
  thumbnail_url: string | null;
  status: string | null;
  is_permanent: boolean;
  tags: string[] | null;
  updated_at: string | null;
  // Joined data
  place_name?: string;
  user_email?: string;
  report_count?: number;
}

export interface StoryReport {
  id: string;
  story_id: string;
  reporter_user_id: string;
  reason: string;
  created_at: string;
  // Joined data
  reporter_email?: string;
}

export async function getStories(
  limit: number = 50,
  offset: number = 0,
  status?: string,
  hasReports?: boolean
): Promise<{ stories: PlaceStory[]; total: number }> {
  try {
    let query = supabase
      .from("place_stories")
      .select(`
        *,
        places:place_id(name),
        users:user_id(email)
      `, { count: "exact" });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Supabase] Get stories error:", error);
      return { stories: [], total: 0 };
    }

    // Get report counts for each story
    const storyIds = (data || []).map((s: any) => s.id);
    let reportCounts: Record<string, number> = {};
    
    if (storyIds.length > 0) {
      const { data: reports } = await supabase
        .from("story_reports")
        .select("story_id")
        .in("story_id", storyIds);
      
      if (reports) {
        reports.forEach((r: any) => {
          reportCounts[r.story_id] = (reportCounts[r.story_id] || 0) + 1;
        });
      }
    }

    const stories: PlaceStory[] = (data || []).map((s: any) => ({
      ...s,
      place_name: s.places?.name,
      user_email: s.users?.email,
      report_count: reportCounts[s.id] || 0,
    }));

    // Filter by reports if requested
    if (hasReports === true) {
      const filtered = stories.filter(s => s.report_count && s.report_count > 0);
      return { stories: filtered, total: filtered.length };
    }

    return { stories, total: count || 0 };
  } catch (error) {
    console.error("[Supabase] Get stories error:", error);
    return { stories: [], total: 0 };
  }
}

export async function getStoryById(storyId: string): Promise<PlaceStory | null> {
  try {
    const { data, error } = await supabase
      .from("place_stories")
      .select(`
        *,
        places:place_id(name),
        users:user_id(email)
      `)
      .eq("id", storyId)
      .single();

    if (error) {
      console.error("[Supabase] Get story by ID error:", error);
      return null;
    }

    // Get report count
    const { count } = await supabase
      .from("story_reports")
      .select("*", { count: "exact", head: true })
      .eq("story_id", storyId);

    return {
      ...data,
      place_name: data.places?.name,
      user_email: data.users?.email,
      report_count: count || 0,
    };
  } catch (error) {
    console.error("[Supabase] Get story by ID error:", error);
    return null;
  }
}

export async function getStoryReports(storyId: string): Promise<StoryReport[]> {
  try {
    const { data, error } = await supabase
      .from("story_reports")
      .select(`
        *,
        users:reporter_user_id(email)
      `)
      .eq("story_id", storyId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Supabase] Get story reports error:", error);
      return [];
    }

    return (data || []).map((r: any) => ({
      ...r,
      reporter_email: r.users?.email,
    }));
  } catch (error) {
    console.error("[Supabase] Get story reports error:", error);
    return [];
  }
}

export async function updateStoryStatus(
  storyId: string,
  status: string,
  adminId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("place_stories")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", storyId);

    if (error) {
      console.error("[Supabase] Update story status error:", error);
      return false;
    }

    await logAdminActivity(adminId, `story_${status}`, storyId, "story");
    return true;
  } catch (error) {
    console.error("[Supabase] Update story status error:", error);
    return false;
  }
}

export async function deleteStory(
  storyId: string,
  adminId: string
): Promise<boolean> {
  try {
    // First get story info for logging
    const { data: story } = await supabase
      .from("place_stories")
      .select("user_id")
      .eq("id", storyId)
      .single();

    const { error } = await supabase
      .from("place_stories")
      .delete()
      .eq("id", storyId);

    if (error) {
      console.error("[Supabase] Delete story error:", error);
      return false;
    }

    await logAdminActivity(adminId, "story_deleted", storyId, "story", story?.user_id);
    return true;
  } catch (error) {
    console.error("[Supabase] Delete story error:", error);
    return false;
  }
}

export async function getReportedStories(
  limit: number = 50,
  offset: number = 0
): Promise<{ stories: PlaceStory[]; total: number }> {
  try {
    // Get all story IDs that have reports
    const { data: reportedIds } = await supabase
      .from("story_reports")
      .select("story_id");

    if (!reportedIds || reportedIds.length === 0) {
      return { stories: [], total: 0 };
    }

    const uniqueStoryIds = [...new Set(reportedIds.map((r: any) => r.story_id))];

    const { data, error, count } = await supabase
      .from("place_stories")
      .select(`
        *,
        places:place_id(name),
        users:user_id(email)
      `, { count: "exact" })
      .in("id", uniqueStoryIds)
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Supabase] Get reported stories error:", error);
      return { stories: [], total: 0 };
    }

    // Get report counts
    let reportCounts: Record<string, number> = {};
    reportedIds.forEach((r: any) => {
      reportCounts[r.story_id] = (reportCounts[r.story_id] || 0) + 1;
    });

    const stories: PlaceStory[] = (data || []).map((s: any) => ({
      ...s,
      place_name: s.places?.name,
      user_email: s.users?.email,
      report_count: reportCounts[s.id] || 0,
    }));

    return { stories, total: count || 0 };
  } catch (error) {
    console.error("[Supabase] Get reported stories error:", error);
    return { stories: [], total: 0 };
  }
}

export async function dismissStoryReports(
  storyId: string,
  adminId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("story_reports")
      .delete()
      .eq("story_id", storyId);

    if (error) {
      console.error("[Supabase] Dismiss story reports error:", error);
      return false;
    }

    await logAdminActivity(adminId, "story_reports_dismissed", storyId, "story");
    return true;
  } catch (error) {
    console.error("[Supabase] Dismiss story reports error:", error);
    return false;
  }
}

export async function getStoryStats(): Promise<{
  totalStories: number;
  activeStories: number;
  reportedStories: number;
  removedStories: number;
}> {
  try {
    const [totalResult, activeResult, removedResult] = await Promise.all([
      supabase.from("place_stories").select("*", { count: "exact", head: true }),
      supabase.from("place_stories").select("*", { count: "exact", head: true }).or("status.is.null,status.eq.active"),
      supabase.from("place_stories").select("*", { count: "exact", head: true }).eq("status", "removed"),
    ]);

    // Get count of stories with reports
    const { data: reportedIds } = await supabase
      .from("story_reports")
      .select("story_id");
    
    const uniqueReported = reportedIds ? [...new Set(reportedIds.map((r: any) => r.story_id))].length : 0;

    return {
      totalStories: totalResult.count || 0,
      activeStories: activeResult.count || 0,
      reportedStories: uniqueReported,
      removedStories: removedResult.count || 0,
    };
  } catch (error) {
    console.error("[Supabase] Get story stats error:", error);
    return { totalStories: 0, activeStories: 0, reportedStories: 0, removedStories: 0 };
  }
}


// ============ PHOTO MODERATION ============
export interface PlacePhoto {
  id: string;
  place_id: string;
  user_id: string | null;
  url: string;
  thumbnail_url: string | null;
  caption: string | null;
  source: string | null;
  status: string | null;
  is_cover: boolean;
  is_flagged: boolean;
  flag_reason: string | null;
  created_at: string;
  updated_at: string | null;
  // Joined data
  place_name?: string;
  user_email?: string;
  report_count?: number;
}

export interface PhotoReport {
  id: string;
  photo_id: string;
  reporter_user_id: string;
  reason: string;
  created_at: string;
  // Joined data
  reporter_email?: string;
}

export async function getPhotos(
  limit: number = 50,
  offset: number = 0,
  status?: string,
  isFlagged?: boolean
): Promise<{ photos: PlacePhoto[]; total: number }> {
  try {
    let query = supabase
      .from("place_photos")
      .select(`
        *,
        places:place_id(name),
        users:user_id(email)
      `, { count: "exact" });

    if (status) {
      query = query.eq("status", status);
    }

    if (isFlagged !== undefined) {
      query = query.eq("is_flagged", isFlagged);
    }

    const { data, error, count } = await query
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Supabase] Get photos error:", error);
      return { photos: [], total: 0 };
    }

    // Get report counts for each photo
    const photoIds = (data || []).map((p: any) => p.id);
    let reportCounts: Record<string, number> = {};
    
    if (photoIds.length > 0) {
      const { data: reports } = await supabase
        .from("photo_reports")
        .select("photo_id")
        .in("photo_id", photoIds);
      
      if (reports) {
        reports.forEach((r: any) => {
          reportCounts[r.photo_id] = (reportCounts[r.photo_id] || 0) + 1;
        });
      }
    }

    const photos: PlacePhoto[] = (data || []).map((p: any) => ({
      ...p,
      place_name: p.places?.name,
      user_email: p.users?.email,
      report_count: reportCounts[p.id] || 0,
    }));

    return { photos, total: count || 0 };
  } catch (error) {
    console.error("[Supabase] Get photos error:", error);
    return { photos: [], total: 0 };
  }
}

export async function getPhotoById(photoId: string): Promise<PlacePhoto | null> {
  try {
    const { data, error } = await supabase
      .from("place_photos")
      .select(`
        *,
        places:place_id(name),
        users:user_id(email)
      `)
      .eq("id", photoId)
      .single();

    if (error) {
      console.error("[Supabase] Get photo by ID error:", error);
      return null;
    }

    // Get report count
    const { count } = await supabase
      .from("photo_reports")
      .select("*", { count: "exact", head: true })
      .eq("photo_id", photoId);

    return {
      ...data,
      place_name: data.places?.name,
      user_email: data.users?.email,
      report_count: count || 0,
    };
  } catch (error) {
    console.error("[Supabase] Get photo by ID error:", error);
    return null;
  }
}

export async function getPhotoReports(photoId: string): Promise<PhotoReport[]> {
  try {
    const { data, error } = await supabase
      .from("photo_reports")
      .select(`
        *,
        users:reporter_user_id(email)
      `)
      .eq("photo_id", photoId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Supabase] Get photo reports error:", error);
      return [];
    }

    return (data || []).map((r: any) => ({
      ...r,
      reporter_email: r.users?.email,
    }));
  } catch (error) {
    console.error("[Supabase] Get photo reports error:", error);
    return [];
  }
}

export async function updatePhotoStatus(
  photoId: string,
  status: string,
  adminId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("place_photos")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", photoId);

    if (error) {
      console.error("[Supabase] Update photo status error:", error);
      return false;
    }

    await logAdminActivity(adminId, `photo_${status}`, photoId, "photo");
    return true;
  } catch (error) {
    console.error("[Supabase] Update photo status error:", error);
    return false;
  }
}

export async function approvePhoto(
  photoId: string,
  adminId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("place_photos")
      .update({
        status: "approved",
        is_flagged: false,
        flag_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", photoId);

    if (error) {
      console.error("[Supabase] Approve photo error:", error);
      return false;
    }

    await logAdminActivity(adminId, "photo_approved", photoId, "photo");
    return true;
  } catch (error) {
    console.error("[Supabase] Approve photo error:", error);
    return false;
  }
}

export async function rejectPhoto(
  photoId: string,
  reason: string,
  adminId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("place_photos")
      .update({
        status: "rejected",
        is_flagged: true,
        flag_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", photoId);

    if (error) {
      console.error("[Supabase] Reject photo error:", error);
      return false;
    }

    await logAdminActivity(adminId, "photo_rejected", photoId, "photo", reason);
    return true;
  } catch (error) {
    console.error("[Supabase] Reject photo error:", error);
    return false;
  }
}

export async function deletePhoto(
  photoId: string,
  adminId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("place_photos")
      .delete()
      .eq("id", photoId);

    if (error) {
      console.error("[Supabase] Delete photo error:", error);
      return false;
    }

    await logAdminActivity(adminId, "photo_deleted", photoId, "photo");
    return true;
  } catch (error) {
    console.error("[Supabase] Delete photo error:", error);
    return false;
  }
}

export async function setPhotoCover(
  photoId: string,
  placeId: string,
  adminId: string
): Promise<boolean> {
  try {
    // First, unset any existing cover photo for this place
    await supabase
      .from("place_photos")
      .update({ is_cover: false })
      .eq("place_id", placeId);

    // Then set this photo as cover
    const { error } = await supabase
      .from("place_photos")
      .update({
        is_cover: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", photoId);

    if (error) {
      console.error("[Supabase] Set photo cover error:", error);
      return false;
    }

    await logAdminActivity(adminId, "photo_set_cover", photoId, "photo");
    return true;
  } catch (error) {
    console.error("[Supabase] Set photo cover error:", error);
    return false;
  }
}

export async function getReportedPhotos(
  limit: number = 50,
  offset: number = 0
): Promise<{ photos: PlacePhoto[]; total: number }> {
  try {
    // Get all photo IDs that have reports
    const { data: reportedIds } = await supabase
      .from("photo_reports")
      .select("photo_id");

    if (!reportedIds || reportedIds.length === 0) {
      return { photos: [], total: 0 };
    }

    const uniquePhotoIds = [...new Set(reportedIds.map((r: any) => r.photo_id))];

    const { data, error, count } = await supabase
      .from("place_photos")
      .select(`
        *,
        places:place_id(name),
        users:user_id(email)
      `, { count: "exact" })
      .in("id", uniquePhotoIds)
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Supabase] Get reported photos error:", error);
      return { photos: [], total: 0 };
    }

    // Get report counts
    let reportCounts: Record<string, number> = {};
    reportedIds.forEach((r: any) => {
      reportCounts[r.photo_id] = (reportCounts[r.photo_id] || 0) + 1;
    });

    const photos: PlacePhoto[] = (data || []).map((p: any) => ({
      ...p,
      place_name: p.places?.name,
      user_email: p.users?.email,
      report_count: reportCounts[p.id] || 0,
    }));

    return { photos, total: count || 0 };
  } catch (error) {
    console.error("[Supabase] Get reported photos error:", error);
    return { photos: [], total: 0 };
  }
}

export async function getFlaggedPhotos(
  limit: number = 50,
  offset: number = 0
): Promise<{ photos: PlacePhoto[]; total: number }> {
  try {
    const { data, error, count } = await supabase
      .from("place_photos")
      .select(`
        *,
        places:place_id(name),
        users:user_id(email)
      `, { count: "exact" })
      .eq("is_flagged", true)
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Supabase] Get flagged photos error:", error);
      return { photos: [], total: 0 };
    }

    const photos: PlacePhoto[] = (data || []).map((p: any) => ({
      ...p,
      place_name: p.places?.name,
      user_email: p.users?.email,
    }));

    return { photos, total: count || 0 };
  } catch (error) {
    console.error("[Supabase] Get flagged photos error:", error);
    return { photos: [], total: 0 };
  }
}

export async function dismissPhotoReports(
  photoId: string,
  adminId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("photo_reports")
      .delete()
      .eq("photo_id", photoId);

    if (error) {
      console.error("[Supabase] Dismiss photo reports error:", error);
      return false;
    }

    await logAdminActivity(adminId, "photo_reports_dismissed", photoId, "photo");
    return true;
  } catch (error) {
    console.error("[Supabase] Dismiss photo reports error:", error);
    return false;
  }
}

export async function getPhotoStats(): Promise<{
  totalPhotos: number;
  approvedPhotos: number;
  flaggedPhotos: number;
  reportedPhotos: number;
}> {
  try {
    const [totalResult, approvedResult, flaggedResult] = await Promise.all([
      supabase.from("place_photos").select("*", { count: "exact", head: true }),
      supabase.from("place_photos").select("*", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("place_photos").select("*", { count: "exact", head: true }).eq("is_flagged", true),
    ]);

    // Get count of photos with reports
    const { data: reportedIds } = await supabase
      .from("photo_reports")
      .select("photo_id");
    
    const uniqueReported = reportedIds ? [...new Set(reportedIds.map((r: any) => r.photo_id))].length : 0;

    return {
      totalPhotos: totalResult.count || 0,
      approvedPhotos: approvedResult.count || 0,
      flaggedPhotos: flaggedResult.count || 0,
      reportedPhotos: uniqueReported,
    };
  } catch (error) {
    console.error("[Supabase] Get photo stats error:", error);
    return { totalPhotos: 0, approvedPhotos: 0, flaggedPhotos: 0, reportedPhotos: 0 };
  }
}


// ============ REVIEW MODERATION ============
export interface PlaceReview {
  id: string;
  place_id: string;
  user_id: string;
  rating: number;
  review_text: string | null;
  status: string | null;
  is_flagged: boolean;
  flag_reason: string | null;
  created_at: string;
  updated_at: string | null;
  // Joined data
  place_name?: string;
  user_email?: string;
  report_count?: number;
}

export interface ReviewReport {
  id: string;
  review_id: string;
  reporter_user_id: string;
  reason: string;
  created_at: string;
  // Joined data
  reporter_email?: string;
}

export async function getReviews(
  limit: number = 50,
  offset: number = 0,
  status?: string,
  minRating?: number,
  maxRating?: number
): Promise<{ reviews: PlaceReview[]; total: number }> {
  try {
    let query = supabase
      .from("place_reviews")
      .select(`
        *,
        places:place_id(name),
        users:user_id(email)
      `, { count: "exact" });

    if (status) {
      query = query.eq("status", status);
    }

    if (minRating !== undefined) {
      query = query.gte("rating", minRating);
    }

    if (maxRating !== undefined) {
      query = query.lte("rating", maxRating);
    }

    const { data, error, count } = await query
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Supabase] Get reviews error:", error);
      return { reviews: [], total: 0 };
    }

    // Get report counts for each review
    const reviewIds = (data || []).map((r: any) => r.id);
    let reportCounts: Record<string, number> = {};
    
    if (reviewIds.length > 0) {
      const { data: reports } = await supabase
        .from("review_reports")
        .select("review_id")
        .in("review_id", reviewIds);
      
      if (reports) {
        reports.forEach((r: any) => {
          reportCounts[r.review_id] = (reportCounts[r.review_id] || 0) + 1;
        });
      }
    }

    const reviews: PlaceReview[] = (data || []).map((r: any) => ({
      ...r,
      place_name: r.places?.name,
      user_email: r.users?.email,
      report_count: reportCounts[r.id] || 0,
    }));

    return { reviews, total: count || 0 };
  } catch (error) {
    console.error("[Supabase] Get reviews error:", error);
    return { reviews: [], total: 0 };
  }
}

export async function getReviewById(reviewId: string): Promise<PlaceReview | null> {
  try {
    const { data, error } = await supabase
      .from("place_reviews")
      .select(`
        *,
        places:place_id(name),
        users:user_id(email)
      `)
      .eq("id", reviewId)
      .single();

    if (error) {
      console.error("[Supabase] Get review by ID error:", error);
      return null;
    }

    // Get report count
    const { count } = await supabase
      .from("review_reports")
      .select("*", { count: "exact", head: true })
      .eq("review_id", reviewId);

    return {
      ...data,
      place_name: data.places?.name,
      user_email: data.users?.email,
      report_count: count || 0,
    };
  } catch (error) {
    console.error("[Supabase] Get review by ID error:", error);
    return null;
  }
}

export async function getReviewReports(reviewId: string): Promise<ReviewReport[]> {
  try {
    const { data, error } = await supabase
      .from("review_reports")
      .select(`
        *,
        users:reporter_user_id(email)
      `)
      .eq("review_id", reviewId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Supabase] Get review reports error:", error);
      return [];
    }

    return (data || []).map((r: any) => ({
      ...r,
      reporter_email: r.users?.email,
    }));
  } catch (error) {
    console.error("[Supabase] Get review reports error:", error);
    return [];
  }
}

export async function updateReviewStatus(
  reviewId: string,
  status: string,
  adminId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("place_reviews")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reviewId);

    if (error) {
      console.error("[Supabase] Update review status error:", error);
      return false;
    }

    await logAdminActivity(adminId, `review_${status}`, reviewId, "review");
    return true;
  } catch (error) {
    console.error("[Supabase] Update review status error:", error);
    return false;
  }
}

export async function approveReview(
  reviewId: string,
  adminId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("place_reviews")
      .update({
        status: "approved",
        is_flagged: false,
        flag_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reviewId);

    if (error) {
      console.error("[Supabase] Approve review error:", error);
      return false;
    }

    await logAdminActivity(adminId, "review_approved", reviewId, "review");
    return true;
  } catch (error) {
    console.error("[Supabase] Approve review error:", error);
    return false;
  }
}

export async function rejectReview(
  reviewId: string,
  reason: string,
  adminId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("place_reviews")
      .update({
        status: "rejected",
        is_flagged: true,
        flag_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reviewId);

    if (error) {
      console.error("[Supabase] Reject review error:", error);
      return false;
    }

    await logAdminActivity(adminId, "review_rejected", reviewId, "review", reason);
    return true;
  } catch (error) {
    console.error("[Supabase] Reject review error:", error);
    return false;
  }
}

export async function deleteReview(
  reviewId: string,
  adminId: string
): Promise<boolean> {
  try {
    // First get review info for logging
    const { data: review } = await supabase
      .from("place_reviews")
      .select("user_id, place_id")
      .eq("id", reviewId)
      .single();

    const { error } = await supabase
      .from("place_reviews")
      .delete()
      .eq("id", reviewId);

    if (error) {
      console.error("[Supabase] Delete review error:", error);
      return false;
    }

    await logAdminActivity(adminId, "review_deleted", reviewId, "review", review?.user_id);
    return true;
  } catch (error) {
    console.error("[Supabase] Delete review error:", error);
    return false;
  }
}

export async function getReportedReviews(
  limit: number = 50,
  offset: number = 0
): Promise<{ reviews: PlaceReview[]; total: number }> {
  try {
    // Get all review IDs that have reports
    const { data: reportedIds } = await supabase
      .from("review_reports")
      .select("review_id");

    if (!reportedIds || reportedIds.length === 0) {
      return { reviews: [], total: 0 };
    }

    const uniqueReviewIds = [...new Set(reportedIds.map((r: any) => r.review_id))];

    const { data, error, count } = await supabase
      .from("place_reviews")
      .select(`
        *,
        places:place_id(name),
        users:user_id(email)
      `, { count: "exact" })
      .in("id", uniqueReviewIds)
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Supabase] Get reported reviews error:", error);
      return { reviews: [], total: 0 };
    }

    // Get report counts
    let reportCounts: Record<string, number> = {};
    reportedIds.forEach((r: any) => {
      reportCounts[r.review_id] = (reportCounts[r.review_id] || 0) + 1;
    });

    const reviews: PlaceReview[] = (data || []).map((r: any) => ({
      ...r,
      place_name: r.places?.name,
      user_email: r.users?.email,
      report_count: reportCounts[r.id] || 0,
    }));

    return { reviews, total: count || 0 };
  } catch (error) {
    console.error("[Supabase] Get reported reviews error:", error);
    return { reviews: [], total: 0 };
  }
}

export async function getFlaggedReviews(
  limit: number = 50,
  offset: number = 0
): Promise<{ reviews: PlaceReview[]; total: number }> {
  try {
    const { data, error, count } = await supabase
      .from("place_reviews")
      .select(`
        *,
        places:place_id(name),
        users:user_id(email)
      `, { count: "exact" })
      .eq("is_flagged", true)
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Supabase] Get flagged reviews error:", error);
      return { reviews: [], total: 0 };
    }

    const reviews: PlaceReview[] = (data || []).map((r: any) => ({
      ...r,
      place_name: r.places?.name,
      user_email: r.users?.email,
    }));

    return { reviews, total: count || 0 };
  } catch (error) {
    console.error("[Supabase] Get flagged reviews error:", error);
    return { reviews: [], total: 0 };
  }
}

export async function dismissReviewReports(
  reviewId: string,
  adminId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("review_reports")
      .delete()
      .eq("review_id", reviewId);

    if (error) {
      console.error("[Supabase] Dismiss review reports error:", error);
      return false;
    }

    await logAdminActivity(adminId, "review_reports_dismissed", reviewId, "review");
    return true;
  } catch (error) {
    console.error("[Supabase] Dismiss review reports error:", error);
    return false;
  }
}

export async function getReviewStats(): Promise<{
  totalReviews: number;
  approvedReviews: number;
  flaggedReviews: number;
  reportedReviews: number;
  averageRating: number;
}> {
  try {
    const [totalResult, approvedResult, flaggedResult] = await Promise.all([
      supabase.from("place_reviews").select("*", { count: "exact", head: true }),
      supabase.from("place_reviews").select("*", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("place_reviews").select("*", { count: "exact", head: true }).eq("is_flagged", true),
    ]);

    // Get count of reviews with reports
    const { data: reportedIds } = await supabase
      .from("review_reports")
      .select("review_id");
    
    const uniqueReported = reportedIds ? [...new Set(reportedIds.map((r: any) => r.review_id))].length : 0;

    // Get average rating
    const { data: ratingData } = await supabase
      .from("place_reviews")
      .select("rating");
    
    let averageRating = 0;
    if (ratingData && ratingData.length > 0) {
      const sum = ratingData.reduce((acc: number, r: any) => acc + (r.rating || 0), 0);
      averageRating = sum / ratingData.length;
    }

    return {
      totalReviews: totalResult.count || 0,
      approvedReviews: approvedResult.count || 0,
      flaggedReviews: flaggedResult.count || 0,
      reportedReviews: uniqueReported,
      averageRating,
    };
  } catch (error) {
    console.error("[Supabase] Get review stats error:", error);
    return { totalReviews: 0, approvedReviews: 0, flaggedReviews: 0, reportedReviews: 0, averageRating: 0 };
  }
}


// ============ PLACE EDITING ============
export interface PlaceDetails {
  id: string;
  name: string;
  slug: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  description: string | null;
  short_description: string | null;
  category: string | null;
  subcategory: string | null;
  price_level: number | null;
  hours: any | null;
  amenities: string[] | null;
  tags: string[] | null;
  is_verified: boolean;
  is_claimed: boolean;
  is_active: boolean;
  is_featured: boolean;
  cover_photo_url: string | null;
  logo_url: string | null;
  google_place_id: string | null;
  yelp_id: string | null;
  created_at: string;
  updated_at: string | null;
  owner_user_id: string | null;
  average_rating: number | null;
  total_reviews: number | null;
}

export interface PlaceCreateInput {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  website?: string;
  email?: string;
  description?: string;
  short_description?: string;
  category?: string;
  subcategory?: string;
  price_level?: number;
  hours?: any;
  amenities?: string[];
  tags?: string[];
}

export async function createPlaceAdmin(
  placeData: PlaceCreateInput,
  adminId: string
): Promise<{ success: boolean; placeId?: string; error?: string }> {
  try {
    // Generate slug from name
    const slug = placeData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const { data, error } = await supabase
      .from("places")
      .insert({
        ...placeData,
        slug,
        is_verified: false,
        is_claimed: false,
        is_active: true,
        is_featured: false,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("[Supabase] Create place error:", error);
      return { success: false, error: error.message };
    }

    await logAdminActivity(adminId, "place_created", data.id, "place", placeData.name);
    return { success: true, placeId: data.id };
  } catch (error: any) {
    console.error("[Supabase] Create place error:", error);
    return { success: false, error: error.message };
  }
}

export async function updatePlaceAdmin(
  placeId: string,
  updates: Partial<PlaceDetails>,
  adminId: string
): Promise<boolean> {
  try {
    // Remove fields that shouldn't be updated directly
    const { id, created_at, ...updateData } = updates as any;

    const { error } = await supabase
      .from("places")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", placeId);

    if (error) {
      console.error("[Supabase] Update place error:", error);
      return false;
    }

    await logAdminActivity(adminId, "place_updated", placeId, "place", JSON.stringify(Object.keys(updateData)));
    return true;
  } catch (error) {
    console.error("[Supabase] Update place error:", error);
    return false;
  }
}

export async function deletePlaceAdmin(
  placeId: string,
  adminId: string
): Promise<boolean> {
  try {
    // Get place name for logging
    const { data: place } = await supabase
      .from("places")
      .select("name")
      .eq("id", placeId)
      .single();

    const { error } = await supabase
      .from("places")
      .delete()
      .eq("id", placeId);

    if (error) {
      console.error("[Supabase] Delete place error:", error);
      return false;
    }

    await logAdminActivity(adminId, "place_deleted", placeId, "place", place?.name);
    return true;
  } catch (error) {
    console.error("[Supabase] Delete place error:", error);
    return false;
  }
}

export async function getPlaceForEdit(placeId: string): Promise<PlaceDetails | null> {
  try {
    const { data, error } = await supabase
      .from("places")
      .select("*")
      .eq("id", placeId)
      .single();

    if (error) {
      console.error("[Supabase] Get place for edit error:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("[Supabase] Get place for edit error:", error);
    return null;
  }
}

// ============ TAVVY PLACES (User-Generated) ============
export interface TavvyPlaceInput {
  name: string;
  description?: string | null;
  tavvy_category: string;
  tavvy_subcategory?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  address_line2?: string | null;
  city?: string | null;
  region?: string | null;
  postcode?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  twitter?: string | null;
  tiktok?: string | null;
  hours_display?: string | null;
  hours_json?: any;
  price_level?: number | null;
  photos?: string[] | null;
  cover_image_url?: string | null;
  universe_id?: string | null;
}

export interface TavvyPlace extends TavvyPlaceInput {
  id: string;
  is_verified: boolean;
  is_claimed: boolean;
  source: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
}

export async function createTavvyPlace(
  input: TavvyPlaceInput,
  createdBy: string
): Promise<TavvyPlace | null> {
  try {
    const { data, error } = await supabase
      .from("tavvy_places")
      .insert({
        name: input.name,
        description: input.description || null,
        tavvy_category: input.tavvy_category,
        tavvy_subcategory: input.tavvy_subcategory || null,
        latitude: input.latitude || null,
        longitude: input.longitude || null,
        address: input.address || null,
        address_line2: input.address_line2 || null,
        city: input.city || null,
        region: input.region || null,
        postcode: input.postcode || null,
        country: input.country || null,
        phone: input.phone || null,
        email: input.email || null,
        website: input.website || null,
        instagram: input.instagram || null,
        facebook: input.facebook || null,
        twitter: input.twitter || null,
        tiktok: input.tiktok || null,
        hours_display: input.hours_display || null,
        hours_json: input.hours_json || null,
        price_level: input.price_level || null,
        photos: input.photos || null,
        cover_image_url: input.cover_image_url || null,
        universe_id: input.universe_id || null,
        source: 'admin',
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) {
      console.error("[Supabase] Create tavvy place error:", error);
      return null;
    }

    console.log(`[Supabase] Created new tavvy place: ${data.name} (${data.id})`);
    
    // Log admin action
    await logAdminActivity(createdBy, 'place_created', data.id, 'tavvy_place', `Name: ${data.name}`);

    return data as TavvyPlace;
  } catch (error) {
    console.error("[Supabase] Create tavvy place error:", error);
    return null;
  }
}

export async function verifyPlace(
  placeId: string,
  adminId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("places")
      .update({
        is_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", placeId);

    if (error) {
      console.error("[Supabase] Verify place error:", error);
      return false;
    }

    await logAdminActivity(adminId, "place_verified", placeId, "place");
    return true;
  } catch (error) {
    console.error("[Supabase] Verify place error:", error);
    return false;
  }
}

export async function unverifyPlace(
  placeId: string,
  adminId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("places")
      .update({
        is_verified: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", placeId);

    if (error) {
      console.error("[Supabase] Unverify place error:", error);
      return false;
    }

    await logAdminActivity(adminId, "place_unverified", placeId, "place");
    return true;
  } catch (error) {
    console.error("[Supabase] Unverify place error:", error);
    return false;
  }
}

export async function featurePlace(
  placeId: string,
  adminId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("places")
      .update({
        is_featured: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", placeId);

    if (error) {
      console.error("[Supabase] Feature place error:", error);
      return false;
    }

    await logAdminActivity(adminId, "place_featured", placeId, "place");
    return true;
  } catch (error) {
    console.error("[Supabase] Feature place error:", error);
    return false;
  }
}

export async function unfeaturePlace(
  placeId: string,
  adminId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("places")
      .update({
        is_featured: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", placeId);

    if (error) {
      console.error("[Supabase] Unfeature place error:", error);
      return false;
    }

    await logAdminActivity(adminId, "place_unfeatured", placeId, "place");
    return true;
  } catch (error) {
    console.error("[Supabase] Unfeature place error:", error);
    return false;
  }
}

export async function activatePlace(
  placeId: string,
  adminId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("places")
      .update({
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", placeId);

    if (error) {
      console.error("[Supabase] Activate place error:", error);
      return false;
    }

    await logAdminActivity(adminId, "place_activated", placeId, "place");
    return true;
  } catch (error) {
    console.error("[Supabase] Activate place error:", error);
    return false;
  }
}

export async function deactivatePlace(
  placeId: string,
  adminId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("places")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", placeId);

    if (error) {
      console.error("[Supabase] Deactivate place error:", error);
      return false;
    }

    await logAdminActivity(adminId, "place_deactivated", placeId, "place");
    return true;
  } catch (error) {
    console.error("[Supabase] Deactivate place error:", error);
    return false;
  }
}

export async function getPlacePhotosForEdit(placeId: string): Promise<PlacePhoto[]> {
  try {
    const { data, error } = await supabase
      .from("place_photos")
      .select("*")
      .eq("place_id", placeId)
      .order("is_cover", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Supabase] Get place photos error:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[Supabase] Get place photos error:", error);
    return [];
  }
}



// ============ VERIFICATION SYNC ============
// These functions ensure verification status is properly synced across all related tables

export async function syncVerificationToProProvider(
  userId: string,
  verificationData: {
    is_licensed_verified?: boolean;
    is_insured_verified?: boolean;
    is_bonded_verified?: boolean;
    is_tavvy_verified?: boolean;
  },
  adminId: string
): Promise<boolean> {
  try {
    // Update pro_providers table with verification status
    const { error } = await supabase
      .from("pro_providers")
      .update({
        is_licensed: verificationData.is_licensed_verified,
        is_insured: verificationData.is_insured_verified,
        is_bonded: verificationData.is_bonded_verified,
        is_tavvy_verified: verificationData.is_tavvy_verified,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      console.error("[Supabase] Sync verification to pro_provider error:", error);
      return false;
    }

    await logAdminActivity(adminId, "verification_synced", userId, "pro_provider");
    return true;
  } catch (error) {
    console.error("[Supabase] Sync verification to pro_provider error:", error);
    return false;
  }
}

export async function approveVerificationWithSync(
  verificationId: string,
  userId: string,
  badges: {
    licensed: boolean;
    insured: boolean;
    bonded: boolean;
    tavvyVerified: boolean;
  },
  reviewNotes: string,
  adminId: string
): Promise<boolean> {
  try {
    // Update user_verifications table
    const { error: verificationError } = await supabase
      .from("user_verifications")
      .update({
        is_licensed_verified: badges.licensed,
        is_insured_verified: badges.insured,
        is_bonded_verified: badges.bonded,
        is_tavvy_verified: badges.tavvyVerified,
        verification_status: "approved",
        review_notes: reviewNotes,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", verificationId);

    if (verificationError) {
      console.error("[Supabase] Approve verification error:", verificationError);
      return false;
    }

    // Sync to pro_providers table
    await syncVerificationToProProvider(userId, {
      is_licensed_verified: badges.licensed,
      is_insured_verified: badges.insured,
      is_bonded_verified: badges.bonded,
      is_tavvy_verified: badges.tavvyVerified,
    }, adminId);

    // Update user profile with verification badges
    await supabase
      .from("profiles")
      .update({
        is_verified_pro: badges.tavvyVerified,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    await logAdminActivity(adminId, "verification_approved", verificationId, "verification", reviewNotes);
    return true;
  } catch (error) {
    console.error("[Supabase] Approve verification with sync error:", error);
    return false;
  }
}

export async function rejectVerificationWithSync(
  verificationId: string,
  userId: string,
  reviewNotes: string,
  adminId: string
): Promise<boolean> {
  try {
    // Update user_verifications table
    const { error: verificationError } = await supabase
      .from("user_verifications")
      .update({
        verification_status: "rejected",
        review_notes: reviewNotes,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", verificationId);

    if (verificationError) {
      console.error("[Supabase] Reject verification error:", verificationError);
      return false;
    }

    // Clear verification badges from pro_providers
    await supabase
      .from("pro_providers")
      .update({
        is_licensed: false,
        is_insured: false,
        is_bonded: false,
        is_tavvy_verified: false,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    // Clear verified pro status from profile
    await supabase
      .from("profiles")
      .update({
        is_verified_pro: false,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    await logAdminActivity(adminId, "verification_rejected", verificationId, "verification", reviewNotes);
    return true;
  } catch (error) {
    console.error("[Supabase] Reject verification with sync error:", error);
    return false;
  }
}

// ============ PLACE OVERRIDE FUNCTIONS (ADMIN) ============
export interface PlaceOverrideAdmin {
  id: string;
  place_id: string;
  field_name: string;
  original_value: any;
  override_value: any;
  reason: string;
  created_by: string;
  created_at: string;
  is_active: boolean;
  // Joined
  place_name?: string;
  admin_email?: string;
}

export async function getPlaceOverridesAdmin(
  limit: number = 50,
  offset: number = 0,
  placeId?: string
): Promise<{ overrides: PlaceOverrideAdmin[]; total: number }> {
  try {
    let query = supabase
      .from("place_overrides")
      .select(`
        *,
        places:place_id(name)
      `, { count: "exact" });

    if (placeId) {
      query = query.eq("place_id", placeId);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[Supabase] Get place overrides error:", error);
      return { overrides: [], total: 0 };
    }

    const overrides: PlaceOverrideAdmin[] = (data || []).map((o: any) => ({
      ...o,
      place_name: o.places?.name,
    }));

    return { overrides, total: count || 0 };
  } catch (error) {
    console.error("[Supabase] Get place overrides error:", error);
    return { overrides: [], total: 0 };
  }
}

export async function getTavvyPlaces(
  limit: number = 50,
  offset: number = 0
): Promise<{ places: TavvyPlace[]; total: number }> {
  try {
    const { data, error, count } = await supabase
      .from("tavvy_places")
      .select("*", { count: "exact" })
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[Supabase] Get tavvy places error:", error);
      return { places: [], total: 0 };
    }

    return { places: data as TavvyPlace[], total: count || 0 };
  } catch (error) {
    console.error("[Supabase] Get tavvy places error:", error);
    return { places: [], total: 0 };
  }
}

export async function createPlaceOverrideAdmin(
  placeId: string,
  fieldName: string,
  originalValue: any,
  overrideValue: any,
  reason: string,
  adminId: string
): Promise<{ success: boolean; overrideId?: string }> {
  try {
    // Create the override record
    const { data, error } = await supabase
      .from("place_overrides")
      .insert({
        place_id: placeId,
        field_name: fieldName,
        original_value: originalValue,
        override_value: overrideValue,
        reason,
        created_by: adminId,
        is_active: true,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("[Supabase] Create place override error:", error);
      return { success: false };
    }

    // Apply the override to the place
    const { error: updateError } = await supabase
      .from("places")
      .update({
        [fieldName]: overrideValue,
        updated_at: new Date().toISOString(),
      })
      .eq("id", placeId);

    if (updateError) {
      console.error("[Supabase] Apply place override error:", updateError);
      // Rollback the override record
      await supabase.from("place_overrides").delete().eq("id", data.id);
      return { success: false };
    }

    await logAdminActivity(adminId, "place_override_created", placeId, "place", `${fieldName}: ${overrideValue}`);
    return { success: true, overrideId: data.id };
  } catch (error) {
    console.error("[Supabase] Create place override error:", error);
    return { success: false };
  }
}

export async function revertPlaceOverrideAdmin(
  overrideId: string,
  adminId: string
): Promise<boolean> {
  try {
    // Get the override record
    const { data: override, error: fetchError } = await supabase
      .from("place_overrides")
      .select("*")
      .eq("id", overrideId)
      .single();

    if (fetchError || !override) {
      console.error("[Supabase] Fetch override error:", fetchError);
      return false;
    }

    // Revert the place field to original value
    const { error: updateError } = await supabase
      .from("places")
      .update({
        [override.field_name]: override.original_value,
        updated_at: new Date().toISOString(),
      })
      .eq("id", override.place_id);

    if (updateError) {
      console.error("[Supabase] Revert place override error:", updateError);
      return false;
    }

    // Mark override as inactive
    const { error: deactivateError } = await supabase
      .from("place_overrides")
      .update({
        is_active: false,
      })
      .eq("id", overrideId);

    if (deactivateError) {
      console.error("[Supabase] Deactivate override error:", deactivateError);
    }

    await logAdminActivity(adminId, "place_override_reverted", override.place_id, "place", override.field_name);
    return true;
  } catch (error) {
    console.error("[Supabase] Revert place override error:", error);
    return false;
  }
}

export async function deletePlaceOverrideAdmin(
  overrideId: string,
  adminId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("place_overrides")
      .delete()
      .eq("id", overrideId);

    if (error) {
      console.error("[Supabase] Delete place override error:", error);
      return false;
    }

    await logAdminActivity(adminId, "place_override_deleted", overrideId, "place_override");
    return true;
  } catch (error) {
    console.error("[Supabase] Delete place override error:", error);
    return false;
  }
}

export async function getTavvyPlaceById(id: string): Promise<TavvyPlace | null> {
  try {
    const { data, error } = await supabase
      .from("tavvy_places")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("[Supabase] Get tavvy place by id error:", error);
      return null;
    }

    return data as TavvyPlace;
  } catch (error) {
    console.error("[Supabase] Get tavvy place by id error:", error);
    return null;
  }
}

export async function updateTavvyPlace(
  id: string,
  updates: Partial<TavvyPlaceInput>,
  updatedBy: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("tavvy_places")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("[Supabase] Update tavvy place error:", error);
      return false;
    }

    // Log admin action
    await logAdminActivity(updatedBy, 'place_updated', id, 'tavvy_place');

    return true;
  } catch (error) {
    console.error("[Supabase] Update tavvy place error:", error);
    return false;
  }
}

export async function deleteTavvyPlace(id: string, deletedBy: string): Promise<boolean> {
  try {
    // Soft delete
    const { error } = await supabase
      .from("tavvy_places")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("[Supabase] Delete tavvy place error:", error);
      return false;
    }

    // Log admin action
    await logAdminActivity(deletedBy, 'place_deleted', id, 'tavvy_place');

    return true;
  } catch (error) {
    console.error("[Supabase] Delete tavvy place error:", error);
    return false;
  }
}

// Get all tavvy categories for dropdown
export async function getTavvyCategories(): Promise<{ slug: string; name: string }[]> {
  // Return the predefined categories
  // These match the PRIMARY_CATEGORIES in the mobile app
  return [
    { slug: 'arts', name: 'Arts & Culture' },
    { slug: 'automotive', name: 'Automotive' },
    { slug: 'nightlife', name: 'Bars & Nightlife' },
    { slug: 'beauty', name: 'Beauty & Personal Care' },
    { slug: 'business', name: 'Business Services' },
    { slug: 'coffee_tea', name: 'Coffee & Tea' },
    { slug: 'education', name: 'Education' },
    { slug: 'entertainment', name: 'Entertainment' },
    { slug: 'events', name: 'Events & Venues' },
    { slug: 'financial', name: 'Financial Services' },
    { slug: 'fitness', name: 'Fitness & Sports' },
    { slug: 'food', name: 'Food & Dining' },
    { slug: 'government', name: 'Government' },
    { slug: 'health', name: 'Health & Medical' },
    { slug: 'home', name: 'Home Services' },
    { slug: 'hotels', name: 'Hotels & Lodging' },
    { slug: 'legal', name: 'Legal Services' },
    { slug: 'outdoors', name: 'Outdoors & Recreation' },
    { slug: 'pets', name: 'Pets & Animals' },
    { slug: 'professional', name: 'Professional Services' },
    { slug: 'real_estate', name: 'Real Estate' },
    { slug: 'religious', name: 'Religious Organizations' },
    { slug: 'rv_camping', name: 'RV & Camping' },
    { slug: 'shopping', name: 'Shopping & Retail' },
    { slug: 'transportation', name: 'Transportation' },
    { slug: 'other', name: 'Other' },
  ];
}
