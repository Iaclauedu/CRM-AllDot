'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  Bell,
  ChevronDown,
  Sparkles,
  Layers,
  HelpCircle,
  Settings,
  TrendingUp,
  FolderGit2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DADOS_ORGANIZACAO, DADOS_MEMBROS, DADOS_NEGOCIOS } from '@/lib/mock-data';
import { formatarMoeda } from '@/lib/utils';

interface TopbarProps {
  onAbrirNovoNegocio?: () => void;
}

const MODULOS_MAP: Record<string, string> = {
  '/': 'Pipeline Principal',
  '/contatos': 'Base de Contatos',
  '/empresas': 'Carteira de Empresas',
  '/produtos': 'Catálogo de Produtos',
  '/dashboard': 'Analytics & Forecast',
  '/configuracoes': 'Configurações',
};

export function Topbar({ onAbrirNovoNegocio }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const dispararCommandPalette = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
  };

  const handleNovaOportunidade = () => {
    if (onAbrirNovoNegocio) {
      onAbrirNovoNegocio();
    } else {
      router.push('/?novo=1');
    }
  };

  const moduloAtual = MODULOS_MAP[pathname] || 'Pipeline Principal';
  const usuarioLogado = DADOS_MEMBROS[0];
  const valorTotalPipeline = DADOS_NEGOCIOS.filter((n) => n.status === 'aberto').reduce(
    (acc, n) => acc + n.valor,
    0
  );

  return (
    <header className="flex h-14 w-full items-center justify-between bg-[#0B132B] px-5 text-white z-20 shrink-0 border-b border-slate-800 select-none shadow-md">
      {/* Lado Esquerdo: Marca AllDot & Breadcrumbs Estruturados */}
      <div className="flex items-center gap-4">
        {/* Marca AllDot */}
        <div className="flex items-center gap-2 pr-2 border-r border-slate-800">
          <span className="font-extrabold text-lg tracking-tight text-white flex items-center">
            Alldot<span className="text-[#E42358] text-xl font-black">.</span>
            <span className="text-[9px] text-slate-400 font-sans ml-0.5 relative -top-1.5">®</span>
          </span>
          <span className="rounded-md bg-[#E42358]/20 border border-[#E42358]/40 px-1.5 py-0.5 text-[10px] font-mono tracking-wider text-[#FF6E96] font-bold">
            PRO
          </span>
        </div>

        {/* Hierarquia de Contexto (Breadcrumbs AllDot) */}
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-300">
          <div className="flex items-center gap-1.5 font-medium hover:text-white cursor-pointer transition-colors">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            <span className="font-semibold text-slate-200">{DADOS_ORGANIZACAO.nome}</span>
          </div>
          <span className="text-slate-600">/</span>
          <div className="flex items-center gap-1 text-slate-400 hover:text-slate-200 cursor-pointer transition-colors">
            <FolderGit2 className="h-3.5 w-3.5 text-slate-500" />
            <span>Funil Comercial B2B</span>
          </div>
          <span className="text-slate-600">/</span>
          <span className="text-[#FF6E96] font-semibold bg-[#E42358]/10 px-2 py-0.5 rounded-md border border-[#E42358]/20">
            {moduloAtual}
          </span>
        </div>
      </div>

      {/* Centro: Barra de Pesquisa Rápida (Ctrl+K) */}
      <div className="flex items-center gap-3">
        <button
          onClick={dispararCommandPalette}
          className="flex h-9 w-64 lg:w-96 items-center justify-between rounded-xl bg-slate-900/90 hover:bg-slate-800/90 px-3.5 text-xs text-slate-300 transition-all border border-slate-700/80 hover:border-slate-600 shadow-inner group"
        >
          <div className="flex items-center gap-2.5">
            <Search className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#E42358] transition-colors" />
            <span className="text-slate-400 font-medium">Buscar negociações, contatos, empresas...</span>
          </div>
          <kbd className="rounded-md bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-400 border border-slate-700">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Lado Direito: KPI ao Vivo, Notificações e Botão de Ação */}
      <div className="flex items-center gap-3.5">
        {/* KPI Rápido de Pipeline */}
        <div className="hidden xl:flex items-center gap-2 rounded-xl bg-slate-900/70 border border-slate-800 px-3 py-1.5 text-xs">
          <TrendingUp className="h-3.5 w-3.5 text-[#E42358]" />
          <span className="text-slate-400 text-[11px]">Total em Aberto:</span>
          <span className="font-mono font-bold text-slate-100">{formatarMoeda(valorTotalPipeline)}</span>
        </div>

        {/* Notificações */}
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors border border-transparent hover:border-slate-700"
          title="Notificações & Alertas"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E42358] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E42358]" />
          </span>
        </button>

        {/* Botão Primário Exclusivo AllDot */}
        <Button
          onClick={handleNovaOportunidade}
          size="sm"
          className="h-9 gap-2 bg-gradient-to-r from-[#DE1B54] to-[#E42358] hover:from-[#C91748] hover:to-[#DE1B54] text-white font-bold text-xs px-4 rounded-xl shadow-lg shadow-[#E42358]/30 transition-all hover:scale-[1.02] active:scale-[0.98] border border-white/10"
        >
          <Plus className="h-4 w-4" />
          <span>Nova Oportunidade</span>
        </Button>
      </div>
    </header>
  );
}

