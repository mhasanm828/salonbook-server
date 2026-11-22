import { Router, type Request, type Response } from "express";
import mongoose from "mongoose";
import { Appointment, TIME_SLOTS } from "../models/Appointment.js";
import { Service } from "../models/Service.js";
import { requireAdmin, requireAuth, requireCustomer } from "../middleware/auth.js";

const router = Router();

function dbReady(res: Response): boolean {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ message: "Database is not connected yet." });
    return false;
  }
  return true;
}

const SERVICE_POPULATE = { path: "serviceId", select: "serviceName category image price duration" };

// POST /api/appointments - customer submits an appointment request
router.post("/", ...requireCustomer, async (req: Request, res: Response) => {
  if (!dbReady(res)) return;
  try {
    const { serviceId, appointmentDate, timeSlot, message } = req.body ?? {};

    if (!serviceId || !mongoose.Types.ObjectId.isValid(serviceId as string)) {
      res.status(400).json({ message: "Invalid service ID." });
      return;
    }
    if (!appointmentDate || typeof appointmentDate !== "string") {
      res.status(400).json({ message: "Appointment date is required." });
      return;
    }
    if (!(TIME_SLOTS as readonly string[]).includes(timeSlot)) {
      res.status(400).json({ message: "Please choose a valid time slot." });
      return;
    }

    const service = await Service.findById(serviceId).lean();
    if (!service) {
      res.status(404).json({ message: "Service not found." });
      return;
    }
    if (service.status !== "active") {
      res.status(400).json({ message: "This service is not available for booking." });
      return;
    }

    // Prevent duplicate active bookings for the same service, date and slot
    const conflict = await Appointment.findOne({
      serviceId,
      appointmentDate,
      timeSlot,
      status: { $in: ["pending", "confirmed"] },
    }).lean();
    if (conflict) {
      res.status(409).json({
        message: "This time slot is already booked for the selected service. Please choose another slot.",
      });
      return;
    }

    const appointment = await Appointment.create({
      serviceId,
      customerId: req.user!.id,
      customerName: req.user!.name || "",
      customerEmail: req.user!.email,
      serviceName: service.serviceName,
      appointmentDate,
      timeSlot,
      message: typeof message === "string" ? message : "",
      servicePrice: service.price,
      paymentStatus: "unpaid",
      status: "pending",
    });
    res.status(201).json({ appointment });
  } catch (error) {
    console.error("Create appointment failed:", error);
    res.status(500).json({ message: "Failed to submit appointment request." });
  }
});

// GET /api/appointments/me/stats - customer dashboard overview counts
router.get("/me/stats", ...requireCustomer, async (req: Request, res: Response) => {
  if (!dbReady(res)) return;
  try {
    const customerId = req.user!.id;
    const [total, pending, confirmed, cancelled] = await Promise.all([
      Appointment.countDocuments({ customerId }),
      Appointment.countDocuments({ customerId, status: "pending" }),
      Appointment.countDocuments({ customerId, status: "confirmed" }),
      Appointment.countDocuments({ customerId, status: "cancelled" }),
    ]);
    res.json({ total, pending, confirmed, cancelled });
  } catch (error) {
    console.error("Customer stats failed:", error);
    res.status(500).json({ message: "Failed to load dashboard data." });
  }
});

// GET /api/appointments/me - customer's own appointments
router.get("/me", ...requireCustomer, async (req: Request, res: Response) => {
  if (!dbReady(res)) return;
  try {
    const appointments = await Appointment.find({ customerId: req.user!.id })
      .populate(SERVICE_POPULATE)
      .sort({ createdAt: -1 })
      .lean();
    res.json({ appointments, count: appointments.length });
  } catch (error) {
    console.error("List my appointments failed:", error);
    res.status(500).json({ message: "Failed to load appointments." });
  }
});

// GET /api/appointments - admin list of all appointment requests
router.get("/", ...requireAdmin, async (_req: Request, res: Response) => {
  if (!dbReady(res)) return;
  try {
    const appointments = await Appointment.find()
      .populate(SERVICE_POPULATE)
      .sort({ createdAt: -1 })
      .lean();
    res.json({ appointments, count: appointments.length });
  } catch (error) {
    console.error("List appointments failed:", error);
    res.status(500).json({ message: "Failed to load appointments." });
  }
});

// GET /api/appointments/:id - owner customer or admin views one appointment
router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = req.params.id as string;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: "Invalid appointment ID." });
    return;
  }
  if (!dbReady(res)) return;
  try {
    const appointment = await Appointment.findById(id).populate(SERVICE_POPULATE).lean();
    if (!appointment) {
      res.status(404).json({ message: "Appointment not found." });
      return;
    }
    const isOwner = appointment.customerId === req.user!.id;
    if (!isOwner && req.user!.role !== "admin") {
      res.status(403).json({ message: "You can only view your own appointments." });
      return;
    }
    res.json({ appointment });
  } catch (error) {
    console.error("Get appointment failed:", error);
    res.status(500).json({ message: "Failed to load appointment." });
  }
});

// PATCH /api/appointments/:id/confirm - admin confirms a pending appointment
router.patch("/:id/confirm", ...requireAdmin, async (req: Request, res: Response) => {
  const id = req.params.id as string;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: "Invalid appointment ID." });
    return;
  }
  if (!dbReady(res)) return;
  try {
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      res.status(404).json({ message: "Appointment not found." });
      return;
    }
    if (appointment.status !== "pending") {
      res.status(400).json({ message: "Only pending appointments can be confirmed." });
      return;
    }
    appointment.status = "confirmed";
    await appointment.save();
    res.json({ appointment });
  } catch (error) {
    console.error("Confirm appointment failed:", error);
    res.status(500).json({ message: "Failed to confirm appointment." });
  }
});

// PATCH /api/appointments/:id/cancel - customer cancels own pending; admin cancels pending/confirmed
router.patch("/:id/cancel", requireAuth, async (req: Request, res: Response) => {
  const id = req.params.id as string;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: "Invalid appointment ID." });
    return;
  }
  if (!dbReady(res)) return;
  try {
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      res.status(404).json({ message: "Appointment not found." });
      return;
    }
    if (req.user!.role === "admin") {
      if (appointment.status === "cancelled") {
        res.status(400).json({ message: "Appointment is already cancelled." });
        return;
      }
    } else {
      if (appointment.customerId !== req.user!.id) {
        res.status(403).json({ message: "You can only cancel your own appointments." });
        return;
      }
      if (appointment.status !== "pending") {
        res.status(400).json({ message: "Only pending appointments can be cancelled." });
        return;
      }
    }
    appointment.status = "cancelled";
    await appointment.save();
    res.json({ appointment });
  } catch (error) {
    console.error("Cancel appointment failed:", error);
    res.status(500).json({ message: "Failed to cancel appointment." });
  }
});

export default router;
