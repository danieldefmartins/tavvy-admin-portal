/**
 * Token Rotation Service
 * 
 * Implements refresh token rotation for enhanced security.
 * Each refresh token can only be used once; using it generates a new token pair.
 * If an old token is reused, it indicates potential token theft and all tokens are revoked.
 */

import crypto from "crypto";
import { supabaseAdmin } from "./supabaseDb";
import { logAnomaly, AnomalyTypes, SeverityLevels } from "./anomalyDetection";

// Configuration
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const ACCESS_TOKEN_EXPIRY_HOURS = 1;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  refreshExpiresAt: Date;
}

export interface RefreshResult {
  success: boolean;
  tokenPair?: TokenPair;
  error?: string;
  securityAlert?: boolean;
}

/**
 * Generate a cryptographically secure token
 */
function generateToken(length: number = 48): string {
  return crypto.randomBytes(length).toString('base64url');
}

/**
 * Hash a token for secure storage
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Create a new refresh token for a user
 */
export async function createRefreshToken(
  userId: string,
  sessionId?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ token: string; expiresAt: Date } | null> {
  try {
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const { error } = await supabaseAdmin
      .from('refresh_tokens')
      .insert({
        user_id: userId,
        token_hash: tokenHash,
        session_id: sessionId || null,
        expires_at: expiresAt.toISOString(),
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
      });

    if (error) {
      console.error('[TokenRotation] Error creating refresh token:', error);
      return null;
    }

    return { token, expiresAt };
  } catch (err) {
    console.error('[TokenRotation] Exception creating refresh token:', err);
    return null;
  }
}

/**
 * Validate and rotate a refresh token
 * Returns new token pair if valid, or triggers security alert if token was already used
 */
export async function rotateRefreshToken(
  refreshToken: string,
  ipAddress?: string,
  userAgent?: string
): Promise<RefreshResult> {
  const tokenHash = hashToken(refreshToken);

  try {
    // Find the token
    const { data: existingToken, error: findError } = await supabaseAdmin
      .from('refresh_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (findError) {
      console.error('[TokenRotation] Error finding token:', findError);
      return { success: false, error: 'Internal error' };
    }

    // Token not found
    if (!existingToken) {
      return { success: false, error: 'Invalid refresh token' };
    }

    // Check if token was already used (potential theft!)
    if (existingToken.used_at) {
      console.error('[TokenRotation] SECURITY ALERT: Reuse of already-used refresh token detected!');
      
      // Revoke ALL tokens for this user (security measure)
      await revokeAllUserTokens(existingToken.user_id, 'token_reuse_detected');

      // Log security anomaly
      await logAnomaly({
        userId: existingToken.user_id,
        anomalyType: AnomalyTypes.SESSION_HIJACK,
        severity: SeverityLevels.CRITICAL,
        ipAddress,
        userAgent,
        details: {
          originalTokenCreated: existingToken.created_at,
          originalTokenUsed: existingToken.used_at,
          reuseAttemptedAt: new Date().toISOString(),
          originalIp: existingToken.ip_address,
          reuseIp: ipAddress,
          message: 'Refresh token reuse detected - possible session hijacking',
        },
      });

      return { 
        success: false, 
        error: 'Session invalidated for security reasons. Please log in again.',
        securityAlert: true,
      };
    }

    // Check if token is expired
    if (new Date(existingToken.expires_at) < new Date()) {
      return { success: false, error: 'Refresh token expired' };
    }

    // Check if token was revoked
    if (existingToken.revoked_at) {
      return { success: false, error: 'Refresh token has been revoked' };
    }

    // Mark current token as used
    const { error: updateError } = await supabaseAdmin
      .from('refresh_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', existingToken.id);

    if (updateError) {
      console.error('[TokenRotation] Error marking token as used:', updateError);
      return { success: false, error: 'Internal error' };
    }

    // Create new refresh token
    const newRefreshToken = await createRefreshToken(
      existingToken.user_id,
      existingToken.session_id,
      ipAddress,
      userAgent
    );

    if (!newRefreshToken) {
      return { success: false, error: 'Failed to create new token' };
    }

    // Link old token to new one (for audit trail)
    // First get the new token's ID
    const { data: newTokenRecord } = await supabaseAdmin
      .from('refresh_tokens')
      .select('id')
      .eq('token_hash', hashToken(newRefreshToken.token))
      .single();

    if (newTokenRecord) {
      await supabaseAdmin
        .from('refresh_tokens')
        .update({ replaced_by: newTokenRecord.id })
        .eq('id', existingToken.id);
    }

    // Generate new access token (placeholder - actual implementation depends on your auth setup)
    const accessToken = generateToken(32);
    const accessExpiresAt = new Date(Date.now() + ACCESS_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    return {
      success: true,
      tokenPair: {
        accessToken,
        refreshToken: newRefreshToken.token,
        expiresAt: accessExpiresAt,
        refreshExpiresAt: newRefreshToken.expiresAt,
      },
    };
  } catch (err) {
    console.error('[TokenRotation] Exception rotating token:', err);
    return { success: false, error: 'Internal error' };
  }
}

/**
 * Revoke a specific refresh token
 */
export async function revokeRefreshToken(
  refreshToken: string,
  reason: string = 'user_logout'
): Promise<boolean> {
  const tokenHash = hashToken(refreshToken);

  try {
    const { error } = await supabaseAdmin
      .from('refresh_tokens')
      .update({
        revoked_at: new Date().toISOString(),
        revoked_reason: reason,
      })
      .eq('token_hash', tokenHash);

    if (error) {
      console.error('[TokenRotation] Error revoking token:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[TokenRotation] Exception revoking token:', err);
    return false;
  }
}

/**
 * Revoke all refresh tokens for a user
 */
export async function revokeAllUserTokens(
  userId: string,
  reason: string = 'user_logout_all'
): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin
      .from('refresh_tokens')
      .update({
        revoked_at: new Date().toISOString(),
        revoked_reason: reason,
      })
      .eq('user_id', userId)
      .is('revoked_at', null)
      .is('used_at', null)
      .select();

    if (error) {
      console.error('[TokenRotation] Error revoking all tokens:', error);
      return 0;
    }

    console.log(`[TokenRotation] Revoked ${data?.length || 0} tokens for user ${userId} (reason: ${reason})`);
    return data?.length || 0;
  } catch (err) {
    console.error('[TokenRotation] Exception revoking all tokens:', err);
    return 0;
  }
}

/**
 * Get active refresh tokens for a user (for admin view)
 */
export async function getUserActiveTokens(userId: string): Promise<Array<{
  id: string;
  createdAt: Date;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}>> {
  try {
    const { data, error } = await supabaseAdmin
      .from('refresh_tokens')
      .select('id, created_at, expires_at, ip_address, user_agent')
      .eq('user_id', userId)
      .is('revoked_at', null)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map(t => ({
      id: t.id,
      createdAt: new Date(t.created_at),
      expiresAt: new Date(t.expires_at),
      ipAddress: t.ip_address,
      userAgent: t.user_agent,
    }));
  } catch (err) {
    console.error('[TokenRotation] Exception getting user tokens:', err);
    return [];
  }
}

/**
 * Cleanup expired and old used tokens
 */
export async function cleanupOldTokens(): Promise<number> {
  try {
    // Delete tokens that are:
    // - Expired more than 7 days ago, OR
    // - Used more than 30 days ago, OR
    // - Revoked more than 30 days ago
    const cutoffExpired = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const cutoffUsed = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
      .from('refresh_tokens')
      .delete()
      .or(`expires_at.lt.${cutoffExpired},used_at.lt.${cutoffUsed},revoked_at.lt.${cutoffUsed}`)
      .select();

    if (error) {
      console.error('[TokenRotation] Error cleaning up tokens:', error);
      return 0;
    }

    if (data && data.length > 0) {
      console.log(`[TokenRotation] Cleaned up ${data.length} old tokens`);
    }

    return data?.length || 0;
  } catch (err) {
    console.error('[TokenRotation] Exception cleaning up tokens:', err);
    return 0;
  }
}

// Run cleanup periodically (every 6 hours)
setInterval(() => {
  cleanupOldTokens().catch(err => console.error('[TokenRotation] Cleanup error:', err));
}, 6 * 60 * 60 * 1000);
