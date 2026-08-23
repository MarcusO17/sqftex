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

import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { uploadPublicObject, uploadPrivateObject, getPresignedUrl } from "../../src/storage/r2";

describe("R2 storage helper", () => {
  beforeEach(() => sendMock.mockClear());

  it("uploads a public object and returns a public URL under R2_PUBLIC_BASE_URL", async () => {
    const buffer = Buffer.from("fake-image");
    const contentType = "image/jpeg";
    const url = await uploadPublicObject(buffer, contentType, "photo.jpg");
    expect(sendMock).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    // Verify the command was built with correct parameters
    const command = sendMock.mock.calls[0][0];
    expect(command.input.Bucket).toBe("sqftex-media");
    expect(command.input.ContentType).toBe(contentType);
    expect(command.input.Body).toBe(buffer);
    expect(url.startsWith("https://media.sqftex.test/")).toBe(true);
    expect(url).toMatch(/public\/listings\/.+\.jpg$/);
  });

  it("uploads a private object and returns an object key, not a URL", async () => {
    const buffer = Buffer.from("fake-nric");
    const contentType = "image/png";
    const key = await uploadPrivateObject(buffer, contentType, "nric.png");
    expect(sendMock).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    // Verify the command was built with correct parameters
    const command = sendMock.mock.calls[0][0];
    expect(command.input.Bucket).toBe("sqftex-media");
    expect(command.input.ContentType).toBe(contentType);
    expect(command.input.Body).toBe(buffer);
    expect(key).toMatch(/^private\/verification\/.+\.png$/);
    expect(key.startsWith("http")).toBe(false);
  });

  it("returns a presigned URL for a private key", async () => {
    const testKey = "private/verification/abc.jpg";
    const url = await getPresignedUrl(testKey);
    expect(getSignedUrl).toHaveBeenCalled();
    // Verify the command and options were passed correctly
    const command = (getSignedUrl as jest.Mock).mock.calls[0][1];
    expect(command).toBeInstanceOf(GetObjectCommand);
    expect(command.input.Bucket).toBe("sqftex-media");
    expect(command.input.Key).toBe(testKey);
    const options = (getSignedUrl as jest.Mock).mock.calls[0][2];
    expect(options).toEqual({ expiresIn: 300 });
    expect(url).toBe("https://signed.example/private/verification/abc.jpg");
  });
});
