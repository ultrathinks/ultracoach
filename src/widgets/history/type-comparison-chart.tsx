"use client";

import type { TypeComparisonGroup } from "@/entities/analytics";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface TypeComparisonChartProps {
  data: TypeComparisonGroup[];
}

function TypeComparisonChartInner({ data }: TypeComparisonChartProps) {
  if (data.length === 0) return null;

  const chartData = data.map((d) => ({
    name: d.typeLabel,
    전달력: d.avgDelivery,
    답변력: d.avgContent,
    count: d.count,
  }));

  return (
    <div className="rounded-xl bg-card border border-white/[0.1] p-6">
      <h3 className="font-semibold mb-6">유형별 비교</h3>
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
            dataKey="전달력"
            fill="var(--color-indigo)"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
          <Bar
            dataKey="답변력"
            fill="var(--color-pink)"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-6 mt-5 text-sm text-secondary">
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo" />
          전달력
        </span>
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-pink" />
          답변력
        </span>
      </div>
    </div>
  );
}

export { TypeComparisonChartInner };
