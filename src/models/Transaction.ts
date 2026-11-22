import { Schema, model, Types } from "mongoose";

const transactionSchema = new Schema(
  {
    appointmentId: {
      type: Types.ObjectId,
      ref: "Appointment",
      required: true,
    },
    customerId: { type: String, required: true },
    customerName: { type: String, default: "" },
    customerEmail: { type: String, default: "" },
    serviceName: { type: String, default: "" },
    appointmentDate: { type: String, default: "" },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: "bdt" },
    stripeSessionId: { type: String, required: true, unique: true },
    status: { type: String, enum: ["paid", "failed"], required: true },
  },
  { timestamps: true }
);

export const Transaction = model("Transaction", transactionSchema);
