/**
 * Pro Provider Database Functions
 *
 * Queries the pro_providers table directly for all provider management.
 */

import { supabaseAdmin as supabase } from "./supabaseAuth";

// Pro provider interface matching actual pro_providers columns
export interface ProProvider {
  id: string;
  user_id: string;
  business_name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  profile_photo_url: string | null;
  cover_photo_url: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  latitude: number | null;
  longitude: number | null;
  service_radius: number | null;
  years_in_business: number | null;
  years_experience: number | null;
  license_number: string | null;
  is_insured: boolean;
  is_licensed: boolean;
  is_verified: boolean;
  is_active: boolean;
  is_featured: boolean;
  average_rating: number | null;
  total_reviews: number | null;
  review_count: number | null;
  response_time: string | null;
  provider_type: string | null;
  trade_category: string | null;
  specialties: string[] | null;
  service_areas: string[] | null;
  first_name: string | null;
  last_name: string | null;
  bio: string | null;
  brokerage_name: string | null;
  mls_id: string | null;
  subscription_plan: string | null;
  subscription_status: string | null;
  subscription_started_at: string | null;
  subscription_expires_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  total_leads: number | null;
  active_leads: number | null;
  response_rate: number | null;
  card_slug: string | null;
  card_enabled: boolean | null;
  onboarding_step: number | null;
  onboarding_completed_at: string | null;
  whatsapp_number: string | null;
  verified_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Get all pro providers with filtering & pagination
 */
export async function getProsWithPlaces(
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
      query = query.or(
        `business_name.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,city.ilike.%${search}%`
      );
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

    return { providers: (data || []) as ProProvider[], total: count || 0 };
  } catch (error) {
    console.error("[Supabase] Get pro providers error:", error);
    return { providers: [], total: 0 };
  }
}

/**
 * Get a single pro provider by ID
 */
export async function getProWithPlaceById(proId: string): Promise<ProProvider | null> {
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

    return data as ProProvider;
  } catch (error) {
    console.error("[Supabase] Get pro provider by ID error:", error);
    return null;
  }
}

/**
 * Update a pro provider
 */
export async function updateProWithPlace(
  proId: string,
  updates: Partial<ProProvider>,
  adminId: string
): Promise<boolean> {
  try {
    // Remove fields that shouldn't be directly updated
    const { id, user_id, created_at, ...safeUpdates } = updates as any;

    const { error } = await supabase
      .from("pro_providers")
      .update({
        ...safeUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proId);

    if (error) {
      console.error("[Supabase] Update pro provider error:", error);
      return false;
    }

    await logAdminActivity(adminId, "pro_updated", proId, "pro_provider", JSON.stringify(safeUpdates));
    return true;
  } catch (error) {
    console.error("[Supabase] Update pro provider error:", error);
    return false;
  }
}

/**
 * Verify a pro provider
 */
export async function verifyPro(proId: string, adminId: string): Promise<boolean> {
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
      console.error("[Supabase] Verify pro error:", error);
      return false;
    }

    await logAdminActivity(adminId, "pro_verified", proId, "pro_provider");
    return true;
  } catch (error) {
    console.error("[Supabase] Verify pro error:", error);
    return false;
  }
}

/**
 * Unverify a pro provider
 */
export async function unverifyPro(proId: string, adminId: string): Promise<boolean> {
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
      console.error("[Supabase] Unverify pro error:", error);
      return false;
    }

    await logAdminActivity(adminId, "pro_unverified", proId, "pro_provider");
    return true;
  } catch (error) {
    console.error("[Supabase] Unverify pro error:", error);
    return false;
  }
}

/**
 * Activate a pro provider
 */
export async function activatePro(proId: string, adminId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("pro_providers")
      .update({
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proId);

    if (error) {
      console.error("[Supabase] Activate pro error:", error);
      return false;
    }

    await logAdminActivity(adminId, "pro_activated", proId, "pro_provider");
    return true;
  } catch (error) {
    console.error("[Supabase] Activate pro error:", error);
    return false;
  }
}

/**
 * Deactivate a pro provider
 */
export async function deactivatePro(proId: string, adminId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("pro_providers")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proId);

    if (error) {
      console.error("[Supabase] Deactivate pro error:", error);
      return false;
    }

    await logAdminActivity(adminId, "pro_deactivated", proId, "pro_provider");
    return true;
  } catch (error) {
    console.error("[Supabase] Deactivate pro error:", error);
    return false;
  }
}

/**
 * Feature a pro provider
 */
export async function featurePro(proId: string, adminId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("pro_providers")
      .update({
        is_featured: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proId);

    if (error) {
      console.error("[Supabase] Feature pro error:", error);
      return false;
    }

    await logAdminActivity(adminId, "pro_featured", proId, "pro_provider");
    return true;
  } catch (error) {
    console.error("[Supabase] Feature pro error:", error);
    return false;
  }
}

/**
 * Unfeature a pro provider
 */
export async function unfeaturePro(proId: string, adminId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("pro_providers")
      .update({
        is_featured: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proId);

    if (error) {
      console.error("[Supabase] Unfeature pro error:", error);
      return false;
    }

    await logAdminActivity(adminId, "pro_unfeatured", proId, "pro_provider");
    return true;
  } catch (error) {
    console.error("[Supabase] Unfeature pro error:", error);
    return false;
  }
}

/**
 * Get pro provider stats
 */
export async function getProStatsNew(): Promise<{
  totalPros: number;
  verifiedPros: number;
  activePros: number;
  featuredPros: number;
  realtors: number;
  contractors: number;
  onTheGo: number;
  avgCompletion: number;
}> {
  try {
    const [totalResult, verifiedResult, activeResult, featuredResult, realtorResult, contractorResult, onTheGoResult] =
      await Promise.all([
        supabase.from("pro_providers").select("*", { count: "exact", head: true }),
        supabase.from("pro_providers").select("*", { count: "exact", head: true }).eq("is_verified", true),
        supabase.from("pro_providers").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("pro_providers").select("*", { count: "exact", head: true }).eq("is_featured", true),
        supabase.from("pro_providers").select("*", { count: "exact", head: true }).eq("provider_type", "realtor"),
        supabase.from("pro_providers").select("*", { count: "exact", head: true }).eq("provider_type", "pro"),
        supabase.from("pro_providers").select("*", { count: "exact", head: true }).eq("provider_type", "on_the_go"),
      ]);

    return {
      totalPros: totalResult.count || 0,
      verifiedPros: verifiedResult.count || 0,
      activePros: activeResult.count || 0,
      featuredPros: featuredResult.count || 0,
      realtors: realtorResult.count || 0,
      contractors: contractorResult.count || 0,
      onTheGo: onTheGoResult.count || 0,
      avgCompletion: 0,
    };
  } catch (error) {
    console.error("[Supabase] Get pro stats error:", error);
    return { totalPros: 0, verifiedPros: 0, activePros: 0, featuredPros: 0, realtors: 0, contractors: 0, onTheGo: 0, avgCompletion: 0 };
  }
}

/**
 * Get distinct provider types
 */
export async function getDistinctProviderTypesNew(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("pro_providers")
      .select("provider_type")
      .not("provider_type", "is", null);

    if (error || !data) {
      return ["pro", "realtor", "on_the_go"];
    }

    const types = [...new Set(data.map((d: any) => d.provider_type).filter(Boolean))];
    return types.length > 0 ? types : ["pro", "realtor", "on_the_go"];
  } catch (error) {
    return ["pro", "realtor", "on_the_go"];
  }
}

/**
 * Helper function to log admin activity
 */
async function logAdminActivity(
  adminId: string,
  action: string,
  targetId: string,
  targetType: string,
  details?: string
): Promise<void> {
  try {
    await supabase.from("admin_activity_log").insert({
      admin_id: adminId,
      action,
      target_id: targetId,
      target_type: targetType,
      details,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Supabase] Log admin activity error:", error);
  }
}
