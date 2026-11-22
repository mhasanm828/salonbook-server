import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { fromNodeHeaders } from "better-auth/node";
import { getAuth } from "../lib/auth.js";

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: string;
  isBlocked: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/** Try to read the logged-in user from the Better Auth session cookie. */
async function getSessionUser(req: Request): Promise<AuthUser | null> {
  const auth = await getAuth();
  if (!auth) return null;

  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  if (!session?.user) return null;

  const user = session.user as typeof session.user & {
    role?: string;
    isBlocked?: boolean;
  };
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role || "customer",
    isBlocked: Boolean(user.isBlocked),
  };
}

/** Try to read the user from a Bearer JWT (verified with the auth secret). */
function getJwtUser(req: Request): AuthUser | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;

  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) return null;

  try {
    const payload = jwt.verify(header.slice(7), secret) as jwt.JwtPayload & {
      email?: string;
      name?: string;
      role?: string;
      isBlocked?: boolean;
    };
    const id = payload.sub || (payload.id as string | undefined);
    if (!id || !payload.email) return null;
    return {
      id,
      email: payload.email,
      name: payload.name,
      role: payload.role || "customer",
      isBlocked: Boolean(payload.isBlocked),
    };
  } catch {
    return null;
  }
}

/**
 * Protect a route: a valid Better Auth session or a verified JWT is
 * required. Blocked users are rejected here as well, so every
 * protected API gets the block check automatically.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = (await getSessionUser(req)) || getJwtUser(req);
    if (!user) {
      res.status(401).json({ message: "Unauthorized. Please sign in." });
      return;
    }
    if (user.isBlocked) {
      res
        .status(403)
        .json({ message: "Your account has been blocked by the admin." });
      return;
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ message: "Authentication check failed." });
  }
}

/** Restrict a route to one role. Use after (and including) requireAuth. */
export function requireRole(role: "admin" | "customer") {
  const checkRole = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized. Please sign in." });
      return;
    }
    if (req.user.role !== role) {
      res
        .status(403)
        .json({ message: `Forbidden. This route is for ${role} only.` });
      return;
    }
    next();
  };
  return [requireAuth, checkRole];
}

export const requireAdmin = requireRole("admin");
export const requireCustomer = requireRole("customer");
