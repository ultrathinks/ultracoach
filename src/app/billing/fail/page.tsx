import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/shared/ui";

export default async function BillingFailPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; code?: string }>;
}) {
  const { message, code } = await searchParams;
  const t = await getTranslations("billing");
  return (
    <PageContainer size="form" className="px-6 py-20 text-center">
      <h1 className="text-2xl font-bold mb-2 text-red">
        {t("checkoutFailedTitle")}
      </h1>
      {message && <p className="text-sm text-secondary mb-2">{message}</p>}
      {code && (
        <p className="text-xs text-muted mb-6">
          {t("checkoutFailedCode", { code })}
        </p>
      )}
      <Link
        href="/dashboard/billing"
        className="text-sm text-indigo hover:underline"
      >
        {t("checkoutBackToBilling")}
      </Link>
    </PageContainer>
  );
}
