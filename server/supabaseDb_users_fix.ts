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
