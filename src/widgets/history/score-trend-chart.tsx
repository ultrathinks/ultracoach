"use client";

import { useTranslations } from "next-intl";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ScoreTrendPoint } from "@/entities/analytics";

interface ScoreTrendChartProps {
  data: ScoreTrendPoint[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function ScoreTrendChartInner({ data }: ScoreTrendChartProps) {
  const t = useTranslations("history");

  const scored = data.filter(
    (d) => d.deliveryScore !== null || d.contentScore !== null,
  );

  if (scored.length === 0) return null;

  const isSingle = scored.length === 1;
  const deliveryLabel = t("delivery");
  const contentLabel = t("content");

  const chartData = scored.map((d) => ({
    date: formatDate(d.createdAt),
    delivery: d.deliveryScore,
    content: d.contentScore,
  }));

  return (
    <div className="rounded-xl bg-card border border-white/[0.1] p-6">
      <h3 className="font-semibold mb-6">{t("scoreTrend")}</h3>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData}>
          <XAxis
            dataKey="date"
            stroke="var(--color-muted)"
            fontSize={12}
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
          <Line
            type="monotone"
            dataKey="delivery"
            name={deliveryLabel}
            stroke="var(--color-indigo)"
            strokeWidth={2}
            dot={isSingle ? { r: 4, fill: "var(--color-indigo)" } : false}
            activeDot={{ r: 4, fill: "var(--color-indigo)" }}
          />
          <Line
            type="monotone"
            dataKey="content"
            name={contentLabel}
            stroke="var(--color-pink)"
            strokeWidth={2}
            dot={isSingle ? { r: 4, fill: "var(--color-pink)" } : false}
            activeDot={{ r: 4, fill: "var(--color-pink)" }}
          />
        </LineChart>
      </ResponsiveContainer>
      {isSingle && (
        <p className="text-center text-muted text-sm mt-4">
          {t("scoreTrendSingle")}
        </p>
      )}
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

export { ScoreTrendChartInner };
