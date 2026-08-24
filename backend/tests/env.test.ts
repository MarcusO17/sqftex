// src/env.ts does `import "dotenv/config"`, which re-reads the real
// backend/.env file every time the module is freshly required. Since Task 2
// deliberately puts non-empty placeholder values in .env (real Clerk keys
// are a prerequisite noted in the plan, but tests need something present),
// leaving this unmocked would let a `delete process.env.X` below get
// silently undone by dotenv reloading X from disk — making the "missing
// var" test depend on the developer's local .env staying incomplete rather
// than on the code under test. Mock it to a no-op so these tests only see
// the process.env values set explicitly in each test.
jest.mock("dotenv/config", () => ({}));

describe("env", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("throws a clear error when a required var is missing", () => {
    delete process.env.CLERK_SECRET_KEY;
    expect(() => require("../src/env")).toThrow(/CLERK_SECRET_KEY/);
  });

  it("loads successfully when all required vars are present", () => {
    process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/db";
    process.env.CLERK_SECRET_KEY = "sk_test_x";
    process.env.CLERK_PUBLISHABLE_KEY = "pk_test_x";
    process.env.ADMIN_EMAIL = "admin@example.com";
    process.env.ADMIN_PASSWORD = "hunter22222";
    process.env.ADMIN_COOKIE_SECRET = "cookie-secret-for-adminjs-session";
    const { env } = require("../src/env");
    expect(env.ADMIN_EMAIL).toBe("admin@example.com");
    expect(env.CORS_ALLOWED_ORIGIN).toBe("http://localhost:3000");
  });
});
