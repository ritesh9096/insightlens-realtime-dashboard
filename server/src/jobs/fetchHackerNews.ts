import { PrismaClient, Source } from "@prisma/client";
import fetch from "node-fetch";
import { io } from "../server.js"; // to emit WS events

const prisma = new PrismaClient();


const getUniqueId = (): string => {
  //random id gernarateor 
  return Math.random().toString(36).substring(2, 15);
}

export default async function fetchNews() {
  try {
    const url = `https://newsapi.org/v2/top-headlines?category=technology&language=en&pageSize=5&apiKey=${process.env.NEWS_API_KEY}`;
    console.log(url);
    const res = await fetch(url);
    const data = await res.json() as { status: string; articles: any[] };

    if (data.status !== "ok") {
      console.error("❌ NewsAPI error:", data);
      return;
    }

    for (const article of data.articles) {
      try {
        const created = await prisma.trend.create({
          data: {
            source: Source.HACKER_NEWS, // Using HACKER_NEWS as the source type for tech news
            externalId: getUniqueId(), // unique identifier
            // for now we are going to use the normal id increment
            title: article.title || "Untitled",
            url: article.url || null,
            score: 0, // optional — could map popularity later
            raw: article,
          },
        });

        // 🔔 Emit real-time update
        io.emit("trend:new", created);
        console.log(`✅ Inserted: ${article.title}`);
      } catch (e: any) {
        if (e.code === "P2002") {

          //still we need to emit the event
          io.emit("trend:new", article);
          console.log(`✅ Inserted: ${article.title}`);
        } else {
          console.error("❌ Insert failed", e);
        }
      }
    }
  } catch (err) {
    console.error("❌ Fetch failed", err);
  } finally {
    await prisma.$disconnect();
  }
}


