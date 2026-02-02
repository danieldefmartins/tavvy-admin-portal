/**
 * Pro Provider Database Functions
 * 
 * Updated to use the new "A Pro is a Place" architecture:
 * - pros table: Pro-specific data (subscription, highlights, services)
 * - places table: Business data (name, address, hours, photos)
 * 
 * These functions query both tables and join them for a complete Pro profile.
 */

import { supabaseAdmin as supabase } from "./supabaseAuth";

// Combined Pro + Place interface for admin display
export interface ProWithPlace {
  // Pro fields
  id: string;
  user_id: string;
  place_id: string;
  provider_type: string | null;
  specialties: string[] | null;
  services: any | null;
  service_areas: any | null;
  service_radius: number | null;
  years_experience: number | null;
  year_established: number | null;
  license_number: string | null;
  license_state: string | null;
  insurance_verified: boolean | null;
  background_check: boolean | null;
  highlights: string[] | null;
  bio: string | null;
  subscription_tier: string | null;
  subscription_status: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  onboarding_completed: boolean | null;
  onboarding_step: number | null;
  profile_completion: number | null;
  is_active: boolean | null;
  is_verified: boolean | null;
  is_featured: boolean | null;
  verified_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  
  // Place fields (prefixed with place_)
  business_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  short_description: string | null;
  hours: any | null;
  photos: string[] | null;
  cover_photo: string | null;
  logo: string | null;
  category_id: string | null;
  category_name: string | null;
}

/**
 * Get all Pro providers with their linked Place data
 */
export async function getProsWithPlaces(
  limit: number = 50,
  offset: number = 0,
  search?: string,
  providerType?: string,
  isVerified?: boolean,
  isActive?: boolean
): Promise<{ providers: ProWithPlace[]; total: number }> {
  try {
    // Build the query to join pros with places
    let query = supabase
      .from("pros")
      .select(`
        *,
        places!inner (
          id,
          name,
          phone,
          email,
          website,
          address,
          city,
          state,
          zip_code,
          latitude,
          longitude,
          description,
          short_description,
          hours,
          photos,
          cover_photo,
          logo,
          category_id,
          is_verified,
          created_at,
          updated_at
        )
      `, { count: "exact" });

    // Apply filters
    if (search) {
      // Search in both pros and places fields
      query = query.or(`bio.ilike.%${search}%,places.name.ilike.%${search}%,places.city.ilike.%${search}%`);
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
      console.error("[Supabase] Get pros with places error:", error);
      // Fallback to pro_providers if new tables don't exist yet
      return getProsFromLegacyTable(limit, offset, search, providerType, isVerified, isActive);
    }

    // Transform the data to flatten the structure
    const providers: ProWithPlace[] = (data || []).map((pro: any) => ({
      // Pro fields
      id: pro.id,
      user_id: pro.user_id,
      place_id: pro.place_id,
      provider_type: pro.provider_type,
      specialties: pro.specialties,
      services: pro.services,
      service_areas: pro.service_areas,
      service_radius: pro.service_radius,
      years_experience: pro.years_experience,
      year_established: pro.year_established,
      license_number: pro.license_number,
      license_state: pro.license_state,
      insurance_verified: pro.insurance_verified,
      background_check: pro.background_check,
      highlights: pro.highlights,
      bio: pro.bio,
      subscription_tier: pro.subscription_tier,
      subscription_status: pro.subscription_status,
      stripe_customer_id: pro.stripe_customer_id,
      stripe_subscription_id: pro.stripe_subscription_id,
      onboarding_completed: pro.onboarding_completed,
      onboarding_step: pro.onboarding_step,
      profile_completion: pro.profile_completion,
      is_active: pro.is_active,
      is_verified: pro.is_verified || pro.places?.is_verified,
      is_featured: pro.is_featured,
      verified_at: pro.verified_at,
      created_at: pro.created_at,
      updated_at: pro.updated_at,
      
      // Place fields
      business_name: pro.places?.name,
      phone: pro.places?.phone,
      email: pro.places?.email,
      website: pro.places?.website,
      address: pro.places?.address,
      city: pro.places?.city,
      state: pro.places?.state,
      zip_code: pro.places?.zip_code,
      latitude: pro.places?.latitude,
      longitude: pro.places?.longitude,
      description: pro.places?.description,
      short_description: pro.places?.short_description,
      hours: pro.places?.hours,
      photos: pro.places?.photos,
      cover_photo: pro.places?.cover_photo,
      logo: pro.places?.logo,
      category_id: pro.places?.category_id,
      category_name: null, // Would need another join for category name
    }));

    return { providers, total: count || 0 };
  } catch (error) {
    console.error("[Supabase] Get pros with places error:", error);
    // Fallback to legacy table
    return getProsFromLegacyTable(limit, offset, search, providerType, isVerified, isActive);
  }
}

/**
 * Fallback function to get pros from the legacy pro_providers table
 */
async function getProsFromLegacyTable(
  limit: number = 50,
  offset: number = 0,
  search?: string,
  providerType?: string,
  isVerified?: boolean,
  isActive?: boolean
): Promise<{ providers: ProWithPlace[]; total: number }> {
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
      console.error("[Supabase] Get pro providers (legacy) error:", error);
      return { providers: [], total: 0 };
    }

    // Map legacy data to new format
    const providers: ProWithPlace[] = (data || []).map((pro: any) => ({
      id: pro.id,
      user_id: pro.user_id,
      place_id: null,
      provider_type: pro.provider_type,
      specialties: pro.specialties,
      services: null,
      service_areas: null,
      service_radius: pro.service_radius,
      years_experience: pro.years_experience,
      year_established: null,
      license_number: pro.license_number,
      license_state: pro.license_state,
      insurance_verified: null,
      background_check: null,
      highlights: null,
      bio: pro.bio,
      subscription_tier: pro.subscription_tier,
      subscription_status: pro.subscription_status,
      stripe_customer_id: pro.stripe_customer_id,
      stripe_subscription_id: pro.stripe_subscription_id,
      onboarding_completed: null,
      onboarding_step: null,
      profile_completion: null,
      is_active: pro.is_active,
      is_verified: pro.is_verified,
      is_featured: pro.is_featured,
      verified_at: pro.verified_at,
      created_at: pro.created_at,
      updated_at: pro.updated_at,
      business_name: pro.business_name,
      phone: pro.phone,
      email: pro.email,
      website: pro.website,
      address: pro.address,
      city: pro.city,
      state: pro.state,
      zip_code: pro.zip_code,
      latitude: pro.latitude,
      longitude: pro.longitude,
      description: pro.description,
      short_description: null,
      hours: pro.hours,
      photos: pro.photos,
      cover_photo: pro.cover_photo,
      logo: pro.logo_url || pro.profile_photo_url,
      category_id: null,
      category_name: null,
    }));

    return { providers, total: count || 0 };
  } catch (error) {
    console.error("[Supabase] Get pro providers (legacy) error:", error);
    return { providers: [], total: 0 };
  }
}

/**
 * Get a single Pro with their Place data by ID
 */
export async function getProWithPlaceById(proId: string): Promise<ProWithPlace | null> {
  try {
    // Try new tables first
    const { data: pro, error } = await supabase
      .from("pros")
      .select(`
        *,
        places (
          id,
          name,
          phone,
          email,
          website,
          address,
          city,
          state,
          zip_code,
          latitude,
          longitude,
          description,
          short_description,
          hours,
          photos,
          cover_photo,
          logo,
          category_id,
          is_verified,
          created_at,
          updated_at
        )
      `)
      .eq("id", proId)
      .single();

    if (error) {
      console.error("[Supabase] Get pro with place by ID error:", error);
      // Fallback to legacy table
      return getProFromLegacyTableById(proId);
    }

    if (!pro) return null;

    return {
      id: pro.id,
      user_id: pro.user_id,
      place_id: pro.place_id,
      provider_type: pro.provider_type,
      specialties: pro.specialties,
      services: pro.services,
      service_areas: pro.service_areas,
      service_radius: pro.service_radius,
      years_experience: pro.years_experience,
      year_established: pro.year_established,
      license_number: pro.license_number,
      license_state: pro.license_state,
      insurance_verified: pro.insurance_verified,
      background_check: pro.background_check,
      highlights: pro.highlights,
      bio: pro.bio,
      subscription_tier: pro.subscription_tier,
      subscription_status: pro.subscription_status,
      stripe_customer_id: pro.stripe_customer_id,
      stripe_subscription_id: pro.stripe_subscription_id,
      onboarding_completed: pro.onboarding_completed,
      onboarding_step: pro.onboarding_step,
      profile_completion: pro.profile_completion,
      is_active: pro.is_active,
      is_verified: pro.is_verified || pro.places?.is_verified,
      is_featured: pro.is_featured,
      verified_at: pro.verified_at,
      created_at: pro.created_at,
      updated_at: pro.updated_at,
      business_name: pro.places?.name,
      phone: pro.places?.phone,
      email: pro.places?.email,
      website: pro.places?.website,
      address: pro.places?.address,
      city: pro.places?.city,
      state: pro.places?.state,
      zip_code: pro.places?.zip_code,
      latitude: pro.places?.latitude,
      longitude: pro.places?.longitude,
      description: pro.places?.description,
      short_description: pro.places?.short_description,
      hours: pro.places?.hours,
      photos: pro.places?.photos,
      cover_photo: pro.places?.cover_photo,
      logo: pro.places?.logo,
      category_id: pro.places?.category_id,
      category_name: null,
    };
  } catch (error) {
    console.error("[Supabase] Get pro with place by ID error:", error);
    return getProFromLegacyTableById(proId);
  }
}

/**
 * Fallback to get pro from legacy table by ID
 */
async function getProFromLegacyTableById(proId: string): Promise<ProWithPlace | null> {
  try {
    const { data: pro, error } = await supabase
      .from("pro_providers")
      .select("*")
      .eq("id", proId)
      .single();

    if (error || !pro) {
      console.error("[Supabase] Get pro provider (legacy) by ID error:", error);
      return null;
    }

    return {
      id: pro.id,
      user_id: pro.user_id,
      place_id: null,
      provider_type: pro.provider_type,
      specialties: pro.specialties,
      services: null,
      service_areas: null,
      service_radius: pro.service_radius,
      years_experience: pro.years_experience,
      year_established: null,
      license_number: pro.license_number,
      license_state: pro.license_state,
      insurance_verified: null,
      background_check: null,
      highlights: null,
      bio: pro.bio,
      subscription_tier: pro.subscription_tier,
      subscription_status: pro.subscription_status,
      stripe_customer_id: pro.stripe_customer_id,
      stripe_subscription_id: pro.stripe_subscription_id,
      onboarding_completed: null,
      onboarding_step: null,
      profile_completion: null,
      is_active: pro.is_active,
      is_verified: pro.is_verified,
      is_featured: pro.is_featured,
      verified_at: pro.verified_at,
      created_at: pro.created_at,
      updated_at: pro.updated_at,
      business_name: pro.business_name,
      phone: pro.phone,
      email: pro.email,
      website: pro.website,
      address: pro.address,
      city: pro.city,
      state: pro.state,
      zip_code: pro.zip_code,
      latitude: pro.latitude,
      longitude: pro.longitude,
      description: pro.description,
      short_description: null,
      hours: pro.hours,
      photos: pro.photos,
      cover_photo: pro.cover_photo,
      logo: pro.logo_url || pro.profile_photo_url,
      category_id: null,
      category_name: null,
    };
  } catch (error) {
    console.error("[Supabase] Get pro provider (legacy) by ID error:", error);
    return null;
  }
}

/**
 * Update a Pro and their linked Place
 */
export async function updateProWithPlace(
  proId: string,
  proUpdates: Partial<any>,
  placeUpdates: Partial<any>,
  adminId: string
): Promise<boolean> {
  try {
    // Get the pro to find the place_id
    const { data: pro, error: fetchError } = await supabase
      .from("pros")
      .select("place_id")
      .eq("id", proId)
      .single();

    if (fetchError) {
      // Fallback to legacy table
      return updateProLegacy(proId, { ...proUpdates, ...placeUpdates }, adminId);
    }

    // Update pros table
    if (Object.keys(proUpdates).length > 0) {
      const { error: proError } = await supabase
        .from("pros")
        .update({
          ...proUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", proId);

      if (proError) {
        console.error("[Supabase] Update pro error:", proError);
        return false;
      }
    }

    // Update places table
    if (pro?.place_id && Object.keys(placeUpdates).length > 0) {
      const { error: placeError } = await supabase
        .from("places")
        .update({
          ...placeUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pro.place_id);

      if (placeError) {
        console.error("[Supabase] Update place error:", placeError);
        return false;
      }
    }

    // Log admin activity
    await logAdminActivity(adminId, "pro_updated", proId, "pro", JSON.stringify({ proUpdates, placeUpdates }));
    return true;
  } catch (error) {
    console.error("[Supabase] Update pro with place error:", error);
    return false;
  }
}

/**
 * Fallback to update legacy pro_providers table
 */
async function updateProLegacy(
  proId: string,
  updates: Partial<any>,
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
      console.error("[Supabase] Update pro provider (legacy) error:", error);
      return false;
    }

    await logAdminActivity(adminId, "pro_updated", proId, "pro_provider", JSON.stringify(updates));
    return true;
  } catch (error) {
    console.error("[Supabase] Update pro provider (legacy) error:", error);
    return false;
  }
}

/**
 * Verify a Pro (updates both pros and places tables)
 */
export async function verifyPro(proId: string, adminId: string): Promise<boolean> {
  try {
    // Try new tables first
    const { data: pro, error: fetchError } = await supabase
      .from("pros")
      .select("place_id")
      .eq("id", proId)
      .single();

    if (fetchError) {
      // Fallback to legacy
      return verifyProLegacy(proId, adminId);
    }

    // Update pros table
    const { error: proError } = await supabase
      .from("pros")
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", proId);

    if (proError) {
      console.error("[Supabase] Verify pro error:", proError);
      return false;
    }

    // Also update the linked place
    if (pro?.place_id) {
      await supabase
        .from("places")
        .update({
          is_verified: true,
          verification_method: "admin",
          updated_at: new Date().toISOString(),
        })
        .eq("id", pro.place_id);
    }

    await logAdminActivity(adminId, "pro_verified", proId, "pro");
    return true;
  } catch (error) {
    console.error("[Supabase] Verify pro error:", error);
    return verifyProLegacy(proId, adminId);
  }
}

async function verifyProLegacy(proId: string, adminId: string): Promise<boolean> {
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
      console.error("[Supabase] Verify pro (legacy) error:", error);
      return false;
    }

    await logAdminActivity(adminId, "pro_verified", proId, "pro_provider");
    return true;
  } catch (error) {
    console.error("[Supabase] Verify pro (legacy) error:", error);
    return false;
  }
}

/**
 * Unverify a Pro
 */
export async function unverifyPro(proId: string, adminId: string): Promise<boolean> {
  try {
    const { data: pro, error: fetchError } = await supabase
      .from("pros")
      .select("place_id")
      .eq("id", proId)
      .single();

    if (fetchError) {
      return unverifyProLegacy(proId, adminId);
    }

    const { error: proError } = await supabase
      .from("pros")
      .update({
        is_verified: false,
        verified_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proId);

    if (proError) {
      console.error("[Supabase] Unverify pro error:", proError);
      return false;
    }

    if (pro?.place_id) {
      await supabase
        .from("places")
        .update({
          is_verified: false,
          verification_method: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pro.place_id);
    }

    await logAdminActivity(adminId, "pro_unverified", proId, "pro");
    return true;
  } catch (error) {
    console.error("[Supabase] Unverify pro error:", error);
    return unverifyProLegacy(proId, adminId);
  }
}

async function unverifyProLegacy(proId: string, adminId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("pro_providers")
      .update({
        is_verified: false,
        verified_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proId);

    if (error) return false;
    await logAdminActivity(adminId, "pro_unverified", proId, "pro_provider");
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Activate a Pro
 */
export async function activatePro(proId: string, adminId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("pros")
      .update({
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proId);

    if (error) {
      // Fallback to legacy
      const { error: legacyError } = await supabase
        .from("pro_providers")
        .update({
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", proId);

      if (legacyError) return false;
    }

    await logAdminActivity(adminId, "pro_activated", proId, "pro");
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Deactivate a Pro
 */
export async function deactivatePro(proId: string, adminId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("pros")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proId);

    if (error) {
      const { error: legacyError } = await supabase
        .from("pro_providers")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", proId);

      if (legacyError) return false;
    }

    await logAdminActivity(adminId, "pro_deactivated", proId, "pro");
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Feature a Pro
 */
export async function featurePro(proId: string, adminId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("pros")
      .update({
        is_featured: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proId);

    if (error) {
      const { error: legacyError } = await supabase
        .from("pro_providers")
        .update({
          is_featured: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", proId);

      if (legacyError) return false;
    }

    await logAdminActivity(adminId, "pro_featured", proId, "pro");
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Unfeature a Pro
 */
export async function unfeaturePro(proId: string, adminId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("pros")
      .update({
        is_featured: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proId);

    if (error) {
      const { error: legacyError } = await supabase
        .from("pro_providers")
        .update({
          is_featured: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", proId);

      if (legacyError) return false;
    }

    await logAdminActivity(adminId, "pro_unfeatured", proId, "pro");
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get Pro stats (tries new tables first, falls back to legacy)
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
    // Try new tables first
    const [totalResult, verifiedResult, activeResult, featuredResult, realtorResult, contractorResult, onTheGoResult] = await Promise.all([
      supabase.from("pros").select("*", { count: "exact", head: true }),
      supabase.from("pros").select("*", { count: "exact", head: true }).eq("is_verified", true),
      supabase.from("pros").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("pros").select("*", { count: "exact", head: true }).eq("is_featured", true),
      supabase.from("pros").select("*", { count: "exact", head: true }).eq("provider_type", "realtor"),
      supabase.from("pros").select("*", { count: "exact", head: true }).eq("provider_type", "pro"),
      supabase.from("pros").select("*", { count: "exact", head: true }).eq("provider_type", "on_the_go"),
    ]);

    // If new tables work, return those stats
    if (!totalResult.error) {
      // Get average completion
      const { data: completionData } = await supabase
        .from("pros")
        .select("profile_completion")
        .not("profile_completion", "is", null);

      const avgCompletion = completionData && completionData.length > 0
        ? Math.round(completionData.reduce((sum: number, p: any) => sum + (p.profile_completion || 0), 0) / completionData.length)
        : 0;

      return {
        totalPros: totalResult.count || 0,
        verifiedPros: verifiedResult.count || 0,
        activePros: activeResult.count || 0,
        featuredPros: featuredResult.count || 0,
        realtors: realtorResult.count || 0,
        contractors: contractorResult.count || 0,
        onTheGo: onTheGoResult.count || 0,
        avgCompletion,
      };
    }

    // Fallback to legacy table
    const [legacyTotal, legacyVerified, legacyActive, legacyFeatured, legacyRealtor, legacyContractor] = await Promise.all([
      supabase.from("pro_providers").select("*", { count: "exact", head: true }),
      supabase.from("pro_providers").select("*", { count: "exact", head: true }).eq("is_verified", true),
      supabase.from("pro_providers").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("pro_providers").select("*", { count: "exact", head: true }).eq("is_featured", true),
      supabase.from("pro_providers").select("*", { count: "exact", head: true }).eq("provider_type", "realtor"),
      supabase.from("pro_providers").select("*", { count: "exact", head: true }).eq("provider_type", "contractor"),
    ]);

    return {
      totalPros: legacyTotal.count || 0,
      verifiedPros: legacyVerified.count || 0,
      activePros: legacyActive.count || 0,
      featuredPros: legacyFeatured.count || 0,
      realtors: legacyRealtor.count || 0,
      contractors: legacyContractor.count || 0,
      onTheGo: 0,
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
    // Try new tables first
    const { data, error } = await supabase
      .from("pros")
      .select("provider_type")
      .not("provider_type", "is", null);

    if (!error && data) {
      const types = [...new Set(data.map((d: any) => d.provider_type).filter(Boolean))];
      return types.length > 0 ? types : ["pro", "realtor", "on_the_go"];
    }

    // Fallback to legacy
    const { data: legacyData } = await supabase
      .from("pro_providers")
      .select("provider_type")
      .not("provider_type", "is", null);

    if (legacyData) {
      return [...new Set(legacyData.map((d: any) => d.provider_type).filter(Boolean))];
    }

    return ["pro", "realtor", "on_the_go"];
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
