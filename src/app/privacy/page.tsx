import { getLocale, getTranslations } from "next-intl/server";
import { PageContainer, PageHeader } from "@/shared/ui";

export const metadata = {
  title: "Privacy — UltraCoach",
};

export default async function PrivacyPage() {
  const locale = await getLocale();
  const t = await getTranslations("legal");
  const Content =
    locale === "en"
      ? (await import("@/content/legal/privacy.en.mdx")).default
      : (await import("@/content/legal/privacy.ko.mdx")).default;
  return (
    <PageContainer size="content" className="px-6 py-12">
      <PageHeader title={t("privacy.title")} />
      <article className="prose prose-invert max-w-none text-secondary">
        <Content />
      </article>
    </PageContainer>
  );
}
