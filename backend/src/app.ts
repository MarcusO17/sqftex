import cors from "cors";
import express, { Express } from "express";
import { clerkAuth } from "./middleware/auth";
import { usersRouter } from "./routes/users";

export function createApp(): Express {
  const app = express();
  app.use(cors({ origin: process.env.CORS_ALLOWED_ORIGIN ?? "http://localhost:3000" }));
  app.use(express.json());
  app.use(clerkAuth);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/v1/users", usersRouter);

  return app;
}
