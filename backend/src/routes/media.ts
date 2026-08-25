import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Router } from "express";
import { env } from "../env";
import { s3 } from "../storage/r2";

export const mediaRouter = Router();

// Real R2 serves the `public/` prefix over a public CDN domain — anyone can
// GET it with no auth. Garage's S3 API has no equivalent (it rejects every
// anonymous request outright), so for local dev R2_PUBLIC_BASE_URL points
// here instead: this streams the object through the same authenticated S3
// client the rest of the app already uses. Only ever serves `public/*` — the
// `private/` prefix (NRIC verification uploads) must stay reachable only via
// getPresignedUrl()'s short-lived signed links, never through this route.
mediaRouter.get("/*", async (req, res) => {
  const key = (req.params as Record<string, string>)[0];
  if (!key || !key.startsWith("public/")) {
    res.status(404).end();
    return;
  }

  try {
    const object = await s3.send(new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }));
    if (!object.Body) {
      res.status(404).end();
      return;
    }
    res.setHeader("Content-Type", object.ContentType ?? "application/octet-stream");
    if (object.ContentLength !== undefined) {
      res.setHeader("Content-Length", String(object.ContentLength));
    }
    (object.Body as NodeJS.ReadableStream).pipe(res);
  } catch {
    res.status(404).end();
  }
});
