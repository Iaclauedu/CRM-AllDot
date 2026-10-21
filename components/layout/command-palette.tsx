'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Kanban,
  Building2,
  Users,
  Package,
  PlusCircle,
  FileText,
  X,
  ExternalLink,
} from 'lucide-react';
import { DADOS_NEGOCIOS, DADOS_CONTATOS, DADOS_EMPRESAS } from '@/lib/mock-data';
import { formatarMoeda } from '@/lib/utils';

export function CommandPalette() {
  const [aberto, setAberto] = React.useState(false);
  const [termo, setTermo] = React.useState('');
  const router = useRouter();

  // Escuta atalhos de teclado Ctrl+K / Cmd+K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setAberto((prev) => !prev);
      }
      if (e.key === 'Escape' && aberto) {
        setAberto(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [aberto]);

  if (!aberto) return null;

  const termoLower = termo.toLowerCase().trim();

  // Filtros de resultados
  const negociosFiltrados = DADOS_NEGOCIOS.filter(
    (n) =>
      n.titulo.toLowerCase().includes(termoLower) ||
      (n.empresa_nome && n.empresa_nome.toLowerCase().includes(termoLower))
  ).slice(0, 4);

  const contatosFiltrados = DADOS_CONTATOS.filter(
    (c) =>
      c.nome.toLowerCase().includes(termoLower) ||
      c.email.toLowerCase().includes(termoLower)
  ).slice(0, 3);

  const empresasFiltradas = DADOS_EMPRESAS.filter(
    (e) =>
      e.nome.toLowerCase().includes(termoLower) ||
      e.cnpj.includes(termoLower)
  ).slice(0, 3);

  const navegarPara = (url: string) => {
    setAberto(false);
    router.push(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={() => setAberto(false)}
      />

      {/* Caixa de Busca */}
      <div className="relative z-50 w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl animate-in fade-in-0 zoom-in-95">
        {/* Input Bar */}
        <div className="flex items-center border-b border-border/80 px-4 py-3">
          <Search className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
          <input
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar negócios, contatos, empresas ou ações rápidas... (Ctrl+K)"
            autoFocus
            className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground/60 focus:outline-none text-foreground"
          />
          {termo && (
            <button
              onClick={() => setTermo('')}
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <kbd className="ml-2 rounded border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Lista de Resultados */}
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-3">
          {/* Ações Rápidas & Navegação */}
          {!termo && (
            <div className="space-y-1">
              <p className="px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                Navegação Rápida
              </p>
              <button
                onClick={() => navegarPara('/')}
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs text-foreground/90 hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Kanban className="h-4 w-4 text-emerald-400" />
                  <span>Pipeline de Vendas (Kanban)</span>
                </div>
                <span className="text-[11px] text-muted-foreground">Ir</span>
              </button>
              <button
                onClick={() => navegarPara('/contatos')}
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs text-foreground/90 hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-sky-400" />
                  <span>Base de Contatos</span>
                </div>
                <span className="text-[11px] text-muted-foreground">Ir</span>
              </button>
              <button
                onClick={() => navegarPara('/empresas')}
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs text-foreground/90 hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-amber-400" />
                  <span>Carteira de Empresas</span>
                </div>
                <span className="text-[11px] text-muted-foreground">Ir</span>
              </button>
            </div>
          )}

          {/* Negócios Encontrados */}
          {negociosFiltrados.length > 0 && (
            <div className="space-y-1">
              <p className="px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                Negócios / Oportunidades
              </p>
              {negociosFiltrados.map((n) => (
                <button
                  key={n.id}
                  onClick={() => navegarPara(`/?negocioId=${n.id}`)}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs text-foreground/90 hover:bg-accent hover:text-accent-foreground transition-colors group"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
                    <div className="text-left truncate">
                      <div className="font-medium text-foreground truncate">{n.titulo}</div>
                      <div className="text-[11px] text-muted-foreground">{n.empresa_nome}</div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-emerald-400 shrink-0 ml-3">
                    {formatarMoeda(n.valor)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Contatos Encontrados */}
          {contatosFiltrados.length > 0 && (
            <div className="space-y-1">
              <p className="px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                Contatos
              </p>
              {contatosFiltrados.map((c) => (
                <button
                  key={c.id}
                  onClick={() => navegarPara(`/contatos`)}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs text-foreground/90 hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Users className="h-4 w-4 text-sky-400 shrink-0" />
                    <div className="text-left truncate">
                      <span className="font-medium text-foreground">{c.nome}</span>
                      <span className="text-muted-foreground text-[11px] ml-2">({c.cargo})</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground truncate">{c.email}</span>
                </button>
              ))}
            </div>
          )}

          {/* Empresas Encontradas */}
          {empresasFiltradas.length > 0 && (
            <div className="space-y-1">
              <p className="px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                Empresas
              </p>
              {empresasFiltradas.map((e) => (
                <button
                  key={e.id}
                  onClick={() => navegarPara(`/empresas`)}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs text-foreground/90 hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Building2 className="h-4 w-4 text-amber-400 shrink-0" />
                    <span className="font-medium text-foreground truncate">{e.nome}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">{e.segmento}</span>
                </button>
              ))}
            </div>
          )}

          {termo &&
            negociosFiltrados.length === 0 &&
            contatosFiltrados.length === 0 &&
            empresasFiltradas.length === 0 && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Nenhum resultado encontrado para &quot;{termo}&quot;.
              </div>
            )}
        </div>

        {/* Footer do Command Palette */}
        <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="rounded border border-border px-1 font-mono">↑↓</kbd> navegar
            </span>
            <span>
              <kbd className="rounded border border-border px-1 font-mono">↵</kbd> selecionar
            </span>
          </div>
          <span>Acme Cloud Tech (Workspace)</span>
        </div>
      </div>
    </div>
  );
}
