import { Schema, model, Types } from "mongoose";

export const TIME_SLOTS = [
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
  "06:00 PM",
  "07:00 PM",
  "08:00 PM",
] as const;

const appointmentSchema = new Schema(
  {
    serviceId: {
      type: Types.ObjectId,
      ref: "Service",
      required: true,
    },
    customerId: { type: String, required: true },
    // Snapshots so history stays readable if a service/user changes
    customerName: { type: String, default: "" },
    customerEmail: { type: String, default: "" },
    serviceName: { type: String, default: "" },
    appointmentDate: { type: String, required: true }, // YYYY-MM-DD
    timeSlot: { type: String, required: true, enum: TIME_SLOTS },
    message: { type: String, default: "" },
    servicePrice: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid"],
      default: "unpaid",
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
    checkoutSessionId: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Appointment = model("Appointment", appointmentSchema);
