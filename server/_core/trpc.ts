import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context";
import { supabaseAdmin } from "../supabaseAuth";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Protected procedure - requires authentication
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

// Check if a user has an active super_admin role (RBAC via user_roles table)
export async function isUserSuperAdmin(userId: string): Promise<boolean> {
  if (!userId) return false;

  try {
    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "super_admin")
      .or("expires_at.is.null,expires_at.gt.now()")
      .maybeSingle();

    if (error) {
      console.error("[Auth] Error checking admin role:", error);
      return false;
    }

    return !!data;
  } catch (err) {
    console.error("[Auth] Exception checking admin role:", err);
    return false;
  }
}

// Admin procedure - requires authentication AND an active super_admin role.
// The result of the role lookup is cached on the request context so multiple
// admin procedures in one request only hit the database once.
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.isSuperAdmin === undefined) {
    ctx.isSuperAdmin = await isUserSuperAdmin(ctx.user.id);
  }

  if (!ctx.isSuperAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Super admin access required",
    });
  }

  return next({
    ctx: {
      ...ctx,
      isSuperAdmin: true as const,
    },
  });
});
