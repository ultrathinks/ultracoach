import { redirect } from "next/navigation";
import { auth } from "@/shared/lib/auth";
import { BillingSuccessClient } from "./success-client";

export const dynamic = "force-dynamic";

export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    authKey?: string;
    customerKey?: string;
    plan?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const params = await searchParams;
  const { authKey, customerKey, plan } = params;

  if (
    !authKey ||
    !customerKey ||
    !plan ||
    (plan !== "pro" && plan !== "premium")
  ) {
    redirect("/dashboard/billing?error=missing-params");
  }

  return (
    <BillingSuccessClient
      authKey={authKey}
      customerKey={customerKey}
      plan={plan}
    />
  );
}
