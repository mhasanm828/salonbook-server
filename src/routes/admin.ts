import { Router, type Request, type Response } from "express";
import mongoose from "mongoose";
import { ObjectId } from "mongodb";
import { Service } from "../models/Service.js";
import { Appointment } from "../models/Appointment.js";
import { Transaction } from "../models/Transaction.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

function usersCollection(res: Response) {
  const db = mongoose.connection.db;
  if (!db) {
    res.status(503).json({ message: "Database is not connected yet." });
    return null;
  }
  // Better Auth stores its users in the "user" collection
  return db.collection("user");
}

interface UserDoc {
  _id: ObjectId;
  name?: string;
  email?: string;
  image?: string | null;
  role?: string;
  isBlocked?: boolean;
  phone?: string;
  createdAt?: Date;
}

function toPublicUser(user: UserDoc) {
  return {
    id: user._id.toString(),
    name: user.name || "",
    email: user.email || "",
    image: user.image || "",
    role: user.role || "customer",
    isBlocked: Boolean(user.isBlocked),
    phone: user.phone || "",
    createdAt: user.createdAt,
  };
}

// GET /api/admin/overview - admin dashboard statistics
router.get("/overview", ...requireAdmin, async (_req: Request, res: Response) => {
  const users = usersCollection(res);
  if (!users) return;
  try {
    const [
      totalCustomers,
      totalActiveServices,
      totalAppointments,
      pendingAppointments,
      confirmedAppointments,
      successfulPayments,
    ] = await Promise.all([
      users.countDocuments({ role: { $ne: "admin" } }),
      Service.countDocuments({ status: "active" }),
      Appointment.countDocuments(),
      Appointment.countDocuments({ status: "pending" }),
      Appointment.countDocuments({ status: "confirmed" }),
      Transaction.find({ status: "paid" }).lean(),
    ]);
    res.json({
      totalCustomers,
      totalActiveServices,
      totalAppointments,
      pendingAppointments,
      confirmedAppointments,
      totalSuccessfulPayments: successfulPayments.length,
      totalRevenue: successfulPayments.reduce((sum, t) => sum + t.amount, 0),
    });
  } catch (error) {
    console.error("Admin overview failed:", error);
    res.status(500).json({ message: "Failed to load dashboard data." });
  }
});

// GET /api/admin/users - all registered customers
router.get("/users", ...requireAdmin, async (_req: Request, res: Response) => {
  const users = usersCollection(res);
  if (!users) return;
  try {
    const docs = (await users
      .find({ role: { $ne: "admin" } })
      .sort({ createdAt: -1 })
      .toArray()) as unknown as UserDoc[];
    res.json({ users: docs.map(toPublicUser), count: docs.length });
  } catch (error) {
    console.error("List users failed:", error);
    res.status(500).json({ message: "Failed to load users." });
  }
});

async function setBlocked(req: Request, res: Response, blocked: boolean) {
  const id = req.params.id as string;
  if (!ObjectId.isValid(id)) {
    res.status(400).json({ message: "Invalid user ID." });
    return;
  }
  const users = usersCollection(res);
  if (!users) return;
  try {
    const result = await users.updateOne(
      { _id: new ObjectId(id) },
      { $set: { isBlocked: blocked, updatedAt: new Date() } }
    );
    if (result.matchedCount === 0) {
      res.status(404).json({ message: "User not found." });
      return;
    }
    res.json({ message: blocked ? "User blocked." : "User unblocked." });
  } catch (error) {
    console.error("Set blocked failed:", error);
    res.status(500).json({ message: "Failed to update user." });
  }
}

// PATCH /api/admin/users/:id/block
router.patch("/users/:id/block", ...requireAdmin, (req, res) =>
  setBlocked(req, res, true)
);

// PATCH /api/admin/users/:id/unblock
router.patch("/users/:id/unblock", ...requireAdmin, (req, res) =>
  setBlocked(req, res, false)
);

export default router;
