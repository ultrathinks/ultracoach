import { KlaimPricingTable } from "@/widgets/billing/klaim-pricing-table";

export default function BillingPage() {
  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold mb-2">Billing</h1>
      <p className="text-secondary text-sm mb-8">
        플랜을 선택하고 더 많은 기능을 이용하세요
      </p>

      <KlaimPricingTable />
    </div>
  );
}
