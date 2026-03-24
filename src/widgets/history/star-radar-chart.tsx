"use client";

import type { StarRadarData } from "@/entities/analytics";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface StarRadarChartProps {
  data: StarRadarData;
}

function StarRadarChartInner({ data }: StarRadarChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl bg-card border border-white/[0.1] p-6">
        <h3 className="text-base font-semibold mb-4">STAR 충족률</h3>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-secondary text-sm">
            첫 세션을 완료하면 STAR 충족률을 확인할 수 있어요
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card border border-white/[0.1] p-6">
      <h3 className="text-base font-semibold mb-4">STAR 충족률</h3>
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="rgba(255,255,255,0.1)" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "var(--color-secondary)", fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: "var(--color-muted)", fontSize: 10 }}
            axisLine={false}
          />
          <Radar
            dataKey="value"
            stroke="var(--color-indigo)"
            fill="var(--color-indigo)"
            fillOpacity={0.2}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-card)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              color: "var(--color-foreground)",
              fontSize: "13px",
            }}
            formatter={(value: number) => [`${value}%`, "충족률"]}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export { StarRadarChartInner };
