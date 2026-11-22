import type { Request, Response } from "express";
import type Stripe from "stripe";
import { Appointment } from "../models/Appointment.js";
import { Transaction } from "../models/Transaction.js";
import { getStripe } from "../lib/stripe.js";

/**
 * Stripe webhook handler.
 *
 * Payment status is updated ONLY here, after Stripe's signature has
 * been verified - never from the browser success redirect and never
 * manually by an admin.
 * Mounted with a raw body parser in index.ts (required for signature
 * verification), before express.json().
 */
export async function stripeWebhookHandler(req: Request, res: Response) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    res.status(503).json({ message: "Stripe webhook is not configured yet." });
    return;
  }

  const signature = req.headers["stripe-signature"];
  if (!signature) {
    res.status(400).json({ message: "Missing Stripe signature." });
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error);
    res.status(400).json({ message: "Invalid Stripe signature." });
    return;
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const appointmentId = session.metadata?.appointmentId;

      if (appointmentId && session.payment_status === "paid") {
        const appointment = await Appointment.findById(appointmentId);
        if (appointment && appointment.paymentStatus !== "paid") {
          appointment.paymentStatus = "paid";
          await appointment.save();

          await Transaction.updateOne(
            { stripeSessionId: session.id },
            {
              $setOnInsert: {
                appointmentId: appointment._id,
                customerId: appointment.customerId,
                customerName: appointment.customerName,
                customerEmail: appointment.customerEmail,
                serviceName: appointment.serviceName,
                appointmentDate: appointment.appointmentDate,
                amount: appointment.servicePrice,
                currency: session.currency || "bdt",
                stripeSessionId: session.id,
                status: "paid",
              },
            },
            { upsert: true }
          );
        }
      }
    }
    res.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook handling failed:", error);
    res.status(500).json({ message: "Webhook handling failed." });
  }
}
