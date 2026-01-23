/**
 * Audit Logging Module
 * 
 * Provides centralized audit logging for sensitive operations.
 * All logs are stored in the audit_log table in Supabase.
 */

import { supabaseAdmin } from "./supabaseDb";

export interface AuditLogEntry {
  userId?: string;
  userEmail?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
}

// Action types for consistency
export const AuditActions = {
  // Authentication
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  
  // Role management
  ROLE_GRANTED: 'role_granted',
  ROLE_REVOKED: 'role_revoked',
  
  // Content moderation
  CONTENT_APPROVED: 'content_approved',
  CONTENT_REJECTED: 'content_rejected',
  CONTENT_DELETED: 'content_deleted',
  
  // User management
  USER_BANNED: 'user_banned',
  USER_UNBANNED: 'user_unbanned',
  USER_DELETED: 'user_deleted',
  
  // Data operations
  BULK_IMPORT: 'bulk_import',
  BULK_DELETE: 'bulk_delete',
  DATA_EXPORT: 'data_export',
  
  // Settings changes
  SETTINGS_UPDATED: 'settings_updated',
  
  // Place management
  PLACE_CREATED: 'place_created',
  PLACE_UPDATED: 'place_updated',
  PLACE_DELETED: 'place_deleted',
  
  // Review management
  REVIEW_APPROVED: 'review_approved',
  REVIEW_REJECTED: 'review_rejected',
  REVIEW_DELETED: 'review_deleted',
} as const;

// Resource types for consistency
export const ResourceTypes = {
  USER: 'user',
  ROLE: 'user_roles',
  PLACE: 'place',
  REVIEW: 'review',
  ARTICLE: 'article',
  CONTENT_FLAG: 'content_flag',
  SETTINGS: 'settings',
  SUBSCRIPTION: 'subscription',
} as const;

/**
 * Log an audit event
 * 
 * @param entry - The audit log entry to record
 * @returns Promise<boolean> - Whether the log was successfully recorded
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('audit_log')
      .insert({
        user_id: entry.userId || null,
        user_email: entry.userEmail || null,
        action: entry.action,
        resource_type: entry.resourceType,
        resource_id: entry.resourceId || null,
        details: entry.details || {},
        ip_address: entry.ipAddress || null,
        user_agent: entry.userAgent || null,
        success: entry.success !== false, // Default to true
        error_message: entry.errorMessage || null,
      });

    if (error) {
      console.error('[AuditLog] Failed to write audit log:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[AuditLog] Exception writing audit log:', err);
    return false;
  }
}

/**
 * Log a successful login
 */
export async function logLogin(
  userId: string,
  email: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuditEvent({
    userId,
    userEmail: email,
    action: AuditActions.LOGIN_SUCCESS,
    resourceType: ResourceTypes.USER,
    resourceId: userId,
    ipAddress,
    userAgent,
  });
}

/**
 * Log a failed login attempt
 */
export async function logFailedLogin(
  email: string,
  reason: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuditEvent({
    userEmail: email,
    action: AuditActions.LOGIN_FAILED,
    resourceType: ResourceTypes.USER,
    details: { reason },
    ipAddress,
    userAgent,
    success: false,
    errorMessage: reason,
  });
}

/**
 * Log a content moderation action
 */
export async function logModerationAction(
  adminUserId: string,
  adminEmail: string,
  action: string,
  resourceType: string,
  resourceId: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAuditEvent({
    userId: adminUserId,
    userEmail: adminEmail,
    action,
    resourceType,
    resourceId,
    details,
  });
}

/**
 * Log a bulk operation
 */
export async function logBulkOperation(
  adminUserId: string,
  adminEmail: string,
  action: string,
  resourceType: string,
  count: number,
  details?: Record<string, unknown>
): Promise<void> {
  await logAuditEvent({
    userId: adminUserId,
    userEmail: adminEmail,
    action,
    resourceType,
    details: {
      ...details,
      affected_count: count,
    },
  });
}
