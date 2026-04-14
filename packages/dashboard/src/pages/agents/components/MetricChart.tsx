import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

interface MetricChartPoint {
  label: string;
  value: number;
}

interface MetricChartProps {
  title: string;
  color: string;
  data: MetricChartPoint[];
  unit?: string;
}

export function MetricChart({ title, color, data, unit = "%" }: MetricChartProps) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
      <p className="text-sm font-medium text-white">{title}</p>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="rgba(148,163,184,0.14)" vertical={false} />
            <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} unit={unit} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#020617",
                borderColor: "rgba(255,255,255,0.1)",
                borderRadius: "18px"
              }}
            />
            <Line dataKey="value" stroke={color} strokeWidth={2.5} dot={false} type="monotone" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
