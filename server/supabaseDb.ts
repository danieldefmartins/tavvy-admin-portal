import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseKey);

// ============ PLACES ============
export async function getPlaces(limit = 100, offset = 0) {
  const { data, error } = await supabase
    .from("fsq_places_raw")
    .select("*")
    .range(offset, offset + limit - 1)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getPlaceById(id: string) {
  const { data, error } = await supabase
    .from("fsq_places_raw")
    .select("*")
    .eq("fsq_id", id)
    .single();

  if (error) throw error;
  return data;
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
export async function getSignals() {
  const { data, error } = await supabase
    .from("review_items")
    .select("*")
    .order("label", { ascending: true });

  if (error) throw error;
  return data;
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
  excerpt?: string;
  content?: string;
  cover_image_url?: string;
  author_name?: string;
  author_avatar_url?: string;
  category_id?: string;
  universe_id?: string;
  read_time_minutes?: number;
  is_featured?: boolean;
  status?: string;
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
  return data;
}

export async function updateArticle(id: string, updates: any) {
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

  const { data, error } = await supabase
    .from("atlas_articles")
    .update({
      ...updates,
      category_id: updates.category_id || null,
      universe_id: updates.universe_id || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteArticle(id: string) {
  const { error } = await supabase
    .from("atlas_articles")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return { success: true };
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
  description?: string;
  location?: string;
  banner_image_url?: string;
  thumbnail_image_url?: string;
  category_id?: string;
  parent_universe_id?: string;
  is_featured?: boolean;
  status?: string;
}) {
  const { data, error } = await supabase
    .from("atlas_universes")
    .insert({
      ...universe,
      category_id: universe.category_id || null,
      parent_universe_id: universe.parent_universe_id || null,
      place_count: 0,
      article_count: 0,
      sub_universe_count: 0,
      total_signals: 0,
      published_at: universe.status === "published" ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateUniverse(id: string, updates: any) {
  // If status is changing to published, set published_at
  if (updates.status === "published") {
    const { data: existing } = await supabase
      .from("atlas_universes")
      .select("published_at")
      .eq("id", id)
      .single();
    
    if (!existing?.published_at) {
      updates.published_at = new Date().toISOString();
    }
  }

  const { data, error } = await supabase
    .from("atlas_universes")
    .update({
      ...updates,
      category_id: updates.category_id || null,
      parent_universe_id: updates.parent_universe_id || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteUniverse(id: string) {
  const { error } = await supabase
    .from("atlas_universes")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return { success: true };
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
  state?: string;
  country?: string;
  region?: string;
  population?: number;
  timezone?: string;
  airport_code?: string;
  latitude?: number;
  longitude?: number;
  cover_image_url?: string;
  thumbnail_image_url?: string;
  description?: string;
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
  return data;
}

export async function updateCity(id: string, updates: any) {
  const { data, error } = await supabase
    .from("tavvy_cities")
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

export async function deleteCity(id: string) {
  const { error } = await supabase
    .from("tavvy_cities")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return { success: true };
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
