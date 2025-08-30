import { Router, type Request, type Response } from "express";
import z from "zod";
import prisma from "../lib/prisma.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    if (!process.env.DATABASE_URL) {
      return res.json({
        ok: true,
        db: "not_configured",
        message: "Database URL not set",
      });
    }
    await prisma.$queryRaw`SELECT 1`; // quick connectivity test
    res.json({ ok: true, db: "up" });
  } catch (e) {
    console.error("Database health check failed:", e);
    res.status(500).json({
      ok: false,
      db: "down",
      error: e instanceof Error ? e.message : "Unknown error",
    });
  }
});

// POST /api/trends  (test insert; your ingestion script will use this model directly)
router.post("/", async (req: Request, res: Response) => {
  const schema = z.object({
    source: z.enum(["HACKER_NEWS", "COINGECKO"]),
    externalId: z.string().min(1),
    title: z.string().min(1),
    url: z.string(),
    score: z.number().optional(),
    raw: z.any(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.message);

  try {
    const data = {
      ...parsed.data,
      score: parsed.data.score ?? null,
      url: parsed.data.url ?? null,
    };
    const created = await prisma.trend.create({ data });
    res.status(201).json(created);
  } catch (e: any) {
    // Handle unique violation on (source, externalId)
    if (e.code === "P2002") {
      return res
        .status(409)
        .json({ error: "Duplicate trend for this source/externalId" });
    }
    console.error(e);
    res.status(500).json({ error: "Failed to create trend" });
  }
});

export default router;
