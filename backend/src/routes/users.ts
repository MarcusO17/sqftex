import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../prisma";
import { toUserJSON } from "../serializers/user";
import { uploadPrivateObject } from "../storage/r2";

export const usersRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

usersRouter.get("/me/", requireAuth, (req, res) => {
  res.json(toUserJSON(req.dbUser!));
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
