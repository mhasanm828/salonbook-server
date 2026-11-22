import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "SalonBook server is running" });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "salonbook-server" });
});

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
