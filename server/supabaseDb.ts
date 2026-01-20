import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseKey);

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
  source: 'foursquare' | 'user';
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
  try {
    // Search in fsq_places_raw
    const { data: fsqData, error: fsqError } = await supabase
      .from("fsq_places_raw")
      .select("*")
      .or(`name.ilike.%${query}%,locality.ilike.%${query}%,address.ilike.%${query}%`)
      .range(offset, offset + limit - 1)
      .order("name", { ascending: true });

    if (fsqError) {
      console.error("[Supabase] Search places error:", fsqError);
      return [];
    }

    // Map to Place interface
    const places: Place[] = (fsqData || []).map((p: any) => ({
      id: p.fsq_place_id || p.fsq_id || p.id,
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
      source: 'foursquare' as const,
    }));

    console.log(`[Supabase] Found ${places.length} places for query: ${query}`);
    return places;
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
  try {
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
      query = query.eq("region", filters.state);
    }
    if (filters.country) {
      query = query.eq("country", filters.country);
    }
    if (filters.category) {
      query = query.ilike("tavvy_category", `%${filters.category}%`);
    }

    const { data, error, count } = await query
      .range(offset, offset + limit - 1)
      .order("name", { ascending: true });

    if (error) {
      console.error("[Supabase] Advanced search places error:", error);
      return { places: [], total: 0 };
    }

    const places: Place[] = (data || []).map((p: any) => ({
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
      source: 'foursquare' as const,
    }));

    console.log(`[Supabase] Advanced search found ${places.length} places (total: ${count})`);
    return { places, total: count || 0 };
  } catch (error) {
    console.error("[Supabase] Advanced search places error:", error);
    return { places: [], total: 0 };
  }
}

// Get distinct countries for dropdown
export async function getDistinctCountries(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("places")
      .select("country")
      .not("country", "is", null)
      .order("country", { ascending: true });

    if (error) {
      console.error("[Supabase] Get distinct countries error:", error);
      return [];
    }

    // Get unique values
    const countries = Array.from(new Set((data || []).map((d: any) => d.country).filter(Boolean)));
    return countries;
  } catch (error) {
    console.error("[Supabase] Get distinct countries error:", error);
    return [];
  }
}

// Get distinct regions/states for dropdown (optionally filtered by country)
export async function getDistinctRegions(country?: string): Promise<string[]> {
  try {
    let query = supabase
      .from("places")
      .select("region")
      .not("region", "is", null);

    if (country) {
      query = query.eq("country", country);
    }

    const { data, error } = await query.order("region", { ascending: true });

    if (error) {
      console.error("[Supabase] Get distinct regions error:", error);
      return [];
    }

    const regions = Array.from(new Set((data || []).map((d: any) => d.region).filter(Boolean)));
    return regions;
  } catch (error) {
    console.error("[Supabase] Get distinct regions error:", error);
    return [];
  }
}

// Get distinct cities for dropdown (optionally filtered by country and/or region)
export async function getDistinctCities(country?: string, region?: string): Promise<string[]> {
  try {
    let query = supabase
      .from("places")
      .select("city")
      .not("city", "is", null);

    if (country) {
      query = query.eq("country", country);
    }
    if (region) {
      query = query.eq("region", region);
    }

    const { data, error } = await query.order("city", { ascending: true });

    if (error) {
      console.error("[Supabase] Get distinct cities error:", error);
      return [];
    }

    const cities = Array.from(new Set((data || []).map((d: any) => d.city).filter(Boolean)));
    return cities;
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
      .order("tavvy_category", { ascending: true });

    if (error) {
      console.error("[Supabase] Get distinct categories error:", error);
      return [];
    }

    const categories = Array.from(new Set((data || []).map((d: any) => d.tavvy_category).filter(Boolean)));
    return categories;
  } catch (error) {
    console.error("[Supabase] Get distinct categories error:", error);
    return [];
  }
}

export async function getPlaceById(id: string) {
  // Try fsq_places_raw first
  const { data, error } = await supabase
    .from("fsq_places_raw")
    .select("*")
    .or(`fsq_place_id.eq.${id},fsq_id.eq.${id}`)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned, try alternate lookup
    console.error("[Supabase] Get place by ID error:", error);
  }
  
  if (data) return data;

  // Fallback: try by id column directly
  const { data: fallbackData, error: fallbackError } = await supabase
    .from("fsq_places_raw")
    .select("*")
    .eq("id", id)
    .single();

  if (fallbackError && fallbackError.code !== 'PGRST116') {
    throw fallbackError;
  }

  return fallbackData;
}

export async function getPlacesCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("fsq_places_raw")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error("[Supabase] Get places count error:", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error("[Supabase] Get places count error:", error);
    return 0;
  }
}

export async function updatePlace(id: string, updates: any) {
  const { data, error } = await supabase
    .from("fsq_places_raw")
    .update(updates)
    .eq("fsq_id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createPlace(place: any) {
  const { data, error } = await supabase
    .from("fsq_places_raw")
    .insert(place)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePlace(id: string) {
  const { error } = await supabase
    .from("fsq_places_raw")
    .delete()
    .eq("fsq_id", id);

  if (error) throw error;
  return { success: true };
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
