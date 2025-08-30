import "dotenv/config";
import express from "express";
import cors from "cors";
import health from "./routes/health.js";
import trends from "./routes/trends.js";
import cron from "node-cron";
import fetchHackerNews from "./jobs/fetchHackerNews.js";
import http from "http";
import { Server } from "socket.io";

const app = express();
app.use(cors({ origin: ["http://localhost:3000"], credentials: true }));
app.use(express.json());

app.use("/api/health", health);
app.use("/api/trends", trends);

cron.schedule("*/1 * * * *", () => {
  console.log("⏰ Running Hacker News job...");
  fetchHackerNews();
});

// --socket.io setup --- 

const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST"],
  }
});

io.on("connection", (socket) => {
  console.log('🔌 socket connected:', socket.id);
  socket.on("disconnect", () => {
    console.log("🔌 socket disconnected:", socket.id);
  });
});


const port = Number(process.env.PORT) || 4000;

const startServer = (portToTry: number) => {
  server.listen(portToTry, () => {                                                                                                
    console.log(`API listening on http://localhost:${portToTry}`);
  }).on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${portToTry} is busy, trying port ${portToTry + 1}`);
      startServer(portToTry + 1);
    } else {
      console.error('Server error:', err);
    }
  });
};

startServer(port);