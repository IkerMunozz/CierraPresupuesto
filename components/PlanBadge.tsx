'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PlanBadge() {
  const [plan, setPlan] = useState<{ plan: string; status: string } | null>(null);

  useEffect(() => {
    fetch('/api/stripe/subscription')
      .then((res) => res.json())
      .then((data) => setPlan(data))
      .catch(() => {});
  }, []);

  if (!plan) return <span className="text-slate-400">Cargando...</span>;

  const planName = plan.plan.charAt(0).toUpperCase() + plan.plan.slice(1);
  const isBusiness = plan.plan === 'business';

  return (
    <span className={`text-xl font-bold flex items-center gap-2 ${isBusiness ? 'text-purple-600' : 'text-blue-600'}`}>
      <span className={`h-2 w-2 rounded-full ${isBusiness ? 'bg-purple-600' : 'bg-blue-600'}`} />
      Plan {planName}
    </span>
  );
}
