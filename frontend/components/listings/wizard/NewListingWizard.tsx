"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { WizardShell } from "./WizardShell";
import { TypeStep } from "./TypeStep";
import { BasicsStep } from "./BasicsStep";
import { createListing, listMyDraftListings, type Listing } from "@/lib/api/listings";

export function NewListingWizard() {
  const router = useRouter();
  const { getToken } = useAuth();

  const [resumeDraft, setResumeDraft] = useState<Listing | null | undefined>(undefined); // undefined = still checking
  const [stepIndex, setStepIndex] = useState(0);
  const [category, setCategory] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sizeSqft, setSizeSqft] = useState(320);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const drafts = await listMyDraftListings(token);
        if (!cancelled) setResumeDraft(drafts[0] ?? null);
      } catch {
        // Draft check failed — fall back to a fresh wizard rather than
        // stranding the user on a blank page.
        if (!cancelled) setResumeDraft(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  async function handleContinueFromBasics() {
    if (!category || !title.trim() || !description.trim()) {
      setError("Fill in a title and description before continuing.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in.");
      const draft = await createListing(
        { title, description, category, size_sqft: sizeSqft },
        token
      );
      router.push(`/listings/new/${draft.id}?step=location`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your listing. Try again.");
      setSubmitting(false);
    }
  }

  function handleNext() {
    if (submitting) return;
    if (stepIndex === 0) {
      if (!category) {
        setError("Pick a category to continue.");
        return;
      }
      setError(null);
      setStepIndex(1);
      return;
    }
    handleContinueFromBasics();
  }

  function handleIndexChange(index: number) {
    if (index > stepIndex && stepIndex === 0 && !category) {
      setError("Pick a category to continue.");
      return;
    }
    setError(null);
    setStepIndex(index);
  }

  if (resumeDraft === undefined) {
    return null; // brief loading gap while the draft check resolves
  }

  if (resumeDraft) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "96px 32px" }}>
        <div style={{ maxWidth: 420, display: "flex", flexDirection: "column", gap: 16, textAlign: "center" }}>
          <h1 style={{ fontSize: 26 }}>Continue where you left off?</h1>
          <p style={{ color: "hsl(var(--muted-foreground))" }}>
            You have an unfinished listing: <strong>{resumeDraft.title}</strong>
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              type="button"
              className="btn-primary"
              onClick={() => router.push(`/listings/new/${resumeDraft.id}`)}
            >
              Continue draft
            </button>
            <button type="button" className="btn-outline" onClick={() => setResumeDraft(null)}>
              Start new
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <p role="alert" style={{ textAlign: "center", padding: "8px 24px 0" }}>
          {error}
        </p>
      )}
      <WizardShell
        steps={[
          <TypeStep key="type" category={category} onSelect={setCategory} />,
          <BasicsStep
            key="basics"
            title={title}
            description={description}
            sizeSqft={sizeSqft}
            onTitleChange={setTitle}
            onDescriptionChange={setDescription}
            onSizeChange={setSizeSqft}
          />,
        ]}
        stepIndex={stepIndex}
        globalStepIndex={stepIndex}
        globalStepCount={6}
        sqft={sizeSqft}
        onIndexChange={handleIndexChange}
        onNext={handleNext}
        nextLabel={submitting ? "Saving…" : "Continue →"}
        backDisabled={stepIndex === 0}
      />
    </div>
  );
}
