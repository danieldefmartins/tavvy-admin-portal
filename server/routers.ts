import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
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
  type BatchReviewInput,
} from "./supabaseDb";
import { getDb } from "./db";
import { repActivityLog, batchImportJobs } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { syncProToGHL } from "./ghl";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Places router - search and manage places from Supabase
  places: router({
    search: protectedProcedure
      .input(z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }))
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
      .input(z.object({
        placeId: z.string(),
        signals: z.array(z.object({
          signalSlug: z.string(),
          tapCount: z.number().min(1).max(3),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

        // Log each signal submission
        for (const signal of input.signals) {
          await db.insert(repActivityLog).values({
            userId: ctx.user.id,
            placeId: input.placeId,
            signalSlug: signal.signalSlug,
            tapCount: signal.tapCount,
            source: "manual",
          });
        }

        // Import to Supabase
        const batchInput: BatchReviewInput[] = input.signals.map(s => ({
          place_id: input.placeId,
          signal_slug: s.signalSlug,
          tap_count: s.tapCount,
        }));

        const result = await batchImportReviews(batchInput, ctx.user.openId);
        return result;
      }),

    batchImport: protectedProcedure
      .input(z.object({
        reviews: z.array(z.object({
          place_id: z.string(),
          signal_slug: z.string(),
          tap_count: z.number().min(1).max(10),
        })),
        fileName: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

        // Create batch import job
        const jobResult = await db.insert(batchImportJobs).values({
          userId: ctx.user.id,
          fileName: input.fileName,
          totalRows: input.reviews.length,
          status: "processing",
        });

        const jobId = jobResult[0].insertId;

        // Log each review
        for (const review of input.reviews) {
          await db.insert(repActivityLog).values({
            userId: ctx.user.id,
            placeId: review.place_id,
            signalSlug: review.signal_slug,
            tapCount: review.tap_count,
            source: "batch",
          });
        }

        // Import to Supabase
        const result = await batchImportReviews(input.reviews, ctx.user.openId);

        // Update job status
        await db.update(batchImportJobs)
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
      .input(z.object({
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
      }))
      .mutation(async ({ input }) => {
        const apiKey = process.env.GHL_API_KEY;
        const locationId = process.env.GHL_LOCATION_ID;

        if (!apiKey || !locationId) {
          console.warn('GHL credentials not configured');
          return { success: false, error: 'GHL not configured' };
        }

        const result = await syncProToGHL(input, apiKey, locationId);
        return result;
      }),
  }),

  // Rep stats router
  stats: router({
    getMyStats: protectedProcedure.query(async ({ ctx }) => {
      return getRepStats(ctx.user.openId);
    }),

    getActivityLog: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(50),
      }).optional())
      .query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) return [];

        return db.select()
          .from(repActivityLog)
          .where(eq(repActivityLog.userId, ctx.user.id))
          .orderBy(desc(repActivityLog.createdAt))
          .limit(50);
      }),

    getBatchJobs: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];

      return db.select()
        .from(batchImportJobs)
        .where(eq(batchImportJobs.userId, ctx.user.id))
        .orderBy(desc(batchImportJobs.createdAt))
        .limit(20);
    }),
  }),
});

export type AppRouter = typeof appRouter;
