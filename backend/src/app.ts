import cors from "cors";
import express, { Express } from "express";
import { buildAdminRouter } from "./admin/adminRouter";
import { clerkAuth } from "./middleware/auth";
import { bookingsRouter } from "./routes/bookings";
import { listingsRouter } from "./routes/listings";
import { mediaRouter } from "./routes/media";
import { savedListingsRouter } from "./routes/savedListings";
import { usersRouter } from "./routes/users";

// async because mounting AdminJS requires a dynamic import (see
// admin/adminRouter.ts) — every caller (server.ts, every test file) awaits
// this instead of treating it as a synchronous factory.
export async function createApp(): Promise<Express> {
  const app = express();
  app.use(cors({ origin: process.env.CORS_ALLOWED_ORIGIN ?? "http://localhost:3000" }));
  app.use(express.json());
  app.use(clerkAuth);
  // @adminjs/express registers its internal routes (e.g. GET "/login")
  // relative to AdminJS's rootPath, expecting the router to be mounted
  // under that same prefix — mounting it bare (as the plan originally had
  // it) makes "/login" resolve at the app root, not "/admin/login", and
  // AdminJS's own unauthenticated-redirect then bounces requests to
  // "/admin/login" forever since nothing is actually listening there.
  app.use("/admin", await buildAdminRouter());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/v1/users", usersRouter);
  app.use("/api/v1/listings", listingsRouter);
  app.use("/api/v1/bookings", bookingsRouter);
  app.use("/api/v1/saved-listings", savedListingsRouter);
  app.use("/media", mediaRouter);

  return app;
}
