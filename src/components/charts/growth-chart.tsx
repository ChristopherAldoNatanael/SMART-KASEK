"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export interface GrowthDataPoint {
  period: string;
  overall: number | null;
  pedagogic: number | null;
  professional: number | null;
  social: number | null;
  personality: number | null;
  digital: number | null;
  assessment: number | null;
  classroom: number | null;
}

interface GrowthChartProps {
  data: GrowthDataPoint[];
  height?: number;
}

export function GrowthChart({ data, height = 300 }: GrowthChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed text-muted-foreground"
        style={{ height }}
      >
        Belum ada data pertumbuhan
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="period"
          tick={{ fontSize: 12 }}
          stroke="hsl(var(--muted-foreground))"
          tickLine={false}
          axisLine={{ stroke: "hsl(var(--border))" }}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 12 }}
          stroke="hsl(var(--muted-foreground))"
          tickLine={false}
          axisLine={false}
          width={32}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="overall"
          name="Overall"
          stroke="hsl(var(--foreground))"
          strokeWidth={2.5}
          dot={{ r: 4, fill: "hsl(var(--foreground))" }}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="pedagogic"
          name="Pedagogik"
          stroke="hsl(var(--brand))"
          strokeWidth={1.5}
          dot={false}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="professional"
          name="Profesional"
          stroke="#64748b"
          strokeWidth={1.5}
          dot={false}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="assessment"
          name="Asesmen"
          stroke="#d97706"
          strokeWidth={1.5}
          dot={false}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="classroom"
          name="Manajemen Kelas"
          stroke="#be123c"
          strokeWidth={1.5}
          dot={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
