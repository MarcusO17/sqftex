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
