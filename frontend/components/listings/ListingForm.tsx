"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addListingPhoto, createListing, publishListing } from "@/lib/api/listings";
import { ensureCsrfCookie } from "@/lib/api/client";

export function ListingForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    ensureCsrfCookie();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const data = new FormData(event.currentTarget);
    const photoFile = data.get("photo") as File;

    try {
      const listing = await createListing({
        title: String(data.get("title")),
        description: String(data.get("description")),
        category: String(data.get("category")),
        size_sqft: Number(data.get("size_sqft")),
        price_cents: Math.round(Number(data.get("price_myr")) * 100),
        price_unit: data.get("price_unit") as "daily" | "monthly",
        address: String(data.get("address")),
        access_rules: String(data.get("access_rules") ?? ""),
        prohibited_items: String(data.get("prohibited_items") ?? ""),
        latitude: Number(data.get("latitude")),
        longitude: Number(data.get("longitude")),
      });

      if (photoFile && photoFile.size > 0) {
        await addListingPhoto(listing.id, photoFile);
      }

      await publishListing(listing.id);
      router.push(`/listings/${listing.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong creating the listing.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <p role="alert">{error}</p>}
      <label>
        Title
        <input name="title" required />
      </label>
      <label>
        Description
        <textarea name="description" required />
      </label>
      <label>
        Category
        <select name="category" required>
          <option value="spare_room">Spare room</option>
          <option value="garage">Garage</option>
          <option value="shoplot_back_room">Shoplot back room</option>
          <option value="warehouse_bay">Warehouse bay</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label>
        Size (sqft)
        <input name="size_sqft" type="number" min="1" required />
      </label>
      <label>
        Price (MYR)
        <input name="price_myr" type="number" min="0" step="0.01" required />
      </label>
      <label>
        Price unit
        <select name="price_unit" required>
          <option value="monthly">Monthly</option>
          <option value="daily">Daily</option>
        </select>
      </label>
      <label>
        Address
        <input name="address" required />
      </label>
      <label>
        Latitude
        <input name="latitude" type="number" step="any" required />
      </label>
      <label>
        Longitude
        <input name="longitude" type="number" step="any" required />
      </label>
      <label>
        Access rules
        <textarea name="access_rules" />
      </label>
      <label>
        Prohibited items
        <textarea name="prohibited_items" />
      </label>
      <label>
        Photo
        <input name="photo" type="file" accept="image/*" />
      </label>
      <button type="submit" disabled={submitting}>
        {submitting ? "Creating..." : "Create listing"}
      </button>
    </form>
  );
}
