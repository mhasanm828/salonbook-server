import express from "express";
import cors from "cors";
import dotenv from "dotenv";

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

app.listen(port, () => {
  console.log(`SalonBook server listening on port ${port}`);
});

export default app;
