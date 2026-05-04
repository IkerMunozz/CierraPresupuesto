'use client';

import {
  ArrowUpRight,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  Mail,
  Target,
  X,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Action, ActionPriority, ActionKind } from './types';

const PRIORITY_CONFIG: Record<
  ActionPriority,
  { color: string; bg: string; dot: string; label: string }
> = {
  HIGH: {
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    dot: 'bg-rose-500',
    label: 'HIGH',
  },
  MEDIUM: {
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    dot: 'bg-amber-500',
    label: 'MED',
  },
  LOW: {
    color: 'text-slate-500',
    bg: 'bg-slate-50',
    dot: 'bg-slate-400',
    label: 'LOW',
  },
};

const KIND_ICONS: Record<ActionKind, React.ReactNode> = {
  FOLLOW_UP: <Mail className="h-4 w-4" />,
  OPTIMIZE_QUOTE: <Sparkles className="h-4 w-4" />,
  PRIORITIZE: <Target className="h-4 w-4" />,
  RISK_ALERT: <AlertTriangle className="h-4 w-4" />,
  REVENUE_OPPORTUNITY: <TrendingUp className="h-4 w-4" />,
};

function formatImpact(impact: number): string {
  if (impact >= 1000) {
    return `${(impact / 1000).toFixed(impact % 1000 === 0 ? 0 : 1)}k`;
  }
  return impact.toString();
}

interface ActionCardProps {
  action: Action;
  onDismiss: (id: string) => void;
  onComplete: (id: string) => void;
  index: number;
}

export function ActionCard({ action, onDismiss, onComplete, index }: ActionCardProps) {
  const priority = PRIORITY_CONFIG[action.priority];

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className="group relative flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 transition-all hover:border-slate-300 hover:shadow-sm"
    >
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${priority.bg} ${priority.color}`}>
        {KIND_ICONS[action.kind]}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${priority.color}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${priority.dot}`} />
            {priority.label}
          </span>
          <span className="truncate text-sm font-medium text-slate-900">
            {action.title}
          </span>
        </div>
        <p className="truncate text-xs text-slate-500">{action.reason}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className="text-sm font-semibold text-emerald-600">
          +€{formatImpact(action.impact)}
        </span>

        <button
          onClick={() => onComplete(action.id)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 opacity-0 transition-all hover:bg-emerald-50 hover:text-emerald-600 group-hover:opacity-100"
          aria-label="Complete action"
        >
          <Check className="h-3.5 w-3.5" />
        </button>

        <button
          onClick={() => onDismiss(action.id)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 opacity-0 transition-all hover:bg-slate-50 hover:text-slate-600 group-hover:opacity-100"
          aria-label="Dismiss action"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <a
          href={action.actionUrl || '#'}
          className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-800"
        >
          {action.cta}
          <ArrowUpRight className="h-3 w-3" />
        </a>
      </div>
    </motion.div>
  );
}
