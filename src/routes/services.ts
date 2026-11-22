import { Router, type Request, type Response } from "express";
import mongoose from "mongoose";
import { Service, SERVICE_CATEGORIES } from "../models/Service.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

function dbReady(res: Response): boolean {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ message: "Database is not connected yet." });
    return false;
  }
  return true;
}

// GET /api/services - public list of active services
// Query: ?search=name&category=Makeup&sort=price-asc|price-desc
router.get("/", async (req: Request, res: Response) => {
  if (!dbReady(res)) return;
  try {
    const { search, category, sort } = req.query as {
      search?: string;
      category?: string;
      sort?: string;
    };

    const filter: Record<string, unknown> = { status: "active" };
    if (search) {
      filter.serviceName = { $regex: search, $options: "i" };
    }
    if (category && (SERVICE_CATEGORIES as readonly string[]).includes(category)) {
      filter.category = category;
    }

    let query = Service.find(filter);
    if (sort === "price-asc") query = query.sort({ price: 1 });
    else if (sort === "price-desc") query = query.sort({ price: -1 });
    else query = query.sort({ createdAt: -1 });

    const services = await query.lean();
    res.json({ services, count: services.length });
  } catch (error) {
    console.error("List services failed:", error);
    res.status(500).json({ message: "Failed to load services." });
  }
});

// GET /api/services/all - admin list including inactive services
router.get("/all", ...requireAdmin, async (_req: Request, res: Response) => {
  if (!dbReady(res)) return;
  try {
    const services = await Service.find().sort({ createdAt: -1 }).lean();
    res.json({ services, count: services.length });
  } catch (error) {
    console.error("List all services failed:", error);
    res.status(500).json({ message: "Failed to load services." });
  }
});

// GET /api/services/:id - public details of one active service
router.get("/:id", async (req: Request, res: Response) => {
  const id = req.params.id as string;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: "Invalid service ID." });
    return;
  }
  if (!dbReady(res)) return;
  try {
    const service = await Service.findById(id).lean();
    if (!service || service.status !== "active") {
      res.status(404).json({ message: "Service not found." });
      return;
    }
    res.json({ service });
  } catch (error) {
    console.error("Get service failed:", error);
    res.status(500).json({ message: "Failed to load service." });
  }
});

// POST /api/services - admin creates a service
router.post("/", ...requireAdmin, async (req: Request, res: Response) => {
  if (!dbReady(res)) return;
  try {
    const { serviceName, category, description, price, duration, image, status } =
      req.body ?? {};

    if (!serviceName || !category || !description || !image) {
      res.status(400).json({
        message: "Service name, category, description and image are required.",
      });
      return;
    }
    if (!(SERVICE_CATEGORIES as readonly string[]).includes(category)) {
      res.status(400).json({ message: "Invalid service category." });
      return;
    }
    const priceNumber = Number(price);
    const durationNumber = Number(duration);
    if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
      res.status(400).json({ message: "Price must be a positive number." });
      return;
    }
    if (!Number.isFinite(durationNumber) || durationNumber <= 0) {
      res.status(400).json({ message: "Duration must be a positive number." });
      return;
    }
    if (status && status !== "active" && status !== "inactive") {
      res.status(400).json({ message: "Status must be active or inactive." });
      return;
    }

    const service = await Service.create({
      serviceName,
      category,
      description,
      price: priceNumber,
      duration: durationNumber,
      image,
      status: status || "active",
    });
    res.status(201).json({ service });
  } catch (error) {
    console.error("Create service failed:", error);
    res.status(500).json({ message: "Failed to create service." });
  }
});

export default router;
