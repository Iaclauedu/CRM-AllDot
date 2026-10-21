'use client';

import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Building2,
  PhoneCall,
  Calendar,
  MessageCircle,
  AlertTriangle,
  Star,
  Clock,
  ExternalLink,
  Plus,
  Flame,
  ArrowUpRight,
} from 'lucide-react';
import { formatarMoeda, formatarDataHora } from '@/lib/utils';
import type { Negocio } from '@/lib/mock-data';

interface KanbanCardProps {
  negocio: Negocio;
  diasEstagnacao?: number;
  onClick?: () => void;
  onCriarTarefa?: (negocio: Negocio) => void;
  isOverlay?: boolean;
}

export function KanbanCard({
  negocio,
  diasEstagnacao = 7,
  onClick,
  onCriarTarefa,
  isOverlay = false,
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: negocio.id,
    data: {
      type: 'Negocio',
      negocio,
    },
    disabled: isOverlay,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  // Cálculo de Estagnação (Deal Rotting)
  const diffDias =
    (Date.now() - new Date(negocio.ultima_atividade_em).getTime()) / (1000 * 86400);
  const isEstagnado = diffDias > diasEstagnacao && negocio.status === 'aberto';

  // Análise de Atividades
  let statusAtividade: 'atrasada' | 'hoje' | 'futura' | 'sem_tarefa' = 'sem_tarefa';
  let atividadePrincipal = null;

  if (negocio.atividades && negocio.atividades.length > 0) {
    const pendentes = negocio.atividades.filter((a) => !a.concluida_em);
    if (pendentes.length > 0) {
      atividadePrincipal = pendentes[0];
      if (atividadePrincipal.data_vencimento) {
        const vencimento = new Date(atividadePrincipal.data_vencimento);
        const hojeInicio = new Date();
        hojeInicio.setHours(0, 0, 0, 0);
        const hojeFim = new Date();
        hojeFim.setHours(23, 59, 59, 999);

        if (vencimento < hojeInicio) {
          statusAtividade = 'atrasada';
        } else if (vencimento <= hojeFim) {
          statusAtividade = 'hoje';
        } else {
          statusAtividade = 'futura';
        }
      }
    }
  }

  // Verifica se há produtos recorrentes (MRR)
  const totalProdutos = negocio.produtos?.reduce((acc, p) => acc + p.quantidade, 0) || 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      suppressHydrationWarning
      className={`group relative rounded-2xl border bg-white p-3.5 shadow-xs transition-all duration-200 select-none cursor-grab active:cursor-grabbing hover:shadow-lg hover:border-[#E42358]/40 hover:-translate-y-0.5 ${
        isEstagnado
          ? 'border-amber-300/80 bg-gradient-to-b from-amber-50/20 to-white ring-1 ring-amber-300/50'
          : 'border-slate-200/90'
      } ${
        isOverlay
          ? 'scale-105 shadow-2xl ring-2 ring-[#E42358] z-50 rotate-1 border-[#E42358]'
          : ''
      }`}
    >
      {/* 1. Header do Card: Prioridade / Status + Valor Ponderado */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          {/* Badge de Prioridade AllDot */}
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 font-mono tracking-tight group-hover:bg-[#FFF0F3] group-hover:text-[#E42358] transition-colors">
            <Star className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />
            <span>P1</span>
          </span>

          {/* Indicador de Estagnação / Risco */}
          {isEstagnado && (
            <span
              title={`Sem atividade há ${Math.floor(diffDias)} dias`}
              className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 animate-pulse"
            >
              <Flame className="h-3 w-3 text-amber-600" />
              <span>{Math.floor(diffDias)}d</span>
            </span>
          )}

          {totalProdutos > 0 && (
            <span className="text-[10px] font-semibold text-slate-400">
              {totalProdutos} {totalProdutos === 1 ? 'item' : 'itens'}
            </span>
          )}
        </div>

        {/* Valor da Oportunidade */}
        <div className="text-right">
          <span className="font-extrabold font-mono text-xs text-slate-900 group-hover:text-[#E42358] transition-colors">
            {formatarMoeda(negocio.valor)}
          </span>
        </div>
      </div>

      {/* 2. Título do Negócio */}
      <h3 className="text-xs font-bold text-slate-900 leading-snug tracking-tight group-hover:text-[#DE1B54] transition-colors line-clamp-2">
        {negocio.titulo}
      </h3>

      {/* 3. Empresa & Contato com Ação Rápida WhatsApp */}
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5 truncate max-w-[85%]">
          <Building2 className="h-3 w-3 shrink-0 text-slate-400" />
          <span className="truncate font-medium text-slate-600">
            {negocio.empresa_nome || 'Empresa Geral'}
          </span>
        </div>

        {/* Botão de WhatsApp 1-Click se houver telefone */}
        {negocio.contato_whatsapp && (
          <a
            href={`https://wa.me/${negocio.contato_whatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            title={`Conversar com ${negocio.contato_nome || 'Contato'} no WhatsApp`}
            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 p-1 rounded-md transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      {/* 4. Rodapé do Card: Próxima Atividade + Responsável */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
        {/* Atividade Status Pill */}
        {atividadePrincipal ? (
          <div
            className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-medium max-w-[75%] truncate border ${
              statusAtividade === 'atrasada'
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : statusAtividade === 'hoje'
                ? 'bg-amber-50 border-amber-200 text-amber-800 font-semibold'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            {statusAtividade === 'atrasada' ? (
              <Clock className="h-3 w-3 shrink-0 text-rose-600 animate-pulse" />
            ) : statusAtividade === 'hoje' ? (
              <Calendar className="h-3 w-3 shrink-0 text-amber-600" />
            ) : (
              <Calendar className="h-3 w-3 shrink-0 text-slate-500" />
            )}
            <span className="truncate">{atividadePrincipal.titulo}</span>
          </div>
        ) : (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onCriarTarefa ? onCriarTarefa(negocio) : onClick?.();
            }}
            className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-[#E42358] hover:bg-[#FFF0F3] px-2 py-1 rounded-lg transition-colors border border-dashed border-slate-200 hover:border-[#E42358]/50"
          >
            <Plus className="h-3 w-3" />
            <span>Agendar Ação</span>
          </button>
        )}

        {/* Responsável Avatar */}
        {negocio.responsavel_avatar && (
          <div className="relative shrink-0" title={`Responsável: ${negocio.responsavel_nome}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={negocio.responsavel_avatar}
              alt={negocio.responsavel_nome || ''}
              className="h-6 w-6 rounded-full object-cover ring-1.5 ring-slate-200 hover:ring-[#E42358] transition-all"
            />
          </div>
        )}
      </div>
    </div>
  );
}

