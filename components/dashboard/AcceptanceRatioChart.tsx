'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AcceptanceRatioChartProps {
  data: {
    date: string;
    ratio: number;
  }[];
}

export function AcceptanceRatioChart({ data }: AcceptanceRatioChartProps) {
  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="colorRatio" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            stroke="#64748b"
            fontSize={12}
            tickFormatter={(value) => {
              const date = new Date(value);
              return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
            }}
          />
          <YAxis
            stroke="#64748b"
            fontSize={12}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
            formatter={(value: number) => [`${value.toFixed(1)}%`, 'Ratio de Aceptación']}
            labelFormatter={(value) => {
              const date = new Date(value);
              return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
            }}
          />
          <Area
            type="monotone"
            dataKey="ratio"
            stroke="#10b981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorRatio)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}