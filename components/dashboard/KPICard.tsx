'use client';

import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Sparkline } from './Sparkline';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  trend?: number[];
  icon?: React.ReactNode;
  delay?: number;
}

export function KPICard({ title, value, change, trend, icon, delay = 0 }: KPICardProps) {
  const getChangeColor = () => {
    if (!change) return 'text-slate-500';
    return change > 0 ? 'text-emerald-600' : change < 0 ? 'text-rose-600' : 'text-slate-500';
  };

  const getChangeIcon = () => {
    if (!change) return <Minus className="h-3 w-3" />;
    return change > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
            {change !== undefined && (
              <div className={`flex items-center gap-1 text-sm font-medium ${getChangeColor()}`}>
                {getChangeIcon()}
                <span>{Math.abs(change)}%</span>
              </div>
            )}
          </div>
        </div>
        {icon && (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-600 transition-colors group-hover:bg-slate-100">
            {icon}
          </div>
        )}
      </div>
      
      {trend && trend.length > 0 && (
        <div className="mt-4 h-12 w-full">
          <Sparkline data={trend} />
        </div>
      )}
    </motion.div>
  );
}