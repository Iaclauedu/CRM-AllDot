'use client';

import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { KanbanCard } from './kanban-card';
import { formatarMoeda } from '@/lib/utils';
import type { EtapaFunil, Negocio } from '@/lib/mock-data';
import { Plus, Sparkles, TrendingUp, GripVertical } from 'lucide-react';

interface KanbanColumnProps {
  etapa: EtapaFunil;
  negocios: Negocio[];
  onCardClick?: (negocio: Negocio) => void;
  onAdicionarNegocio?: (etapaId: string) => void;
  onCriarTarefa?: (negocio: Negocio) => void;
}

// Cores temáticas exclusivas para cada etapa do funil AllDot
const CORES_ETAPAS: Record<number, { dot: string; border: string; bg: string; text: string }> = {
  1: { dot: 'bg-indigo-500', border: 'border-indigo-200', bg: 'bg-indigo-50', text: 'text-indigo-700' },
  2: { dot: 'bg-sky-500', border: 'border-sky-200', bg: 'bg-sky-50', text: 'text-sky-700' },
  3: { dot: 'bg-[#E42358]', border: 'border-[#E42358]/30', bg: 'bg-[#FFF0F3]', text: 'text-[#DE1B54]' },
  4: { dot: 'bg-emerald-500', border: 'border-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-700' },
};

export function KanbanColumn({
  etapa,
  negocios,
  onCardClick,
  onAdicionarNegocio,
  onCriarTarefa,
}: KanbanColumnProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: etapa.id,
    data: {
      type: 'Coluna',
      etapa,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  const valorTotal = negocios.reduce((acc, n) => acc + n.valor, 0);
  const valorPonderado = (valorTotal * etapa.probabilidade_fechamento) / 100;
  const cores = CORES_ETAPAS[etapa.ordem] || CORES_ETAPAS[1];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col w-[310px] rounded-2xl border transition-colors duration-200 shrink-0 h-full ${
        isOver && !isDragging
          ? 'border-[#E42358] bg-[#FFF0F3]/60 ring-2 ring-[#E42358]/20 shadow-md'
          : 'border-slate-200/80 bg-slate-100/70'
      }`}
    >
      {/* 1. Cabeçalho da Etapa AllDot */}
      <div className="flex flex-col border-b border-slate-200/80 px-4 py-3 select-none bg-white/80 backdrop-blur-xs rounded-t-2xl">
        <div className="flex items-center justify-between gap-2">
          {/* Indicador de Etapa e Nome */}
          <div className="flex items-center gap-1.5 truncate">
            {/* Grip handle para arrastar e reordenar a etapa */}
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 -ml-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors shrink-0"
              title="Arraste para alterar a ordem desta fase no funil"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </div>
            <span className={`h-2.5 w-2.5 rounded-full ${cores.dot} shadow-xs shrink-0`} />
            <h2 className="font-bold text-xs text-slate-900 tracking-tight truncate">
              {etapa.nome}
            </h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.2 text-[11px] font-bold text-slate-600 font-mono shrink-0">
              {negocios.length}
            </span>
          </div>

          {/* Botão de Adicionar Negócio Rápido nesta Etapa */}
          <button
            onClick={() => onAdicionarNegocio?.(etapa.id)}
            title={`Adicionar negociação em ${etapa.nome}`}
            className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:text-[#E42358] hover:bg-[#FFF0F3] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Sub-barra: Valor Total + Forecast Ponderado */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 font-mono">
            <span className="font-bold text-slate-900 text-[11px]">
              {formatarMoeda(valorTotal)}
            </span>
          </div>

          <div
            className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold font-mono ${cores.bg} ${cores.text}`}
            title={`Forecast ponderado (${etapa.probabilidade_fechamento}%): ${formatarMoeda(valorPonderado)}`}
          >
            <TrendingUp className="h-2.5 w-2.5" />
            <span>{etapa.probabilidade_fechamento}%</span>
          </div>
        </div>
      </div>

      {/* 2. Lista de Cards Sortable */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[160px]">
        <SortableContext
          items={negocios.map((n) => n.id)}
          strategy={verticalListSortingStrategy}
        >
          {negocios.map((negocio) => (
            <KanbanCard
              key={negocio.id}
              negocio={negocio}
              diasEstagnacao={etapa.dias_estagnacao}
              onClick={() => onCardClick?.(negocio)}
              onCriarTarefa={onCriarTarefa}
            />
          ))}
        </SortableContext>

        {negocios.length === 0 && (
          <div
            onClick={() => onAdicionarNegocio?.(etapa.id)}
            className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300/80 bg-white/40 p-4 text-center cursor-pointer hover:border-[#E42358]/50 hover:bg-[#FFF0F3]/30 transition-all group"
          >
            <Plus className="h-4 w-4 text-slate-400 group-hover:text-[#E42358] transition-colors mb-1" />
            <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-800">
              Nenhuma oportunidade
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">
              Clique para adicionar
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

