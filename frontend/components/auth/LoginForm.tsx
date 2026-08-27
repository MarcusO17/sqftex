"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginFormProps = {
  className?: string;
  // Called after a successful sign-in instead of the default redirect. Used
  // by the landing-page dialog (close + refresh in place); the /login page
  // leaves this unset and navigates.
  onSuccess?: () => void;
  // Where to go after sign-in when `onSuccess` isn't provided. The /login
  // page passes the ?redirect_url query param through; defaults to "/".
  afterSignInUrl?: string;
};

// Custom sign-in form, built on shadcn/ui primitives and wired to Clerk's
// `useSignIn` custom-flow API. Rendered both on the /login page and inside
// the landing nav's <LoginDialog>.
export function LoginForm({ className, onSuccess, afterSignInUrl }: LoginFormProps) {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();
  const redirectUrl = afterSignInUrl || "/";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  function handleComplete() {
    if (onSuccess) onSuccess();
    else router.push(redirectUrl);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const attempt = await signIn.create({ identifier: email, password });

      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        handleComplete();
        return;
      }

      // e.g. needs_first_factor / needs_second_factor — out of scope for
      // this first pass.
      setError("Additional verification is required to sign in.");
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        setError(err.errors[0]?.longMessage || err.errors[0]?.message || "Could not sign you in.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    if (!isLoaded || submitting) return;
    setError(null);
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: redirectUrl,
      });
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        setError(err.errors[0]?.longMessage || err.errors[0]?.message || "Google sign-in failed.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="flex flex-col gap-1.5 text-center">
        <h2 className="text-xl font-semibold tracking-tight">Welcome back</h2>
        <p className="text-sm text-muted-foreground">Log in to your packrat account</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={!isLoaded || submitting}
            onClick={handleGoogle}
          >
            <GoogleIcon className="mr-2 h-4 w-4" />
            Continue with Google
          </Button>

          <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
            <span className="relative z-10 bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                {/* TODO: wire to a Clerk password-reset flow */}
                <span className="ml-auto text-sm text-muted-foreground">Forgot password?</span>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {error}
              </p>
            )}

            {/* Clerk bot-protection mounts here when enabled for sign-in */}
            <div id="clerk-captcha" />

            <Button type="submit" className="w-full" disabled={!isLoaded || submitting}>
              {submitting ? "Signing in…" : "Log in"}
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="text-foreground underline underline-offset-4">
              Sign up
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.86-.08-1.68-.22-2.47H12v4.68h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.83z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.88-3c-1.08.72-2.45 1.16-4.06 1.16-3.12 0-5.77-2.11-6.71-4.95H1.29v3.09A12 12 0 0 0 12 24z"
      />
      <path fill="#FBBC05" d="M5.29 14.3a7.2 7.2 0 0 1 0-4.6V6.62H1.29a12 12 0 0 0 0 10.76z" />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.29 6.62l4 3.09C6.23 6.86 8.88 4.75 12 4.75z"
      />
    </svg>
  );
}
