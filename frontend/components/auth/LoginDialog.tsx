"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LoginForm } from "./LoginForm";

// Landing-nav "Log in" popup — replaces Clerk's <SignInButton mode="modal">
// widget with the custom shadcn LoginForm in a shadcn Dialog. On success it
// closes and refreshes so the nav re-renders in its <SignedIn> state
// without a full navigation away from the landing page.
export function LoginDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-sm">
        {/* Visible heading lives in LoginForm; this keeps the dialog
            accessible without duplicating it on screen. */}
        <DialogTitle className="sr-only">Log in</DialogTitle>
        <LoginForm
          afterSignInUrl="/"
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
