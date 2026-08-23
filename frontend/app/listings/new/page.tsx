import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ListingForm } from "@/components/listings/ListingForm";
import type { User } from "@/lib/api/users";

async function fetchMe(): Promise<User | null> {
  const cookieHeader = cookies().toString();
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  try {
    const response = await fetch(`${baseUrl}/api/v1/users/me/`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    return response.ok ? ((await response.json()) as User) : null;
  } catch {
    return null;
  }
}

export default async function NewListingPage() {
  const me = await fetchMe();

  if (!me) {
    redirect("/login?next=/listings/new");
  }

  if (!me.is_verified) {
    return (
      <main>
        <h1>Verification required</h1>
        <p>
          You need to complete ID verification before you can create a listing. Upload your NRIC
          and wait for approval.
        </p>
      </main>
    );
  }

  return (
    <main>
      <h1>Create a listing</h1>
      <ListingForm />
    </main>
  );
}
