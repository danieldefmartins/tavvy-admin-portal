import { createClient, SupabaseClient, User } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

/**
 * Get Supabase client for authentication
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!_supabase) {
    const url = process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || (!anonKey && !serviceKey)) {
      console.warn("[Supabase Auth] Missing VITE_SUPABASE_URL or keys");
      return null;
    }

    // Use service role key if available (server-side), otherwise anon key
    _supabase = createClient(url, serviceKey || anonKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _supabase;
}

/**
 * Verify a Supabase JWT token and return the user
 */
export async function verifySupabaseToken(token: string): Promise<User | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      console.warn("[Supabase Auth] Token verification failed:", error?.message);
      return null;
    }
    return data.user;
  } catch (error) {
    console.error("[Supabase Auth] Error verifying token:", error);
    return null;
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ user: User | null; session: any; error: string | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { user: null, session: null, error: "Supabase not configured" };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { user: null, session: null, error: error.message };
    }

    return { user: data.user, session: data.session, error: null };
  } catch (error) {
    return { user: null, session: null, error: "Sign in failed" };
  }
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  metadata?: { full_name?: string }
): Promise<{ user: User | null; session: any; error: string | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { user: null, session: null, error: "Supabase not configured" };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (error) {
      return { user: null, session: null, error: error.message };
    }

    return { user: data.user, session: data.session, error: null };
  } catch (error) {
    return { user: null, session: null, error: "Sign up failed" };
  }
}

/**
 * Sign out
 */
export async function signOut(token: string): Promise<{ error: string | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { error: "Supabase not configured" };
  }

  try {
    const { error } = await supabase.auth.admin.signOut(token);
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (error) {
    return { error: "Sign out failed" };
  }
}

/**
 * Get user by ID (admin function)
 */
export async function getUserById(userId: string): Promise<User | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error || !data.user) {
      return null;
    }
    return data.user;
  } catch (error) {
    return null;
  }
}
