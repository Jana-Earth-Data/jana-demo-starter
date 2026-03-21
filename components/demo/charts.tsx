"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BreakdownPoint, TrendPoint } from "@/lib/types/demo";

export function EmissionsTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid stroke="#243244" strokeDasharray="3 3" />
          <XAxis dataKey="period" stroke="#93a4b8" />
          <YAxis stroke="#93a4b8" />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              border: "1px solid #243244",
              borderRadius: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#7dd3fc"
            strokeWidth={3}
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SectorBarChart({ data }: { data: BreakdownPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 12, right: 12 }}>
          <CartesianGrid stroke="#243244" strokeDasharray="3 3" />
          <XAxis type="number" stroke="#93a4b8" />
          <YAxis
            dataKey="label"
            type="category"
            width={90}
            stroke="#93a4b8"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              border: "1px solid #243244",
              borderRadius: 12,
            }}
          />
          <Bar dataKey="value" fill="#7dd3fc" radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
