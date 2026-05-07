import { getLocale, getTranslations } from "next-intl/server";
import { PageContainer, PageHeader } from "@/shared/ui";

export const metadata = {
  title: "Refund — UltraCoach",
};

export default async function RefundPage() {
  const locale = await getLocale();
  const t = await getTranslations("legal");
  const Content =
    locale === "en"
      ? (await import("@/content/legal/refund.en.mdx")).default
      : (await import("@/content/legal/refund.ko.mdx")).default;
  return (
    <PageContainer size="content" className="px-6 py-12">
      <PageHeader title={t("refund.title")} />
      <article className="prose prose-invert max-w-none text-secondary">
        <Content />
      </article>
    </PageContainer>
  );
}
