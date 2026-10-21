'use client';

import * as React from 'react';
import {
  DollarSign,
  Calendar,
  Layers,
  User,
  Package,
  Edit2,
  Check,
  Building2,
  Tag,
  Plus,
  Trash2,
  Loader2,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DADOS_ETAPAS,
  DADOS_MEMBROS,
  DADOS_PRODUTOS,
  type Negocio,
  type Produto,
  type EtapaFunil,
} from '@/lib/mock-data';
import {
  buscarProdutosDoBanco,
  adicionarProdutoAoNegocio,
  removerProdutoDoNegocio,
} from '@/lib/supabase/service';
import { formatarMoeda, formatarData } from '@/lib/utils';

interface ColunaPropriedadesProps {
  negocio: Negocio;
  onAtualizarNegocio: (atualizado: Partial<Negocio>) => void;
  etapas?: EtapaFunil[];
}

export function ColunaPropriedades({
  negocio,
  onAtualizarNegocio,
  etapas = DADOS_ETAPAS,
}: ColunaPropriedadesProps) {
  // Inline edit states
  const [editandoValor, setEditandoValor] = React.useState(false);
  const [valorTemp, setValorTemp] = React.useState(negocio.valor.toString());

  const [origemLead, setOrigemLead] = React.useState('Outbound SDR');
  const [editandoOrigem, setEditandoOrigem] = React.useState(false);

  const [previsaoFechamento, setPrevisaoFechamento] = React.useState(
    negocio.data_fechamento_esperada || ''
  );

  // Catálogo de produtos & formulário de adicionar
  const [catalogoProdutos, setCatalogoProdutos] = React.useState<Produto[]>(DADOS_PRODUTOS);
  const [adicionandoProduto, setAdicionandoProduto] = React.useState(false);
  const [produtoSelecionadoId, setProdutoSelecionadoId] = React.useState<string>(
    DADOS_PRODUTOS[0]?.id || ''
  );
  const [quantidade, setQuantidade] = React.useState<number>(1);
  const [salvandoAcao, setSalvandoAcao] = React.useState(false);
  const [removendoId, setRemovendoId] = React.useState<string | null>(null);

  // Sincroniza valorTemp caso o negócio mude externamente
  React.useEffect(() => {
    setValorTemp(negocio.valor.toString());
  }, [negocio.valor]);

  // Carrega catálogo de produtos do Supabase
  React.useEffect(() => {
    buscarProdutosDoBanco().then((prods) => {
      if (prods && prods.length > 0) {
        setCatalogoProdutos(prods);
        setProdutoSelecionadoId((prev) => prev || prods[0].id);
      }
    });
  }, []);

  const etapaAtual = DADOS_ETAPAS.find((e) => e.id === negocio.etapa_id);
  const responsavelAtual = DADOS_MEMBROS.find(
    (m) => m.id === negocio.responsavel_id
  );

  const salvarValor = () => {
    const valNumerico = parseFloat(valorTemp.replace(',', '.'));
    if (!isNaN(valNumerico)) {
      onAtualizarNegocio({ valor: valNumerico });
    }
    setEditandoValor(false);
  };

  const handleTrocarEtapa = (novaEtapaId: string) => {
    onAtualizarNegocio({ etapa_id: novaEtapaId });
  };

  const handleTrocarResponsavel = (novoRespId: string) => {
    const resp = DADOS_MEMBROS.find((m) => m.id === novoRespId);
    if (resp) {
      onAtualizarNegocio({
        responsavel_id: resp.id,
        responsavel_nome: resp.nome_completo,
        responsavel_avatar: resp.avatar_url,
      });
    }
  };

  // Adicionar produto ao negócio (funciona em QUALQUER etapa do funil)
  const handleConfirmarAdicionarProduto = async () => {
    const prod = catalogoProdutos.find((p) => p.id === produtoSelecionadoId);
    if (!prod || quantidade <= 0) return;

    setSalvandoAcao(true);
    try {
      // Salva no Supabase
      await adicionarProdutoAoNegocio(
        negocio.id,
        prod.id,
        prod.nome,
        quantidade,
        prod.valor
      );

      // Atualiza estado local do negócio
      const produtosAtuais = negocio.produtos ? [...negocio.produtos] : [];
      const indexExistente = produtosAtuais.findIndex((p) => p.produto_id === prod.id);

      if (indexExistente >= 0) {
        const itemExistente = produtosAtuais[indexExistente];
        const novaQtd = Number(itemExistente.quantidade) + Number(quantidade);
        produtosAtuais[indexExistente] = {
          ...itemExistente,
          quantidade: novaQtd,
          subtotal: novaQtd * itemExistente.valor_unitario,
        };
      } else {
        produtosAtuais.push({
          produto_id: prod.id,
          nome: prod.nome,
          quantidade: Number(quantidade),
          valor_unitario: prod.valor,
          subtotal: Number(quantidade) * prod.valor,
        });
      }

      const novoValorTotal = produtosAtuais.reduce(
        (acc, p) => acc + (p.subtotal || p.quantidade * p.valor_unitario),
        0
      );

      onAtualizarNegocio({
        produtos: produtosAtuais,
        valor: novoValorTotal,
      });

      setAdicionandoProduto(false);
      setQuantidade(1);
    } catch (err) {
      console.error('Erro ao adicionar produto:', err);
    } finally {
      setSalvandoAcao(false);
    }
  };

  // Remover produto do negócio (funciona em QUALQUER etapa do funil)
  const handleRemoverProduto = async (produtoId: string) => {
    setRemovendoId(produtoId);
    try {
      await removerProdutoDoNegocio(negocio.id, produtoId);

      const novaLista = (negocio.produtos || []).filter(
        (p) => p.produto_id !== produtoId
      );
      const novoValorTotal = novaLista.reduce(
        (acc, p) => acc + (p.subtotal || p.quantidade * p.valor_unitario),
        0
      );

      onAtualizarNegocio({
        produtos: novaLista,
        valor: novoValorTotal,
      });
    } catch (err) {
      console.error('Erro ao remover produto:', err);
    } finally {
      setRemovendoId(null);
    }
  };

  const produtoSelecionado = catalogoProdutos.find((p) => p.id === produtoSelecionadoId);
  const subtotalPrevia = (produtoSelecionado?.valor || 0) * (quantidade || 1);

  return (
    <div className="space-y-5 text-xs text-foreground p-1 select-none">
      {/* Bloco de Valor e Status */}
      <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3">
        <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider block">
          Valor da Oportunidade
        </span>

        {editandoValor ? (
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              value={valorTemp}
              onChange={(e) => setValorTemp(e.target.value)}
              onBlur={salvarValor}
              onKeyDown={(e) => e.key === 'Enter' && salvarValor()}
              className="h-8 text-sm font-bold font-mono"
            />
            <Button size="iconSm" onClick={salvarValor} variant="success">
              <Check className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div
            onClick={() => {
              setValorTemp(negocio.valor.toString());
              setEditandoValor(true);
            }}
            className="group flex items-center justify-between cursor-pointer rounded-lg p-1.5 -m-1.5 hover:bg-accent/40 transition-colors"
            title="Clique para editar o valor manual (ou gerencie os produtos abaixo)"
          >
            <span className="text-xl font-bold font-mono text-emerald-400">
              {formatarMoeda(negocio.valor)}
            </span>
            <Edit2 className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px]">
          <span className="text-muted-foreground">Status do Negócio:</span>
          <Badge
            variant={
              negocio.status === 'ganho'
                ? 'success'
                : negocio.status === 'perdido'
                ? 'destructive'
                : 'info'
            }
            className="capitalize"
          >
            {negocio.status}
          </Badge>
        </div>
      </div>

      {/* Propriedades Principais com Edição Inline */}
      <div className="space-y-3.5">
        <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Propriedades Gerais
        </h4>

        {/* Etapa do Pipeline */}
        <div>
          <label className="text-muted-foreground text-[11px] block mb-1">
            Etapa do Pipeline
          </label>
          <select
            value={negocio.etapa_id}
            onChange={(e) => handleTrocarEtapa(e.target.value)}
            className="flex h-8 w-full rounded-md border border-input bg-card/60 px-2 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {etapas.map((et) => (
              <option key={et.id} value={et.id} className="bg-card">
                {et.nome} ({et.probabilidade_fechamento}%)
              </option>
            ))}
          </select>
        </div>

        {/* Responsável Comercial */}
        <div>
          <label className="text-muted-foreground text-[11px] block mb-1">
            Vendedor Responsável
          </label>
          <select
            value={negocio.responsavel_id}
            onChange={(e) => handleTrocarResponsavel(e.target.value)}
            className="flex h-8 w-full rounded-md border border-input bg-card/60 px-2 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {DADOS_MEMBROS.map((m) => (
              <option key={m.id} value={m.id} className="bg-card">
                {m.nome_completo} ({m.cargo})
              </option>
            ))}
          </select>
        </div>

        {/* Data Prevista de Fechamento */}
        <div>
          <label className="text-muted-foreground text-[11px] block mb-1">
            Previsão de Fechamento
          </label>
          <Input
            type="date"
            value={previsaoFechamento}
            onChange={(e) => {
              setPrevisaoFechamento(e.target.value);
              onAtualizarNegocio({ data_fechamento_esperada: e.target.value });
            }}
            className="h-8 font-mono text-[11px]"
          />
        </div>

        {/* Campo Personalizado: Origem do Lead (Edição inline) */}
        <div>
          <label className="text-muted-foreground text-[11px] block mb-1">
            Origem do Lead (Campo Customizado)
          </label>
          <select
            value={origemLead}
            onChange={(e) => setOrigemLead(e.target.value)}
            className="flex h-8 w-full rounded-md border border-input bg-card/60 px-2 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="Outbound SDR" className="bg-card">Outbound SDR</option>
            <option value="Inbound Ads" className="bg-card">Inbound Ads</option>
            <option value="Indicação" className="bg-card">Indicação</option>
            <option value="LinkedIn Direct" className="bg-card">LinkedIn Direct</option>
          </select>
        </div>
      </div>

      {/* Produtos Vinculados ao Negócio */}
      <div className="space-y-3 pt-3 border-t border-border/60">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-emerald-400" />
            Produtos / Itens ({negocio.produtos?.length || 0})
          </h4>

          {/* Botão Adicionar Produto (Livre em qualquer etapa) */}
          {!adicionandoProduto && (
            <button
              onClick={() => setAdicionandoProduto(true)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium bg-[#E42358]/10 text-[#E42358] hover:bg-[#E42358]/20 transition-colors"
              title="Adicionar produto ou serviço a este negócio"
            >
              <Plus className="h-3 w-3" />
              Adicionar
            </button>
          )}
        </div>

        {/* Formulário Inline para Adicionar Produto */}
        {adicionandoProduto && (
          <div className="rounded-xl border border-[#E42358]/30 bg-[#E42358]/5 p-3 space-y-3 animate-in fade-in-0 duration-200">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground text-xs flex items-center gap-1">
                <Plus className="h-3.5 w-3.5 text-[#E42358]" />
                Adicionar Produto ao Negócio
              </span>
              <button
                onClick={() => setAdicionandoProduto(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-muted-foreground text-[10px] block mb-0.5">
                  Item / Produto
                </label>
                <select
                  value={produtoSelecionadoId}
                  onChange={(e) => setProdutoSelecionadoId(e.target.value)}
                  className="flex h-8 w-full rounded-md border border-input bg-card px-2 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {catalogoProdutos.map((prod) => (
                    <option key={prod.id} value={prod.id} className="bg-card">
                      {prod.nome} — {formatarMoeda(prod.valor)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-muted-foreground text-[10px] block mb-0.5">
                    Quantidade
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={quantidade}
                    onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-muted-foreground text-[10px] block mb-0.5">
                    Subtotal Estimado
                  </label>
                  <div className="h-8 flex items-center font-mono font-bold text-xs text-emerald-400">
                    {formatarMoeda(subtotalPrevia)}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
              <button
                type="button"
                onClick={() => setAdicionandoProduto(false)}
                className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
              <Button
                size="sm"
                onClick={handleConfirmarAdicionarProduto}
                disabled={salvandoAcao}
                className="bg-[#E42358] hover:bg-[#c91848] text-white text-xs h-7 px-3"
              >
                {salvandoAcao ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Adicionar
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Lista de Produtos Vinculados */}
        {negocio.produtos && negocio.produtos.length > 0 ? (
          <div className="space-y-2">
            {negocio.produtos.map((item) => (
              <div
                key={item.produto_id}
                className="group rounded-lg border border-border/60 bg-muted/20 p-2.5 space-y-1.5 transition-colors hover:border-border"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-foreground truncate" title={item.nome}>
                    {item.nome}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-mono text-emerald-400 font-semibold text-xs">
                      {formatarMoeda(item.subtotal || item.quantidade * item.valor_unitario)}
                    </span>
                    <button
                      onClick={() => handleRemoverProduto(item.produto_id)}
                      disabled={removendoId === item.produto_id}
                      className="p-1 rounded text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                      title="Excluir este produto do negócio"
                    >
                      {removendoId === item.produto_id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-500" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                  <span>Qtd: {item.quantidade}</span>
                  <span>Unit: {formatarMoeda(item.valor_unitario)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border/60 p-3 text-center text-muted-foreground text-[11px]">
            Nenhum produto cadastrado neste negócio.
          </div>
        )}
      </div>
    </div>
  );
}
