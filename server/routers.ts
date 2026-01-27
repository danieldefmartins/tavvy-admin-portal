import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  createDraft,
  getDraftById,
  getActiveDraft,
  getUserDrafts,
  updateDraft,
  deleteDraft,
  snoozeDraft,
  submitDraft,
  getPendingOfflineDrafts,
  markDraftSynced,
} from "./draftDb";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  searchPlaces,
  searchPlacesAdvanced,
  searchFsqPlaces,
  getFsqRegions,
  getFsqCities,
  getDistinctCountries,
  getDistinctRegions,
  getDistinctCities,
  getDistinctCategories,
  getPlaceById,
  getPlacesCount,
  getAllReviewItems,
  getReviewItemsByType,
  getPlaceSignalAggregates,
  batchImportReviews,
  getRepStats,
  testConnection,
  type BatchReviewInput,
  // Articles
  getAllArticles,
  getArticleCategories,
  createArticle,
  updateArticle,
  deleteArticle,
  bulkImportArticles,
  type BulkArticleInput,
  // Cities
  getAllCities,
  createCity,
  updateCity,
  deleteCity,
  // Universes
  getAllUniverses,
  createUniverse,
  updateUniverse,
  deleteUniverse,
  // Business Claims
  getBusinessClaims,
  getBusinessClaimById,
  updateBusinessClaimStatus,
  // Moderation
  getContentFlags,
  getModerationQueue,
  reviewContentFlag,
  reviewModerationItem,
  // Audit Log
  getAdminActivityLog,
  logAdminActivity,
  // Place Overrides
  getPlaceOverrides,
  createPlaceOverride,
  reviewPlaceOverride,
  // Stats
  getModerationStats,
// User Management
  getUsers,
  getUserById,
  getUserRoles,
  addUserRole,
  removeUserRole,
  getUserStrikes,
  addUserStrike,
  removeUserStrike,
  getUserGamification,
  blockUser,
  unblockUser,
  isUserBlocked,
  getUserStats,
  updateUser,
  updateUserEmail,
  deleteUser,
  // Pro Providers Management
  getProProviders,
  getProProviderById,
  updateProProvider,
  verifyProProvider,
  unverifyProProvider,
  activateProProvider,
  deactivateProProvider,
  featureProProvider,
  unfeatureProProvider,
  getProReviews,
  getProStats,
  getDistinctProviderTypes,
  // Story Moderation
  getStories,
  getStoryById,
  getStoryReports,
  updateStoryStatus,
  deleteStory,
  getReportedStories,
  dismissStoryReports,
  getStoryStats,
  // Photo Moderation
  getPhotos,
  getPhotoById,
  getPhotoReports,
  updatePhotoStatus,
  approvePhoto,
  rejectPhoto,
  deletePhoto,
  setPhotoCover,
  getReportedPhotos,
  getFlaggedPhotos,
  dismissPhotoReports,
  getPhotoStats,
  // Review Moderation
  getReviews,
  getReviewById,
  getReviewReports,
  updateReviewStatus,
  approveReview,
  rejectReview,
  deleteReview,
  getReportedReviews,
  getFlaggedReviews,
  dismissReviewReports,
  getReviewStats,
  // Place Editing
  createPlaceAdmin,
  updatePlaceAdmin,
  deletePlaceAdmin,
  getPlaceForEdit,
  verifyPlace,
  unverifyPlace,
  featurePlace,
  unfeaturePlace,
  activatePlace,
  deactivatePlace,
  getPlacePhotosForEdit,
  getDistinctCategories,
  // Verification Sync
  syncVerificationToProProvider,
  approveVerificationWithSync,
  rejectVerificationWithSync,
  // Place Overrides
  getPlaceOverridesAdmin,
  createPlaceOverrideAdmin,
  revertPlaceOverrideAdmin,
  deletePlaceOverrideAdmin,
  // Tavvy Places (User-Generated)
  createTavvyPlace,
  getTavvyPlaces,
  getTavvyPlaceById,
  updateTavvyPlace,
  deleteTavvyPlace,
  getTavvyCategories,
  type TavvyPlaceInput,
} from "./supabaseDb";
import { getDb } from "./db";
import { repActivityLog, batchImportJobs } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { syncProToGHL } from "./ghl";
import {
  signInWithEmail,
  verifySupabaseToken,
} from "./supabaseAuth";
import { supabase } from "./supabaseDb";
import {
  logLogin,
  logFailedLogin,
  logBulkOperation,
  logModerationAction,
  AuditActions,
  ResourceTypes,
} from "./auditLog";
import {
  createSession,
  revokeSessionByToken,
  getUserSessions,
  revokeAllUserSessions,
  generateDeviceFingerprint,
} from "./sessionManager";
import {
  trackFailedLogin,
  runLoginAnomalyChecks,
  getUnacknowledgedAnomalies,
  acknowledgeAnomaly,
} from "./anomalyDetection";
import {
  createRefreshToken,
  rotateRefreshToken,
  revokeAllUserTokens,
} from "./tokenRotation";

// Cookie name for Supabase auth token
const AUTH_COOKIE_NAME = "tavvy_auth_token";

// Helper function to check if user has super_admin role via database
// This replaces the hardcoded SUPER_ADMIN_EMAILS array with RBAC
async function isUserSuperAdmin(userId: string): Promise<boolean> {
  if (!userId) return false;
  
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'super_admin')
      .or('expires_at.is.null,expires_at.gt.now()')
      .maybeSingle();
    
    if (error) {
      console.error('[Auth] Error checking admin role:', error);
      return false;
    }
    
    return !!data;
  } catch (err) {
    console.error('[Auth] Exception checking admin role:', err);
    return false;
  }
}

// Version for deployment verification
const BUILD_VERSION = '2026-01-26-fsq-search-fix';

export const appRouter = router({
  // Version endpoint for deployment verification
  version: publicProcedure.query(() => {
    return { version: BUILD_VERSION, timestamp: new Date().toISOString() };
  }),

  // Auth router - Login only, super admin restricted
  auth: router({
    me: publicProcedure.query(async ({ ctx }) => {
      // Get token from cookie
      const token = ctx.req.cookies?.[AUTH_COOKIE_NAME];
      if (!token) return null;

      // Verify token with Supabase
      const user = await verifySupabaseToken(token);
      if (!user) return null;

      // Check if user has super_admin role in database (RBAC)
      const isSuperAdmin = await isUserSuperAdmin(user.id);
      if (!isSuperAdmin) {
        return null; // Non-admin users get null (treated as not logged in)
      }

      return {
        id: user.id,
        openId: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Admin",
        role: "super_admin",
        isSuperAdmin: true,
      };
    }),

    login: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(6),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // NOTE: We no longer check email before login.
        // This prevents email enumeration attacks.
        // Role check happens AFTER successful auth.

        const { user, session, error } = await signInWithEmail(
          input.email,
          input.password
        );

        const clientIp = ctx.req.ip || ctx.req.headers['x-forwarded-for']?.toString();
        const userAgent = ctx.req.headers['user-agent'];

        if (error || !user || !session) {
          // Log failed login attempt
          await logFailedLogin(
            input.email,
            error || "Invalid credentials",
            clientIp,
            userAgent
          );
          // Track for anomaly detection (brute force detection)
          await trackFailedLogin(input.email, clientIp, userAgent);
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: error || "Invalid credentials",
          });
        }

        // Check if user has super_admin role in database (RBAC)
        const isSuperAdmin = await isUserSuperAdmin(user.id);
        if (!isSuperAdmin) {
          // Log failed login (non-admin trying to access admin portal)
          await logFailedLogin(
            input.email,
            "User is not a super_admin",
            clientIp,
            userAgent
          );
          // Track for anomaly detection
          await trackFailedLogin(input.email, clientIp, userAgent);
          // Don't reveal that the user exists but isn't an admin
          // Use the same error message as invalid credentials
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid credentials",
          });
        }

        // Log successful login
        await logLogin(
          user.id,
          user.email || input.email,
          clientIp,
          userAgent
        );

        // Generate device fingerprint for anomaly detection
        const deviceFingerprint = generateDeviceFingerprint(userAgent, clientIp);

        // Run anomaly detection checks
        const anomalyResult = await runLoginAnomalyChecks(
          user.id,
          user.email || input.email,
          deviceFingerprint,
          clientIp,
          userAgent
        );

        if (anomalyResult.anomaliesDetected.length > 0) {
          console.log(`[Auth] Anomalies detected for ${user.email}:`, anomalyResult.anomaliesDetected);
        }

        // Create tracked session (enforces concurrent session limits)
        const sessionResult = await createSession(
          user.id,
          session.access_token,
          clientIp,
          userAgent
        );

        if (sessionResult.revokedSessionId) {
          console.log(`[Auth] Revoked old session ${sessionResult.revokedSessionId} due to session limit`);
        }

        // Create refresh token for token rotation
        const refreshTokenResult = await createRefreshToken(
          user.id,
          sessionResult.session?.id,
          clientIp,
          userAgent
        );

        // Set auth cookie with enhanced security settings
        ctx.res.cookie(AUTH_COOKIE_NAME, session.access_token, {
          httpOnly: true,  // Prevent XSS access to cookie
          secure: process.env.NODE_ENV === "production",  // HTTPS only in production
          sameSite: "strict",  // Strict CSRF protection (changed from lax)
          maxAge: 60 * 60 * 24 * 1 * 1000, // 1 day (reduced from 7 days for security)
          path: "/",
        });

        // Set refresh token cookie (longer lived, but also httpOnly)
        if (refreshTokenResult) {
          ctx.res.cookie('tavvy_refresh_token', refreshTokenResult.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 60 * 60 * 24 * 7 * 1000, // 7 days
            path: "/",
          });
        }

        return {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || "Admin",
            isSuperAdmin: true,
          },
        };
      }),

    // Refresh access token using refresh token rotation
    refresh: publicProcedure.mutation(async ({ ctx }) => {
      const refreshToken = ctx.req.cookies?.['tavvy_refresh_token'];
      
      if (!refreshToken) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "No refresh token provided",
        });
      }

      const clientIp = ctx.req.ip || ctx.req.headers['x-forwarded-for']?.toString();
      const userAgent = ctx.req.headers['user-agent'];

      const result = await rotateRefreshToken(refreshToken, clientIp, userAgent);

      if (!result.success) {
        // Clear cookies on failure
        ctx.res.clearCookie(AUTH_COOKIE_NAME, { path: "/" });
        ctx.res.clearCookie('tavvy_refresh_token', { path: "/" });
        
        throw new TRPCError({
          code: result.securityAlert ? "FORBIDDEN" : "UNAUTHORIZED",
          message: result.error || "Token refresh failed",
        });
      }

      // Set new tokens
      if (result.tokenPair) {
        ctx.res.cookie(AUTH_COOKIE_NAME, result.tokenPair.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 60 * 60 * 1000, // 1 hour
          path: "/",
        });

        ctx.res.cookie('tavvy_refresh_token', result.tokenPair.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 60 * 60 * 24 * 7 * 1000, // 7 days
          path: "/",
        });
      }

      return { success: true };
    }),

    logout: publicProcedure.mutation(async ({ ctx }) => {
      // Revoke the session in the database
      const token = ctx.req.cookies?.[AUTH_COOKIE_NAME];
      if (token) {
        await revokeSessionByToken(token, 'user_logout');
      }
      // Clear both auth and refresh token cookies
      ctx.res.clearCookie(AUTH_COOKIE_NAME, { path: "/" });
      ctx.res.clearCookie('tavvy_refresh_token', { path: "/" });
      return { success: true };
    }),

    // Get all active sessions for the current user
    getSessions: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user?.id) return [];
      const sessions = await getUserSessions(ctx.user.id);
      return sessions.map(s => ({
        id: s.id,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        createdAt: s.createdAt.toISOString(),
        lastActivityAt: s.lastActivityAt.toISOString(),
        isCurrent: s.sessionToken === ctx.req.cookies?.[AUTH_COOKIE_NAME],
      }));
    }),

    // Logout from all devices
    logoutAll: protectedProcedure.mutation(async ({ ctx }) => {
      if (!ctx.user?.id) return { success: false, count: 0 };
      // Revoke all sessions and refresh tokens
      const sessionCount = await revokeAllUserSessions(ctx.user.id, 'user_logout_all');
      const tokenCount = await revokeAllUserTokens(ctx.user.id, 'user_logout_all');
      // Clear cookies
      ctx.res.clearCookie(AUTH_COOKIE_NAME, { path: "/" });
      ctx.res.clearCookie('tavvy_refresh_token', { path: "/" });
      return { success: true, sessionsRevoked: sessionCount, tokensRevoked: tokenCount };
    }),

    // Get security anomalies (super admin only)
    getAnomalies: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(50) }).optional())
      .query(async ({ input }) => {
        const anomalies = await getUnacknowledgedAnomalies(input?.limit || 50);
        return anomalies;
      }),

    // Acknowledge a security anomaly
    acknowledgeAnomaly: protectedProcedure
      .input(z.object({ anomalyId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user?.id) return { success: false };
        const success = await acknowledgeAnomaly(input.anomalyId, ctx.user.id);
        return { success };
      }),
  }),

  // Debug router - for testing connections
  debug: router({
    testDbConnection: protectedProcedure.query(async () => {
      console.log("[Debug] Testing database connection...");
      const result = await testConnection();
      console.log("[Debug] Connection test result:", result);
      return result;
    }),
  }),

  // Places router - search and manage places from Supabase
  places: router({
    search: protectedProcedure
      .input(
        z.object({
          query: z.string().min(1),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ input }) => {
        return searchPlaces(input.query, input.limit, input.offset);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        return getPlaceById(input.id);
      }),

    getCount: protectedProcedure.query(async () => {
      return getPlacesCount();
    }),

    getSignals: protectedProcedure
      .input(z.object({ placeId: z.string() }))
      .query(async ({ input }) => {
        return getPlaceSignalAggregates(input.placeId);
      }),

    // Advanced search with filters
    advancedSearch: protectedProcedure
      .input(
        z.object({
          filters: z.object({
            name: z.string().optional(),
            address: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            country: z.string().optional(),
            category: z.string().optional(),
          }),
          limit: z.number().min(1).max(200).default(50),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ input }) => {
        return searchPlacesAdvanced(input.filters, input.limit, input.offset);
      }),

    // Get distinct countries for dropdown
    getCountries: protectedProcedure.query(async () => {
      return getDistinctCountries();
    }),

    // Get distinct regions/states for dropdown
    getRegions: protectedProcedure
      .input(z.object({ country: z.string().optional() }))
      .query(async ({ input }) => {
        return getDistinctRegions(input.country);
      }),

    // Get distinct cities for dropdown
    getCities: protectedProcedure
      .input(z.object({ country: z.string().optional(), region: z.string().optional() }))
      .query(async ({ input }) => {
        return getDistinctCities(input.country, input.region);
      }),

    // Get distinct categories for dropdown
    getCategories: protectedProcedure.query(async () => {
      return getDistinctCategories();
    }),

    // Search fsq_places_raw - name required, location filters optional
    searchFsq: protectedProcedure
      .input(
        z.object({
          name: z.string().min(2), // Required - at least 2 characters
          country: z.string().optional(),
          region: z.string().optional(),
          city: z.string().optional(),
          limit: z.number().min(1).max(200).default(50),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ input }) => {
        return searchFsqPlaces(
          {
            name: input.name,
            country: input.country,
            region: input.region,
            city: input.city,
          },
          input.limit,
          input.offset
        );
      }),

    // Get regions from fsq_places_raw for a specific country
    getFsqRegions: protectedProcedure
      .input(z.object({ country: z.string().min(1) }))
      .query(async ({ input }) => {
        return getFsqRegions(input.country);
      }),

    // Get cities from fsq_places_raw for a specific country/region
    getFsqCities: protectedProcedure
      .input(z.object({ country: z.string().min(1), region: z.string().optional() }))
      .query(async ({ input }) => {
        return getFsqCities(input.country, input.region);
    // ============ TAVVY PLACES (User-Generated) ============
    
    // Get tavvy categories for dropdown
    getTavvyCategories: protectedProcedure.query(async () => {
      return getTavvyCategories();
    }),

    // Create a new tavvy place
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1, "Name is required").max(200),
          description: z.string().max(2000).optional(),
          tavvy_category: z.string().min(1, "Category is required"),
          tavvy_subcategory: z.string().optional(),
          latitude: z.number().min(-90).max(90).optional(),
          longitude: z.number().min(-180).max(180).optional(),
          address: z.string().max(500).optional(),
          address_line2: z.string().max(200).optional(),
          city: z.string().max(100).optional(),
          region: z.string().max(100).optional(),
          postcode: z.string().max(20).optional(),
          country: z.string().max(100).optional(),
          phone: z.string().max(50).optional(),
          email: z.string().email().optional().or(z.literal("")),
          website: z.string().url().optional().or(z.literal("")),
          instagram: z.string().max(100).optional(),
          facebook: z.string().max(200).optional(),
          twitter: z.string().max(100).optional(),
          tiktok: z.string().max(100).optional(),
          hours_display: z.string().max(500).optional(),
          hours_json: z.any().optional(),
          price_level: z.number().min(1).max(4).optional(),
          photos: z.array(z.string()).optional(),
          cover_image_url: z.string().url().optional().or(z.literal("")),
          universe_id: z.string().uuid().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user?.id;
        if (!userId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "You must be logged in to create a place",
          });
        }

        // Clean up empty strings
        const cleanInput: TavvyPlaceInput = {
          ...input,
          email: input.email || null,
          website: input.website || null,
          cover_image_url: input.cover_image_url || null,
        };

        const place = await createTavvyPlace(cleanInput, userId);
        if (!place) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create place",
          });
        }

        return place;
      }),

    // Get all tavvy places (paginated)
    getTavvyPlaces: protectedProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(200).default(50),
          offset: z.number().min(0).default(0),
        }).optional()
      )
      .query(async ({ input }) => {
        const limit = input?.limit || 50;
        const offset = input?.offset || 0;
        return getTavvyPlaces(limit, offset);
      }),

    // Get a single tavvy place by ID
    getTavvyPlace: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ input }) => {
        const place = await getTavvyPlaceById(input.id);
        if (!place) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Place not found",
          });
        }
        return place;
      }),

    // Update a tavvy place
    updateTavvyPlace: protectedProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          name: z.string().min(1).max(200).optional(),
          description: z.string().max(2000).optional(),
          tavvy_category: z.string().optional(),
          tavvy_subcategory: z.string().optional(),
          latitude: z.number().min(-90).max(90).optional(),
          longitude: z.number().min(-180).max(180).optional(),
          address: z.string().max(500).optional(),
          address_line2: z.string().max(200).optional(),
          city: z.string().max(100).optional(),
          region: z.string().max(100).optional(),
          postcode: z.string().max(20).optional(),
          country: z.string().max(100).optional(),
          phone: z.string().max(50).optional(),
          email: z.string().email().optional().or(z.literal("")),
          website: z.string().url().optional().or(z.literal("")),
          instagram: z.string().max(100).optional(),
          facebook: z.string().max(200).optional(),
          twitter: z.string().max(100).optional(),
          tiktok: z.string().max(100).optional(),
          hours_display: z.string().max(500).optional(),
          hours_json: z.any().optional(),
          price_level: z.number().min(1).max(4).optional(),
          photos: z.array(z.string()).optional(),
          cover_image_url: z.string().url().optional().or(z.literal("")),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user?.id;
        if (!userId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "You must be logged in to update a place",
          });
        }

        const { id, ...updates } = input;
        const success = await updateTavvyPlace(id, updates, userId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update place",
          });
        }

        return { success: true };
      }),

    // Delete a tavvy place (soft delete)
    deleteTavvyPlace: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user?.id;
        if (!userId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "You must be logged in to delete a place",
          });
        }

        const success = await deleteTavvyPlace(input.id, userId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to delete place",
          });
        }

        return { success: true };
      }),
  }),

  // Signals router - get signal definitions
  signals: router({
    getAll: protectedProcedure.query(async () => {
      return getAllReviewItems();
    }),

    getByType: protectedProcedure
      .input(z.object({ type: z.enum(["best_for", "vibe", "heads_up"]) }))
      .query(async ({ input }) => {
        return getReviewItemsByType(input.type);
      }),
  }),

  // Reviews router - submit reviews
  reviews: router({
    submitQuick: protectedProcedure
      .input(
        z.object({
          placeId: z.string(),
          signals: z.array(
            z.object({
              signalSlug: z.string(),
              tapCount: z.number().min(1).max(3),
            })
          ),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const userId = ctx.user?.id || "anonymous";

        // Log each signal submission
        for (const signal of input.signals) {
          await db.insert(repActivityLog).values({
            userId: userId,
            placeId: input.placeId,
            signalSlug: signal.signalSlug,
            tapCount: signal.tapCount,
            source: "manual",
          });
        }

        // Import to Supabase
        const batchInput: BatchReviewInput[] = input.signals.map((s) => ({
          place_id: input.placeId,
          signal_slug: s.signalSlug,
          tap_count: s.tapCount,
        }));

        const result = await batchImportReviews(batchInput, userId);
        return result;
      }),

    batchImport: protectedProcedure
      .input(
        z.object({
          reviews: z.array(
            z.object({
              place_id: z.string(),
              signal_slug: z.string(),
              tap_count: z.number().min(1).max(10),
            })
          ),
          fileName: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const userId = ctx.user?.id || "anonymous";

        // Create batch import job
        const jobResult = await db.insert(batchImportJobs).values({
          userId: userId,
          fileName: input.fileName,
          totalRows: input.reviews.length,
          status: "processing",
        });

        const jobId = jobResult[0].insertId;

        // Log each review
        for (const review of input.reviews) {
          await db.insert(repActivityLog).values({
            userId: userId,
            placeId: review.place_id,
            signalSlug: review.signal_slug,
            tapCount: review.tap_count,
            source: "batch",
          });
        }

        // Import to Supabase
        const result = await batchImportReviews(input.reviews, userId);

        // Update job status
        await db
          .update(batchImportJobs)
          .set({
            successCount: result.success,
            failedCount: result.failed,
            status: "completed",
            errorLog: result.errors.length > 0 ? result.errors.join("\n") : null,
            completedAt: new Date(),
          })
          .where(eq(batchImportJobs.id, Number(jobId)));

        // Audit log the bulk import
        await logBulkOperation(
          ctx.user?.id || 'unknown',
          ctx.user?.email || 'unknown',
          AuditActions.BULK_IMPORT,
          ResourceTypes.REVIEW,
          input.reviews.length,
          {
            fileName: input.fileName,
            successCount: result.success,
            failedCount: result.failed,
          }
        );

        return { jobId, ...result };
      }),
  }),

  // GoHighLevel sync router
  ghl: router({
    syncContact: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          fullName: z.string().min(1),
          phone: z.string().optional(),
          businessName: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          zipCode: z.string().optional(),
          website: z.string().optional(),
          services: z.array(z.string()).optional(),
          yearsExperience: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const apiKey = process.env.GHL_API_KEY;
        const locationId = process.env.GHL_LOCATION_ID;

        if (!apiKey || !locationId) {
          console.warn("GHL credentials not configured");
          return { success: false, error: "GHL not configured" };
        }

        const result = await syncProToGHL(input, apiKey, locationId);
        return result;
      }),
  }),

  // Rep stats router
  stats: router({
    getMyStats: protectedProcedure.query(async ({ ctx }) => {
      const userId = ctx.user?.id || ctx.user?.openId || "anonymous";
      return getRepStats(userId);
    }),

    getActivityLog: protectedProcedure
      .input(
        z
          .object({
            limit: z.number().min(1).max(100).default(50),
          })
          .optional()
      )
      .query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) return [];

        const userId = ctx.user?.id || "anonymous";

        return db
          .select()
          .from(repActivityLog)
          .where(eq(repActivityLog.userId, userId))
          .orderBy(desc(repActivityLog.createdAt))
          .limit(50);
      }),

    getBatchJobs: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];

      const userId = ctx.user?.id || "anonymous";

      return db
        .select()
        .from(batchImportJobs)
        .where(eq(batchImportJobs.userId, userId))
        .orderBy(desc(batchImportJobs.createdAt))
        .limit(20);
    }),
  }),

  // ============ ARTICLES ROUTER ============
  articles: router({
    getAll: protectedProcedure.query(async () => {
      return getAllArticles();
    }),

    getCategories: protectedProcedure.query(async () => {
      return getArticleCategories();
    }),

    getUniverses: protectedProcedure.query(async () => {
      return getAllUniverses();
    }),

    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1),
          slug: z.string().min(1),
          excerpt: z.string().optional(),
          content: z.string().optional(),
          cover_image_url: z.string().optional(),
          author_name: z.string().optional(),
          author_avatar_url: z.string().optional(),
          category_id: z.string().optional(),
          universe_id: z.string().optional(),
          read_time_minutes: z.number().optional(),
          is_featured: z.boolean().default(false),
          status: z.string().default("draft"),
        })
      )
      .mutation(async ({ input }) => {
        const id = await createArticle({
          ...input,
          excerpt: input.excerpt || null,
          content: input.content || null,
          cover_image_url: input.cover_image_url || null,
          author_name: input.author_name || null,
          author_avatar_url: input.author_avatar_url || null,
          category_id: input.category_id || null,
          universe_id: input.universe_id || null,
          read_time_minutes: input.read_time_minutes || null,
          published_at: null,
        });
        if (!id) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create article",
          });
        }
        return { id };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          title: z.string().optional(),
          slug: z.string().optional(),
          excerpt: z.string().optional(),
          content: z.string().optional(),
          cover_image_url: z.string().optional(),
          author_name: z.string().optional(),
          author_avatar_url: z.string().optional(),
          category_id: z.string().optional(),
          universe_id: z.string().optional(),
          read_time_minutes: z.number().optional(),
          is_featured: z.boolean().optional(),
          status: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const success = await updateArticle(id, data);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update article",
          });
        }
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        const success = await deleteArticle(input.id);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to delete article",
          });
        }
        return { success: true };
      }),

    bulkImport: protectedProcedure
      .input(
        z.object({
          articles: z.array(z.object({
            title: z.string(),
            slug: z.string(),
            excerpt: z.string().optional(),
            content: z.string().optional(),
            author_name: z.string().optional(),
            category_id: z.string().nullable().optional(),
            content_blocks: z.any().optional(),
            section_images: z.any().optional(),
            cover_image_url: z.string().optional(),
            read_time_minutes: z.number().optional(),
            article_template_type: z.string().optional(),
            is_featured: z.boolean().optional(),
            status: z.string().optional(),
          })),
          updateExisting: z.boolean().default(false),
        })
      )
      .mutation(async ({ input }) => {
        return bulkImportArticles(input.articles, input.updateExisting);
      }),
  }),

  // ============ CITIES ROUTER ============
  cities: router({
    getAll: protectedProcedure.query(async () => {
      return getAllCities();
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          slug: z.string().min(1),
          state: z.string().optional(),
          country: z.string().default("USA"),
          population: z.number().optional(),
          cover_image_url: z.string().optional(),
          description: z.string().optional(),
          latitude: z.number().optional(),
          longitude: z.number().optional(),
          timezone: z.string().optional(),
          is_featured: z.boolean().default(false),
          is_active: z.boolean().default(true),
        })
      )
      .mutation(async ({ input }) => {
        const id = await createCity({
          ...input,
          state: input.state || null,
          population: input.population || null,
          cover_image_url: input.cover_image_url || null,
          description: input.description || null,
          latitude: input.latitude || null,
          longitude: input.longitude || null,
          timezone: input.timezone || undefined,
        });
        if (!id) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create city",
          });
        }
        return { id };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().optional(),
          slug: z.string().optional(),
          state: z.string().optional(),
          country: z.string().optional(),
          population: z.number().optional(),
          cover_image_url: z.string().optional(),
          description: z.string().optional(),
          latitude: z.number().optional(),
          longitude: z.number().optional(),
          timezone: z.string().optional(),
          is_featured: z.boolean().optional(),
          is_active: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const success = await updateCity(id, data);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update city",
          });
        }
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        const success = await deleteCity(input.id);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to delete city",
          });
        }
        return { success: true };
      }),
  }),

  // ============ UNIVERSES ROUTER ============
  universes: router({
    getAll: protectedProcedure.query(async () => {
      return getAllUniverses();
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          slug: z.string().min(1),
          description: z.string().optional(),
          thumbnail_image_url: z.string().optional(),
          banner_image_url: z.string().optional(),
          location: z.string().optional(),
          is_featured: z.boolean().default(false),
          status: z.string().default("active"),
        })
      )
      .mutation(async ({ input }) => {
        const id = await createUniverse({
          ...input,
          description: input.description || null,
          thumbnail_image_url: input.thumbnail_image_url || null,
          banner_image_url: input.banner_image_url || null,
          location: input.location || null,
        });
        if (!id) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create universe",
          });
        }
        return { id };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().optional(),
          slug: z.string().optional(),
          description: z.string().optional(),
          thumbnail_image_url: z.string().optional(),
          banner_image_url: z.string().optional(),
          location: z.string().optional(),
          is_featured: z.boolean().optional(),
          status: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const success = await updateUniverse(id, data);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update universe",
          });
        }
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        const success = await deleteUniverse(input.id);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to delete universe",
          });
        }
        return { success: true };
      }),
  }),

  // ============ BUSINESS CLAIMS ROUTER ============
  businessClaims: router({
    getAll: protectedProcedure
      .input(
        z.object({
          status: z.enum(["pending", "verified", "rejected", "expired"]).optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        return getBusinessClaims(input?.status);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        const claim = await getBusinessClaimById(input.id);
        if (!claim) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Business claim not found",
          });
        }
        return claim;
      }),

    approve: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await updateBusinessClaimStatus(input.id, "verified", adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to approve business claim",
          });
        }
        return { success: true };
      }),

    reject: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await updateBusinessClaimStatus(input.id, "rejected", adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to reject business claim",
          });
        }
        return { success: true };
      }),
  }),

  // ============ MODERATION ROUTER ============
  moderation: router({
    getFlags: protectedProcedure
      .input(
        z.object({
          status: z.enum(["pending", "reviewed", "dismissed", "actioned"]).optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        return getContentFlags(input?.status);
      }),

    getQueue: protectedProcedure
      .input(
        z.object({
          status: z.enum(["pending", "approved", "rejected"]).optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        return getModerationQueue(input?.status);
      }),

    reviewFlag: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          status: z.enum(["reviewed", "dismissed", "actioned"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await reviewContentFlag(input.id, input.status, adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to review content flag",
          });
        }
        return { success: true };
      }),

    reviewQueueItem: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          status: z.enum(["approved", "rejected"]),
          rejectionReason: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await reviewModerationItem(
          input.id,
          input.status,
          adminId,
          input.rejectionReason
        );
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to review moderation item",
          });
        }
        return { success: true };
      }),

    getStats: protectedProcedure.query(async () => {
      return getModerationStats();
    }),
  }),

  // ============ AUDIT LOG ROUTER ============
  auditLog: router({
    getAll: protectedProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(500).default(100),
          adminId: z.string().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        return getAdminActivityLog(input?.limit || 100, input?.adminId);
      }),

    log: protectedProcedure
      .input(
        z.object({
          actionType: z.string(),
          targetId: z.string().optional(),
          targetType: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await logAdminActivity(
          adminId,
          input.actionType,
          input.targetId,
          input.targetType,
          input.notes
        );
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to log admin activity",
          });
        }
        return { success: true };
      }),
  }),

  // ============ PLACE OVERRIDES ROUTER ============
  overrides: router({
    getAll: protectedProcedure
      .input(
        z.object({
          status: z.enum(["pending", "approved", "rejected"]).optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        return getPlaceOverrides(input?.status);
      }),

    create: protectedProcedure
      .input(
        z.object({
          placeId: z.string(),
          fieldName: z.string(),
          overrideValue: z.string(),
          overrideReason: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const id = await createPlaceOverride(
          input.placeId,
          input.fieldName,
          input.overrideValue,
          adminId,
          input.overrideReason
        );
        if (!id) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create place override",
          });
        }
        return { id };
      }),

    review: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          status: z.enum(["approved", "rejected"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await reviewPlaceOverride(input.id, input.status, adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to review place override",
          });
        }
        return { success: true };
      }),
  }),

  // ============ USER MANAGEMENT ============
  users: router({
    getAll: protectedProcedure
      .input(
        z.object({
          limit: z.number().optional().default(50),
          offset: z.number().optional().default(0),
          search: z.string().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        const { limit, offset, search } = input || {};
        return getUsers(limit, offset, search);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        return getUserById(input.id);
      }),

    getRoles: protectedProcedure
      .input(z.object({ userId: z.string() }))
      .query(async ({ input }) => {
        return getUserRoles(input.userId);
      }),

    addRole: protectedProcedure
      .input(
        z.object({
          userId: z.string(),
          role: z.string(),
          expiresAt: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await addUserRole(input.userId, input.role, adminId, input.expiresAt);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to add user role",
          });
        }
        return { success: true };
      }),

    removeRole: protectedProcedure
      .input(
        z.object({
          userId: z.string(),
          role: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await removeUserRole(input.userId, input.role, adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to remove user role",
          });
        }
        return { success: true };
      }),

    getStrikes: protectedProcedure
      .input(z.object({ userId: z.string() }))
      .query(async ({ input }) => {
        return getUserStrikes(input.userId);
      }),

    addStrike: protectedProcedure
      .input(
        z.object({
          userId: z.string(),
          reason: z.string(),
          storyId: z.string().optional(),
          expiresAt: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await addUserStrike(
          input.userId,
          input.reason,
          adminId,
          input.storyId,
          input.expiresAt
        );
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to add user strike",
          });
        }
        return { success: true };
      }),

    removeStrike: protectedProcedure
      .input(z.object({ strikeId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await removeUserStrike(input.strikeId, adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to remove user strike",
          });
        }
        return { success: true };
      }),

    getGamification: protectedProcedure
      .input(z.object({ userId: z.string() }))
      .query(async ({ input }) => {
        return getUserGamification(input.userId);
      }),

    block: protectedProcedure
      .input(z.object({ userId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await blockUser(input.userId, adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to block user",
          });
        }
        return { success: true };
      }),

    unblock: protectedProcedure
      .input(z.object({ userId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await unblockUser(input.userId, adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to unblock user",
          });
        }
        return { success: true };
      }),

    isBlocked: protectedProcedure
      .input(z.object({ userId: z.string() }))
      .query(async ({ input }) => {
        return isUserBlocked(input.userId);
      }),

    getStats: protectedProcedure.query(async () => {
      return getUserStats();
    }),

    update: protectedProcedure
      .input(
        z.object({
          userId: z.string(),
          data: z.object({
            display_name: z.string().optional(),
            username: z.string().optional(),
            bio: z.string().optional(),
            is_pro: z.boolean().optional(),
            trusted_contributor: z.boolean().optional(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        return updateUser(input.userId, input.data);
      }),

    updateEmail: protectedProcedure
      .input(
        z.object({
          userId: z.string(),
          email: z.string().email(),
        })
      )
      .mutation(async ({ input }) => {
        return updateUserEmail(input.userId, input.email);
      }),

    delete: protectedProcedure
      .input(z.object({ userId: z.string() }))
      .mutation(async ({ input }) => {
        return deleteUser(input.userId);
      }),
  }),

  // ============ PRO PROVIDERS MANAGEMENT ============
  pros: router({
    getAll: protectedProcedure
      .input(
        z.object({
          limit: z.number().optional().default(50),
          offset: z.number().optional().default(0),
          search: z.string().optional(),
          providerType: z.string().optional(),
          isVerified: z.boolean().optional(),
          isActive: z.boolean().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        const { limit, offset, search, providerType, isVerified, isActive } = input || {};
        return getProProviders(limit, offset, search, providerType, isVerified, isActive);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        return getProProviderById(input.id);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          updates: z.record(z.any()),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await updateProProvider(input.id, input.updates, adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update pro provider",
          });
        }
        return { success: true };
      }),

    verify: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await verifyProProvider(input.id, adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to verify pro provider",
          });
        }
        return { success: true };
      }),

    unverify: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await unverifyProProvider(input.id, adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to unverify pro provider",
          });
        }
        return { success: true };
      }),

    activate: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await activateProProvider(input.id, adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to activate pro provider",
          });
        }
        return { success: true };
      }),

    deactivate: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await deactivateProProvider(input.id, adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to deactivate pro provider",
          });
        }
        return { success: true };
      }),

    feature: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await featureProProvider(input.id, adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to feature pro provider",
          });
        }
        return { success: true };
      }),

    unfeature: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await unfeatureProProvider(input.id, adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to unfeature pro provider",
          });
        }
        return { success: true };
      }),

    getReviews: protectedProcedure
      .input(z.object({ proId: z.string() }))
      .query(async ({ input }) => {
        return getProReviews(input.proId);
      }),

    getStats: protectedProcedure.query(async () => {
      return getProStats();
    }),

    getProviderTypes: protectedProcedure.query(async () => {
      return getDistinctProviderTypes();
    }),
  }),

  // ============ STORY MODERATION ============
  stories: router({
    getAll: protectedProcedure
      .input(
        z.object({
          limit: z.number().optional().default(50),
          offset: z.number().optional().default(0),
          status: z.string().optional(),
          hasReports: z.boolean().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        const { limit, offset, status, hasReports } = input || {};
        return getStories(limit, offset, status, hasReports);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        return getStoryById(input.id);
      }),

    getReports: protectedProcedure
      .input(z.object({ storyId: z.string() }))
      .query(async ({ input }) => {
        return getStoryReports(input.storyId);
      }),

    getReported: protectedProcedure
      .input(
        z.object({
          limit: z.number().optional().default(50),
          offset: z.number().optional().default(0),
        }).optional()
      )
      .query(async ({ input }) => {
        const { limit, offset } = input || {};
        return getReportedStories(limit, offset);
      }),

    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          status: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await updateStoryStatus(input.id, input.status, adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update story status",
          });
        }
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await deleteStory(input.id, adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to delete story",
          });
        }
        return { success: true };
      }),

    dismissReports: protectedProcedure
      .input(z.object({ storyId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await dismissStoryReports(input.storyId, adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to dismiss story reports",
          });
        }
        return { success: true };
      }),

    getStats: protectedProcedure.query(async () => {
      return getStoryStats();
    }),
  }),

  // ============ PHOTO MODERATION ============
  photos: router({
    getAll: protectedProcedure
      .input(
        z.object({
          limit: z.number().optional().default(50),
          offset: z.number().optional().default(0),
          status: z.string().optional(),
          isFlagged: z.boolean().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        const { limit, offset, status, isFlagged } = input || {};
        return getPhotos(limit, offset, status, isFlagged);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        return getPhotoById(input.id);
      }),

    getReports: protectedProcedure
      .input(z.object({ photoId: z.string() }))
      .query(async ({ input }) => {
        return getPhotoReports(input.photoId);
      }),

    getReported: protectedProcedure
      .input(
        z.object({
          limit: z.number().optional().default(50),
          offset: z.number().optional().default(0),
        }).optional()
      )
      .query(async ({ input }) => {
        const { limit, offset } = input || {};
        return getReportedPhotos(limit, offset);
      }),

    getFlagged: protectedProcedure
      .input(
        z.object({
          limit: z.number().optional().default(50),
          offset: z.number().optional().default(0),
        }).optional()
      )
      .query(async ({ input }) => {
        const { limit, offset } = input || {};
        return getFlaggedPhotos(limit, offset);
      }),

    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          status: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await updatePhotoStatus(input.id, input.status, adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update photo status",
          });
        }
        return { success: true };
      }),

    approve: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await approvePhoto(input.id, adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to approve photo",
          });
        }
        return { success: true };
      }),

    reject: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          reason: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await rejectPhoto(input.id, input.reason, adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to reject photo",
          });
        }
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await deletePhoto(input.id, adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to delete photo",
          });
        }
        return { success: true };
      }),

    setCover: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          placeId: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await setPhotoCover(input.id, input.placeId, adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to set photo as cover",
          });
        }
        return { success: true };
      }),

    dismissReports: protectedProcedure
      .input(z.object({ photoId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await dismissPhotoReports(input.photoId, adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to dismiss photo reports",
          });
        }
        return { success: true };
      }),

    getStats: protectedProcedure.query(async () => {
      return getPhotoStats();
    }),
  }),

  // ============ REVIEW MODERATION ============
  reviewModeration: router({
    getAll: protectedProcedure
      .input(
        z.object({
          limit: z.number().optional().default(50),
          offset: z.number().optional().default(0),
          status: z.string().optional(),
          minRating: z.number().optional(),
          maxRating: z.number().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        const { limit, offset, status, minRating, maxRating } = input || {};
        return getReviews(limit, offset, status, minRating, maxRating);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        return getReviewById(input.id);
      }),

    getReports: protectedProcedure
      .input(z.object({ reviewId: z.string() }))
      .query(async ({ input }) => {
        return getReviewReports(input.reviewId);
      }),

    getReported: protectedProcedure
      .input(
        z.object({
          limit: z.number().optional().default(50),
          offset: z.number().optional().default(0),
        }).optional()
      )
      .query(async ({ input }) => {
        const { limit, offset } = input || {};
        return getReportedReviews(limit, offset);
      }),

    getFlagged: protectedProcedure
      .input(
        z.object({
          limit: z.number().optional().default(50),
          offset: z.number().optional().default(0),
        }).optional()
      )
      .query(async ({ input }) => {
        const { limit, offset } = input || {};
        return getFlaggedReviews(limit, offset);
      }),

    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          status: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await updateReviewStatus(input.id, input.status, adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update review status",
          });
        }
        return { success: true };
      }),

    approve: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await approveReview(input.id, adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to approve review",
          });
        }
        return { success: true };
      }),

    reject: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          reason: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await rejectReview(input.id, input.reason, adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to reject review",
          });
        }
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await deleteReview(input.id, adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to delete review",
          });
        }
        return { success: true };
      }),

    dismissReports: protectedProcedure
      .input(z.object({ reviewId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await dismissReviewReports(input.reviewId, adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to dismiss review reports",
          });
        }
        return { success: true };
      }),

    getStats: protectedProcedure.query(async () => {
      return getReviewStats();
    }),
  }),

  // ============ PLACE EDITING ============
  placeEdit: router({
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          address: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          zip_code: z.string().optional(),
          country: z.string().optional(),
          latitude: z.number().optional(),
          longitude: z.number().optional(),
          phone: z.string().optional(),
          website: z.string().optional(),
          email: z.string().optional(),
          description: z.string().optional(),
          short_description: z.string().optional(),
          category: z.string().optional(),
          subcategory: z.string().optional(),
          price_level: z.number().optional(),
          hours: z.any().optional(),
          amenities: z.array(z.string()).optional(),
          tags: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const result = await createPlaceAdmin(input, adminId);
        if (!result.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: result.error || "Failed to create place",
          });
        }
        return { success: true, placeId: result.placeId };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          updates: z.record(z.any()),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await updatePlaceAdmin(input.id, input.updates, adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update place",
          });
        }
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await deletePlaceAdmin(input.id, adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to delete place",
          });
        }
        return { success: true };
      }),

    getForEdit: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        return getPlaceForEdit(input.id);
      }),

    verify: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await verifyPlace(input.id, adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to verify place",
          });
        }
        return { success: true };
      }),

    unverify: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await unverifyPlace(input.id, adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to unverify place",
          });
        }
        return { success: true };
      }),

    feature: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await featurePlace(input.id, adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to feature place",
          });
        }
        return { success: true };
      }),

    unfeature: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await unfeaturePlace(input.id, adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to unfeature place",
          });
        }
        return { success: true };
      }),

    activate: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await activatePlace(input.id, adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to activate place",
          });
        }
        return { success: true };
      }),

    deactivate: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await deactivatePlace(input.id, adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to deactivate place",
          });
        }
        return { success: true };
      }),

    getPhotos: protectedProcedure
      .input(z.object({ placeId: z.string() }))
      .query(async ({ input }) => {
        return getPlacePhotosForEdit(input.placeId);
      }),

    getCategories: protectedProcedure.query(async () => {
      return getDistinctCategories();
    }),
  }),

  // ============ VERIFICATION SYNC ============
  verificationSync: router({
    approve: protectedProcedure
      .input(
        z.object({
          verificationId: z.string(),
          userId: z.string(),
          badges: z.object({
            licensed: z.boolean(),
            insured: z.boolean(),
            bonded: z.boolean(),
            tavvyVerified: z.boolean(),
          }),
          reviewNotes: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await approveVerificationWithSync(
          input.verificationId,
          input.userId,
          input.badges,
          input.reviewNotes,
          adminId
        );
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to approve verification",
          });
        }
        return { success: true };
      }),

    reject: protectedProcedure
      .input(
        z.object({
          verificationId: z.string(),
          userId: z.string(),
          reviewNotes: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await rejectVerificationWithSync(
          input.verificationId,
          input.userId,
          input.reviewNotes,
          adminId
        );
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to reject verification",
          });
        }
        return { success: true };
      }),

    syncToProvider: protectedProcedure
      .input(
        z.object({
          userId: z.string(),
          verificationData: z.object({
            is_licensed_verified: z.boolean().optional(),
            is_insured_verified: z.boolean().optional(),
            is_bonded_verified: z.boolean().optional(),
            is_tavvy_verified: z.boolean().optional(),
          }),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await syncVerificationToProProvider(
          input.userId,
          input.verificationData,
          adminId
        );
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to sync verification",
          });
        }
        return { success: true };
      }),
  }),

  // ============ PLACE OVERRIDES ============
  placeOverrides: router({
    getAll: protectedProcedure
      .input(
        z.object({
          limit: z.number().optional().default(50),
          offset: z.number().optional().default(0),
          placeId: z.string().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        const { limit, offset, placeId } = input || {};
        return getPlaceOverridesAdmin(limit, offset, placeId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          placeId: z.string(),
          fieldName: z.string(),
          originalValue: z.any(),
          overrideValue: z.any(),
          reason: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const result = await createPlaceOverrideAdmin(
          input.placeId,
          input.fieldName,
          input.originalValue,
          input.overrideValue,
          input.reason,
          adminId
        );
        if (!result.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create override",
          });
        }
        return { success: true, overrideId: result.overrideId };
      }),

    revert: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await revertPlaceOverrideAdmin(input.id, adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to revert override",
          });
        }
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const adminId = ctx.user?.id || "unknown";
        const success = await deletePlaceOverrideAdmin(input.id, adminId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to delete override",
  // Drafts router - manage content drafts for Universal Add
  drafts: router({
    create: protectedProcedure
      .input(
        z.object({
          latitude: z.number(),
          longitude: z.number(),
          address_line1: z.string().optional(),
          address_line2: z.string().optional(),
          city: z.string().optional(),
          region: z.string().optional(),
          postal_code: z.string().optional(),
          country: z.string().optional(),
          formatted_address: z.string().optional(),
          is_offline: z.boolean().optional(),
          offline_created_at: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user?.id;
        if (!userId) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }
        const draft = await createDraft(userId, input);
        if (!draft) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create draft",
          });
        }
        return draft;
      }),
    get: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const userId = ctx.user?.id;
        if (!userId) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }
        const draft = await getDraftById(input.id, userId);
        if (!draft) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Draft not found" });
        }
        return draft;
      }),
    getActive: protectedProcedure.query(async ({ ctx }) => {
      const userId = ctx.user?.id;
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      return await getActiveDraft(userId);
    }),
    list: protectedProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        }).optional()
      )
      .query(async ({ ctx, input }) => {
        const userId = ctx.user?.id;
        if (!userId) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }
        return await getUserDrafts(userId, input?.limit || 50, input?.offset || 0);
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          status: z.enum(["draft_location","draft_type_selected","draft_subtype_selected","draft_details","draft_review"]).optional(),
          current_step: z.number().min(1).max(6).optional(),
          latitude: z.number().optional(),
          longitude: z.number().optional(),
          address_line1: z.string().optional(),
          address_line2: z.string().optional(),
          city: z.string().optional(),
          region: z.string().optional(),
          postal_code: z.string().optional(),
          country: z.string().optional(),
          formatted_address: z.string().optional(),
          content_type: z.enum(["business","universe","city","rv_campground","event","quick_add"]).optional(),
          content_subtype: z.enum(['physical','service','on_the_go','new_universe','spot_in_universe','rv_park','campground','boondocking','overnight_parking','restroom','parking','atm','water_fountain','pet_relief','photo_spot']).optional(),
          data: z.record(z.string(), z.any()).optional(),
          photos: z.array(z.string()).optional(),
          cover_photo: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user?.id;
        if (!userId) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }
        const { id, ...updates } = input;
        const draft = await updateDraft(id, userId, updates);
        if (!draft) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update draft",
          });
        }
        return draft;
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user?.id;
        if (!userId) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }
        const success = await deleteDraft(input.id, userId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to delete draft",
          });
        }
        return { success: true };
      }),
    snooze: protectedProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          hours: z.number().min(1).max(168).default(24),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user?.id;
        if (!userId) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }
        const draft = await snoozeDraft(input.id, userId, input.hours);
        if (!draft) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to snooze draft",
          });
        }
        return draft;
      }),
    submit: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user?.id;
        if (!userId) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }
        const result = await submitDraft(input.id, userId);
        if (!result.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: result.error || "Failed to submit draft",
          });
        }
        return result;
      }),
    getPendingOffline: protectedProcedure.query(async ({ ctx }) => {
      const userId = ctx.user?.id;
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      return await getPendingOfflineDrafts(userId);
    }),
    markSynced: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user?.id;
        if (!userId) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }
        const success = await markDraftSynced(input.id, userId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to mark draft as synced",
          });
        }
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
