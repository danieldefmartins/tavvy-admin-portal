import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  searchPlaces,
  searchPlacesAdvanced,
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
} from "./supabaseDb";
import { getDb } from "./db";
import { repActivityLog, batchImportJobs } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { syncProToGHL } from "./ghl";
import {
  signInWithEmail,
  verifySupabaseToken,
} from "./supabaseAuth";

// Cookie name for Supabase auth token
const AUTH_COOKIE_NAME = "tavvy_auth_token";

// Super admin emails - ONLY these emails can access admin portal
const SUPER_ADMIN_EMAILS = [
  "daniel@360forbusiness.com",
  "alineedaniel@gmail.com",
];

// Helper function to check if email is an admin
function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.some(adminEmail => 
    adminEmail.toLowerCase() === email.toLowerCase()
  );
}

export const appRouter = router({
  // Auth router - Login only, super admin restricted
  auth: router({
    me: publicProcedure.query(async ({ ctx }) => {
      // Get token from cookie
      const token = ctx.req.cookies?.[AUTH_COOKIE_NAME];
      if (!token) return null;

      // Verify token with Supabase
      const user = await verifySupabaseToken(token);
      if (!user) return null;

      // Check if user is an admin
      if (!isAdminEmail(user.email)) {
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
        // Check if email is an admin BEFORE attempting login
        if (!isAdminEmail(input.email)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access denied. Admin portal is restricted.",
          });
        }

        const { user, session, error } = await signInWithEmail(
          input.email,
          input.password
        );

        if (error || !user || !session) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: error || "Invalid credentials",
          });
        }

        // Set auth cookie
        ctx.res.cookie(AUTH_COOKIE_NAME, session.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7 * 1000, // 7 days
          path: "/",
        });

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

    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(AUTH_COOKIE_NAME, { path: "/" });
      return { success: true };
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
});

export type AppRouter = typeof appRouter;
