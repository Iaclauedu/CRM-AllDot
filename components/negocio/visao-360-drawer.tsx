'use client';

import * as React from 'react';
import {
  X,
  Trophy,
  XCircle,
  Trash2,
  ChevronRight,
  Sparkles,
  Layers,
  Building2,
  Calendar,
} from 'lucide-react';
import { ColunaPropriedades } from './coluna-propriedades';
import { ColunaTimeline } from './coluna-timeline';
import { ColunaAssociacoes } from './coluna-associacoes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DADOS_ETAPAS,
  type Negocio,
  type Atividade,
  type EtapaFunil,
} from '@/lib/mock-data';

interface Visao360DrawerProps {
  negocio: Negocio | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAtualizarNegocio: (negocioId: string, atualizado: Partial<Negocio>) => void;
  onMarcarGanho?: (negocioId: string) => void;
  onMarcarPerdido?: (negocio: Negocio) => void;
  etapas?: EtapaFunil[];
}

export function Visao360Drawer({
  negocio,
  open,
  onOpenChange,
  onAtualizarNegocio,
  onMarcarGanho,
  onMarcarPerdido,
  etapas = DADOS_ETAPAS,
}: Visao360DrawerProps) {
  // Escuta tecla ESC para fechar
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  if (!open || !negocio) return null;

  const handleAtualizarCampos = (campos: Partial<Negocio>) => {
    onAtualizarNegocio(negocio.id, campos);
  };

  const handleAdicionarAtividade = (novaAtividade: Atividade) => {
    const listaAtualizada = [novaAtividade, ...(negocio.atividades || [])];
    onAtualizarNegocio(negocio.id, {
      atividades: listaAtualizada,
      ultima_atividade_em: new Date().toISOString(),
    });
  };

  const handleConcluirAtividade = (atividadeId: string) => {
    const listaAtualizada = (negocio.atividades || []).map((a) =>
      a.id === atividadeId ? { ...a, concluida_em: new Date().toISOString() } : a
    );
    onAtualizarNegocio(negocio.id, {
      atividades: listaAtualizada,
      ultima_atividade_em: new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 select-none animate-in fade-in-0 duration-200">
      {/* Backdrop com blur suave */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={() => onOpenChange(false)}
      />

      {/* Container Principal da Visão 360º (Drawer Expansível) */}
      <div className="relative z-50 flex flex-col h-[92vh] w-full max-w-7xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header Superior da Visão 360º */}
        <div className="flex flex-col border-b border-border bg-card/80 px-6 py-4 shrink-0">
          <div className="flex items-center justify-between gap-4">
            {/* Título e Empresa */}
            <div className="flex items-center gap-3 truncate">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E42358]/10 border border-[#E42358]/20 shrink-0">
                <Sparkles className="h-4 w-4 text-[#E42358]" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-foreground truncate">
                    {negocio.titulo}
                  </h1>
                  <Badge
                    variant={
                      negocio.status === 'ganho'
                        ? 'success'
                        : negocio.status === 'perdido'
                        ? 'destructive'
                        : 'secondary'
                    }
                    className="capitalize text-[10px]"
                  >
                    {negocio.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>{negocio.empresa_nome || 'Empresa Geral'}</span>
                </div>
              </div>
            </div>

            {/* Ações Rápidas no Topo (Ganho / Perdido / Fechar) */}
            <div className="flex items-center gap-2 shrink-0">
              {negocio.status === 'aberto' && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onMarcarGanho?.(negocio.id)}
                    className="gap-1.5 border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold"
                  >
                    <Trophy className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Ganho</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onMarcarPerdido?.(negocio)}
                    className="gap-1.5 border-red-300 bg-red-50 text-red-800 hover:bg-red-100 text-xs font-semibold"
                  >
                    <XCircle className="h-3.5 w-3.5 text-red-600" />
                    <span>Perdido</span>
                  </Button>
                </>
              )}

              <button
                onClick={() => onOpenChange(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors ml-2"
                title="Fechar (ESC)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Stepper de Etapas do Funil (Pipeline Progression Bar) */}
          <div className="mt-4 pt-3 border-t border-border/40 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max">
              {etapas.map((etapa, idx) => {
                const isEtapaAtual = etapa.id === negocio.etapa_id;
                const etapaIdxAtual = etapas.findIndex((e) => e.id === negocio.etapa_id);
                const isPassada = idx < etapaIdxAtual;

                return (
                  <button
                    key={etapa.id}
                    onClick={() => handleAtualizarCampos({ etapa_id: etapa.id })}
                    className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      isEtapaAtual
                        ? 'bg-[#E42358] text-white font-semibold shadow-sm'
                        : isPassada
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-muted/50 text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                  >
                    <span className="font-mono text-[10px]">{idx + 1}.</span>
                    <span>{etapa.nome}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Corpo em 3 Colunas (Layout HubSpot UX) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-border">
          {/* Coluna Esquerda (25%): Propriedades do Negócio */}
          <div className="md:col-span-3 overflow-y-auto p-4 bg-card/40">
            <ColunaPropriedades
              negocio={negocio}
              onAtualizarNegocio={handleAtualizarCampos}
              etapas={etapas}
            />
          </div>

          {/* Coluna Central (50%): Abas Rápidas e Timeline Unificada */}
          <div className="md:col-span-6 overflow-hidden flex flex-col p-4 bg-background/60">
            <ColunaTimeline
              negocio={negocio}
              onAdicionarAtividade={handleAdicionarAtividade}
              onConcluirAtividade={handleConcluirAtividade}
            />
          </div>

          {/* Coluna Direita (25%): Contato Principal e Empresa */}
          <div className="md:col-span-3 overflow-y-auto p-4 bg-card/40">
            <ColunaAssociacoes negocio={negocio} />
          </div>
        </div>
      </div>
    </div>
  );
}
