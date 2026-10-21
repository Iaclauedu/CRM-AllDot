'use client';

import * as React from 'react';
import {
  Building2,
  Calendar,
  MessageCircle,
  AlertTriangle,
  Star,
  Plus,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { formatarMoeda, formatarData } from '@/lib/utils';
import type { Negocio, EtapaFunil } from '@/lib/mock-data';

interface KanbanListViewProps {
  negocios: Negocio[];
  etapas: EtapaFunil[];
  onCardClick?: (negocio: Negocio) => void;
  onAdicionarTarefa?: (negocio: Negocio) => void;
  onAdicionarNegocio?: (etapaId: string) => void;
}

function getBadgeEstilo(ordem: number) {
  switch (ordem) {
    case 1:
      return 'bg-indigo-600 text-white shadow-xs';
    case 2:
      return 'bg-sky-600 text-white shadow-xs';
    case 3:
      return 'bg-[#E42358] text-white shadow-xs shadow-[#E42358]/20';
    case 4:
      return 'bg-emerald-600 text-white shadow-xs';
    default:
      return 'bg-slate-700 text-white shadow-xs';
  }
}


export function KanbanListView({
  negocios,
  etapas,
  onCardClick,
  onAdicionarTarefa,
  onAdicionarNegocio,
}: KanbanListViewProps) {
  const [colapsados, setColapsados] = React.useState<Record<string, boolean>>({});

  const toggleColapso = (etapaId: string) => {
    setColapsados((prev) => ({ ...prev, [etapaId]: !prev[etapaId] }));
  };

  return (
    <div className="flex-1 overflow-auto p-6 space-y-5 bg-[#F8FAFC]">
      {etapas.map((etapa) => {
        const dealsDaEtapa = negocios.filter((n) => n.etapa_id === etapa.id);
        const totalValor = dealsDaEtapa.reduce((acc, n) => acc + n.valor, 0);
        const isColapsado = colapsados[etapa.id];

        return (
          <div
            key={etapa.id}
            className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs transition-shadow hover:shadow-md"
          >
            {/* Header da Etapa (Estilo ClickUp Estruturado + AllDot Identity) */}
            <div
              onClick={() => toggleColapso(etapa.id)}
              className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-3 cursor-pointer select-none hover:bg-slate-100/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="text-slate-400 hover:text-slate-700 transition-transform"
                >
                  {isColapsado ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {/* Badge da Etapa */}
                <span
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold tracking-wider uppercase font-mono ${getBadgeEstilo(etapa.ordem)}`}
                >
                  {etapa.nome}
                </span>


                <span className="text-xs font-bold text-slate-500 font-mono">
                  {dealsDaEtapa.length} {dealsDaEtapa.length === 1 ? 'oportunidade' : 'oportunidades'}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <span className="text-slate-400 font-normal">Soma:</span>
                  <span className="font-extrabold text-slate-900">{formatarMoeda(totalValor)}</span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdicionarNegocio?.(etapa.id);
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-[#E42358] hover:text-[#C91748] hover:bg-[#FFF0F3] px-2.5 py-1 rounded-lg transition-colors border border-transparent hover:border-[#E42358]/30"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Novo</span>
                </button>
              </div>
            </div>

            {/* Tabela de Negócios */}
            {!isColapsado && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-white">
                      <th className="py-2.5 px-5 w-8"></th>
                      <th className="py-2.5 px-3">Oportunidade & Empresa</th>
                      <th className="py-2.5 px-3">Contato Principal</th>
                      <th className="py-2.5 px-3">Próxima Ação</th>
                      <th className="py-2.5 px-3 text-right">Valor</th>
                      <th className="py-2.5 px-4 text-center">Responsável</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {dealsDaEtapa.length > 0 ? (
                      dealsDaEtapa.map((negocio) => (
                        <tr
                          key={negocio.id}
                          onClick={() => onCardClick?.(negocio)}
                          className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                        >
                          {/* Checkbox / Star */}
                          <td className="py-3 px-5 text-center">
                            <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                          </td>

                          {/* Título & Empresa */}
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900 group-hover:text-[#E42358] transition-colors leading-snug">
                              {negocio.titulo}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                              <Building2 className="h-3 w-3 text-slate-400" />
                              <span>{negocio.empresa_nome || 'Empresa Geral'}</span>
                            </div>
                          </td>

                          {/* Contato & WhatsApp */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-700 font-medium">
                                {negocio.contato_nome || 'Não atribuído'}
                              </span>
                              {negocio.contato_whatsapp && (
                                <a
                                  href={`https://wa.me/${negocio.contato_whatsapp.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  title="WhatsApp Web"
                                  className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 p-1 rounded transition-colors"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                </a>
                              )}
                            </div>
                            {negocio.contato_email && (
                              <span className="text-[11px] text-slate-400 block truncate max-w-[180px]">
                                {negocio.contato_email}
                              </span>
                            )}
                          </td>

                          {/* Próxima Ação */}
                          <td className="py-3 px-3">
                            {negocio.atividades && negocio.atividades.length > 0 ? (
                              <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/90 border border-slate-200/80 px-2.5 py-1 text-[11px] font-medium text-slate-700 max-w-[220px] truncate">
                                <Calendar className="h-3 w-3 text-slate-500 shrink-0" />
                                <span className="truncate">{negocio.atividades[0].titulo}</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAdicionarTarefa?.(negocio);
                                }}
                                className="text-[11px] text-slate-400 hover:text-[#E42358] hover:bg-[#FFF0F3] px-2 py-0.5 rounded transition-colors inline-flex items-center gap-1"
                              >
                                <Plus className="h-3 w-3" />
                                <span>Agendar ação</span>
                              </button>
                            )}
                          </td>

                          {/* Valor da Oportunidade */}
                          <td className="py-3 px-3 text-right">
                            <span className="font-extrabold font-mono text-slate-900 group-hover:text-[#E42358] transition-colors">
                              {formatarMoeda(negocio.valor)}
                            </span>
                          </td>

                          {/* Responsável */}
                          <td className="py-3 px-4 text-center">
                            {negocio.responsavel_avatar ? (
                              <div className="inline-block relative" title={negocio.responsavel_nome}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={negocio.responsavel_avatar}
                                  alt={negocio.responsavel_nome || ''}
                                  className="h-6 w-6 rounded-full object-cover ring-1 ring-slate-200"
                                />
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-xs text-slate-400">
                          Nenhuma negociação nesta etapa.
                        </td>
                      </tr>
                    )}

                    {/* Linha Rápida "+ Adicionar oportunidade" inline */}
                    <tr
                      onClick={() => onAdicionarNegocio?.(etapa.id)}
                      className="hover:bg-[#FFF0F3]/30 cursor-pointer transition-colors border-t border-slate-100 text-slate-400 hover:text-[#E42358]"
                    >
                      <td className="py-2.5 px-5 text-center">
                        <Plus className="h-3.5 w-3.5 mx-auto" />
                      </td>
                      <td colSpan={5} className="py-2.5 px-3 text-[11px] font-semibold">
                        + Nova oportunidade em {etapa.nome}...
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

