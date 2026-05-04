'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Action } from './types';
import { pruneActions } from './scorer';
import { generateMockActions } from './mock-data';

interface UseActionsReturn {
  actions: Action[];
  totalImpact: number;
  loading: boolean;
  dismissAction: (id: string) => void;
  completeAction: (id: string) => void;
  refresh: () => void;
}

export function useActions(): UseActionsReturn {
  const [rawActions, setRawActions] = useState<Action[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setRawActions(generateMockActions());
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const dismissAction = useCallback((id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  }, []);

  const completeAction = useCallback((id: string) => {
    setCompleted((prev) => new Set(prev).add(id));
  }, []);

  const refresh = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setRawActions(generateMockActions());
      setLoading(false);
    }, 400);
  }, []);

  const visible = rawActions.filter(
    (a) => !dismissed.has(a.id) && !completed.has(a.id),
  );

  const actions = pruneActions(visible, 5);

  const totalImpact = actions.reduce((sum, a) => sum + a.impact, 0);

  return {
    actions,
    totalImpact,
    loading,
    dismissAction,
    completeAction,
    refresh,
  };
}
