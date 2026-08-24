/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  // testMatch (glob-based) breaks Jest's path resolution when the repo sits
  // under a dot-prefixed directory segment, e.g. a `.claude/worktrees/...`
  // checkout on Windows — the `\.` right before that segment gets parsed as
  // an escaped literal dot instead of a path separator, so the glob matches
  // zero files. testRegex does plain regex matching against the resolved
  // path instead of glob semantics, which isn't affected by this.
  testRegex: "tests[\\\\/].*\\.test\\.ts$",
  setupFilesAfterEnv: ["<rootDir>/tests/setupEnv.ts"],
  // Jest resets the module registry per test FILE (not once for the whole
  // run), so AdminJS's cold build (src/admin/adminRouter.ts's module-level
  // cache) re-pays its ~2.5s bundling cost on the first createApp() call
  // in every file that imports src/app.ts — i.e. almost all of them. The
  // 5s default is too tight for that.
  testTimeout: 30000,
};
