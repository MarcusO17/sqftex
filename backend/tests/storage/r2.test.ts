const sendMock = jest.fn().mockResolvedValue({});

jest.mock("@aws-sdk/client-s3", () => {
  const actual = jest.requireActual("@aws-sdk/client-s3");
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation(() => ({ send: sendMock })),
  };
});

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn().mockResolvedValue("https://signed.example/private/verification/abc.jpg"),
}));

// Fixed, known value — do not read process.env.R2_PUBLIC_BASE_URL here. If the real .env has it
// blank, an assertion against process.env would pass vacuously (url.startsWith("") is always
// true) and prove nothing.
jest.mock("../../src/env", () => ({
  env: { R2_PUBLIC_BASE_URL: "https://media.sqftex.test", R2_BUCKET_NAME: "sqftex-media" },
}));

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { uploadPublicObject, uploadPrivateObject, getPresignedUrl } from "../../src/storage/r2";

describe("R2 storage helper", () => {
  beforeEach(() => sendMock.mockClear());

  it("uploads a public object and returns a public URL under R2_PUBLIC_BASE_URL", async () => {
    const url = await uploadPublicObject(Buffer.from("fake-image"), "image/jpeg", "photo.jpg");
    expect(sendMock).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    expect(url.startsWith("https://media.sqftex.test/")).toBe(true);
    expect(url).toMatch(/public\/listings\/.+\.jpg$/);
  });

  it("uploads a private object and returns an object key, not a URL", async () => {
    const key = await uploadPrivateObject(Buffer.from("fake-nric"), "image/png", "nric.png");
    expect(sendMock).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    expect(key).toMatch(/^private\/verification\/.+\.png$/);
    expect(key.startsWith("http")).toBe(false);
  });

  it("returns a presigned URL for a private key", async () => {
    const url = await getPresignedUrl("private/verification/abc.jpg");
    expect(getSignedUrl).toHaveBeenCalled();
    expect(url).toBe("https://signed.example/private/verification/abc.jpg");
  });
});
