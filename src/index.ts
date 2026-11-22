import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { toNodeHandler } from "better-auth/node";
import { connectDB } from "./config/db.js";
import { getAuth } from "./lib/auth.js";
import serviceRoutes from "./routes/services.js";
import appointmentRoutes from "./routes/appointments.js";
import adminRoutes from "./routes/admin.js";
import paymentRoutes from "./routes/payments.js";
import { stripeWebhookHandler } from "./routes/webhook.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Better Auth handler must be mounted before express.json()
app.all("/api/auth/*splat", async (req, res) => {
  const auth = await getAuth();
  if (!auth) {
    res.status(503).json({
      message: "Authentication is not configured yet (MONGODB_URI missing).",
    });
    return;
  }
  return toNodeHandler(auth)(req, res);
});

// Stripe webhook needs the raw body for signature verification,
// so it is mounted before express.json()
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler
);

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "SalonBook server is running" });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "salonbook-server" });
});

app.use("/api/services", serviceRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payments", paymentRoutes);

async function start() {
  await connectDB();
  app.listen(port, () => {
    console.log(`SalonBook server listening on port ${port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

export default app;
