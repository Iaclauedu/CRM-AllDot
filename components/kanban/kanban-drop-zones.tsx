'use client';

import * as React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Trophy, XCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropZoneProps {
  id: string;
  titulo: string;
  descricao: string;
  icone: React.ElementType;
  corBase: string;
  corAtiva: string;
}

function DropZone({ id, titulo, descricao, icone: Icone, corBase, corAtiva }: DropZoneProps) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-1 flex items-center justify-center gap-3 py-4 px-6 rounded-xl border-2 border-dashed transition-all duration-200 select-none shadow-lg',
        isOver
          ? cn(corAtiva, 'scale-[1.02] shadow-2xl')
          : cn(corBase, 'opacity-90 hover:opacity-100')
      )}
    >
      <Icone className={cn('h-6 w-6 shrink-0 transition-transform', isOver && 'scale-125')} />
      <div className="text-left">
        <p className="text-xs font-bold uppercase tracking-wider">{titulo}</p>
        <p className="text-[10px] opacity-80">{descricao}</p>
      </div>
    </div>
  );
}

interface KanbanDropZonesProps {
  visivel: boolean;
}

export function KanbanDropZones({ visivel }: KanbanDropZonesProps) {
  if (!visivel) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-3xl px-4 animate-in slide-in-from-bottom-8 duration-200 pointer-events-auto">
      <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-background/90 p-2.5 backdrop-blur-xl shadow-2xl">
        {/* Zona GANHO */}
        <DropZone
          id="zone-ganho"
          titulo="Marcar como Ganho"
          descricao="Comemorar venda e fechar negócio"
          icone={Trophy}
          corBase="border-emerald-600/50 bg-emerald-950/40 text-emerald-300"
          corAtiva="border-emerald-400 bg-emerald-900/80 text-emerald-100 ring-4 ring-emerald-500/20"
        />

        {/* Zona PERDIDO */}
        <DropZone
          id="zone-perdido"
          titulo="Marcar como Perdido"
          descricao="Arquivar com justificativa"
          icone={XCircle}
          corBase="border-red-600/50 bg-red-950/40 text-red-300"
          corAtiva="border-red-400 bg-red-900/80 text-red-100 ring-4 ring-red-500/20"
        />

        {/* Zona EXCLUIR */}
        <DropZone
          id="zone-excluir"
          titulo="Excluir Oportunidade"
          descricao="Remover permanentemente"
          icone={Trash2}
          corBase="border-zinc-700 bg-zinc-900/60 text-zinc-400"
          corAtiva="border-red-500 bg-red-950/80 text-red-200 ring-4 ring-red-500/20"
        />
      </div>
    </div>
  );
}
