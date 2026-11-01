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
import { DADOS_ORGANIZACAO, DADOS_NEGOCIOS, type Negocio } from '@/lib/mock-data';
import { buscarOrganizacaoDoBanco, buscarNegociosDoBanco } from '@/lib/supabase/service';
import { formatarMoeda } from '@/lib/utils';
import { useCustomBranding } from '@/lib/branding-context';
import { AllDotLogo } from '@/components/layout/alldot-logo';

interface TopbarProps {
  onAbrirNovoNegocio?: () => void;
  nomeFunil?: string;
}

const MODULOS_MAP: Record<string, string> = {
  '/': 'Pipeline Principal',
  '/contatos': 'Base de Contatos',
  '/empresas': 'Carteira de Empresas',
  '/produtos': 'Catálogo de Produtos',
  '/dashboard': 'Analytics & Forecast',
  '/configuracoes': 'Configurações',
};

export function Topbar({ onAbrirNovoNegocio, nomeFunil }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [nomeOrganizacao, setNomeOrganizacao] = React.useState(DADOS_ORGANIZACAO.nome);
  const [negocios, setNegocios] = React.useState<Negocio[]>(DADOS_NEGOCIOS);

  React.useEffect(() => {
    buscarOrganizacaoDoBanco().then((org) => {
      if (org?.nome) {
        setNomeOrganizacao(org.nome);
      }
    });

    buscarNegociosDoBanco().then((lista) => {
      if (lista && lista.length > 0) {
        setNegocios(lista);
      }
    });

    const handleOrgUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.nome) {
        setNomeOrganizacao(customEvent.detail.nome);
      }
    };

    window.addEventListener('workspace-organizacao-atualizada', handleOrgUpdated);
    return () => window.removeEventListener('workspace-organizacao-atualizada', handleOrgUpdated);
  }, []);

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

  const { branding } = useCustomBranding();
  const moduloAtual = MODULOS_MAP[pathname] || 'Pipeline Principal';
  const valorTotalPipeline = negocios
    .filter((n) => n.status === 'aberto')
    .reduce((acc, n) => acc + n.valor, 0);

  return (
    <header
      className="flex h-14 w-full items-center justify-between px-5 text-white z-20 shrink-0 border-b border-slate-800 select-none shadow-md transition-colors duration-300"
      style={{ backgroundColor: branding.corTopbar || '#0B132B' }}
    >
      {/* Lado Esquerdo: Marca AllDot / Cliente & Breadcrumbs Estruturados */}
      <div className="flex items-center gap-4">
        {/* Marca Customizável */}
        <div className="flex items-center gap-2 pr-2 border-r border-slate-800">
          <AllDotLogo variant="white" size="sm" />
          <span
            className="rounded-md px-1.5 py-0.5 text-[10px] font-mono tracking-wider font-bold"
            style={{
              backgroundColor: `${branding.corPrimaria}25`,
              color: branding.corPrimaria,
              border: `1px solid ${branding.corPrimaria}40`,
            }}
          >
            PRO
          </span>
        </div>

        {/* Hierarquia de Contexto (Breadcrumbs) */}
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-300">
          <div className="flex items-center gap-1.5 font-medium hover:text-white cursor-pointer transition-colors">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            <span className="font-semibold text-slate-200">
              {branding.empresaNome !== 'Alldot' ? branding.empresaNome : nomeOrganizacao}
            </span>
          </div>
          <span className="text-slate-600">/</span>
          <div className="flex items-center gap-1 text-slate-400 hover:text-slate-200 cursor-pointer transition-colors">
            <FolderGit2 className="h-3.5 w-3.5 text-slate-500" />
            <span>{nomeFunil || 'Funil Comercial B2B'}</span>
          </div>
          <span className="text-slate-600">/</span>
          <span
            className="font-semibold px-2 py-0.5 rounded-md text-xs"
            style={{
              backgroundColor: `${branding.corPrimaria}15`,
              color: branding.corPrimaria,
              border: `1px solid ${branding.corPrimaria}30`,
            }}
          >
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
            <Search
              className="h-3.5 w-3.5 text-slate-400 transition-colors"
              style={{ color: undefined }}
            />
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
          <TrendingUp className="h-3.5 w-3.5" style={{ color: branding.corPrimaria }} />
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
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: branding.corPrimaria }}
            />
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{ backgroundColor: branding.corPrimaria }}
            />
          </span>
        </button>

        {/* Botão Primário Dinâmico */}
        <Button
          onClick={handleNovaOportunidade}
          size="sm"
          style={{
            backgroundColor: branding.corPrimaria,
            boxShadow: `0 4px 14px ${branding.corPrimaria}40`,
          }}
          className="h-9 gap-2 text-white font-bold text-xs px-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] border border-white/10 hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          <span>Nova Oportunidade</span>
        </Button>
      </div>
    </header>
  );
}

