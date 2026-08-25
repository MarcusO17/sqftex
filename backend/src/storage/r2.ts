import { randomUUID } from "crypto";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../env";

export const s3 = new S3Client({
  region: "auto",
  endpoint: env.R2_ENDPOINT_URL,
  // Path-style (endpoint/bucket/key) rather than virtual-hosted-style
  // (bucket.endpoint/key) — required for local Garage/MinIO, since
  // "bucket.localhost" doesn't resolve. R2 supports path-style too, so this
  // is safe for the real endpoint as well.
  forcePathStyle: true,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

function buildKey(prefix: string, originalName: string): string {
  const ext = originalName.includes(".") ? originalName.split(".").pop() : "bin";
  return `${prefix}/${randomUUID()}.${ext}`;
}

async function putObject(key: string, buffer: Buffer, contentType: string): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
}

export async function uploadPublicObject(
  buffer: Buffer,
  contentType: string,
  originalName: string
): Promise<string> {
  const key = buildKey("public/listings", originalName);
  await putObject(key, buffer, contentType);
  return `${env.R2_PUBLIC_BASE_URL}/${key}`;
}

export async function uploadPrivateObject(
  buffer: Buffer,
  contentType: string,
  originalName: string
): Promise<string> {
  const key = buildKey("private/verification", originalName);
  await putObject(key, buffer, contentType);
  return key;
}

export async function getPresignedUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key });
  return getSignedUrl(s3, command, { expiresIn: 300 });
}
