/**
 * Alert Service Module
 * 
 * Sends email and webhook alerts for critical security events.
 * Supports multiple notification channels: Email (Resend), Slack, Discord.
 */

// Configuration from environment
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ALERT_EMAIL_FROM = process.env.ALERT_EMAIL_FROM || 'security@tavvy.app';
const ALERT_EMAIL_TO = process.env.ALERT_EMAIL_TO?.split(',') || [];
const SLACK_WEBHOOK_URL = process.env.SLACK_SECURITY_WEBHOOK;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_SECURITY_WEBHOOK;

// Alert severity levels
export const AlertSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type AlertSeverityType = typeof AlertSeverity[keyof typeof AlertSeverity];

export interface SecurityAlert {
  title: string;
  severity: AlertSeverityType;
  description: string;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  details?: Record<string, unknown>;
  actionUrl?: string;
}

// Rate limiting for alerts (prevent alert storms)
const alertCooldowns = new Map<string, number>();
const ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between same alerts

/**
 * Check if we should send an alert (rate limiting)
 */
function shouldSendAlert(alertKey: string): boolean {
  const lastSent = alertCooldowns.get(alertKey);
  const now = Date.now();
  
  if (lastSent && (now - lastSent) < ALERT_COOLDOWN_MS) {
    return false;
  }
  
  alertCooldowns.set(alertKey, now);
  return true;
}

/**
 * Generate a unique key for rate limiting
 */
function getAlertKey(alert: SecurityAlert): string {
  return `${alert.title}-${alert.userEmail || alert.ipAddress || 'unknown'}`;
}

/**
 * Send email alert via Resend API
 */
async function sendEmailAlert(alert: SecurityAlert): Promise<boolean> {
  if (!RESEND_API_KEY || ALERT_EMAIL_TO.length === 0) {
    console.log('[AlertService] Email alerts not configured (missing RESEND_API_KEY or ALERT_EMAIL_TO)');
    return false;
  }

  const severityEmoji = {
    low: '🔵',
    medium: '🟡',
    high: '🟠',
    critical: '🔴',
  };

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${alert.severity === 'critical' ? '#dc2626' : alert.severity === 'high' ? '#ea580c' : '#eab308'}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">
          ${severityEmoji[alert.severity]} Security Alert: ${alert.title}
        </h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">
          Severity: ${alert.severity.toUpperCase()}
        </p>
      </div>
      
      <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="margin: 0 0 15px 0; font-size: 16px; color: #374151;">
          ${alert.description}
        </p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; width: 120px;">Timestamp</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">${alert.timestamp.toISOString()}</td>
          </tr>
          ${alert.userEmail ? `
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">User Email</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">${alert.userEmail}</td>
          </tr>
          ` : ''}
          ${alert.ipAddress ? `
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">IP Address</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">${alert.ipAddress}</td>
          </tr>
          ` : ''}
          ${alert.userAgent ? `
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">User Agent</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 12px; word-break: break-all;">${alert.userAgent}</td>
          </tr>
          ` : ''}
        </table>
        
        ${alert.details ? `
        <div style="margin-top: 15px; padding: 10px; background: #fff; border: 1px solid #e5e7eb; border-radius: 4px;">
          <strong style="color: #374151;">Additional Details:</strong>
          <pre style="margin: 10px 0 0 0; font-size: 12px; overflow-x: auto;">${JSON.stringify(alert.details, null, 2)}</pre>
        </div>
        ` : ''}
        
        ${alert.actionUrl ? `
        <div style="margin-top: 20px;">
          <a href="${alert.actionUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
            View in Admin Portal
          </a>
        </div>
        ` : ''}
      </div>
      
      <div style="padding: 15px 20px; background: #f3f4f6; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="margin: 0; font-size: 12px; color: #6b7280;">
          This is an automated security alert from Tavvy Admin Portal.
          Do not reply to this email.
        </p>
      </div>
    </div>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: ALERT_EMAIL_FROM,
        to: ALERT_EMAIL_TO,
        subject: `[${alert.severity.toUpperCase()}] Security Alert: ${alert.title}`,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AlertService] Failed to send email:', errorText);
      return false;
    }

    console.log(`[AlertService] Email alert sent for: ${alert.title}`);
    return true;
  } catch (err) {
    console.error('[AlertService] Exception sending email:', err);
    return false;
  }
}

/**
 * Send Slack webhook alert
 */
async function sendSlackAlert(alert: SecurityAlert): Promise<boolean> {
  if (!SLACK_WEBHOOK_URL) {
    return false;
  }

  const severityColor = {
    low: '#3b82f6',
    medium: '#eab308',
    high: '#ea580c',
    critical: '#dc2626',
  };

  const payload = {
    attachments: [{
      color: severityColor[alert.severity],
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `🚨 ${alert.title}`,
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Severity:*\n${alert.severity.toUpperCase()}` },
            { type: 'mrkdwn', text: `*Time:*\n${alert.timestamp.toISOString()}` },
            ...(alert.userEmail ? [{ type: 'mrkdwn', text: `*User:*\n${alert.userEmail}` }] : []),
            ...(alert.ipAddress ? [{ type: 'mrkdwn', text: `*IP:*\n${alert.ipAddress}` }] : []),
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: alert.description,
          },
        },
      ],
    }],
  };

  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('[AlertService] Failed to send Slack alert');
      return false;
    }

    console.log(`[AlertService] Slack alert sent for: ${alert.title}`);
    return true;
  } catch (err) {
    console.error('[AlertService] Exception sending Slack alert:', err);
    return false;
  }
}

/**
 * Send Discord webhook alert
 */
async function sendDiscordAlert(alert: SecurityAlert): Promise<boolean> {
  if (!DISCORD_WEBHOOK_URL) {
    return false;
  }

  const severityColor = {
    low: 0x3b82f6,
    medium: 0xeab308,
    high: 0xea580c,
    critical: 0xdc2626,
  };

  const payload = {
    embeds: [{
      title: `🚨 ${alert.title}`,
      description: alert.description,
      color: severityColor[alert.severity],
      fields: [
        { name: 'Severity', value: alert.severity.toUpperCase(), inline: true },
        { name: 'Time', value: alert.timestamp.toISOString(), inline: true },
        ...(alert.userEmail ? [{ name: 'User', value: alert.userEmail, inline: true }] : []),
        ...(alert.ipAddress ? [{ name: 'IP Address', value: alert.ipAddress, inline: true }] : []),
      ],
      footer: {
        text: 'Tavvy Security Alert',
      },
      timestamp: alert.timestamp.toISOString(),
    }],
  };

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('[AlertService] Failed to send Discord alert');
      return false;
    }

    console.log(`[AlertService] Discord alert sent for: ${alert.title}`);
    return true;
  } catch (err) {
    console.error('[AlertService] Exception sending Discord alert:', err);
    return false;
  }
}

/**
 * Send a security alert through all configured channels
 */
export async function sendSecurityAlert(alert: SecurityAlert): Promise<{ email: boolean; slack: boolean; discord: boolean }> {
  const alertKey = getAlertKey(alert);
  
  // Rate limiting check
  if (!shouldSendAlert(alertKey)) {
    console.log(`[AlertService] Alert rate-limited: ${alert.title}`);
    return { email: false, slack: false, discord: false };
  }

  // Send to all configured channels in parallel
  const [emailResult, slackResult, discordResult] = await Promise.all([
    sendEmailAlert(alert),
    sendSlackAlert(alert),
    sendDiscordAlert(alert),
  ]);

  return {
    email: emailResult,
    slack: slackResult,
    discord: discordResult,
  };
}

/**
 * Pre-built alert generators for common security events
 */
export const SecurityAlerts = {
  bruteForceDetected: (
    email: string,
    ipAddress: string | undefined,
    attemptCount: number
  ): SecurityAlert => ({
    title: 'Brute Force Attack Detected',
    severity: AlertSeverity.CRITICAL,
    description: `Multiple failed login attempts detected for account "${email}". This may indicate a brute force attack attempting to guess the password.`,
    userEmail: email,
    ipAddress,
    timestamp: new Date(),
    details: {
      attemptCount,
      windowMinutes: 15,
      recommendation: 'Consider temporarily blocking this IP address',
    },
    actionUrl: process.env.ADMIN_PORTAL_URL ? `${process.env.ADMIN_PORTAL_URL}/security/anomalies` : undefined,
  }),

  impossibleTravel: (
    userId: string,
    email: string,
    fromLocation: string,
    toLocation: string,
    distanceKm: number,
    timeMinutes: number,
    ipAddress: string | undefined
  ): SecurityAlert => ({
    title: 'Impossible Travel Detected',
    severity: AlertSeverity.CRITICAL,
    description: `User "${email}" logged in from ${toLocation} only ${timeMinutes} minutes after logging in from ${fromLocation}. The distance of ${distanceKm.toFixed(0)} km would require impossible travel speed.`,
    userId,
    userEmail: email,
    ipAddress,
    timestamp: new Date(),
    details: {
      fromLocation,
      toLocation,
      distanceKm: Math.round(distanceKm),
      timeMinutes,
      requiredSpeedKmh: Math.round((distanceKm / timeMinutes) * 60),
      recommendation: 'Verify account has not been compromised',
    },
    actionUrl: process.env.ADMIN_PORTAL_URL ? `${process.env.ADMIN_PORTAL_URL}/security/anomalies` : undefined,
  }),

  newDeviceLogin: (
    userId: string,
    email: string,
    ipAddress: string | undefined,
    userAgent: string | undefined
  ): SecurityAlert => ({
    title: 'New Device Login',
    severity: AlertSeverity.LOW,
    description: `User "${email}" logged in from a new device that has not been seen before.`,
    userId,
    userEmail: email,
    ipAddress,
    userAgent,
    timestamp: new Date(),
    details: {
      recommendation: 'No action required unless user reports unauthorized access',
    },
  }),

  sessionLimitExceeded: (
    userId: string,
    email: string,
    revokedSessionId: string
  ): SecurityAlert => ({
    title: 'Session Limit Exceeded',
    severity: AlertSeverity.MEDIUM,
    description: `User "${email}" exceeded the concurrent session limit. An older session was automatically revoked.`,
    userId,
    userEmail: email,
    timestamp: new Date(),
    details: {
      revokedSessionId,
      maxSessions: 3,
      recommendation: 'May indicate account sharing or credential theft',
    },
  }),

  adminRoleGranted: (
    grantedToEmail: string,
    grantedByEmail: string,
    role: string
  ): SecurityAlert => ({
    title: 'Admin Role Granted',
    severity: AlertSeverity.HIGH,
    description: `User "${grantedToEmail}" was granted the "${role}" role by "${grantedByEmail}".`,
    userEmail: grantedToEmail,
    timestamp: new Date(),
    details: {
      role,
      grantedBy: grantedByEmail,
      recommendation: 'Verify this role assignment was authorized',
    },
  }),
};

// Cleanup old cooldown entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of alertCooldowns.entries()) {
    if ((now - timestamp) > ALERT_COOLDOWN_MS * 2) {
      alertCooldowns.delete(key);
    }
  }
}, 10 * 60 * 1000); // Every 10 minutes
