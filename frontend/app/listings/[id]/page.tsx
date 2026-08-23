import { getListing } from "@/lib/api/listings";

export default async function ListingDetailPage({ params }: { params: { id: string } }) {
  const listing = await getListing(Number(params.id));

  return (
    <main>
      <h1>{listing.title}</h1>
      <p>{listing.address}</p>
      <p>
        {listing.size_sqft} sqft &middot; RM {(listing.price_cents / 100).toFixed(2)}{" "}
        {listing.price_unit === "daily" ? "/day" : "/month"}
      </p>
      <p>{listing.description}</p>
      <div>
        {listing.photos.map((photo) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={photo.id} src={photo.image} alt={listing.title} />
        ))}
      </div>
      <section>
        <h2>Access rules</h2>
        <p>{listing.access_rules || "Coordinate access directly with the host."}</p>
      </section>
      <section>
        <h2>Prohibited items</h2>
        <p>{listing.prohibited_items || "None specified."}</p>
      </section>
    </main>
  );
}
