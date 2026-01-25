/**
 * Session Management Module
 * 
 * Provides session tracking, concurrent session limits, and session security.
 * Works alongside Supabase Auth for enhanced session control.
 */

import { supabaseAdmin } from "./supabaseAuth";
import crypto from "crypto";

// Configuration
const MAX_CONCURRENT_SESSIONS = 3; // Maximum active sessions per user
const SESSION_DURATION_HOURS = 24; // Session duration in hours

export interface SessionInfo {
  id: string;
  userId: string;
  sessionToken: string;
  refreshToken?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
}

export interface CreateSessionResult {
  success: boolean;
  session?: SessionInfo;
  revokedSessionId?: string; // If an old session was revoked to make room
  error?: string;
}

/**
 * Generate a secure random token
 */
function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a device fingerprint from request info
 */
export function generateDeviceFingerprint(userAgent?: string, ipAddress?: string): string {
  const data = `${userAgent || 'unknown'}-${ipAddress || 'unknown'}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}

/**
 * Create a new session for a user
 * Enforces concurrent session limits by revoking oldest session if needed
 */
export async function createSession(
  userId: string,
  supabaseAccessToken: string,
  ipAddress?: string,
  userAgent?: string
): Promise<CreateSessionResult> {
  try {
    // Count current active sessions
    const { data: countData, error: countError } = await supabaseAdmin
      .rpc('count_active_sessions', { p_user_id: userId });

    if (countError) {
      console.error('[SessionManager] Error counting sessions:', countError);
      return { success: false, error: 'Failed to check session count' };
    }

    const activeSessionCount = countData || 0;
    let revokedSessionId: string | undefined;

    // If at limit, revoke oldest session
    if (activeSessionCount >= MAX_CONCURRENT_SESSIONS) {
      const { data: revokedId, error: revokeError } = await supabaseAdmin
        .rpc('revoke_oldest_session', { p_user_id: userId });

      if (revokeError) {
        console.error('[SessionManager] Error revoking old session:', revokeError);
        // Continue anyway - we'll try to create the new session
      } else {
        revokedSessionId = revokedId;
        console.log(`[SessionManager] Revoked oldest session ${revokedId} for user ${userId}`);
      }
    }

    // Create new session
    const sessionToken = generateToken();
    const refreshToken = generateToken();
    const deviceFingerprint = generateDeviceFingerprint(userAgent, ipAddress);
    const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);

    const { data: session, error: insertError } = await supabaseAdmin
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_token: supabaseAccessToken, // Use Supabase token as session token
        refresh_token: refreshToken,
        ip_address: ipAddress,
        user_agent: userAgent,
        device_fingerprint: deviceFingerprint,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('[SessionManager] Error creating session:', insertError);
      return { success: false, error: 'Failed to create session' };
    }

    return {
      success: true,
      session: {
        id: session.id,
        userId: session.user_id,
        sessionToken: session.session_token,
        refreshToken: session.refresh_token,
        ipAddress: session.ip_address,
        userAgent: session.user_agent,
        deviceFingerprint: session.device_fingerprint,
        createdAt: new Date(session.created_at),
        lastActivityAt: new Date(session.last_activity_at),
        expiresAt: new Date(session.expires_at),
      },
      revokedSessionId,
    };
  } catch (err) {
    console.error('[SessionManager] Exception creating session:', err);
    return { success: false, error: 'Internal error creating session' };
  }
}

/**
 * Validate a session token
 */
export async function validateSession(sessionToken: string): Promise<SessionInfo | null> {
  try {
    const { data: session, error } = await supabaseAdmin
      .from('user_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error || !session) {
      return null;
    }

    // Update last activity
    await supabaseAdmin
      .from('user_sessions')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', session.id);

    return {
      id: session.id,
      userId: session.user_id,
      sessionToken: session.session_token,
      refreshToken: session.refresh_token,
      ipAddress: session.ip_address,
      userAgent: session.user_agent,
      deviceFingerprint: session.device_fingerprint,
      createdAt: new Date(session.created_at),
      lastActivityAt: new Date(session.last_activity_at),
      expiresAt: new Date(session.expires_at),
    };
  } catch (err) {
    console.error('[SessionManager] Exception validating session:', err);
    return null;
  }
}

/**
 * Revoke a specific session
 */
export async function revokeSession(
  sessionId: string,
  reason: string = 'user_logout'
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('user_sessions')
      .update({
        revoked_at: new Date().toISOString(),
        revoked_reason: reason,
      })
      .eq('id', sessionId);

    if (error) {
      console.error('[SessionManager] Error revoking session:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[SessionManager] Exception revoking session:', err);
    return false;
  }
}

/**
 * Revoke all sessions for a user
 */
export async function revokeAllUserSessions(
  userId: string,
  reason: string = 'user_logout_all'
): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_sessions')
      .update({
        revoked_at: new Date().toISOString(),
        revoked_reason: reason,
      })
      .eq('user_id', userId)
      .is('revoked_at', null)
      .select();

    if (error) {
      console.error('[SessionManager] Error revoking all sessions:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (err) {
    console.error('[SessionManager] Exception revoking all sessions:', err);
    return 0;
  }
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: string): Promise<SessionInfo[]> {
  try {
    const { data: sessions, error } = await supabaseAdmin
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error || !sessions) {
      return [];
    }

    return sessions.map(s => ({
      id: s.id,
      userId: s.user_id,
      sessionToken: s.session_token,
      refreshToken: s.refresh_token,
      ipAddress: s.ip_address,
      userAgent: s.user_agent,
      deviceFingerprint: s.device_fingerprint,
      createdAt: new Date(s.created_at),
      lastActivityAt: new Date(s.last_activity_at),
      expiresAt: new Date(s.expires_at),
    }));
  } catch (err) {
    console.error('[SessionManager] Exception getting user sessions:', err);
    return [];
  }
}

/**
 * Revoke session by token (for logout)
 */
export async function revokeSessionByToken(
  sessionToken: string,
  reason: string = 'user_logout'
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('user_sessions')
      .update({
        revoked_at: new Date().toISOString(),
        revoked_reason: reason,
      })
      .eq('session_token', sessionToken);

    if (error) {
      console.error('[SessionManager] Error revoking session by token:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[SessionManager] Exception revoking session by token:', err);
    return false;
  }
}
