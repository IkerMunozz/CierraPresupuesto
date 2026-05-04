'use client';

import { motion } from 'framer-motion';
import { Bolt, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useActions } from './use-actions';
import { ActionCard } from './ActionCard';

export function ActionLayer() {
  const { actions, totalImpact, loading, dismissAction, completeAction } = useActions();
  const [collapsed, setCollapsed] = useState(false);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="mt-3 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <Bolt className="h-5 w-5" />
        </div>
        <p className="mt-2 text-sm font-medium text-slate-700">Todo bajo control</p>
        <p className="text-xs text-slate-500">No hay acciones pendientes por ahora</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-xl border border-slate-200 bg-white"
    >
      <div
        className="flex cursor-pointer items-center justify-between border-b border-slate-100 px-4 py-3 transition-colors hover:bg-slate-50"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-white">
            <Bolt className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Action Layer</h2>
            <p className="text-xs text-slate-500">
              {actions.length} {actions.length === 1 ? 'acción' : 'acciones'}{' '}
              <span className="font-medium text-emerald-600">
                · +€{(totalImpact / 1000).toFixed(totalImpact % 1000 === 0 ? 0 : 1)}k
                recuperables
              </span>
            </p>
          </div>
        </div>
        <button className="text-slate-400 transition-colors hover:text-slate-600">
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </div>

      <div className="divide-y divide-slate-100">
        {!collapsed &&
          actions.map((action, index) => (
            <div key={action.id} className="px-2 py-1.5">
              <ActionCard
                action={action}
                onDismiss={dismissAction}
                onComplete={completeAction}
                index={index}
              />
            </div>
          ))}
      </div>
    </motion.div>
  );
}
