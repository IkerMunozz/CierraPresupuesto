// components/crm/PipelineKanban.tsx
'use client';

import { useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';
import { getClientsByStage, moveClientToStage, PipelineStage } from '@/lib/services/pipelineService';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface PipelineKanbanProps {
  userId: string;
}

const STAGES: { id: PipelineStage; label: string; color: string }[] = [
  { id: 'lead', label: 'Leads', color: 'bg-slate-100' },
  { id: 'contactado', label: 'Contactados', color: 'bg-blue-50' },
  { id: 'propuesta', label: 'Propuesta', color: 'bg-yellow-50' },
  { id: 'negociacion', label: 'Negociación', color: 'bg-purple-50' },
  { id: 'ganado', label: 'Ganados', color: 'bg-green-50' },
  { id: 'perdido', label: 'Perdidos', color: 'bg-red-50' },
];

function StageColumn({ stage, clients, onDrop }: any) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'client',
    drop: (item: { id: number }) => onDrop(item.id, stage.id),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  return (
    <div
      ref={drop}
      className={`flex-1 min-w-[250px] ${stage.color} rounded-2xl p-4 ${isOver ? 'ring-2 ring-brand-500' : ''}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-900">{stage.label}</h3>
        <Badge variant="secondary">{clients.length}</Badge>
      </div>

      <div className="space-y-3">
        {clients.map((client: any) => (
          <ClientCard key={client.id} client={client} />
        ))}
      </div>

      <Button variant="ghost" className="w-full mt-4 text-slate-500">
        <Plus size={16} className="mr-2" /> Añadir
      </Button>
    </div>
  );
}

function ClientCard({ client }: { client: any }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'client',
    item: { id: client.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div ref={drag} className={`${isDragging ? 'opacity-50' : ''}`}>
      <Card className="p-4 hover:shadow-md transition-all cursor-move">
        <h4 className="font-bold text-sm text-slate-900">{client.name}</h4>
        {client.company && (
          <p className="text-xs text-slate-500 mt-1">{client.company}</p>
        )}
        <p className="text-xs text-slate-400 mt-2">
          {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(client.potentialValue)}
        </p>
      </Card>
    </div>
  );
}

export default function PipelineKanban({ userId }: PipelineKanbanProps) {
  const [stages, setStages] = useState<Record<string, any[]>>({});

  // Cargar datos (en producción usar SWR/React Query)
  useState(() => {
    STAGES.forEach(async (stage) => {
      const clients = await getClientsByStage(userId, stage.id);
      setStages(prev => ({ ...prev, [stage.id]: clients }));
    });
  });

  const handleDrop = async (clientId: number, newStage: PipelineStage) => {
    await moveClientToStage(clientId, newStage, userId);
    // Recargar datos
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => (
          <StageColumn
            key={stage.id}
            stage={stage}
            clients={stages[stage.id] || []}
            onDrop={handleDrop}
          />
        ))}
      </div>
    </DndProvider>
  );
}
