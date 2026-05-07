"use client";

import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TypeComparisonGroup } from "@/entities/analytics";

interface TypeComparisonChartProps {
  data: TypeComparisonGroup[];
}

function TypeComparisonChartInner({ data }: TypeComparisonChartProps) {
  const t = useTranslations("history");

  if (data.length === 0) return null;

  const deliveryLabel = t("delivery");
  const contentLabel = t("content");

  const translateType = (type: string): string => {
    if (
      type === "personality" ||
      type === "technical" ||
      type === "culture-fit"
    ) {
      return t(`types.${type}`);
    }
    return type;
  };

  const chartData = data.map((d) => ({
    name: translateType(d.type),
    delivery: d.avgDelivery,
    content: d.avgContent,
    count: d.count,
  }));

  return (
    <div className="rounded-xl bg-card border border-white/[0.1] p-6">
      <h3 className="font-semibold mb-6">{t("typeComparison")}</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} barGap={4} barCategoryGap="30%">
          <XAxis
            dataKey="name"
            stroke="var(--color-muted)"
            fontSize={13}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            stroke="var(--color-muted)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-card)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              color: "var(--color-foreground)",
              fontSize: "13px",
            }}
          />
          <Bar
            dataKey="delivery"
            name={deliveryLabel}
            fill="var(--color-indigo)"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
          <Bar
            dataKey="content"
            name={contentLabel}
            fill="var(--color-pink)"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-6 mt-5 text-sm text-secondary">
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo" />
          {deliveryLabel}
        </span>
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-pink" />
          {contentLabel}
        </span>
      </div>
    </div>
  );
}

export { TypeComparisonChartInner };
