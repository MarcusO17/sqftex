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

  useEffect(() => {
    let cancelled = false;
    (async () => {
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
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  function handleIndexChange(index: number) {
    setStepIndex(index);
    router.replace(`/listings/new/${draftId}?step=${STEP_NAMES[index]}`);
  }

  async function handleNext() {
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
        handleIndexChange(1);
      } else if (stepIndex === 1) {
        await updateListing(draftId, { price_cents: Math.round(priceRM * 100), price_unit: priceUnit }, token);
        handleIndexChange(2);
      } else if (stepIndex === 2) {
        if (files.length === 0 && uploadedPhotoCount === 0) {
          setError("Add at least one photo before continuing.");
          setSubmitting(false);
          return;
        }
        await updateListing(draftId, { access_rules: accessRules, prohibited_items: prohibitedItems }, token);
        for (const file of files) {
          await addListingPhoto(draftId, file, token);
        }
        setUploadedPhotoCount((n) => n + files.length);
        setFiles([]);
        handleIndexChange(3);
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
            onEditStep={handleIndexChange}
            publishing={submitting}
            error={null}
          />,
        ]}
        stepIndex={stepIndex}
        globalStepIndex={stepIndex + 2}
        globalStepCount={6}
        category={draft.category}
        onIndexChange={handleIndexChange}
        onNext={handleNext}
        nextLabel={submitting ? "Saving…" : stepIndex === 3 ? "Publish" : "Continue →"}
      />
    </div>
  );
}
