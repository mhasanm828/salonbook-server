import { Router, type Request, type Response } from "express";
import mongoose from "mongoose";
import { ObjectId } from "mongodb";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

function usersCollection(res: Response) {
  const db = mongoose.connection.db;
  if (!db) {
    res.status(503).json({ message: "Database is not connected yet." });
    return null;
  }
  return db.collection("user");
}

// GET /api/profile - the logged-in user's own profile
router.get("/", requireAuth, async (req: Request, res: Response) => {
  const users = usersCollection(res);
  if (!users) return;
  try {
    if (!ObjectId.isValid(req.user!.id)) {
      res.json({
        user: {
          id: req.user!.id,
          name: req.user!.name || "",
          email: req.user!.email,
          image: "",
          phone: "",
          role: req.user!.role,
        },
      });
      return;
    }
    const doc = await users.findOne({ _id: new ObjectId(req.user!.id) });
    if (!doc) {
      res.status(404).json({ message: "Profile not found." });
      return;
    }
    res.json({
      user: {
        id: doc._id.toString(),
        name: doc.name || "",
        email: doc.email || "",
        image: doc.image || "",
        phone: doc.phone || "",
        role: doc.role || "customer",
      },
    });
  } catch (error) {
    console.error("Get profile failed:", error);
    res.status(500).json({ message: "Failed to load profile." });
  }
});

// PATCH /api/profile - update own name, image and phone only.
// Role and blocked status can never be changed through this route.
router.patch("/", requireAuth, async (req: Request, res: Response) => {
  const users = usersCollection(res);
  if (!users) return;
  try {
    if (!ObjectId.isValid(req.user!.id)) {
      res.status(400).json({ message: "Profile cannot be updated for this account yet." });
      return;
    }
    const { name, image, phone } = req.body ?? {};
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof name === "string" && name.trim()) updates.name = name.trim();
    if (typeof image === "string") updates.image = image;
    if (typeof phone === "string") updates.phone = phone;

    if (Object.keys(updates).length === 1) {
      res.status(400).json({ message: "Nothing to update." });
      return;
    }

    const result = await users.updateOne(
      { _id: new ObjectId(req.user!.id) },
      { $set: updates }
    );
    if (result.matchedCount === 0) {
      res.status(404).json({ message: "Profile not found." });
      return;
    }
    res.json({ message: "Profile updated successfully." });
  } catch (error) {
    console.error("Update profile failed:", error);
    res.status(500).json({ message: "Failed to update profile." });
  }
});

export default router;
