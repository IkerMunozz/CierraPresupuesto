'use client';

import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, AlertTriangle, Target, DollarSign } from 'lucide-react';

interface Insight {
  type: 'pattern' | 'recommendation' | 'warning' | 'opportunity';
  title: string;
  description: string;
  impact?: string;
  icon?: React.ReactNode;
}

interface AIInsightsProps {
  insights: Insight[];
}

const insightConfig = {
  pattern: {
    icon: TrendingUp,
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600',
    borderColor: 'border-blue-200',
  },
  recommendation: {
    icon: Sparkles,
    bgColor: 'bg-purple-50',
    iconColor: 'text-purple-600',
    borderColor: 'border-purple-200',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-amber-50',
    iconColor: 'text-amber-600',
    borderColor: 'border-amber-200',
  },
  opportunity: {
    icon: Target,
    bgColor: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    borderColor: 'border-emerald-200',
  },
};

export function AIInsights({ insights }: AIInsightsProps) {
  if (insights.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <Sparkles className="mx-auto h-12 w-12 text-slate-400" />
        <p className="mt-4 text-sm font-medium text-slate-600">
          Genera más presupuestos para obtener insights personalizados
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {insights.map((insight, index) => {
        const config = insightConfig[insight.type];
        const Icon = config.icon;

        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className={`flex gap-4 rounded-xl border ${config.borderColor} ${config.bgColor} p-4 transition-all hover:shadow-md`}
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${config.bgColor}`}>
              <Icon className={`h-5 w-5 ${config.iconColor}`} />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-slate-900">{insight.title}</h4>
              <p className="mt-1 text-sm text-slate-600">{insight.description}</p>
              {insight.impact && (
                <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-700">
                  <DollarSign className="h-3 w-3" />
                  <span>{insight.impact}</span>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}