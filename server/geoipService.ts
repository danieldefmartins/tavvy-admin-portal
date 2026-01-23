/**
 * GeoIP Service Module
 * 
 * Provides IP geolocation for detecting impossible travel and geographic anomalies.
 * Uses ip-api.com free tier (45 requests/minute) with caching.
 */

// Cache for IP geolocation results
const geoCache = new Map<string, { data: GeoLocation; timestamp: number }>();
const GEO_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Rate limiting for API calls
let apiCallsThisMinute = 0;
let minuteStart = Date.now();
const MAX_CALLS_PER_MINUTE = 40; // Leave some buffer below 45 limit

export interface GeoLocation {
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  city: string;
  lat: number;
  lon: number;
  isp: string;
  isValid: boolean;
}

export interface TravelAnalysis {
  fromLocation: GeoLocation;
  toLocation: GeoLocation;
  distanceKm: number;
  timeMinutes: number;
  requiredSpeedKmh: number;
  isImpossible: boolean;
  confidence: 'high' | 'medium' | 'low';
}

// Maximum reasonable travel speed (km/h)
// Commercial jets cruise at ~900 km/h, but accounting for airport time, we use 800
const MAX_REASONABLE_SPEED_KMH = 800;

// Minimum distance to consider for impossible travel (km)
// Ignore small distances that could be VPN/proxy changes
const MIN_DISTANCE_FOR_ANALYSIS_KM = 100;

// Minimum time between logins to analyze (minutes)
// Ignore very short intervals that might be session refreshes
const MIN_TIME_FOR_ANALYSIS_MINUTES = 5;

/**
 * Check rate limit and reset if minute has passed
 */
function checkRateLimit(): boolean {
  const now = Date.now();
  if (now - minuteStart > 60000) {
    minuteStart = now;
    apiCallsThisMinute = 0;
  }
  return apiCallsThisMinute < MAX_CALLS_PER_MINUTE;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Get geolocation for an IP address
 */
export async function getGeoLocation(ip: string): Promise<GeoLocation | null> {
  // Skip private/local IPs
  if (isPrivateIP(ip)) {
    return null;
  }

  // Check cache first
  const cached = geoCache.get(ip);
  if (cached && (Date.now() - cached.timestamp) < GEO_CACHE_TTL_MS) {
    return cached.data;
  }

  // Check rate limit
  if (!checkRateLimit()) {
    console.warn('[GeoIP] Rate limit reached, skipping lookup');
    return null;
  }

  try {
    apiCallsThisMinute++;
    
    // Using ip-api.com free tier
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,city,lat,lon,isp,query`);
    
    if (!response.ok) {
      console.error('[GeoIP] API request failed:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (data.status !== 'success') {
      console.warn('[GeoIP] Lookup failed for IP:', ip, data.message);
      return null;
    }

    const geoLocation: GeoLocation = {
      ip: data.query,
      country: data.country,
      countryCode: data.countryCode,
      region: data.region,
      city: data.city,
      lat: data.lat,
      lon: data.lon,
      isp: data.isp,
      isValid: true,
    };

    // Cache the result
    geoCache.set(ip, { data: geoLocation, timestamp: Date.now() });

    return geoLocation;
  } catch (err) {
    console.error('[GeoIP] Exception during lookup:', err);
    return null;
  }
}

/**
 * Check if an IP is private/local
 */
function isPrivateIP(ip: string): boolean {
  // IPv4 private ranges
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^127\./,
    /^localhost$/i,
    /^::1$/,
    /^fe80:/i,
  ];
  
  return privateRanges.some(range => range.test(ip));
}

/**
 * Format location for display
 */
export function formatLocation(geo: GeoLocation): string {
  if (geo.city && geo.country) {
    return `${geo.city}, ${geo.country}`;
  }
  if (geo.country) {
    return geo.country;
  }
  return 'Unknown location';
}

/**
 * Analyze travel between two logins for impossible travel detection
 */
export async function analyzeTravelBetweenLogins(
  fromIp: string,
  toIp: string,
  fromTime: Date,
  toTime: Date
): Promise<TravelAnalysis | null> {
  // Skip if same IP
  if (fromIp === toIp) {
    return null;
  }

  // Get geolocation for both IPs
  const [fromGeo, toGeo] = await Promise.all([
    getGeoLocation(fromIp),
    getGeoLocation(toIp),
  ]);

  if (!fromGeo || !toGeo) {
    return null;
  }

  // Calculate distance
  const distanceKm = calculateDistance(fromGeo.lat, fromGeo.lon, toGeo.lat, toGeo.lon);

  // Skip if distance is too small
  if (distanceKm < MIN_DISTANCE_FOR_ANALYSIS_KM) {
    return null;
  }

  // Calculate time difference in minutes
  const timeMinutes = (toTime.getTime() - fromTime.getTime()) / (1000 * 60);

  // Skip if time is too short (might be session refresh)
  if (timeMinutes < MIN_TIME_FOR_ANALYSIS_MINUTES) {
    return null;
  }

  // Calculate required speed
  const requiredSpeedKmh = (distanceKm / timeMinutes) * 60;

  // Determine if travel is impossible
  const isImpossible = requiredSpeedKmh > MAX_REASONABLE_SPEED_KMH;

  // Determine confidence level
  let confidence: 'high' | 'medium' | 'low' = 'medium';
  
  if (distanceKm > 5000 && timeMinutes < 60) {
    // Intercontinental in under an hour - very suspicious
    confidence = 'high';
  } else if (distanceKm > 1000 && timeMinutes < 30) {
    // Long distance in very short time
    confidence = 'high';
  } else if (fromGeo.isp !== toGeo.isp) {
    // Different ISPs adds credibility
    confidence = 'high';
  } else if (fromGeo.countryCode === toGeo.countryCode) {
    // Same country, might be VPN
    confidence = 'low';
  }

  return {
    fromLocation: fromGeo,
    toLocation: toGeo,
    distanceKm,
    timeMinutes,
    requiredSpeedKmh,
    isImpossible,
    confidence,
  };
}

/**
 * Get the last known location for a user
 */
export async function getLastKnownLocation(
  userId: string,
  supabaseAdmin: any
): Promise<{ ip: string; timestamp: Date; geo: GeoLocation } | null> {
  try {
    const { data: lastSession, error } = await supabaseAdmin
      .from('user_sessions')
      .select('ip_address, created_at')
      .eq('user_id', userId)
      .not('ip_address', 'is', null)
      .order('created_at', { ascending: false })
      .limit(2); // Get 2 to skip current session

    if (error || !lastSession || lastSession.length < 2) {
      return null;
    }

    // Use the second most recent (previous session)
    const previousSession = lastSession[1];
    if (!previousSession.ip_address) {
      return null;
    }

    const geo = await getGeoLocation(previousSession.ip_address);
    if (!geo) {
      return null;
    }

    return {
      ip: previousSession.ip_address,
      timestamp: new Date(previousSession.created_at),
      geo,
    };
  } catch (err) {
    console.error('[GeoIP] Error getting last known location:', err);
    return null;
  }
}

// Cleanup old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of geoCache.entries()) {
    if ((now - entry.timestamp) > GEO_CACHE_TTL_MS) {
      geoCache.delete(ip);
    }
  }
}, 60 * 60 * 1000); // Every hour
