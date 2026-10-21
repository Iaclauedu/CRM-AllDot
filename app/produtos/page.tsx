'use client';

import * as React from 'react';
import {
  Package,
  Plus,
  Search,
  DollarSign,
  Calendar,
  CheckCircle2,
  MoreVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { CommandPalette } from '@/components/layout/command-palette';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { DADOS_PRODUTOS, type Produto } from '@/lib/mock-data';
import { buscarProdutosDoBanco, criarProdutoNoBanco } from '@/lib/supabase/service';
import { formatarMoeda } from '@/lib/utils';

export default function PaginaProdutos() {
  const [produtos, setProdutos] = React.useState<Produto[]>(DADOS_PRODUTOS);
  const [busca, setBusca] = React.useState('');
  const [modalAberta, setModalAberta] = React.useState(false);

  // Carrega produtos reais do Supabase
  React.useEffect(() => {
    let ativo = true;
    buscarProdutosDoBanco().then((lista) => {
      if (ativo && lista && lista.length > 0) {
        setProdutos(lista);
      }
    });
    return () => {
      ativo = false;
    };
  }, []);

  // Form states
  const [nome, setNome] = React.useState('');
  const [descricao, setDescricao] = React.useState('');
  const [sku, setSku] = React.useState('');
  const [valor, setValor] = React.useState('');
  const [tipoCobranca, setTipoCobranca] = React.useState<'mensal' | 'a_vista' | 'anual'>('mensal');

  const produtosFiltrados = produtos.filter(
    (p) =>
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (p.codigo_sku && p.codigo_sku.toLowerCase().includes(busca.toLowerCase())) ||
      (p.descricao && p.descricao.toLowerCase().includes(busca.toLowerCase()))
  );

  const handleSalvarProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !valor) return;

    const valorNumerico = parseFloat(valor.replace(',', '.'));
    const novoProduto = await criarProdutoNoBanco({
      nome,
      descricao,
      codigo_sku: sku || `SKU-${Math.floor(Math.random() * 9000 + 1000)}`,
      valor: isNaN(valorNumerico) ? 0 : valorNumerico,
      tipo_cobranca: tipoCobranca,
      ativo: true,
    });

    setProdutos([novoProduto, ...produtos]);
    setNome('');
    setDescricao('');
    setSku('');
    setValor('');
    setTipoCobranca('mensal');
    setModalAberta(false);
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
              <Package className="h-5 w-5 text-emerald-400" />
              <h1 className="text-base font-semibold text-foreground tracking-tight">
                Catálogo de Produtos & Serviços
              </h1>
              <Badge variant="secondary" className="font-mono">
                {produtos.length}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Itens, planos e serviços para composição de propostas e cálculo automático de valor dos negócios.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou SKU..."
                className="pl-8"
              />
            </div>
            <Button
              onClick={() => setModalAberta(true)}
              size="sm"
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Novo Produto</span>
            </Button>
          </div>
        </div>

        {/* Tabela de Produtos */}
        <div className="flex-1 overflow-auto p-6">
          <div className="rounded-lg border border-border bg-card/60 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/30 text-muted-foreground select-none">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Nome do Produto / Plano</th>
                  <th className="py-2.5 px-4 font-medium">Código SKU</th>
                  <th className="py-2.5 px-4 font-medium">Tipo de Cobrança</th>
                  <th className="py-2.5 px-4 font-medium">Valor Unitário</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {produtosFiltrados.length > 0 ? (
                  produtosFiltrados.map((prod) => (
                    <tr
                      key={prod.id}
                      className="hover:bg-accent/40 transition-colors group"
                    >
                      <td className="py-2.5 px-4 font-medium text-foreground">
                        <div>
                          <div className="font-semibold text-foreground">{prod.nome}</div>
                          {prod.descricao && (
                            <div className="text-[11px] text-muted-foreground line-clamp-1 max-w-md">
                              {prod.descricao}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-4 font-mono text-[11px] text-muted-foreground">
                        {prod.codigo_sku || '-'}
                      </td>

                      <td className="py-2.5 px-4">
                        {prod.tipo_cobranca === 'mensal' ? (
                          <Badge variant="info" className="capitalize">
                            Recorrência Mensal (MRR)
                          </Badge>
                        ) : prod.tipo_cobranca === 'anual' ? (
                          <Badge variant="warning" className="capitalize">
                            Anual Recorrente
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="capitalize">
                            Pagamento À Vista
                          </Badge>
                        )}
                      </td>

                      <td className="py-2.5 px-4 font-semibold text-emerald-400 font-mono">
                        {formatarMoeda(prod.valor)}
                      </td>

                      <td className="py-2.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Ativo no Catálogo
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <button className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-xs text-muted-foreground"
                    >
                      Nenhum produto cadastrado no catálogo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de Criação de Produto */}
        <Dialog open={modalAberta} onOpenChange={setModalAberta}>
          <form onSubmit={handleSalvarProduto}>
            <DialogHeader>
              <DialogTitle>Novo Produto ou Serviço</DialogTitle>
              <DialogDescription>
                Cadastre um item no catálogo para ser adicionado aos negócios e propostas do funil.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-2">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">
                  Nome do Produto / Plano *
                </label>
                <Input
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Assinatura Mensal Pro"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">
                    Valor (R$) *
                  </label>
                  <Input
                    required
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    placeholder="1490.00"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">
                    Tipo de Cobrança *
                  </label>
                  <select
                    value={tipoCobranca}
                    onChange={(e) => setTipoCobranca(e.target.value as any)}
                    className="flex h-8 w-full rounded-md border border-input bg-background/50 px-2 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="mensal" className="bg-card">Mensal (MRR)</option>
                    <option value="a_vista" className="bg-card">À Vista (Setup / Consultoria)</option>
                    <option value="anual" className="bg-card">Anual</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">
                    Código SKU
                  </label>
                  <Input
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="SKU-PRO-01"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">
                    Descrição Curta
                  </label>
                  <Input
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Detalhes ou escopo do produto"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalAberta(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">Cadastrar Produto</Button>
            </DialogFooter>
          </form>
        </Dialog>
      </div>
    </div>
  );
}
