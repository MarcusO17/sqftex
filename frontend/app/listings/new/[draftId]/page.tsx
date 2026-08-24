import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { NavBar } from "@/components/layout/NavBar";
import { DraftWizard } from "@/components/listings/wizard/DraftWizard";

export default async function DraftListingPage({ params }: { params: { draftId: string } }) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }

  const draftId = Number(params.draftId);
  if (!Number.isInteger(draftId)) {
    redirect("/listings/new");
  }

  return (
    <div>
      <NavBar variant="app" />
      <DraftWizard draftId={draftId} />
    </div>
  );
}
