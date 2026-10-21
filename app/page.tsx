'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { CommandPalette } from '@/components/layout/command-palette';
import type { Negocio } from '@/lib/mock-data';

// Dynamic import com ssr: false para evitar hydration mismatch de @dnd-kit (aria-describedby)
const KanbanBoard = dynamic(
  () => import('@/components/kanban/kanban-board').then((mod) => mod.KanbanBoard),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#E42358] border-t-transparent" />
          <span className="text-xs font-semibold text-slate-500 font-mono tracking-tight">
            Carregando Pipeline AllDot...
          </span>
        </div>
      </div>
    ),
  }
);

export default function PaginaInicialPipeline() {
  const [abrirNovoNegocioFn, setAbrirNovoNegocioFn] = React.useState<(() => void) | null>(null);

  const handleCardClick = React.useCallback((negocio: Negocio) => {
    console.log('Negócio selecionado:', negocio);
  }, []);

  const handleNovoNegocioClickRef = React.useCallback((abrir: () => void) => {
    setAbrirNovoNegocioFn(() => abrir);
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onAbrirNovoNegocio={() => abrirNovoNegocioFn?.()} />
        <CommandPalette />

        <div className="flex-1 overflow-hidden">
          <KanbanBoard
            onCardClick={handleCardClick}
            onNovoNegocioClickRef={handleNovoNegocioClickRef}
          />
        </div>
      </div>
    </div>
  );
}

