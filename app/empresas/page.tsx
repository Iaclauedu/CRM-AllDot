'use client';

import * as React from 'react';
import {
  Building2,
  User,
  Plus,
  Search,
  Briefcase,
  Pencil,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { CommandPalette } from '@/components/layout/command-palette';
import {
  ModalCriarEmpresa,
  formatarCpfCnpj,
} from '@/components/empresas/modal-criar-empresa';
import {
  DADOS_EMPRESAS,
  DADOS_MEMBROS,
  type Empresa,
  type Membro,
} from '@/lib/mock-data';
import {
  buscarEmpresasDoBanco,
  criarEmpresaNoBanco,
  atualizarEmpresaNoBanco,
  buscarMembrosDoBanco,
} from '@/lib/supabase/service';
import { formatarData } from '@/lib/utils';

export default function PaginaEmpresas() {
  const [empresas, setEmpresas] = React.useState<Empresa[]>(DADOS_EMPRESAS);
  const [membros, setMembros] = React.useState<Membro[]>(DADOS_MEMBROS);
  const [busca, setBusca] = React.useState('');
  const [modalAberta, setModalAberta] = React.useState(false);
  const [empresaEditando, setEmpresaEditando] = React.useState<Empresa | null>(null);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  // Carrega empresas e membros reais do Supabase
  React.useEffect(() => {
    let ativo = true;
    buscarEmpresasDoBanco().then((lista) => {
      if (ativo && lista && lista.length > 0) {
        setEmpresas(lista);
      }
    });
    buscarMembrosDoBanco().then((lista) => {
      if (ativo && lista && lista.length > 0) {
        setMembros(lista);
      }
    });
    return () => {
      ativo = false;
    };
  }, []);

  const exibirFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  };

  const empresasFiltradas = empresas.filter((e) => {
    const termo = busca.toLowerCase();
    return (
      e.nome.toLowerCase().includes(termo) ||
      (e.razao_social && e.razao_social.toLowerCase().includes(termo)) ||
      (e.nome_fantasia && e.nome_fantasia.toLowerCase().includes(termo)) ||
      e.cnpj.toLowerCase().includes(termo) ||
      (e.cpf_cnpj && e.cpf_cnpj.includes(termo)) ||
      (e.contato_principal && e.contato_principal.toLowerCase().includes(termo)) ||
      (e.origem_lead && e.origem_lead.toLowerCase().includes(termo)) ||
      e.segmento.toLowerCase().includes(termo)
    );
  });

  const abrirNovoCadastro = () => {
    setEmpresaEditando(null);
    setModalAberta(true);
  };

  const abrirEdicaoEmpresa = (emp: Empresa) => {
    setEmpresaEditando(emp);
    setModalAberta(true);
  };

  const handleSalvarEmpresa = async (dados: Partial<Empresa>) => {
    if (empresaEditando) {
      await atualizarEmpresaNoBanco(empresaEditando.id, dados);
      const atualizada: Empresa = {
        ...empresaEditando,
        ...dados,
        nome: dados.razao_social || dados.nome || empresaEditando.nome,
        cnpj: dados.cnpj || empresaEditando.cnpj,
      };
      setEmpresas((prev) =>
        prev.map((item) => (item.id === atualizada.id ? atualizada : item))
      );
      exibirFeedback(`Cadastro "${atualizada.nome}" atualizado no Supabase!`);
    } else {
      const empresaCriada = await criarEmpresaNoBanco(dados);
      setEmpresas((prev) => [empresaCriada, ...prev]);
      exibirFeedback(`Cadastro "${empresaCriada.nome}" salvo com sucesso no Supabase!`);
    }
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
                Empresas & Clientes (PJ / PF)
              </h1>
              <Badge variant="secondary" className="font-mono">
                {empresas.length}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cadastro de Pessoa Jurídica (CNPJ com ReceitaWS) e Pessoa Física (CPF) sincronizado no Supabase.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Filtrar por razão social, CPF/CNPJ, contato..."
                className="pl-8"
              />
            </div>
            <Button onClick={abrirNovoCadastro} size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <span>Novo Cliente / Empresa</span>
            </Button>
          </div>
        </div>

        {feedback && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-400 shadow-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="font-medium">{feedback}</span>
          </div>
        )}

        {/* Tabela de Alta Densidade */}
        <div className="flex-1 overflow-auto p-6">
          <div className="rounded-lg border border-border bg-card/60 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/30 text-muted-foreground select-none">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Tipo</th>
                  <th className="py-2.5 px-4 font-medium">Razão Social / Nome Completo</th>
                  <th className="py-2.5 px-4 font-medium">CPF / CNPJ</th>
                  <th className="py-2.5 px-4 font-medium">Contato Principal</th>
                  <th className="py-2.5 px-4 font-medium">WhatsApp & E-mail</th>
                  <th className="py-2.5 px-4 font-medium">Origem do Lead</th>
                  <th className="py-2.5 px-4 font-medium">Responsável</th>
                  <th className="py-2.5 px-4 font-medium">Negócios</th>
                  <th className="py-2.5 px-4 font-medium">Criado em</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {empresasFiltradas.length > 0 ? (
                  empresasFiltradas.map((emp) => {
                    const responsavel = membros.find(
                      (m) => m.id === emp.responsavel_id
                    );
                    const digitos = (emp.cpf_cnpj || emp.cnpj || '').replace(/\D/g, '');
                    const tipo: 'PF' | 'PJ' =
                      emp.tipo_cliente || (digitos.length === 11 ? 'PF' : 'PJ');
                    const docFormatado = digitos
                      ? formatarCpfCnpj(digitos, tipo)
                      : emp.cnpj || '-';

                    return (
                      <tr
                        key={emp.id}
                        className="hover:bg-accent/40 transition-colors group"
                      >
                        <td className="py-2.5 px-4">
                          {tipo === 'PF' ? (
                            <Badge
                              variant="info"
                              className="inline-flex items-center gap-1 text-[10px]"
                            >
                              <User className="h-2.5 w-2.5" />
                              <span>PF</span>
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="inline-flex items-center gap-1 text-[10px]"
                            >
                              <Building2 className="h-2.5 w-2.5" />
                              <span>PJ</span>
                            </Badge>
                          )}
                        </td>

                        <td className="py-2.5 px-4 font-medium text-foreground">
                          <div className="font-semibold text-foreground">
                            {emp.razao_social || emp.nome}
                          </div>
                          {tipo === 'PJ' &&
                            emp.nome_fantasia &&
                            emp.nome_fantasia !== (emp.razao_social || emp.nome) && (
                              <div className="text-[11px] text-muted-foreground">
                                Fantasia: {emp.nome_fantasia}
                              </div>
                            )}
                          {emp.endereco && (
                            <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground line-clamp-1 max-w-xs">
                              <MapPin className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate">{emp.endereco}</span>
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                          {docFormatado}
                        </td>

                        <td className="py-2.5 px-4 text-foreground">
                          {emp.contato_principal || (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        <td className="py-2.5 px-4">
                          <div className="space-y-0.5">
                            {emp.whatsapp_principal ? (
                              <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                                <Phone className="h-3 w-3 shrink-0" />
                                <span>{emp.whatsapp_principal}</span>
                              </div>
                            ) : null}
                            {emp.email_principal ? (
                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Mail className="h-3 w-3 shrink-0" />
                                <span className="truncate max-w-[180px]">
                                  {emp.email_principal}
                                </span>
                              </div>
                            ) : null}
                            {!emp.whatsapp_principal && !emp.email_principal && (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                        </td>

                        <td className="py-2.5 px-4">
                          <span className="rounded-md bg-secondary/80 px-2 py-0.5 text-[11px] text-secondary-foreground border border-border">
                            {emp.origem_lead || emp.segmento || 'Prospecção Ativa'}
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
                          <button
                            type="button"
                            onClick={() => abrirEdicaoEmpresa(emp)}
                            title="Editar cadastro"
                            className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={10}
                      className="py-12 text-center text-xs text-muted-foreground"
                    >
                      Nenhum cliente ou empresa encontrado com os filtros atuais.
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
          empresasExistentes={empresas}
          empresaEditando={empresaEditando}
        />
      </div>
    </div>
  );
}
