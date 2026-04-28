'use client';

import { motion } from 'framer-motion';
import { FileText, Send, CheckCircle, XCircle, Clock } from 'lucide-react';

export interface ActivityEvent {
  id: string;
  type: 'created' | 'sent' | 'accepted' | 'rejected';
  quoteTitle: string;
  clientName: string;
  timestamp: Date;
  amount?: number;
}

interface ActivityFeedProps {
  events: ActivityEvent[];
}

const eventConfig = {
  created: {
    icon: FileText,
    bgColor: 'bg-slate-100',
    iconColor: 'text-slate-600',
    label: 'Presupuesto creado',
  },
  sent: {
    icon: Send,
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
    label: 'Enviado a cliente',
  },
  accepted: {
    icon: CheckCircle,
    bgColor: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    label: 'Aceptado',
  },
  rejected: {
    icon: XCircle,
    bgColor: 'bg-rose-100',
    iconColor: 'text-rose-600',
    label: 'Rechazado',
  },
};

export function ActivityFeed({ events }: ActivityFeedProps) {
  if (events.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <Clock className="mx-auto h-12 w-12 text-slate-400" />
        <p className="mt-4 text-sm font-medium text-slate-600">
          No hay actividad reciente
        </p>
      </div>
    );
  }

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMins < 1) return 'Ahora mismo';
    if (diffInMins < 60) return `Hace ${diffInMins} min`;
    if (diffInHours < 24) return `Hace ${diffInHours} h`;
    if (diffInDays < 7) return `Hace ${diffInDays} días`;
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="space-y-4">
      {events.slice(0, 10).map((event, index) => {
        const config = eventConfig[event.type];
        const Icon = config.icon;

        return (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="flex gap-4"
          >
            <div className="relative flex flex-col items-center">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${config.bgColor} ${config.iconColor}`}>
                <Icon className="h-5 w-5" />
              </div>
              {index < events.length - 1 && (
                <div className="mt-2 h-full w-0.5 bg-slate-200" />
              )}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{config.label}</p>
                  <p className="mt-1 text-sm text-slate-600">{event.quoteTitle}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{event.clientName}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">{formatTimestamp(event.timestamp)}</p>
                  {event.amount && (
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(event.amount)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}