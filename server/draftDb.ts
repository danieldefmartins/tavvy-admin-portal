import { supabase } from "./supabaseDb";

// ============ CONTENT DRAFTS ============

export type ContentType = 'business' | 'universe' | 'city' | 'rv_campground' | 'event' | 'quick_add';
export type ContentSubtype = 
  | 'physical' | 'service' | 'on_the_go'
  | 'new_universe' | 'spot_in_universe'
  | 'rv_park' | 'campground' | 'boondocking' | 'overnight_parking'
  | 'restroom' | 'parking' | 'atm' | 'water_fountain' | 'pet_relief' | 'photo_spot';

export type DraftStatus = 
  | 'draft_location'
  | 'draft_type_selected'
  | 'draft_subtype_selected'
  | 'draft_details'
  | 'draft_review'
  | 'submitted'
  | 'failed';

export type SyncStatus = 'synced' | 'pending' | 'failed';

export interface ContentDraft {
  id: string;
  user_id: string;
  status: DraftStatus;
  current_step: number;
  latitude: number | null;
  longitude: number | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string | null;
  formatted_address: string | null;
  content_type: ContentType | null;
  content_subtype: ContentSubtype | null;
  data: Record<string, any>;
  photos: string[];
  cover_photo: string | null;
  created_at: string;
  updated_at: string;
  remind_later_until: string | null;
  is_offline: boolean;
  offline_created_at: string | null;
  sync_status: SyncStatus;
}

export interface CreateDraftInput {
  latitude: number;
  longitude: number;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country?: string;
  formatted_address?: string;
  is_offline?: boolean;
  offline_created_at?: string;
}

export interface UpdateDraftInput {
  status?: DraftStatus;
  current_step?: number;
  latitude?: number;
  longitude?: number;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country?: string;
  formatted_address?: string;
  content_type?: ContentType;
  content_subtype?: ContentSubtype;
  data?: Record<string, any>;
  photos?: string[];
  cover_photo?: string;
  remind_later_until?: string | null;
  sync_status?: SyncStatus;
}

export async function createDraft(
  userId: string,
  input: CreateDraftInput
): Promise<ContentDraft | null> {
  try {
    const { data, error } = await supabase
      .from("content_drafts")
      .insert({
        user_id: userId,
        status: 'draft_location',
        current_step: 1,
        latitude: input.latitude,
        longitude: input.longitude,
        address_line1: input.address_line1 || null,
        address_line2: input.address_line2 || null,
        city: input.city || null,
        region: input.region || null,
        postal_code: input.postal_code || null,
        country: input.country || null,
        formatted_address: input.formatted_address || null,
        is_offline: input.is_offline || false,
        offline_created_at: input.offline_created_at || null,
        sync_status: input.is_offline ? 'pending' : 'synced',
        data: {},
        photos: [],
      })
      .select()
      .single();

    if (error) {
      console.error("[DraftDb] Create draft error:", error);
      return null;
    }
    return data as ContentDraft;
  } catch (error) {
    console.error("[DraftDb] Create draft exception:", error);
    return null;
  }
}

export async function getDraftById(
  draftId: string,
  userId: string
): Promise<ContentDraft | null> {
  try {
    const { data, error } = await supabase
      .from("content_drafts")
      .select("*")
      .eq("id", draftId)
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("[DraftDb] Get draft error:", error);
      return null;
    }
    return data as ContentDraft;
  } catch (error) {
    console.error("[DraftDb] Get draft exception:", error);
    return null;
  }
}

export async function getActiveDraft(userId: string): Promise<ContentDraft | null> {
  try {
    const { data, error } = await supabase
      .from("content_drafts")
      .select("*")
      .eq("user_id", userId)
      .neq("status", "submitted")
      .is("remind_later_until", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[DraftDb] Get active draft error:", error);
      return null;
    }
    return data as ContentDraft | null;
  } catch (error) {
    console.error("[DraftDb] Get active draft exception:", error);
    return null;
  }
}

export async function getUserDrafts(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ drafts: ContentDraft[]; total: number }> {
  try {
    const { data, error, count } = await supabase
      .from("content_drafts")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .neq("status", "submitted")
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[DraftDb] Get user drafts error:", error);
      return { drafts: [], total: 0 };
    }
    return { drafts: data as ContentDraft[], total: count || 0 };
  } catch (error) {
    console.error("[DraftDb] Get user drafts exception:", error);
    return { drafts: [], total: 0 };
  }
}

export async function updateDraft(
  draftId: string,
  userId: string,
  updates: UpdateDraftInput
): Promise<ContentDraft | null> {
  try {
    let finalUpdates: any = { ...updates };
    
    if (updates.data) {
      const existing = await getDraftById(draftId, userId);
      if (existing) {
        finalUpdates.data = { ...existing.data, ...updates.data };
      }
    }

    const { data, error } = await supabase
      .from("content_drafts")
      .update(finalUpdates)
      .eq("id", draftId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("[DraftDb] Update draft error:", error);
      return null;
    }
    return data as ContentDraft;
  } catch (error) {
    console.error("[DraftDb] Update draft exception:", error);
    return null;
  }
}

export async function deleteDraft(
  draftId: string,
  userId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("content_drafts")
      .delete()
      .eq("id", draftId)
      .eq("user_id", userId);

    if (error) {
      console.error("[DraftDb] Delete draft error:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[DraftDb] Delete draft exception:", error);
    return false;
  }
}

export async function snoozeDraft(
  draftId: string,
  userId: string,
  hours: number = 24
): Promise<ContentDraft | null> {
  const remindAt = new Date();
  remindAt.setHours(remindAt.getHours() + hours);
  return updateDraft(draftId, userId, {
    remind_later_until: remindAt.toISOString(),
  });
}

export interface SubmitDraftResult {
  success: boolean;
  final_id?: string;
  final_table?: string;
  taps_earned?: number;
  error?: string;
}

export async function submitDraft(
  draftId: string,
  userId: string
): Promise<SubmitDraftResult> {
  try {
    const draft = await getDraftById(draftId, userId);
    if (!draft) {
      return { success: false, error: "Draft not found" };
    }

    if (!draft.latitude || !draft.longitude) {
      return { success: false, error: "Location is required" };
    }
    
    if (!draft.content_type) {
      return { success: false, error: "Content type is required" };
    }

    let result: SubmitDraftResult;
    
    switch (draft.content_type) {
      case 'business':
      case 'quick_add':
        result = await submitToTavvyPlaces(draft);
        break;
      case 'event':
        result = await submitToTavvyEvents(draft);
        break;
      case 'rv_campground':
        result = await submitToTavvyRvCampgrounds(draft);
        break;
      default:
        return { success: false, error: "Unknown content type" };
    }

    if (result.success) {
      await updateDraft(draftId, userId, { status: 'submitted' });
    }
    return result;
  } catch (error: any) {
    console.error("[DraftDb] Submit draft exception:", error);
    return { success: false, error: error.message || String(error) };
  }
}

async function submitToTavvyPlaces(draft: ContentDraft): Promise<SubmitDraftResult> {
  const { data, error } = await supabase
    .from("tavvy_places")
    .insert({
      name: draft.data?.name || draft.content_subtype || 'Place',
      description: draft.data?.description || null,
      tavvy_category: draft.data?.tavvy_category || draft.content_subtype || 'other',
      latitude: draft.latitude,
      longitude: draft.longitude,
      address: draft.address_line1,
      city: draft.city,
      region: draft.region,
      postcode: draft.postal_code,
      country: draft.country,
      phone: draft.data?.phone || null,
      email: draft.data?.email || null,
      website: draft.data?.website || null,
      photos: draft.photos,
      cover_image_url: draft.cover_photo,
      source: 'user',
      created_by: draft.user_id,
      place_type: draft.content_subtype === 'service' ? 'service' : 
                  draft.content_subtype === 'on_the_go' ? 'mobile' : 'fixed',
      is_quick_add: draft.content_type === 'quick_add',
      quick_add_type: draft.content_type === 'quick_add' ? draft.content_subtype : null,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, final_id: data.id, final_table: 'tavvy_places', taps_earned: 50 };
}

async function submitToTavvyEvents(draft: ContentDraft): Promise<SubmitDraftResult> {
  const { data, error } = await supabase
    .from("tavvy_events")
    .insert({
      name: draft.data?.name,
      description: draft.data?.description || null,
      latitude: draft.latitude,
      longitude: draft.longitude,
      address_line1: draft.address_line1,
      city: draft.city,
      region: draft.region,
      country: draft.country,
      formatted_address: draft.formatted_address,
      start_datetime: draft.data?.start_datetime,
      end_datetime: draft.data?.end_datetime || null,
      is_all_day: draft.data?.is_all_day || false,
      is_recurring: draft.data?.is_recurring || false,
      event_category: draft.data?.event_category,
      cover_photo: draft.cover_photo,
      photos: draft.photos,
      ticket_url: draft.data?.ticket_url || null,
      is_free: draft.data?.is_free !== false,
      created_by: draft.user_id,
      status: 'published',
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, final_id: data.id, final_table: 'tavvy_events', taps_earned: 50 };
}

async function submitToTavvyRvCampgrounds(draft: ContentDraft): Promise<SubmitDraftResult> {
  const { data, error } = await supabase
    .from("tavvy_rv_campgrounds")
    .insert({
      name: draft.data?.name,
      description: draft.data?.description || null,
      latitude: draft.latitude,
      longitude: draft.longitude,
      address_line1: draft.address_line1,
      city: draft.city,
      region: draft.region,
      country: draft.country,
      formatted_address: draft.formatted_address,
      campground_type: draft.content_subtype,
      amenities: draft.data?.amenities || {},
      has_electric: draft.data?.has_electric || false,
      has_water: draft.data?.has_water || false,
      has_sewer: draft.data?.has_sewer || false,
      has_wifi: draft.data?.has_wifi || false,
      price_per_night: draft.data?.price_per_night || null,
      phone: draft.data?.phone || null,
      website: draft.data?.website || null,
      cover_photo: draft.cover_photo,
      photos: draft.photos,
      created_by: draft.user_id,
      status: 'published',
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, final_id: data.id, final_table: 'tavvy_rv_campgrounds', taps_earned: 50 };
}

export async function getPendingOfflineDrafts(userId: string): Promise<ContentDraft[]> {
  try {
    const { data, error } = await supabase
      .from("content_drafts")
      .select("*")
      .eq("user_id", userId)
      .eq("sync_status", "pending")
      .order("offline_created_at", { ascending: true });

    if (error) {
      return [];
    }
    return data as ContentDraft[];
  } catch (error) {
    return [];
  }
}

export async function markDraftSynced(draftId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("content_drafts")
      .update({ sync_status: 'synced', is_offline: false })
      .eq("id", draftId)
      .eq("user_id", userId);
    return !error;
  } catch (error) {
    return false;
  }
}
