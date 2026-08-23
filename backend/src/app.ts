import cors from "cors";
import express, { Express } from "express";

export function createApp(): Express {
  const app = express();
  app.use(cors({ origin: process.env.CORS_ALLOWED_ORIGIN ?? "http://localhost:3000" }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  return app;
}
