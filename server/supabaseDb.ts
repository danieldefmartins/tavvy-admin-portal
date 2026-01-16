import postgres from "postgres";

let _sql: ReturnType<typeof postgres> | null = null;
let _connectionAttempted = false;

/**
 * Get Supabase PostgreSQL connection
 * Uses the SUPABASE_DATABASE_URL environment variable
 */
export function getSupabaseDb() {
  if (!_sql && !_connectionAttempted) {
    _connectionAttempted = true;
    const dbUrl = process.env.SUPABASE_DATABASE_URL;
    
    if (!dbUrl) {
      console.error("[Supabase] SUPABASE_DATABASE_URL environment variable is not set!");
      return null;
    }
    
    // Log connection attempt (mask password)
    const maskedUrl = dbUrl.replace(/:[^:@]+@/, ':****@');
    console.log("[Supabase] Attempting to connect to:", maskedUrl);
    
    try {
      _sql = postgres(dbUrl, {
        ssl: { rejectUnauthorized: false },
        max: 10,
        idle_timeout: 20,
        connect_timeout: 30,
        onnotice: (notice) => console.log("[Supabase] Notice:", notice),
      });
      console.log("[Supabase] Connection pool created successfully");
    } catch (error) {
      console.error("[Supabase] Failed to create connection pool:", error);
      _sql = null;
    }
  }
  return _sql;
}

/**
 * Test the database connection
 */
export async function testConnection(): Promise<{ success: boolean; error?: string }> {
  const sql = getSupabaseDb();
  if (!sql) {
    return { success: false, error: "Database not configured" };
  }
  
  try {
    const result = await sql`SELECT 1 as test`;
    console.log("[Supabase] Connection test successful:", result);
    return { success: true };
  } catch (error: any) {
    console.error("[Supabase] Connection test failed:", error);
    return { success: false, error: error.message || String(error) };
  }
}

// ============ PLACES QUERIES ============
// Queries both fsq_places_raw (Foursquare data) and tavvy_places (user-added)

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

/**
 * Search places from both fsq_places_raw and tavvy_places
 * Combines results with source field to identify origin
 */
export async function searchPlaces(
  query: string,
  limit: number = 50,
  offset: number = 0
): Promise<Place[]> {
  const sql = getSupabaseDb();
  if (!sql) {
    console.warn("[Supabase] Database not connected");
    return [];
  }

  const searchPattern = `%${query}%`;
  
  try {
    // Query both tables and combine results
    const result = await sql<Place[]>`
      (
        SELECT 
          fsq_place_id as id,
          name,
          address,
          locality as city,
          region as state,
          country,
          postcode as postal_code,
          latitude as lat,
          longitude as lng,
          tel as phone,
          website,
          fsq_category_labels as category,
          'foursquare'::text as source
        FROM fsq_places_raw
        WHERE name ILIKE ${searchPattern}
           OR locality ILIKE ${searchPattern}
           OR address ILIKE ${searchPattern}
        ORDER BY name ASC
        LIMIT ${Math.ceil(limit / 2)}
      )
      UNION ALL
      (
        SELECT 
          id::text,
          name,
          address,
          city,
          region as state,
          country,
          postcode as postal_code,
          latitude as lat,
          longitude as lng,
          phone,
          website,
          tavvy_category as category,
          'user'::text as source
        FROM tavvy_places
        WHERE is_deleted = false
          AND (name ILIKE ${searchPattern}
               OR city ILIKE ${searchPattern}
               OR address ILIKE ${searchPattern})
        ORDER BY name ASC
        LIMIT ${Math.ceil(limit / 2)}
      )
      ORDER BY name ASC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    console.log(`[Supabase] Found ${result.length} places for query: ${query}`);
    return result;
  } catch (error) {
    console.error("[Supabase] Search places error:", error);
    return [];
  }
}

/**
 * Get a single place by ID
 * Checks both fsq_places_raw (by fsq_place_id) and tavvy_places (by id)
 */
export async function getPlaceById(placeId: string): Promise<Place | null> {
  const sql = getSupabaseDb();
  if (!sql) return null;

  try {
    // First try fsq_places_raw
    const fsqResult = await sql<Place[]>`
      SELECT 
        fsq_place_id as id,
        name,
        address,
        locality as city,
        region as state,
        country,
        postcode as postal_code,
        latitude as lat,
        longitude as lng,
        tel as phone,
        website,
        fsq_category_labels as category,
        'foursquare'::text as source
      FROM fsq_places_raw
      WHERE fsq_place_id = ${placeId}
      LIMIT 1
    `;
    
    if (fsqResult.length > 0) {
      return fsqResult[0];
    }

    // Then try tavvy_places
    const tavvyResult = await sql<Place[]>`
      SELECT 
        id::text,
        name,
        address,
        city,
        region as state,
        country,
        postcode as postal_code,
        latitude as lat,
        longitude as lng,
        phone,
        website,
        tavvy_category as category,
        'user'::text as source
      FROM tavvy_places
      WHERE id::text = ${placeId} AND is_deleted = false
      LIMIT 1
    `;
    
    return tavvyResult.length > 0 ? tavvyResult[0] : null;
  } catch (error) {
    console.error("[Supabase] Get place by ID error:", error);
    return null;
  }
}

/**
 * Get total count of places from both tables
 */
export async function getPlacesCount(): Promise<number> {
  const sql = getSupabaseDb();
  if (!sql) return 0;

  try {
    // Get count from fsq_places_raw (this is a large table, so we use an estimate)
    const fsqResult = await sql`
      SELECT reltuples::bigint AS estimate
      FROM pg_class
      WHERE relname = 'fsq_places_raw'
    `;
    
    // Get exact count from tavvy_places (smaller table)
    const tavvyResult = await sql`
      SELECT COUNT(*) as count FROM tavvy_places WHERE is_deleted = false
    `;
    
    const fsqCount = fsqResult.length > 0 ? Number(fsqResult[0].estimate) : 0;
    const tavvyCount = tavvyResult.length > 0 ? parseInt(tavvyResult[0].count as string, 10) : 0;
    
    return fsqCount + tavvyCount;
  } catch (error) {
    console.error("[Supabase] Get places count error:", error);
    return 0;
  }
}

// ============ REVIEW ITEMS (SIGNALS) QUERIES ============

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

export async function getAllReviewItems(): Promise<ReviewItem[]> {
  const sql = getSupabaseDb();
  if (!sql) return [];

  try {
    const result = await sql<ReviewItem[]>`
      SELECT id, slug, label, icon_emoji, signal_type, color, is_universal, sort_order, is_active
      FROM review_items
      WHERE is_active = true
      ORDER BY signal_type, sort_order ASC
    `;
    return result;
  } catch (error) {
    console.error("[Supabase] Get all review items error:", error);
    return [];
  }
}

export async function getReviewItemsByType(signalType: string): Promise<ReviewItem[]> {
  const sql = getSupabaseDb();
  if (!sql) return [];

  try {
    const result = await sql<ReviewItem[]>`
      SELECT id, slug, label, icon_emoji, signal_type, color, is_universal, sort_order, is_active
      FROM review_items
      WHERE signal_type = ${signalType} AND is_active = true
      ORDER BY sort_order ASC
    `;
    return result;
  } catch (error) {
    console.error("[Supabase] Get review items by type error:", error);
    return [];
  }
}

// ============ REVIEWS QUERIES ============

export interface Review {
  id: string;
  place_id: string;
  user_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface ReviewSignal {
  id: string;
  review_id: string;
  signal_id: string;
  intensity: number;
  created_at: Date;
}

export async function createReview(
  placeId: string,
  userId: string
): Promise<string | null> {
  const sql = getSupabaseDb();
  if (!sql) return null;

  try {
    const result = await sql`
      INSERT INTO reviews (place_id, user_id, created_at, updated_at)
      VALUES (${placeId}, ${userId}, NOW(), NOW())
      RETURNING id
    `;
    return result.length > 0 ? (result[0].id as string) : null;
  } catch (error) {
    console.error("[Supabase] Create review error:", error);
    return null;
  }
}

export async function addReviewSignal(
  reviewId: string,
  signalId: string,
  intensity: number
): Promise<string | null> {
  const sql = getSupabaseDb();
  if (!sql) return null;

  try {
    const result = await sql`
      INSERT INTO review_signals (review_id, signal_id, intensity, created_at)
      VALUES (${reviewId}, ${signalId}, ${intensity}, NOW())
      RETURNING id
    `;
    return result.length > 0 ? (result[0].id as string) : null;
  } catch (error) {
    console.error("[Supabase] Add review signal error:", error);
    return null;
  }
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
  const sql = getSupabaseDb();
  if (!sql) return [];

  try {
    const result = await sql<PlaceSignalAggregate[]>`
      SELECT psa.place_id, psa.signal_id, ri.slug as signal_slug, ri.signal_type, 
             psa.bucket, psa.tap_total, psa.review_count, psa.last_tap_at
      FROM place_signal_aggregates psa
      LEFT JOIN review_items ri ON ri.id = psa.signal_id
      WHERE psa.place_id = ${placeId}
      ORDER BY psa.tap_total DESC
    `;
    return result;
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
  const sql = getSupabaseDb();
  if (!sql) return;

  try {
    await sql`
      INSERT INTO place_signal_aggregates (place_id, signal_id, bucket, tap_total, review_count, last_tap_at)
      VALUES (${placeId}, ${signalId}, ${bucket}, ${tapCount}, 1, NOW())
      ON CONFLICT (place_id, signal_id, bucket)
      DO UPDATE SET
        tap_total = place_signal_aggregates.tap_total + ${tapCount},
        review_count = place_signal_aggregates.review_count + 1,
        last_tap_at = NOW()
    `;
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
  const sql = getSupabaseDb();
  if (!sql) return { success: 0, failed: reviews.length, errors: ["Database not connected"] };

  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const review of reviews) {
    try {
      // Get signal info
      const signalResult = await sql`
        SELECT id, signal_type FROM review_items WHERE slug = ${review.signal_slug} LIMIT 1
      `;
      
      if (signalResult.length === 0) {
        errors.push(`Signal not found: ${review.signal_slug}`);
        failed++;
        continue;
      }

      const signalId = signalResult[0].id as string;
      const signalType = signalResult[0].signal_type as string;
      
      // Determine bucket based on signal type
      const bucket = signalType === "best_for" ? "positive" : 
                     signalType === "heads_up" ? "negative" : "neutral";

      // Create review
      const reviewResult = await sql`
        INSERT INTO reviews (place_id, user_id, created_at, updated_at)
        VALUES (${review.place_id}, ${repUserId}, NOW(), NOW())
        RETURNING id
      `;

      if (reviewResult.length === 0) {
        errors.push(`Failed to create review for place: ${review.place_id}`);
        failed++;
        continue;
      }

      const reviewId = reviewResult[0].id as string;

      // Add review signal
      await sql`
        INSERT INTO review_signals (review_id, signal_id, intensity, created_at)
        VALUES (${reviewId}, ${signalId}, ${review.tap_count}, NOW())
      `;

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
  const sql = getSupabaseDb();
  if (!sql) return { total_reviews: 0, reviews_today: 0, reviews_this_week: 0, places_reviewed: 0 };

  try {
    const result = await sql`
      SELECT 
        COUNT(*) as total_reviews,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as reviews_today,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as reviews_this_week,
        COUNT(DISTINCT place_id) as places_reviewed
      FROM reviews
      WHERE user_id = ${userId}
    `;

    return {
      total_reviews: parseInt(result[0].total_reviews as string, 10),
      reviews_today: parseInt(result[0].reviews_today as string, 10),
      reviews_this_week: parseInt(result[0].reviews_this_week as string, 10),
      places_reviewed: parseInt(result[0].places_reviewed as string, 10),
    };
  } catch (error) {
    console.error("[Supabase] Get rep stats error:", error);
    return { total_reviews: 0, reviews_today: 0, reviews_this_week: 0, places_reviewed: 0 };
  }
}
