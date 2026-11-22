import { Router, type Request, type Response } from "express";
import mongoose from "mongoose";
import { Appointment } from "../models/Appointment.js";
import { Transaction } from "../models/Transaction.js";
import { requireAdmin, requireCustomer } from "../middleware/auth.js";
import { getStripe } from "../lib/stripe.js";

const router = Router();

function dbReady(res: Response): boolean {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ message: "Database is not connected yet." });
    return false;
  }
  return true;
}

// POST /api/payments/checkout - customer pays for a confirmed appointment
router.post("/checkout", ...requireCustomer, async (req: Request, res: Response) => {
  if (!dbReady(res)) return;
  const stripe = getStripe();
  if (!stripe) {
    res.status(503).json({ message: "Stripe is not configured yet." });
    return;
  }
  try {
    const { appointmentId } = req.body ?? {};
    if (!appointmentId || !mongoose.Types.ObjectId.isValid(appointmentId as string)) {
      res.status(400).json({ message: "Invalid appointment ID." });
      return;
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      res.status(404).json({ message: "Appointment not found." });
      return;
    }
    if (appointment.customerId !== req.user!.id) {
      res.status(403).json({ message: "You can only pay for your own appointments." });
      return;
    }
    if (appointment.status !== "confirmed") {
      res.status(400).json({ message: "Only confirmed appointments can be paid for." });
      return;
    }
    if (appointment.paymentStatus === "paid") {
      res.status(400).json({ message: "This appointment is already paid." });
      return;
    }

    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const currency = (process.env.STRIPE_CURRENCY || "bdt").toLowerCase();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: Math.round(appointment.servicePrice * 100),
            product_data: {
              name: appointment.serviceName || "Salon service",
              description: `Appointment on ${appointment.appointmentDate} at ${appointment.timeSlot}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        appointmentId: appointment._id.toString(),
        customerId: appointment.customerId,
      },
      success_url: `${clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/payment/cancel?appointmentId=${appointment._id.toString()}`,
    });

    appointment.checkoutSessionId = session.id;
    await appointment.save();

    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("Create checkout session failed:", error);
    res.status(500).json({ message: "Failed to start payment." });
  }
});

// GET /api/payments/transactions - admin views all payment transactions
router.get("/transactions", ...requireAdmin, async (_req: Request, res: Response) => {
  if (!dbReady(res)) return;
  try {
    const transactions = await Transaction.find().sort({ createdAt: -1 }).lean();
    res.json({ transactions, count: transactions.length });
  } catch (error) {
    console.error("List transactions failed:", error);
    res.status(500).json({ message: "Failed to load transactions." });
  }
});

export default router;
