import { clerkClient, clerkMiddleware, getAuth } from "@clerk/express";
import type { User } from "@prisma/client";
import type { RequestHandler } from "express";
import { prisma } from "../prisma";

declare global {
  namespace Express {
    interface Request {
      dbUser?: User;
    }
  }
}

export const clerkAuth = clerkMiddleware();

async function upsertDbUser(clerkUserId: string): Promise<User> {
  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
  return prisma.user.upsert({
    where: { clerkUserId },
    update: { email },
    create: { clerkUserId, email },
  });
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ detail: "Authentication required." });
    return;
  }
  req.dbUser = await upsertDbUser(userId);
  next();
};

export const attachDbUserIfPresent: RequestHandler = async (req, _res, next) => {
  const { userId } = getAuth(req);
  if (userId) {
    req.dbUser = await upsertDbUser(userId);
  }
  next();
};
