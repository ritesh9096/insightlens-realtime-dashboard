// frontend/app/page.tsx or pages/index.tsx
"use client";
import { useEffect, useState } from "react";
import ioClient from "socket.io-client";

type Trend = {
  id: number;
  source: "HACKER_NEWS" | "COINGECKO";
  externalId: string;
  title: string;
  url?: string | null;
  score?: number | null;
  collectedAt: string;
};

export default function Dashboard() {
  const [trends, setTrends] = useState<Trend[]>([]);

  // 1) Fetch initial data
  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL!;
    fetch(`${api}/trends?limit=20`)
      .then((res) => res.json())
      .then(({ items }) => setTrends(items))
      .catch(console.error);
  }, []);

  // 2) Subscribe to socket events
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL!;
    const socket = ioClient(wsUrl, {
      transports: ["websocket"], // prefer WS
      withCredentials: true,
    });

    const onNewTrend = (t: Trend) => {
      setTrends((prev) => [t, ...prev].slice(0, 50)); // keep top 50
    };

    socket.on("connect", () => console.log("🔌 connected", socket.id));
    socket.on("trend:new", onNewTrend);

    return () => {
      socket.off("trend:new", onNewTrend);
      socket.disconnect();
    };
  }, []);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">InsightLens (Live)</h1>
      <ul className="space-y-3">
        {trends.map((t) => (
          <li key={t.id} className="border rounded p-3">
            <div className="text-sm text-gray-500">
              {t.source} • {new Date(t.collectedAt).toLocaleString()}
            </div>
            <a
              href={t.url ?? "#"}
              target="_blank"
              className="text-lg font-medium"
            >
              {t.title}
            </a>
            {t.score != null && (
              <div className="text-sm mt-1">Score: {t.score}</div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
