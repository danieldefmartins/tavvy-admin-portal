import type { Request, Response } from "express";
import { verifySupabaseToken } from "../supabaseAuth";

const AUTH_COOKIE_NAME = "tavvy_auth_token";

export async function createContext({
  req,
  res,
}: {
  req: Request;
  res: Response;
}) {
  // Get token from cookie
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  
  let user = null;
  
  if (token) {
    // Verify token with Supabase
    const supabaseUser = await verifySupabaseToken(token);
    if (supabaseUser) {
      user = {
        id: supabaseUser.id,
        openId: supabaseUser.id,
        email: supabaseUser.email,
        name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split("@")[0] || "User",
      };
    }
  }

  return {
    req,
    res,
    user,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
