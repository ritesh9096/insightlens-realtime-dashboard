import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";

const router = Router();

// GET /api/trends?source=HACKER_NEWS|COINGECKO&limit=20&offset=0
router.get("/", async (req, res) => {
  const schema = z.object({
    source: z.enum(["HACKER_NEWS", "COINGECKO"]).optional(),
    limit: z.coerce.number().min(1).max(100).default(20),
    offset: z.coerce.number().min(0).default(0),
  });

  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const { source, limit, offset } = parsed.data;

  try {
    const where = source ? { source } : {};
    const [items, total] = await Promise.all([
      prisma.trend.findMany({
        where,
        orderBy: { collectedAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.trend.count({ where }),
    ]);

    res.json({ total, items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch trends" });
  }
});

// POST /api/trends  (test insert; your ingestion script will use this model directly)
router.post("/", async (req, res) => {
  const schema = z.object({
    source: z.enum(["HACKER_NEWS", "COINGECKO"]),
    externalId: z.string().min(1),
    title: z.string().min(1),
    url: z.string().url({}).optional(),
    score: z.number().optional(),
    raw: z.any()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  try {
    const data = {
      ...parsed.data,
      url: parsed.data.url ?? null,
      score: parsed.data.score ?? null,
    };
    const created = await prisma.trend.create({ data });
    console.log(created); 
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
