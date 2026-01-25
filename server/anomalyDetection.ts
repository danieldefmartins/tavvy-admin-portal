/**
 * Anomaly Detection Module
 * 
 * Detects and logs suspicious login patterns and security anomalies.
 * Provides alerting for security monitoring.
 */

import { supabaseAdmin } from "./supabaseAuth";
import { sendSecurityAlert, SecurityAlerts } from "./alertService";
import {
  analyzeTravelBetweenLogins,
  getLastKnownLocation,
  formatLocation,
} from "./geoipService";

// Anomaly types
export const AnomalyTypes = {
  BRUTE_FORCE: 'brute_force_attempt',
  NEW_DEVICE: 'new_device_login',
  NEW_LOCATION: 'new_ip_location',
  IMPOSSIBLE_TRAVEL: 'impossible_travel',
  UNUSUAL_TIME: 'unusual_login_time',
  MULTIPLE_FAILED: 'multiple_failed_logins',
  SESSION_HIJACK: 'potential_session_hijack',
  CONCURRENT_SESSIONS: 'concurrent_session_limit',
} as const;

// Severity levels
export const SeverityLevels = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export interface AnomalyDetails {
  userId?: string;
  userEmail?: string;
  anomalyType: string;
  severity: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}

// In-memory store for tracking failed login attempts (per IP)
const failedLoginAttempts = new Map<string, { count: number; firstAttempt: number }>();

// Configuration
const FAILED_LOGIN_THRESHOLD = 5; // Number of failed attempts before flagging
const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const BRUTE_FORCE_THRESHOLD = 10; // Number of attempts that indicate brute force

/**
 * Log an anomaly to the database and send alerts for critical/high severity
 */
export async function logAnomaly(anomaly: AnomalyDetails): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('login_anomalies')
      .insert({
        user_id: anomaly.userId || null,
        user_email: anomaly.userEmail || null,
        anomaly_type: anomaly.anomalyType,
        severity: anomaly.severity,
        ip_address: anomaly.ipAddress || null,
        user_agent: anomaly.userAgent || null,
        details: anomaly.details || {},
      });

    if (error) {
      console.error('[AnomalyDetection] Failed to log anomaly:', error);
      return false;
    }

    console.warn(`[AnomalyDetection] ${anomaly.severity.toUpperCase()} anomaly detected: ${anomaly.anomalyType}`, {
      user: anomaly.userEmail,
      ip: anomaly.ipAddress,
    });

    // Send alerts for critical and high severity anomalies
    if (anomaly.severity === SeverityLevels.CRITICAL || anomaly.severity === SeverityLevels.HIGH) {
      // Fire and forget - don't block on alert sending
      sendSecurityAlert({
        title: anomaly.anomalyType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        severity: anomaly.severity as 'low' | 'medium' | 'high' | 'critical',
        description: `Security anomaly detected: ${anomaly.anomalyType}`,
        userId: anomaly.userId,
        userEmail: anomaly.userEmail,
        ipAddress: anomaly.ipAddress,
        userAgent: anomaly.userAgent,
        timestamp: new Date(),
        details: anomaly.details,
      }).catch(err => console.error('[AnomalyDetection] Failed to send alert:', err));
    }

    return true;
  } catch (err) {
    console.error('[AnomalyDetection] Exception logging anomaly:', err);
    return false;
  }
}

/**
 * Track a failed login attempt and detect brute force patterns
 */
export async function trackFailedLogin(
  email: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const key = ipAddress || 'unknown';
  const now = Date.now();

  // Get or create entry for this IP
  let entry = failedLoginAttempts.get(key);
  
  if (!entry || (now - entry.firstAttempt) > FAILED_LOGIN_WINDOW_MS) {
    // Reset if window expired
    entry = { count: 1, firstAttempt: now };
  } else {
    entry.count++;
  }
  
  failedLoginAttempts.set(key, entry);

  // Check for anomalies
  if (entry.count >= BRUTE_FORCE_THRESHOLD) {
    await logAnomaly({
      userEmail: email,
      anomalyType: AnomalyTypes.BRUTE_FORCE,
      severity: SeverityLevels.CRITICAL,
      ipAddress,
      userAgent,
      details: {
        attemptCount: entry.count,
        windowMinutes: FAILED_LOGIN_WINDOW_MS / 60000,
        targetEmail: email,
      },
    });
  } else if (entry.count >= FAILED_LOGIN_THRESHOLD) {
    await logAnomaly({
      userEmail: email,
      anomalyType: AnomalyTypes.MULTIPLE_FAILED,
      severity: SeverityLevels.MEDIUM,
      ipAddress,
      userAgent,
      details: {
        attemptCount: entry.count,
        windowMinutes: FAILED_LOGIN_WINDOW_MS / 60000,
      },
    });
  }
}

/**
 * Clear failed login tracking for an IP after successful login
 */
export function clearFailedLoginTracking(ipAddress?: string): void {
  if (ipAddress) {
    failedLoginAttempts.delete(ipAddress);
  }
}

/**
 * Check for new device login
 */
export async function checkNewDevice(
  userId: string,
  userEmail: string,
  deviceFingerprint: string,
  ipAddress?: string,
  userAgent?: string
): Promise<boolean> {
  try {
    // Check if this device fingerprint has been seen before for this user
    const { data: existingSessions, error } = await supabaseAdmin
      .from('user_sessions')
      .select('device_fingerprint')
      .eq('user_id', userId)
      .eq('device_fingerprint', deviceFingerprint)
      .limit(1);

    if (error) {
      console.error('[AnomalyDetection] Error checking device:', error);
      return false;
    }

    // If no existing sessions with this fingerprint, it's a new device
    if (!existingSessions || existingSessions.length === 0) {
      await logAnomaly({
        userId,
        userEmail,
        anomalyType: AnomalyTypes.NEW_DEVICE,
        severity: SeverityLevels.LOW,
        ipAddress,
        userAgent,
        details: {
          deviceFingerprint,
          message: 'Login from a new device detected',
        },
      });
      return true;
    }

    return false;
  } catch (err) {
    console.error('[AnomalyDetection] Exception checking device:', err);
    return false;
  }
}

/**
 * Check for login from new IP address
 */
export async function checkNewIPAddress(
  userId: string,
  userEmail: string,
  ipAddress?: string,
  userAgent?: string
): Promise<boolean> {
  if (!ipAddress) return false;

  try {
    // Check if this IP has been seen before for this user
    const { data: existingSessions, error } = await supabaseAdmin
      .from('user_sessions')
      .select('ip_address')
      .eq('user_id', userId)
      .eq('ip_address', ipAddress)
      .limit(1);

    if (error) {
      console.error('[AnomalyDetection] Error checking IP:', error);
      return false;
    }

    // If no existing sessions from this IP, it's a new location
    if (!existingSessions || existingSessions.length === 0) {
      await logAnomaly({
        userId,
        userEmail,
        anomalyType: AnomalyTypes.NEW_LOCATION,
        severity: SeverityLevels.LOW,
        ipAddress,
        userAgent,
        details: {
          newIpAddress: ipAddress,
          message: 'Login from a new IP address detected',
        },
      });
      return true;
    }

    return false;
  } catch (err) {
    console.error('[AnomalyDetection] Exception checking IP:', err);
    return false;
  }
}

/**
 * Check for impossible travel (geographic anomaly)
 */
export async function checkImpossibleTravel(
  userId: string,
  userEmail: string,
  currentIp?: string,
  userAgent?: string
): Promise<boolean> {
  if (!currentIp) return false;

  try {
    // Get last known location
    const lastLocation = await getLastKnownLocation(userId, supabaseAdmin);
    if (!lastLocation) {
      return false;
    }

    // Analyze travel
    const analysis = await analyzeTravelBetweenLogins(
      lastLocation.ip,
      currentIp,
      lastLocation.timestamp,
      new Date()
    );

    if (!analysis) {
      return false;
    }

    // Log if impossible travel detected
    if (analysis.isImpossible && analysis.confidence !== 'low') {
      const fromLocationStr = formatLocation(analysis.fromLocation);
      const toLocationStr = formatLocation(analysis.toLocation);

      await logAnomaly({
        userId,
        userEmail,
        anomalyType: AnomalyTypes.IMPOSSIBLE_TRAVEL,
        severity: analysis.confidence === 'high' ? SeverityLevels.CRITICAL : SeverityLevels.HIGH,
        ipAddress: currentIp,
        userAgent,
        details: {
          fromLocation: fromLocationStr,
          toLocation: toLocationStr,
          fromIp: lastLocation.ip,
          toIp: currentIp,
          distanceKm: Math.round(analysis.distanceKm),
          timeMinutes: Math.round(analysis.timeMinutes),
          requiredSpeedKmh: Math.round(analysis.requiredSpeedKmh),
          confidence: analysis.confidence,
          message: `Login from ${toLocationStr} only ${Math.round(analysis.timeMinutes)} minutes after login from ${fromLocationStr}`,
        },
      });

      // Send specific impossible travel alert
      sendSecurityAlert(
        SecurityAlerts.impossibleTravel(
          userId,
          userEmail,
          fromLocationStr,
          toLocationStr,
          analysis.distanceKm,
          analysis.timeMinutes,
          currentIp
        )
      ).catch(err => console.error('[AnomalyDetection] Failed to send impossible travel alert:', err));

      return true;
    }

    return false;
  } catch (err) {
    console.error('[AnomalyDetection] Exception checking impossible travel:', err);
    return false;
  }
}

/**
 * Run all anomaly checks for a login
 */
export async function runLoginAnomalyChecks(
  userId: string,
  userEmail: string,
  deviceFingerprint: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ anomaliesDetected: string[] }> {
  const anomaliesDetected: string[] = [];

  // Clear failed login tracking on successful login
  clearFailedLoginTracking(ipAddress);

  // Check for new device
  const isNewDevice = await checkNewDevice(userId, userEmail, deviceFingerprint, ipAddress, userAgent);
  if (isNewDevice) {
    anomaliesDetected.push(AnomalyTypes.NEW_DEVICE);
  }

  // Check for new IP
  const isNewIP = await checkNewIPAddress(userId, userEmail, ipAddress, userAgent);
  if (isNewIP) {
    anomaliesDetected.push(AnomalyTypes.NEW_LOCATION);
  }

  // Check for impossible travel (only if we have an IP)
  if (ipAddress) {
    const isImpossibleTravel = await checkImpossibleTravel(userId, userEmail, ipAddress, userAgent);
    if (isImpossibleTravel) {
      anomaliesDetected.push(AnomalyTypes.IMPOSSIBLE_TRAVEL);
    }
  }

  return { anomaliesDetected };
}

/**
 * Get unacknowledged anomalies for admin dashboard
 */
export async function getUnacknowledgedAnomalies(limit: number = 50): Promise<AnomalyDetails[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('login_anomalies')
      .select('*')
      .is('acknowledged_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[AnomalyDetection] Error fetching anomalies:', error);
      return [];
    }

    return data.map(a => ({
      userId: a.user_id,
      userEmail: a.user_email,
      anomalyType: a.anomaly_type,
      severity: a.severity,
      ipAddress: a.ip_address,
      userAgent: a.user_agent,
      details: a.details,
    }));
  } catch (err) {
    console.error('[AnomalyDetection] Exception fetching anomalies:', err);
    return [];
  }
}

/**
 * Acknowledge an anomaly
 */
export async function acknowledgeAnomaly(
  anomalyId: string,
  acknowledgedBy: string
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('login_anomalies')
      .update({
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: acknowledgedBy,
      })
      .eq('id', anomalyId);

    if (error) {
      console.error('[AnomalyDetection] Error acknowledging anomaly:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[AnomalyDetection] Exception acknowledging anomaly:', err);
    return false;
  }
}

// Cleanup old entries periodically (every 30 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of failedLoginAttempts.entries()) {
    if ((now - entry.firstAttempt) > FAILED_LOGIN_WINDOW_MS) {
      failedLoginAttempts.delete(key);
    }
  }
}, 30 * 60 * 1000);
