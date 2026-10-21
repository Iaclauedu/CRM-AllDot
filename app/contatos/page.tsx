'use client';

import * as React from 'react';
import {
  Users,
  Plus,
  Search,
  MessageCircle,
  Mail,
  Copy,
  Check,
  Building2,
  MoreVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { CommandPalette } from '@/components/layout/command-palette';
import { ModalCriarContato } from '@/components/contatos/modal-criar-contato';
import {
  DADOS_CONTATOS,
  DADOS_MEMBROS,
  type Contato,
} from '@/lib/mock-data';
import { buscarContatosDoBanco, criarContatoNoBanco } from '@/lib/supabase/service';
import { formatarData, formatarTelefoneWhatsApp } from '@/lib/utils';

export default function PaginaContatos() {
  const [contatos, setContatos] = React.useState<Contato[]>(DADOS_CONTATOS);
  const [busca, setBusca] = React.useState('');
  const [modalAberta, setModalAberta] = React.useState(false);
  const [copiadoId, setCopiadoId] = React.useState<string | null>(null);

  // Carrega contatos reais do Supabase
  React.useEffect(() => {
    let ativo = true;
    buscarContatosDoBanco().then((lista) => {
      if (ativo && lista && lista.length > 0) {
        setContatos(lista);
      }
    });
    return () => {
      ativo = false;
    };
  }, []);

  const contatosFiltrados = contatos.filter(
    (c) =>
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.email.toLowerCase().includes(busca.toLowerCase()) ||
      (c.cargo && c.cargo.toLowerCase().includes(busca.toLowerCase())) ||
      (c.empresa_nome && c.empresa_nome.toLowerCase().includes(busca.toLowerCase()))
  );

  const copiarEmail = (email: string, id: string) => {
    navigator.clipboard.writeText(email);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  const handleSalvarContato = async (novo: Partial<Contato>) => {
    const contatoCriado = await criarContatoNoBanco(novo);
    setContatos([contatoCriado, ...contatos]);
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
              <Users className="h-5 w-5 text-sky-400" />
              <h1 className="text-base font-semibold text-foreground tracking-tight">
                Contatos & Pessoas Chave
              </h1>
              <Badge variant="secondary" className="font-mono">
                {contatos.length}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Decisores, influenciadores e pontos de contato nas empresas clientes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Filtrar por nome, e-mail, cargo..."
                className="pl-8"
              />
            </div>
            <Button
              onClick={() => setModalAberta(true)}
              size="sm"
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Novo Contato</span>
            </Button>
          </div>
        </div>

        {/* Tabela de Contatos */}
        <div className="flex-1 overflow-auto p-6">
          <div className="rounded-lg border border-border bg-card/60 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/30 text-muted-foreground select-none">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Nome do Contato</th>
                  <th className="py-2.5 px-4 font-medium">Empresa Vinculada</th>
                  <th className="py-2.5 px-4 font-medium">Cargo</th>
                  <th className="py-2.5 px-4 font-medium">E-mail</th>
                  <th className="py-2.5 px-4 font-medium">WhatsApp / Telefone</th>
                  <th className="py-2.5 px-4 font-medium">Responsável</th>
                  <th className="py-2.5 px-4 font-medium">Adicionado em</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {contatosFiltrados.length > 0 ? (
                  contatosFiltrados.map((contato) => {
                    const responsavel = DADOS_MEMBROS.find(
                      (m) => m.id === contato.responsavel_id
                    );
                    const whatsappNumeroLimpo = contato.telefone_whatsapp.replace(/\D/g, '');

                    return (
                      <tr
                        key={contato.id}
                        className="hover:bg-accent/40 transition-colors group"
                      >
                        <td className="py-2.5 px-4 font-medium text-foreground">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-semibold text-zinc-300 border border-zinc-700 shrink-0">
                              {contato.nome.charAt(0)}
                            </div>
                            <span className="font-medium text-foreground">
                              {contato.nome}
                            </span>
                          </div>
                        </td>

                        <td className="py-2.5 px-4 text-foreground/90">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">{contato.empresa_nome || '-'}</span>
                          </div>
                        </td>

                        <td className="py-2.5 px-4 text-muted-foreground">
                          {contato.cargo || '-'}
                        </td>

                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <a
                              href={`mailto:${contato.email}`}
                              className="text-foreground hover:text-sky-400 transition-colors truncate"
                            >
                              {contato.email}
                            </a>
                            <button
                              onClick={() => copiarEmail(contato.email, contato.id)}
                              className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                              title="Copiar e-mail"
                            >
                              {copiadoId === contato.id ? (
                                <Check className="h-3 w-3 text-emerald-400" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </td>

                        <td className="py-2.5 px-4">
                          {contato.telefone_whatsapp ? (
                            <a
                              href={`https://wa.me/${whatsappNumeroLimpo}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-900/60 bg-emerald-950/30 px-2 py-0.5 text-[11px] font-medium text-emerald-400 hover:bg-emerald-950/60 transition-colors shadow-sm"
                              title="Abrir WhatsApp Web"
                            >
                              <MessageCircle className="h-3 w-3" />
                              <span>{formatarTelefoneWhatsApp(contato.telefone_whatsapp)}</span>
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
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
                              <span className="text-foreground text-[11px]">
                                {responsavel.nome_completo}
                              </span>
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-4 text-muted-foreground text-[11px]">
                          {formatarData(contato.criado_em)}
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
                      Nenhum contato encontrado com os termos pesquisados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <ModalCriarContato
          open={modalAberta}
          onOpenChange={setModalAberta}
          onSalvar={handleSalvarContato}
        />
      </div>
    </div>
  );
}
