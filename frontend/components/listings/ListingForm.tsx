"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { addListingPhoto, createListing, publishListing } from "@/lib/api/listings";
import { LISTING_CATEGORIES } from "@/lib/listingCategories";

export function ListingForm() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState<string>(LISTING_CATEGORIES[0].value);
  const [priceUnit, setPriceUnit] = useState<"daily" | "monthly">("monthly");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const data = new FormData(event.currentTarget);
    const photoFile = data.get("photo") as File;

    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in.");

      const listing = await createListing(
        {
          title: String(data.get("title")),
          description: String(data.get("description")),
          category,
          size_sqft: Number(data.get("size_sqft")),
          price_cents: Math.round(Number(data.get("price_myr")) * 100),
          price_unit: priceUnit,
          address: String(data.get("address")),
          access_rules: String(data.get("access_rules") ?? ""),
          prohibited_items: String(data.get("prohibited_items") ?? ""),
          latitude: Number(data.get("latitude")),
          longitude: Number(data.get("longitude")),
        },
        token
      );

      if (photoFile && photoFile.size > 0) {
        await addListingPhoto(listing.id, photoFile, token);
      }

      await publishListing(listing.id, token);
      router.push(`/listings/${listing.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong creating the listing.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {error && <p role="alert">{error}</p>}

      <div className="field">
        <label htmlFor="title">Title</label>
        <input id="title" name="title" placeholder="e.g. Ground-floor warehouse bay, Petaling Jaya" required />
      </div>

      <div className="field">
        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" required />
      </div>

      <div className="field">
        <label>Category</label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {LISTING_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              className="chip"
              data-active={category === c.value}
              onClick={() => setCategory(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="address">Address</label>
        <input id="address" name="address" placeholder="Street, area" required />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="field">
          <label htmlFor="size_sqft">Size (sqft)</label>
          <input id="size_sqft" name="size_sqft" type="number" min="1" placeholder="320" required />
        </div>
        <div className="field">
          <label htmlFor="price_myr">Price (RM)</label>
          <input id="price_myr" name="price_myr" type="number" min="0" step="0.01" placeholder="680" required />
        </div>
      </div>

      <div className="field">
        <label>Billed</label>
        <div style={{ display: "flex", border: "1px solid var(--ink)", borderRadius: 10, overflow: "hidden", maxWidth: 280 }}>
          <button
            type="button"
            className="seg"
            data-active={priceUnit === "daily"}
            onClick={() => setPriceUnit("daily")}
          >
            DAILY
          </button>
          <button
            type="button"
            className="seg"
            data-active={priceUnit === "monthly"}
            onClick={() => setPriceUnit("monthly")}
          >
            MONTHLY
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="field">
          <label htmlFor="latitude">Latitude</label>
          <input id="latitude" name="latitude" type="number" step="any" required />
        </div>
        <div className="field">
          <label htmlFor="longitude">Longitude</label>
          <input id="longitude" name="longitude" type="number" step="any" required />
        </div>
      </div>

      <div className="field">
        <label htmlFor="access_rules">Access rules</label>
        <textarea id="access_rules" name="access_rules" />
      </div>

      <div className="field">
        <label htmlFor="prohibited_items">Prohibited items</label>
        <textarea id="prohibited_items" name="prohibited_items" />
      </div>

      <div className="field">
        <label htmlFor="photo">Photo</label>
        <input id="photo" name="photo" type="file" accept="image/*" />
      </div>

      <button type="submit" className="btn-primary" disabled={submitting} style={{ alignSelf: "flex-start" }}>
        {submitting ? "Creating..." : "Publish listing"}
      </button>
    </form>
  );
}
