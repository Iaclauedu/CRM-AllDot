'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Kanban,
  Users,
  Building2,
  Package,
  BarChart3,
  Settings,
  HelpCircle,
  Compass,
  Zap,
} from 'lucide-react';
import { DADOS_MEMBROS } from '@/lib/mock-data';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const usuarioLogado = DADOS_MEMBROS[0];

  const itens = React.useMemo(
    () => [
      { titulo: 'Pipeline de Vendas', href: '/', icone: Kanban, atalho: '1' },
      { titulo: 'Base de Contatos', href: '/contatos', icone: Users, atalho: '2' },
      { titulo: 'Carteira de Empresas', href: '/empresas', icone: Building2, atalho: '3' },
      { titulo: 'Catálogo de Produtos', href: '/produtos', icone: Package, atalho: '4' },
      { titulo: 'Analytics & Forecast', href: '/dashboard', icone: BarChart3, atalho: '5' },
      { titulo: 'Configurações', href: '/configuracoes', icone: Settings, atalho: '6' },
    ],
    []
  );

  // Suporte a atalhos de teclado Alt+1..6
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const item = itens.find((i) => i.atalho === e.key);
        if (item) {
          e.preventDefault();
          router.push(item.href);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [itens, router]);

  return (
    <aside className="w-16 bg-[#0B132B] text-white flex flex-col items-center py-4 select-none shrink-0 border-r border-slate-800/80 z-30 justify-between shadow-2xl">
      {/* Topo: Logo Marca Oficial AllDot */}
      <div className="flex flex-col items-center gap-6 w-full">
        <Link href="/" title="AllDot CRM - Ir para Início" className="group relative">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#DE1B54] via-[#E42358] to-[#FF4B7D] text-white font-extrabold text-base shadow-lg shadow-[#E42358]/30 transition-all duration-200 group-hover:scale-105 group-hover:shadow-[#E42358]/50 ring-2 ring-white/10">
            <span className="tracking-tighter font-mono">A<span className="text-white drop-shadow-md">.</span></span>
          </div>
          {/* Subtle pulse ring on logo */}
          <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E42358] opacity-60" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#E42358] border-2 border-[#0B132B]" />
          </span>
        </Link>

        {/* Separador elegante */}
        <div className="w-8 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />

        {/* Navegação Principal */}
        <nav className="flex flex-col items-center gap-2 w-full px-2">
          {itens.map((item) => {
            const Icone = item.icone;
            const ativo = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative group flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200 ${
                  ativo
                    ? 'bg-[#E42358] text-white shadow-lg shadow-[#E42358]/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icone className={`h-5 w-5 shrink-0 transition-transform duration-200 ${ativo ? 'scale-110' : 'group-hover:scale-110'}`} />

                {/* Tooltip AllDot com atalho */}
                <div className="pointer-events-none absolute left-16 z-50 hidden rounded-lg bg-slate-900 border border-slate-700/80 px-3 py-1.5 text-xs font-semibold text-white shadow-2xl group-hover:flex items-center gap-2 whitespace-nowrap backdrop-blur-md">
                  <span>{item.titulo}</span>
                  <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400 font-mono border border-slate-700">
                    Alt+{item.atalho}
                  </kbd>
                </div>

                {/* Indicador de item ativo */}
                {ativo && (
                  <span className="absolute -left-2.5 h-6 w-1 rounded-r-full bg-[#E42358] shadow-[0_0_8px_#E42358]" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Rodapé: Atalho Rápido IA & Perfil */}
      <div className="flex flex-col items-center gap-4 w-full px-2 pt-3 border-t border-slate-800/80">
        <button
          title="Central de Ajuda & Documentação AllDot"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
        >
          <HelpCircle className="h-5 w-5" />
        </button>

        {/* Avatar do Usuário com Indicador de Presença */}
        <div
          className="relative group cursor-pointer"
          title={`${usuarioLogado.nome_completo} (${usuarioLogado.cargo})`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={usuarioLogado.avatar_url}
            alt={usuarioLogado.nome_completo}
            className="h-9 w-9 rounded-full object-cover ring-2 ring-[#E42358]/50 hover:ring-[#E42358] transition-all shadow-md"
          />
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0B132B]" />
        </div>
      </div>
    </aside>
  );
}

