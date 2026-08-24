import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../prisma";
import { toUserJSON } from "../serializers/user";
import { uploadPrivateObject } from "../storage/r2";

export const usersRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

usersRouter.get("/me/", requireAuth, (req, res) => {
  res.json(toUserJSON(req.dbUser!));
});

const updateProfileSchema = z
  .object({
    username: z.string().min(1),
    phone: z.string(),
    address: z.string(),
  })
  .partial();

usersRouter.patch("/me/", requireAuth, async (req, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ detail: parsed.error.flatten() });
    return;
  }
  const user = await prisma.user.update({
    where: { id: req.dbUser!.id },
    data: parsed.data,
  });
  res.json(toUserJSON(user));
});

// Dev-only shortcut that bypasses the real NRIC-photo + AdminJS review flow
// entirely (see docs/PRD.md "Verification gate" / CLAUDE.md's verification
// business rule for what this stands in for). 404s outside development so
// it can never be reached in a real deployment — remove once onboarding
// wires up the actual review-driven verification path.
usersRouter.post("/me/verify-stub/", requireAuth, async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    res.status(404).end();
    return;
  }
  const user = await prisma.user.update({
    where: { id: req.dbUser!.id },
    data: { isVerified: true },
  });
  res.json(toUserJSON(user));
});

usersRouter.post(
  "/verification/",
  requireAuth,
  upload.single("nric_photo"),
  async (req, res) => {
    const pending = await prisma.identityVerification.findFirst({
      where: { userId: req.dbUser!.id, status: "pending" },
    });
    if (pending) {
      res.status(400).json({ detail: "A verification request is already pending." });
      return;
    }
    if (!req.file) {
      res.status(400).json({ detail: "nric_photo is required." });
      return;
    }

    const nricPhotoUrl = await uploadPrivateObject(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );
    const verification = await prisma.identityVerification.create({
      data: { userId: req.dbUser!.id, nricPhotoUrl },
    });

    res.status(201).json({
      id: verification.id,
      nric_photo: verification.nricPhotoUrl,
      status: verification.status,
      created_at: verification.createdAt.toISOString(),
    });
  }
);
