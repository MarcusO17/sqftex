"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { WizardShell } from "./WizardShell";
import { LocationStep } from "./LocationStep";
import { PricingStep } from "./PricingStep";
import { RulesPhotosStep } from "./RulesPhotosStep";
import { ReviewStep } from "./ReviewStep";
import {
  addListingPhoto,
  getListing,
  publishListing,
  updateListing,
  type Listing,
} from "@/lib/api/listings";

// Steps 3-6 map to wizard indices 0-3 here (the shell always starts a fresh
// index at 0 for whatever `steps` array it's given — TypeStep/BasicsStep
// live in NewListingWizard's own separate WizardShell instance). The step
// *labels* shown to the host ("Step 3 of 6"… "Step 6 of 6") are hardcoded
// into each step component to read correctly regardless of which shell
// instance renders them.
const STEP_NAMES = ["location", "pricing", "rules-photos", "review"] as const;
type StepName = (typeof STEP_NAMES)[number];

function firstIncompleteStep(draft: Listing): number {
  if (draft.location_lat === null || draft.location_lng === null || !draft.address) return 0;
  if (draft.price_cents === null || draft.price_unit === null) return 1;
  if (draft.photos.length === 0) return 2;
  return 3;
}

export function DraftWizard({ draftId }: { draftId: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getToken } = useAuth();

  const [draft, setDraft] = useState<Listing | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [address, setAddress] = useState("");
  const [priceRM, setPriceRM] = useState(680);
  const [priceUnit, setPriceUnit] = useState<"daily" | "monthly">("monthly");
  const [accessRules, setAccessRules] = useState("");
  const [prohibitedItems, setProhibitedItems] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedPhotoCount, setUploadedPhotoCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const loaded = await getListing(draftId, token);
        if (cancelled) return;
        setDraft(loaded);
        if (loaded.location_lat !== null) setLat(loaded.location_lat);
        if (loaded.location_lng !== null) setLng(loaded.location_lng);
        if (loaded.address) setAddress(loaded.address);
        if (loaded.price_cents !== null) setPriceRM(loaded.price_cents / 100);
        if (loaded.price_unit) setPriceUnit(loaded.price_unit);
        setAccessRules(loaded.access_rules);
        setProhibitedItems(loaded.prohibited_items);
        setUploadedPhotoCount(loaded.photos.length);

        const stepParam = searchParams.get("step") as StepName | null;
        const paramIndex = stepParam ? STEP_NAMES.indexOf(stepParam) : -1;
        setStepIndex(paramIndex !== -1 ? paramIndex : firstIncompleteStep(loaded));
      } catch (err) {
        // Same fallback pattern as NewListingWizard's draft-check effect.
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Couldn't load this draft. Try again.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  // Direct, unvalidated navigation. Used for backward moves (Back button,
  // Review's Edit links) and by handleNext once a step's data is already
  // PATCHed — neither case is entering new unsaved data.
  function goToStep(index: number) {
    setStepIndex(index);
    router.replace(`/listings/new/${draftId}?step=${STEP_NAMES[index]}`);
  }

  // The shell's onIndexChange. Its only forward-moving caller is the swipe
  // gesture (Continue goes straight to onNext), and a swipe can only ever
  // request an adjacent panel — so a forward request is always stepIndex + 1,
  // exactly what handleNext advances to. Routing it through handleNext keeps
  // swipes from skipping the PATCH and per-step validation that the Continue
  // button runs. handleNext itself must call goToStep, never this function,
  // or it would re-enter itself: `stepIndex` is a per-render const, so its
  // internal advance calls still read the pre-advance value and would look
  // "forward" from here.
  function handleIndexChange(index: number) {
    if (index > stepIndex) {
      handleNext();
      return;
    }
    goToStep(index);
  }

  async function handleNext() {
    if (submitting) return;
    setError(null);
    const token = await getToken();
    if (!token) {
      setError("Not signed in.");
      return;
    }
    setSubmitting(true);
    try {
      if (stepIndex === 0) {
        if (lat === null || lng === null || !address.trim()) {
          setError("Drop a pin and enter an address before continuing.");
          setSubmitting(false);
          return;
        }
        await updateListing(draftId, { latitude: lat, longitude: lng, address }, token);
        goToStep(1);
      } else if (stepIndex === 1) {
        await updateListing(draftId, { price_cents: Math.round(priceRM * 100), price_unit: priceUnit }, token);
        goToStep(2);
      } else if (stepIndex === 2) {
        if (files.length === 0 && uploadedPhotoCount === 0) {
          setError("Add at least one photo before continuing.");
          setSubmitting(false);
          return;
        }
        await updateListing(draftId, { access_rules: accessRules, prohibited_items: prohibitedItems }, token);
        // Upload one at a time, trimming `files`/bumping the count after each
        // success — if upload N of M fails partway, the M-N already committed to
        // the server are removed from `files` immediately, so clicking Continue
        // again only retries what's actually left instead of re-uploading (and
        // duplicating) photos that already landed.
        let remaining = files;
        while (remaining.length > 0) {
          await addListingPhoto(draftId, remaining[0], token);
          remaining = remaining.slice(1);
          setUploadedPhotoCount((n) => n + 1);
          setFiles(remaining);
        }
        goToStep(3);
      } else {
        const published = await publishListing(draftId, token);
        router.push(`/listings/${published.id}`);
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "96px 32px" }}>
        <p role="alert">{loadError}</p>
      </div>
    );
  }

  if (!draft) return null;

  return (
    <div>
      {error && (
        <p role="alert" style={{ textAlign: "center", padding: "8px 24px 0" }}>
          {error}
        </p>
      )}
      <WizardShell
        steps={[
          <LocationStep
            key="location"
            lat={lat}
            lng={lng}
            address={address}
            onLatLngChange={(la, ln) => {
              setLat(la);
              setLng(ln);
            }}
            onAddressChange={setAddress}
          />,
          <PricingStep
            key="pricing"
            priceRM={priceRM}
            priceUnit={priceUnit}
            onPriceChange={setPriceRM}
            onUnitChange={setPriceUnit}
          />,
          <RulesPhotosStep
            key="rules-photos"
            accessRules={accessRules}
            prohibitedItems={prohibitedItems}
            files={files}
            onAccessRulesChange={setAccessRules}
            onProhibitedItemsChange={setProhibitedItems}
            onFilesChange={setFiles}
          />,
          <ReviewStep
            key="review"
            category={draft.category}
            title={draft.title}
            sizeSqft={draft.size_sqft}
            address={address}
            priceRM={priceRM}
            priceUnit={priceUnit}
            photoCount={uploadedPhotoCount + files.length}
            onEditStep={(globalIdx) => {
              // ReviewStep hands back a GLOBAL step index (0=Type..5=Review) — it has
              // no idea this page only owns the local slice corresponding to global
              // steps 2-5. Convert before calling handleIndexChange, which expects a
              // LOCAL index into this page's own 4-step `steps` array. Type (0) and
              // Basics (1) live on the other page entirely (/listings/new, no
              // draftId) — editing them from here isn't supported yet, so say so
              // instead of navigating to a nonexistent local step. A silent no-op
              // reads as a broken button.
              const local = globalIdx - 2;
              if (local >= 0 && local <= 3) {
                handleIndexChange(local);
              } else {
                setError("Type and Basics can't be edited from here yet — start a new listing to change them.");
              }
            }}
            publishing={submitting}
            error={null}
          />,
        ]}
        stepIndex={stepIndex}
        globalStepIndex={stepIndex + 2}
        globalStepCount={6}
        sqft={draft.size_sqft}
        onIndexChange={handleIndexChange}
        onNext={handleNext}
        nextLabel={submitting ? "Saving…" : stepIndex === 3 ? "Publish" : "Continue →"}
        backDisabled={stepIndex === 0}
      />
    </div>
  );
}
