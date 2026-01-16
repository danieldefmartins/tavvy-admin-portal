import type { Request, Response } from "express";
import { verifySupabaseToken } from "../supabaseAuth";

const AUTH_COOKIE_NAME = "tavvy_auth_token";

export interface User {
  id: string;
  openId: string;
  email: string | undefined;
  name: string;
  role: string;
}

export interface Context {
  req: Request;
  res: Response;
  user: User | null;
}

export async function createContext({
  req,
  res,
}: {
  req: Request;
  res: Response;
}): Promise<Context> {
  let user: User | null = null;

  // Get token from cookie
  const token = req.cookies?.[AUTH_COOKIE_NAME];

  if (token) {
    try {
      const supabaseUser = await verifySupabaseToken(token);
      if (supabaseUser) {
        user = {
          id: supabaseUser.id,
          openId: supabaseUser.id,
          email: supabaseUser.email,
          name:
            supabaseUser.user_metadata?.full_name ||
            supabaseUser.email?.split("@")[0] ||
            "User",
          role: supabaseUser.user_metadata?.role || "user",
        };
      }
    } catch (error) {
      console.warn("[Context] Failed to verify token:", error);
    }
  }

  return { req, res, user };
}
