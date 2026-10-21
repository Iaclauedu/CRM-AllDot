'use client';

import * as React from 'react';
import {
  Building2,
  Plus,
  Search,
  ExternalLink,
  Briefcase,
  Calendar,
  MoreVertical,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { CommandPalette } from '@/components/layout/command-palette';
import { ModalCriarEmpresa } from '@/components/empresas/modal-criar-empresa';
import {
  DADOS_EMPRESAS,
  DADOS_MEMBROS,
  type Empresa,
} from '@/lib/mock-data';
import { buscarEmpresasDoBanco, criarEmpresaNoBanco } from '@/lib/supabase/service';
import { formatarData } from '@/lib/utils';

export default function PaginaEmpresas() {
  const [empresas, setEmpresas] = React.useState<Empresa[]>(DADOS_EMPRESAS);
  const [busca, setBusca] = React.useState('');
  const [modalAberta, setModalAberta] = React.useState(false);

  // Carrega empresas reais do Supabase
  React.useEffect(() => {
    let ativo = true;
    buscarEmpresasDoBanco().then((lista) => {
      if (ativo && lista && lista.length > 0) {
        setEmpresas(lista);
      }
    });
    return () => {
      ativo = false;
    };
  }, []);

  const empresasFiltradas = empresas.filter(
    (e) =>
      e.nome.toLowerCase().includes(busca.toLowerCase()) ||
      e.cnpj.includes(busca) ||
      e.segmento.toLowerCase().includes(busca.toLowerCase())
  );

  const handleSalvarEmpresa = async (nova: Partial<Empresa>) => {
    const empresaCriada = await criarEmpresaNoBanco(nova);
    setEmpresas([empresaCriada, ...empresas]);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onAbrirNovoNegocio={() => {}} />
        <CommandPalette />

        {/* Header do Módulo */}
        <div className="flex items-center justify-between border-b border-border bg-card/40 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-amber-400" />
              <h1 className="text-base font-semibold text-foreground tracking-tight">
                Empresas & Contas B2B
              </h1>
              <Badge variant="secondary" className="font-mono">
                {empresas.length}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Carteira de organizações e contas corporativas da sua operação comercial.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Filtrar por nome, CNPJ ou segmento..."
                className="pl-8"
              />
            </div>
            <Button
              onClick={() => setModalAberta(true)}
              size="sm"
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Nova Empresa</span>
            </Button>
          </div>
        </div>

        {/* Tabela de Alta Densidade */}
        <div className="flex-1 overflow-auto p-6">
          <div className="rounded-lg border border-border bg-card/60 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/30 text-muted-foreground select-none">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Razão Social / Nome</th>
                  <th className="py-2.5 px-4 font-medium">CNPJ</th>
                  <th className="py-2.5 px-4 font-medium">Domínio</th>
                  <th className="py-2.5 px-4 font-medium">Segmento</th>
                  <th className="py-2.5 px-4 font-medium">Responsável</th>
                  <th className="py-2.5 px-4 font-medium">Negócios</th>
                  <th className="py-2.5 px-4 font-medium">Criado em</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {empresasFiltradas.length > 0 ? (
                  empresasFiltradas.map((emp) => {
                    const responsavel = DADOS_MEMBROS.find(
                      (m) => m.id === emp.responsavel_id
                    );

                    return (
                      <tr
                        key={emp.id}
                        className="hover:bg-accent/40 transition-colors group"
                      >
                        <td className="py-2.5 px-4 font-medium text-foreground">
                          {emp.nome}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-muted-foreground">
                          {emp.cnpj}
                        </td>
                        <td className="py-2.5 px-4">
                          {emp.dominio ? (
                            <a
                              href={`https://${emp.dominio}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-sky-400 hover:underline text-[11px]"
                            >
                              <span>{emp.dominio}</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="rounded-md bg-secondary/80 px-2 py-0.5 text-[11px] text-secondary-foreground border border-border">
                            {emp.segmento}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          {responsavel && (
                            <div className="flex items-center gap-2">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={responsavel.avatar_url}
                                alt={responsavel.nome_completo}
                                className="h-5 w-5 rounded-full object-cover border border-border"
                              />
                              <span className="text-foreground">
                                {responsavel.nome_completo}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="inline-flex items-center gap-1 font-mono font-medium text-foreground">
                            <Briefcase className="h-3 w-3 text-muted-foreground" />
                            {emp.total_negocios || 0}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground text-[11px]">
                          {formatarData(emp.criado_em)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-12 text-center text-xs text-muted-foreground"
                    >
                      Nenhuma empresa encontrada com os filtros atuais.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <ModalCriarEmpresa
          open={modalAberta}
          onOpenChange={setModalAberta}
          onSalvar={handleSalvarEmpresa}
        />
      </div>
    </div>
  );
}
