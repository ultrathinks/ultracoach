"use client";

import type { ScoreTrendPoint } from "@/entities/analytics";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ScoreTrendChartProps {
  data: ScoreTrendPoint[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function ScoreTrendChartInner({ data }: ScoreTrendChartProps) {
  if (data.length === 0) return null;

  const isSingle = data.length === 1;

  const chartData = data.map((d) => ({
    date: formatDate(d.createdAt),
    전달력: d.deliveryScore,
    답변력: d.contentScore,
  }));

  return (
    <div className="rounded-xl bg-card border border-white/[0.1] p-6">
      <h3 className="font-semibold mb-6">점수 추이</h3>
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
            dataKey="전달력"
            stroke="var(--color-indigo)"
            strokeWidth={2}
            dot={isSingle ? { r: 4, fill: "var(--color-indigo)" } : false}
            activeDot={{ r: 4, fill: "var(--color-indigo)" }}
          />
          <Line
            type="monotone"
            dataKey="답변력"
            stroke="var(--color-pink)"
            strokeWidth={2}
            dot={isSingle ? { r: 4, fill: "var(--color-pink)" } : false}
            activeDot={{ r: 4, fill: "var(--color-pink)" }}
          />
        </LineChart>
      </ResponsiveContainer>
      {isSingle && (
        <p className="text-center text-muted text-sm mt-4">
          2개 이상 세션을 완료하면 추이를 확인할 수 있어요
        </p>
      )}
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

export { ScoreTrendChartInner };
