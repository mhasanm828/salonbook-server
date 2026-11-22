/**
 * Promote an existing registered user to admin.
 *
 * Admin accounts are never created through public registration.
 * Usage:
 *   1. Register the account normally from the client (Sign Up).
 *   2. Run: npm run make-admin -- admin@example.com
 */
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npm run make-admin -- <email>");
    process.exit(1);
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set in .env");
    process.exit(1);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection failed");

  const result = await db
    .collection("user")
    .updateOne({ email }, { $set: { role: "admin", updatedAt: new Date() } });

  if (result.matchedCount === 0) {
    console.error(`No user found with email ${email}. Register first, then run this again.`);
    process.exit(1);
  }
  console.log(`${email} is now an admin.`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("make-admin failed:", error);
  process.exit(1);
});
