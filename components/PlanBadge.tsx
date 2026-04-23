'use client';

import { useSubscription } from '@/lib/hooks/useSubscription';

export default function PlanBadge() {
  const { label, tone, loading } = useSubscription();

  if (loading) return <span className="text-slate-400">Cargando...</span>;

  const styles =
    tone === 'purple'
      ? { text: 'text-purple-600', dot: 'bg-purple-600' }
      : tone === 'blue'
        ? { text: 'text-blue-600', dot: 'bg-blue-600' }
        : { text: 'text-slate-700', dot: 'bg-slate-400' };

  return (
    <span className={`text-xl font-bold flex items-center gap-2 ${styles.text}`}>
      <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
      Plan {label}
    </span>
  );
}
