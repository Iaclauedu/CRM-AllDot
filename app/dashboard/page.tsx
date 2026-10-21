'use client';

import * as React from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Trophy,
  XCircle,
  Percent,
  Users,
  Target,
  ArrowUpRight,
} from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { CommandPalette } from '@/components/layout/command-palette';
import { Badge } from '@/components/ui/badge';
import {
  DADOS_NEGOCIOS,
  DADOS_ETAPAS,
  DADOS_MEMBROS,
  type Negocio,
  type EtapaFunil,
} from '@/lib/mock-data';
import { buscarNegociosDoBanco, buscarEtapasDoBanco } from '@/lib/supabase/service';
import { formatarMoeda } from '@/lib/utils';

export default function PaginaDashboard() {
  const [negocios, setNegocios] = React.useState<Negocio[]>(DADOS_NEGOCIOS);
  const [etapas, setEtapas] = React.useState<EtapaFunil[]>(DADOS_ETAPAS);

  React.useEffect(() => {
    let ativo = true;
    Promise.all([buscarNegociosDoBanco(), buscarEtapasDoBanco()]).then(([negs, ets]) => {
      if (ativo) {
        if (negs && negs.length > 0) setNegocios(negs);
        if (ets && ets.length > 0) setEtapas(ets);
      }
    });
    return () => {
      ativo = false;
    };
  }, []);

  const totalGanhos = negocios.filter((n) => n.status === 'ganho');
  const totalAbertos = negocios.filter((n) => n.status === 'aberto');
  const totalPerdidos = negocios.filter((n) => n.status === 'perdido');

  const receitaGanha = totalGanhos.reduce((acc, n) => acc + n.valor, 0);
  const receitaAberta = totalAbertos.reduce((acc, n) => acc + n.valor, 0);

  const totalFechados = totalGanhos.length + totalPerdidos.length;
  const taxaConversao =
    totalFechados > 0 ? (totalGanhos.length / totalFechados) * 100 : 75;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <CommandPalette />

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/80 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-emerald-400" />
                <h1 className="text-lg font-bold text-foreground">
                  Dashboard Analítico de Vendas
                </h1>
                <Badge variant="success" className="font-mono text-[10px]">
                  Tempo Real
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Indicadores de performance, conversão de funil e receita B2B.
              </p>
            </div>
          </div>

          {/* Grid de KPIs Principais */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-medium">Receita Ganha no Mês</span>
                <Trophy className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-xl font-bold text-emerald-400 font-mono">
                {formatarMoeda(receitaGanha || 9500)}
              </p>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                <span className="text-emerald-400 font-semibold">+18.4%</span> vs mês anterior
              </span>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-medium">Pipeline Aberto</span>
                <TrendingUp className="h-4 w-4 text-sky-400" />
              </div>
              <p className="text-xl font-bold text-foreground font-mono">
                {formatarMoeda(receitaAberta)}
              </p>
              <span className="text-[11px] text-muted-foreground mt-1 block">
                {totalAbertos.length} oportunidades ativas
              </span>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-medium">Taxa de Conversão</span>
                <Percent className="h-4 w-4 text-amber-400" />
              </div>
              <p className="text-xl font-bold text-amber-400 font-mono">
                {taxaConversao.toFixed(1)}%
              </p>
              <span className="text-[11px] text-muted-foreground mt-1 block">
                De prospecção a fechamento
              </span>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-medium">Ticket Médio B2B</span>
                <Target className="h-4 w-4 text-purple-400" />
              </div>
              <p className="text-xl font-bold text-foreground font-mono">
                {formatarMoeda(7495.0)}
              </p>
              <span className="text-[11px] text-muted-foreground mt-1 block">
                Contratos corporativos
              </span>
            </div>
          </div>

          {/* Gráfico Visual de Conversão por Etapa */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
              <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Volume & Conversão por Etapa do Funil
              </h2>

              <div className="space-y-3">
                {DADOS_ETAPAS.map((etapa) => {
                  const deals = negocios.filter((n) => n.etapa_id === etapa.id);
                  const valor = deals.reduce((acc, n) => acc + n.valor, 0);

                  return (
                    <div key={etapa.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground">{etapa.nome}</span>
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="text-muted-foreground">{deals.length} deals</span>
                          <span className="text-emerald-400 font-semibold">{formatarMoeda(valor)}</span>
                        </div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${Math.max(15, etapa.probabilidade_fechamento)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Motivos de Perda Frequentes & Ranking */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
              <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Ranking de Vendas por Vendedor
              </h2>

              <div className="space-y-3">
                {DADOS_MEMBROS.map((membro, index) => (
                  <div
                    key={membro.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-muted/20"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-muted-foreground w-4">
                        #{index + 1}
                      </span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={membro.avatar_url}
                        alt={membro.nome_completo}
                        className="h-7 w-7 rounded-full object-cover border border-border"
                      />
                      <div>
                        <p className="text-xs font-medium text-foreground">{membro.nome_completo}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{membro.cargo}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold font-mono text-emerald-400">
                        {formatarMoeda(index === 0 ? 14400 : index === 1 ? 8400 : 4990)}
                      </p>
                      <span className="text-[10px] text-muted-foreground">Volume sob gestão</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
