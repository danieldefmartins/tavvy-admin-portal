import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  searchPlaces,
  getPlaceById,
  getPlacesCount,
  getAllReviewItems,
  getReviewItemsByType,
  getPlaceSignalAggregates,
  batchImportReviews,
  getRepStats,
  testConnection,
  type BatchReviewInput,
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
            oderId: userId,
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
          oderId: userId,
          fileName: input.fileName,
          totalRows: input.reviews.length,
          status: "processing",
        });

        const jobId = jobResult[0].insertId;

        // Log each review
        for (const review of input.reviews) {
          await db.insert(repActivityLog).values({
            oderId: userId,
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

        const oderId = ctx.user?.id || "anonymous";

        return db
          .select()
          .from(repActivityLog)
          .where(eq(repActivityLog.oderId, oderId))
          .orderBy(desc(repActivityLog.createdAt))
          .limit(50);
      }),

    getBatchJobs: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];

      const oderId = ctx.user?.id || "anonymous";

      return db
        .select()
        .from(batchImportJobs)
        .where(eq(batchImportJobs.oderId, oderId))
        .orderBy(desc(batchImportJobs.createdAt))
        .limit(20);
    }),
  }),
});

export type AppRouter = typeof appRouter;
