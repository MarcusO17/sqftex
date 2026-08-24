import type { Router } from "express";
import { env } from "../env";
import { prisma } from "../prisma";

// adminjs, @adminjs/express, and @adminjs/prisma are published as ESM-only
// packages ("type": "module"), but this backend is CommonJS (Jest +
// ts-jest + classic tsconfig moduleResolution, matching Tasks 1-9). A
// static `import`/`require` of an ESM-only package from CJS output fails
// at runtime with ERR_REQUIRE_ESM.
//
// Node's CJS *can* load ESM via a dynamic `import()` — but TypeScript, when
// compiling to CommonJS, downlevels `import()` into
// `Promise.resolve().then(() => require(...))`, which is still a `require`
// call and hits the exact same ERR_REQUIRE_ESM. `new Function(...)` builds
// the import call at runtime instead of compile time, so tsc/ts-jest never
// sees a literal `import(...)` to downlevel — this is the standard
// workaround for consuming ESM-only packages from a CJS TypeScript project.
const dynamicImport = new Function("specifier", "return import(specifier)") as (
  specifier: string
) => Promise<any>;

let cachedRouter: Router | null = null;

// Built lazily (not at module load) and cached: `new AdminJS(...)` and
// AdminJS.registerAdapter are meant to run once per process, and every
// route test in this suite calls createApp() fresh per test — rebuilding
// AdminJS's full resource/component set on every call would be wasteful
// and, since registerAdapter is a module-global registration, redundant.
export async function buildAdminRouter(): Promise<Router> {
  if (cachedRouter) return cachedRouter;

  const { default: AdminJS } = await dynamicImport("adminjs");
  const { default: AdminJSExpress } = await dynamicImport("@adminjs/express");
  const { Database, Resource, getModelByName } = await dynamicImport("@adminjs/prisma");

  AdminJS.registerAdapter({ Database, Resource });

  const admin = new AdminJS({
    rootPath: "/admin",
    resources: [
      {
        resource: { model: getModelByName("User"), client: prisma },
        options: { navigation: { name: "Accounts" } },
      },
      {
        resource: { model: getModelByName("Listing"), client: prisma },
        options: { navigation: { name: "Marketplace" } },
      },
      {
        resource: { model: getModelByName("ListingPhoto"), client: prisma },
        options: { navigation: { name: "Marketplace" } },
      },
      {
        resource: { model: getModelByName("IdentityVerification"), client: prisma },
        options: {
          navigation: { name: "Accounts" },
          actions: {
            approve: {
              actionType: "record",
              handler: async (_request: unknown, _response: unknown, context: any) => {
                const { record, currentAdmin } = context;
                await prisma.identityVerification.update({
                  where: { id: Number(record?.params.id) },
                  data: { status: "approved", reviewedAt: new Date() },
                });
                return { record: record?.toJSON(currentAdmin) };
              },
            },
            reject: {
              actionType: "record",
              handler: async (_request: unknown, _response: unknown, context: any) => {
                const { record, currentAdmin } = context;
                await prisma.identityVerification.update({
                  where: { id: Number(record?.params.id) },
                  data: { status: "rejected", reviewedAt: new Date() },
                });
                return { record: record?.toJSON(currentAdmin) };
              },
            },
          },
        },
      },
    ],
  });

  // reviewedById is intentionally left unset by the Approve/Reject actions
  // above — AdminJS auth here is a single hardcoded operator login, not
  // tied to a User row, so there's no meaningful id to attribute the
  // review to (matches the "one operator reviews NRIC uploads" reality
  // this replaces).
  cachedRouter = AdminJSExpress.buildAuthenticatedRouter(
    admin,
    {
      authenticate: async (email: string, password: string) => {
        if (email === env.ADMIN_EMAIL && password === env.ADMIN_PASSWORD) {
          return { email };
        }
        return null;
      },
      cookiePassword: env.ADMIN_COOKIE_SECRET,
    },
    null,
    {
      resave: false,
      saveUninitialized: false,
      secret: env.ADMIN_COOKIE_SECRET,
    }
  );

  return cachedRouter as Router;
}
