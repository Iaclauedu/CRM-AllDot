'use client';

import * as React from 'react';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DADOS_EMPRESAS,
  DADOS_CONTATOS,
  DADOS_MEMBROS,
  DADOS_ETAPAS,
  DADOS_PRODUTOS,
  type Negocio,
  type Produto,
  type EtapaFunil,
} from '@/lib/mock-data';
import { formatarMoeda } from '@/lib/utils';
import { Package, Plus, Trash2 } from 'lucide-react';

interface ModalNovoNegocioProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSalvar: (novoNegocio: Partial<Negocio>) => void;
  etapas?: EtapaFunil[];
  funilId?: string;
}

export function ModalNovoNegocio({
  open,
  onOpenChange,
  onSalvar,
  etapas = DADOS_ETAPAS,
  funilId = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
}: ModalNovoNegocioProps) {
  const [titulo, setTitulo] = React.useState('');
  const [valorManual, setValorManual] = React.useState('');
  const [empresaId, setEmpresaId] = React.useState(DADOS_EMPRESAS[0]?.id || '');
  const [contatoId, setContatoId] = React.useState(DADOS_CONTATOS[0]?.id || '');
  const [etapaId, setEtapaId] = React.useState(etapas[0]?.id || DADOS_ETAPAS[0]?.id || '');
  const [responsavelId, setResponsavelId] = React.useState(DADOS_MEMBROS[0]?.id || '');
  const [dataFechamento, setDataFechamento] = React.useState('');

  React.useEffect(() => {
    if (etapas && etapas.length > 0) {
      setEtapaId((prev: string) => (etapas.some((e) => e.id === prev) ? prev : etapas[0].id));
    }
  }, [etapas]);

  // Produtos selecionados
  const [produtosSelecionados, setProdutosSelecionados] = React.useState<
    { produto_id: string; nome: string; quantidade: number; valor_unitario: number; subtotal: number }[]
  >([]);

  // Filtrar contatos pela empresa selecionada
  const contatosDaEmpresa = DADOS_CONTATOS.filter((c) => c.empresa_id === empresaId);

  // Calcula total a partir dos produtos ou usa o manual
  const totalProdutos = produtosSelecionados.reduce((acc, p) => acc + p.subtotal, 0);
  const valorFinal = produtosSelecionados.length > 0 ? totalProdutos : parseFloat(valorManual.replace(',', '.')) || 0;

  const handleAdicionarProduto = (prod: Produto) => {
    const jaExiste = produtosSelecionados.find((p) => p.produto_id === prod.id);
    if (jaExiste) {
      setProdutosSelecionados(
        produtosSelecionados.map((p) =>
          p.produto_id === prod.id
            ? { ...p, quantidade: p.quantidade + 1, subtotal: (p.quantidade + 1) * p.valor_unitario }
            : p
        )
      );
    } else {
      setProdutosSelecionados([
        ...produtosSelecionados,
        {
          produto_id: prod.id,
          nome: prod.nome,
          quantidade: 1,
          valor_unitario: prod.valor,
          subtotal: prod.valor,
        },
      ]);
    }
  };

  const handleRemoverProduto = (prodId: string) => {
    setProdutosSelecionados(produtosSelecionados.filter((p) => p.produto_id !== prodId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    const empresa = DADOS_EMPRESAS.find((e) => e.id === empresaId);
    const contato = DADOS_CONTATOS.find((c) => c.id === contatoId);
    const responsavel = DADOS_MEMBROS.find((m) => m.id === responsavelId);

    onSalvar({
      titulo,
      valor: valorFinal,
      moeda: 'BRL',
      funil_id: funilId,
      etapa_id: etapaId,
      empresa_id: empresaId,
      empresa_nome: empresa?.nome || '',
      contato_id: contatoId,
      contato_nome: contato?.nome || '',
      contato_email: contato?.email || '',
      contato_whatsapp: contato?.telefone_whatsapp || '',
      responsavel_id: responsavelId,
      responsavel_nome: responsavel?.nome_completo || '',
      responsavel_avatar: responsavel?.avatar_url || '',
      status: 'aberto',
      data_fechamento_esperada: dataFechamento || new Date(Date.now() + 15 * 86400 * 1000).toISOString().split('T')[0],
      ultima_atividade_em: new Date().toISOString(),
      produtos: produtosSelecionados,
    });

    setTitulo('');
    setValorManual('');
    setProdutosSelecionados([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <form onSubmit={handleSubmit} className="max-h-[85vh] overflow-y-auto pr-1">
        <DialogHeader>
          <DialogTitle>Nova Oportunidade de Negócio</DialogTitle>
          <DialogDescription>
            Crie um novo negócio para acompanhar no funil de vendas e vincule produtos do catálogo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-2">
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">
              Título da Oportunidade *
            </label>
            <Input
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Implantação Software - Acme Corp"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">
                Empresa Cliente *
              </label>
              <select
                value={empresaId}
                onChange={(e) => {
                  setEmpresaId(e.target.value);
                  const primeiroContato = DADOS_CONTATOS.find((c) => c.empresa_id === e.target.value);
                  if (primeiroContato) setContatoId(primeiroContato.id);
                }}
                className="flex h-8 w-full rounded-md border border-input bg-background/50 px-2 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {DADOS_EMPRESAS.map((emp) => (
                  <option key={emp.id} value={emp.id} className="bg-card text-foreground">
                    {emp.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">
                Contato Principal
              </label>
              <select
                value={contatoId}
                onChange={(e) => setContatoId(e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-background/50 px-2 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {contatosDaEmpresa.length > 0 ? (
                  contatosDaEmpresa.map((c) => (
                    <option key={c.id} value={c.id} className="bg-card text-foreground">
                      {c.nome} ({c.cargo})
                    </option>
                  ))
                ) : (
                  <option value="" className="bg-card text-foreground">
                    Nenhum contato cadastrado
                  </option>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">
                Etapa Inicial do Funil
              </label>
              <select
                value={etapaId}
                onChange={(e) => setEtapaId(e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-background/50 px-2 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {etapas.map((et) => (
                  <option key={et.id} value={et.id} className="bg-card text-foreground">
                    {et.nome} ({et.probabilidade_fechamento}%)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">
                Responsável Comercial
              </label>
              <select
                value={responsavelId}
                onChange={(e) => setResponsavelId(e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-background/50 px-2 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {DADOS_MEMBROS.map((m) => (
                  <option key={m.id} value={m.id} className="bg-card text-foreground">
                    {m.nome_completo} ({m.cargo})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Módulo de Produtos Vinculados */}
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-emerald-400" />
                Produtos do Catálogo
              </span>
              <span className="text-[11px] text-muted-foreground">
                Total:{' '}
                <strong className="text-emerald-400 font-mono">
                  {formatarMoeda(valorFinal)}
                </strong>
              </span>
            </div>

            {/* Itens adicionados */}
            {produtosSelecionados.length > 0 && (
              <div className="space-y-1.5 border-b border-border/50 pb-2">
                {produtosSelecionados.map((item) => (
                  <div
                    key={item.produto_id}
                    className="flex items-center justify-between text-xs bg-card/60 p-1.5 rounded border border-border/40"
                  >
                    <span className="truncate text-foreground font-medium">{item.nome}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-[11px] font-mono">
                        {item.quantidade}x {formatarMoeda(item.valor_unitario)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoverProduto(item.produto_id)}
                        className="text-muted-foreground hover:text-red-400 p-0.5"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Botões de Adicionar Produtos */}
            <div className="flex flex-wrap gap-1.5">
              {DADOS_PRODUTOS.map((prod) => (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => handleAdicionarProduto(prod)}
                  className="inline-flex items-center gap-1 rounded border border-border bg-card px-2 py-1 text-[11px] text-muted-foreground hover:border-emerald-500/50 hover:text-foreground transition-colors"
                >
                  <Plus className="h-3 w-3 text-emerald-400" />
                  <span>{prod.nome}</span>
                  <span className="text-emerald-400 font-mono text-[10px]">
                    ({formatarMoeda(prod.valor)})
                  </span>
                </button>
              ))}
            </div>

            {produtosSelecionados.length === 0 && (
              <div className="pt-1">
                <label className="text-[11px] text-muted-foreground mb-1 block">
                  Ou digite o valor manual do negócio (R$):
                </label>
                <Input
                  value={valorManual}
                  onChange={(e) => setValorManual(e.target.value)}
                  placeholder="Ex: 5000.00"
                  className="h-7 text-xs font-mono"
                />
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">
              Previsão de Fechamento
            </label>
            <Input
              type="date"
              value={dataFechamento}
              onChange={(e) => setDataFechamento(e.target.value)}
              className="h-8"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="submit">Criar Negócio</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
