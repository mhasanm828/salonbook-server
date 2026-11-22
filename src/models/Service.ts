import { Schema, model, type InferSchemaType } from "mongoose";

export const SERVICE_CATEGORIES = [
  "Haircut & Styling",
  "Hair Coloring",
  "Hair Treatment",
  "Facial & Skincare",
  "Makeup",
  "Manicure & Pedicure",
  "Spa & Massage",
] as const;

const serviceSchema = new Schema(
  {
    serviceName: { type: String, required: true, trim: true },
    category: { type: String, required: true, enum: SERVICE_CATEGORIES },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    duration: { type: Number, required: true, min: 1 }, // minutes
    image: { type: String, required: true },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

export type ServiceDoc = InferSchemaType<typeof serviceSchema>;

export const Service = model("Service", serviceSchema);
