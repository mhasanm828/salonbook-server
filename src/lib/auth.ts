import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient, type Db } from "mongodb";

/**
 * Better Auth configuration (server side).
 *
 * - Email/password + Google sign-in
 * - Users get two extra fields managed only by the server/admin:
 *   role ("customer" | "admin", default "customer", not settable by
 *   the user at sign-up) and isBlocked (default false).
 * - The auth instance is created lazily because it needs a live
 *   MongoDB connection. When MONGODB_URI is not set yet, getAuth()
 *   returns null and the rest of the server still runs.
 */

function createAuth(db: Db, client: MongoClient) {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:5000";
  // Client and server live on different origins in production, so the
  // session cookie must allow cross-site requests (SameSite=None +
  // Secure) whenever the auth URL is HTTPS.
  const isHttps = baseURL.startsWith("https://");

  return betterAuth({
    database: mongodbAdapter(db, { client }),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL,
    ...(isHttps
      ? {
          advanced: {
            defaultCookieAttributes: { sameSite: "none" as const, secure: true },
          },
        }
      : {}),
    trustedOrigins: [process.env.CLIENT_URL || "http://localhost:3000"],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 6,
    },
    ...(googleClientId && googleClientSecret
      ? {
          socialProviders: {
            google: {
              clientId: googleClientId,
              clientSecret: googleClientSecret,
            },
          },
        }
      : {}),
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: false,
          defaultValue: "customer",
          input: false,
        },
        isBlocked: {
          type: "boolean",
          required: false,
          defaultValue: false,
          input: false,
        },
        phone: {
          type: "string",
          required: false,
          input: true,
        },
      },
    },
  });
}

export type AuthInstance = ReturnType<typeof createAuth>;

let client: MongoClient | null = null;
let authInstance: AuthInstance | null = null;
let initPromise: Promise<AuthInstance | null> | null = null;

async function initAuth(): Promise<AuthInstance | null> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("MONGODB_URI is not set - auth is disabled for now.");
    return null;
  }

  client = new MongoClient(uri);
  await client.connect();
  const db = client.db();

  authInstance = createAuth(db, client);
  console.log("Better Auth initialized");
  return authInstance;
}

export async function getAuth(): Promise<AuthInstance | null> {
  if (authInstance) return authInstance;
  if (!initPromise) initPromise = initAuth();
  return initPromise;
}
