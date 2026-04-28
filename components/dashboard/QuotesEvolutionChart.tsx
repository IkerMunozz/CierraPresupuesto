'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface QuotesEvolutionChartProps {
  data: {
    date: string;
    created: number;
    sent: number;
    accepted: number;
  }[];
}

export function QuotesEvolutionChart({ data }: QuotesEvolutionChartProps) {
  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
          <YAxis stroke="#64748b" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
            labelFormatter={(value) => {
              const date = new Date(value);
              return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />
          <Line
            type="monotone"
            dataKey="created"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', strokeWidth: 2 }}
            name="Creados"
          />
          <Line
            type="monotone"
            dataKey="sent"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ fill: '#8b5cf6', strokeWidth: 2 }}
            name="Enviados"
          />
          <Line
            type="monotone"
            dataKey="accepted"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: '#10b981', strokeWidth: 2 }}
            name="Aceptados"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}