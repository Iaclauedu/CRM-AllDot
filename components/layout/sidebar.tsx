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
  LogOut,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { DADOS_MEMBROS } from '@/lib/mock-data';
import { useCustomBranding } from '@/lib/branding-context';
import { AllDotLogo } from '@/components/layout/alldot-logo';
import { createClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const usuarioLogado = DADOS_MEMBROS[0];
  const [modalLogoutAberto, setModalLogoutAberto] = React.useState(false);
  const [saindo, setSaindo] = React.useState(false);

  const handleConfirmarLogout = async () => {
    setSaindo(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Erro ao deslogar:', e);
    }
    router.push('/login');
  };

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

  const { branding } = useCustomBranding();

  return (
    <aside
      className="w-16 text-white flex flex-col items-center py-4 select-none shrink-0 border-r border-slate-800/80 z-30 justify-between shadow-2xl transition-colors duration-300"
      style={{ backgroundColor: branding.corSidebar || '#0B132B' }}
    >
      {/* Topo: Logo Marca (Suporta Logo Customizado do Cliente) */}
      <div className="flex flex-col items-center gap-6 w-full">
        <Link href="/" title={`${branding.empresaNome} - Ir para Início`} className="group relative">
          <div className="transition-all duration-200 group-hover:scale-105">
            <AllDotLogo variant="icon-only" size="md" />
          </div>
          {/* Subtle pulse ring on logo */}
          <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
              style={{ backgroundColor: branding.corPrimaria }}
            />
            <span
              className="relative inline-flex rounded-full h-3 w-3 border-2"
              style={{
                backgroundColor: branding.corPrimaria,
                borderColor: branding.corSidebar || '#0B132B',
              }}
            />
          </span>
        </Link>

        {/* Separador elegante */}
        <div className="w-8 h-px bg-gradient-to-r from-transparent via-slate-700/60 to-transparent" />

        {/* Navegação Principal */}
        <nav className="flex flex-col items-center gap-2 w-full px-2">
          {itens.map((item) => {
            const Icone = item.icone;
            const ativo = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                style={
                  ativo
                    ? {
                        backgroundColor: branding.corPrimaria,
                        boxShadow: `0 4px 14px ${branding.corPrimaria}40`,
                      }
                    : undefined
                }
                className={`relative group flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200 ${
                  ativo
                    ? 'text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icone className={`h-5 w-5 shrink-0 transition-transform duration-200 ${ativo ? 'scale-110' : 'group-hover:scale-110'}`} />

                {/* Tooltip com atalho */}
                <div className="pointer-events-none absolute left-16 z-50 hidden rounded-lg bg-slate-900 border border-slate-700/80 px-3 py-1.5 text-xs font-semibold text-white shadow-2xl group-hover:flex items-center gap-2 whitespace-nowrap backdrop-blur-md">
                  <span>{item.titulo}</span>
                  <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400 font-mono border border-slate-700">
                    Alt+{item.atalho}
                  </kbd>
                </div>

                {/* Indicador de item ativo */}
                {ativo && (
                  <span
                    className="absolute -left-2.5 h-6 w-1 rounded-r-full"
                    style={{
                      backgroundColor: branding.corPrimaria,
                      boxShadow: `0 0 8px ${branding.corPrimaria}`,
                    }}
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Rodapé: Central de Ajuda & Perfil / Logout */}
      <div className="flex flex-col items-center gap-3 w-full px-2 pt-3 border-t border-slate-800/80">
        <button
          title="Central de Ajuda & Documentação AllDot"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
        >
          <HelpCircle className="h-5 w-5" />
        </button>

        {/* Botão de Logout com Confirmação */}
        <button
          id="btn-logout"
          type="button"
          onClick={() => setModalLogoutAberto(true)}
          title="Sair do AllDot CRM (Logout)"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>

        {/* Avatar do Usuário com Indicador de Presença */}
        <div
          onClick={() => router.push('/configuracoes')}
          className="relative group cursor-pointer"
          title={`${usuarioLogado.nome_completo} (${usuarioLogado.cargo}) - Clique para Perfil`}
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

      {/* Modal de Confirmação de Saída / Logout */}
      <Dialog open={modalLogoutAberto} onOpenChange={setModalLogoutAberto}>
        <div className="space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <LogOut className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Confirmar Saída do Sistema</DialogTitle>
                <DialogDescription>
                  Tem certeza de que deseja encerrar a sua sessão no AllDot CRM?
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Todas as suas alterações salvas e negociações permanecem armazenadas com segurança no banco de dados. Você precisará digitar suas credenciais para entrar novamente.
          </p>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalLogoutAberto(false)}
              disabled={saindo}
            >
              Cancelar
            </Button>
            <Button
              id="btn-confirmar-logout"
              type="button"
              size="sm"
              onClick={handleConfirmarLogout}
              disabled={saindo}
              className="bg-rose-600 hover:bg-rose-500 text-white gap-1.5"
            >
              {saindo ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Encerrando Sessão...</span>
                </>
              ) : (
                <>
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sim, Sair da Conta</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </aside>
  );
}

