import { getTranslations } from "next-intl/server";
import { requireAdminPage } from "@/shared/lib/permissions";
import { PageContainer, PageHeader } from "@/shared/ui";
import { AdminOverview } from "@/widgets/admin/admin-overview";
import { PartnerList } from "@/widgets/admin/partner-list";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const t = await getTranslations("admin");
  await requireAdminPage();

  return (
    <PageContainer size="wide" className="px-6 py-10">
      <PageHeader title={t("title")} description={t("description")} gradient />
      <AdminOverview />
      <PartnerList />
    </PageContainer>
  );
}
