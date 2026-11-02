'use client';

import * as React from 'react';
import {
  Package,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Pencil,
  ImagePlus,
  X,
  SlidersHorizontal,
  Loader2,
  Sparkles,
  Tag,
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
import {
  DADOS_PRODUTOS,
  DADOS_UNIDADES_MEDIDAS,
  DADOS_CATEGORIAS_PRODUTO,
  type Produto,
  type UnidadeMedidaItem,
  type CategoriaProdutoItem,
  type CampoPersonalizadoDefinicao,
} from '@/lib/mock-data';
import {
  buscarProdutosDoBanco,
  buscarUnidadesMedidasDoBanco,
  buscarCategoriasProdutoDoBanco,
  criarProdutoNoBanco,
  atualizarProdutoNoBanco,
  excluirProdutoNoBanco,
  buscarCamposPersonalizadosProduto,
  criarCampoPersonalizadoProduto,
  removerCampoPersonalizadoProduto,
  processarEEnviarImagemProduto,
} from '@/lib/supabase/service';
import { formatarMoeda } from '@/lib/utils';

export default function PaginaProdutos() {
  const [produtos, setProdutos] = React.useState<Produto[]>(DADOS_PRODUTOS);
  const [unidadesMedidas, setUnidadesMedidas] =
    React.useState<UnidadeMedidaItem[]>(DADOS_UNIDADES_MEDIDAS);
  const [categoriasProduto, setCategoriasProduto] =
    React.useState<CategoriaProdutoItem[]>(DADOS_CATEGORIAS_PRODUTO);
  const [camposDefinicoes, setCamposDefinicoes] = React.useState<CampoPersonalizadoDefinicao[]>([]);
  const [busca, setBusca] = React.useState('');
  const [modalAberta, setModalAberta] = React.useState(false);
  const [modalCamposAberta, setModalCamposAberta] = React.useState(false);
  const [produtoEditando, setProdutoEditando] = React.useState<Produto | null>(null);
  const [salvando, setSalvando] = React.useState(false);
  const [processandoImagem, setProcessandoImagem] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  // Estados do formulário de produto
  const [nome, setNome] = React.useState('');
  const [descricao, setDescricao] = React.useState('');
  const [sku, setSku] = React.useState('');
  const [valor, setValor] = React.useState('');
  const [unidadeMedidaId, setUnidadeMedidaId] = React.useState<string>(
    DADOS_UNIDADES_MEDIDAS[0].id
  );
  const [categoriaId, setCategoriaId] = React.useState<string>(
    DADOS_CATEGORIAS_PRODUTO[0].id
  );
  const [ativo, setAtivo] = React.useState<boolean>(true);
  const [imagemUrl, setImagemUrl] = React.useState<string>('');
  const [valoresPersonalizados, setValoresPersonalizados] = React.useState<Record<string, any>>({});

  // Estados para criar novo campo personalizado (inline no modal ou no gerenciador)
  const [criandoCampoInline, setCriandoCampoInline] = React.useState(false);
  const [novoCampoLabel, setNovoCampoLabel] = React.useState('');
  const [novoCampoTipo, setNovoCampoTipo] =
    React.useState<CampoPersonalizadoDefinicao['tipo']>('texto');
  const [novoCampoOpcoes, setNovoCampoOpcoes] = React.useState('');
  const [novoCampoObrigatorio, setNovoCampoObrigatorio] = React.useState(false);
  const [salvandoCampo, setSalvandoCampo] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Carrega produtos, unidades de medida, categorias e definições de campos personalizados do Supabase
  React.useEffect(() => {
    let montado = true;
    Promise.all([
      buscarProdutosDoBanco(),
      buscarUnidadesMedidasDoBanco(),
      buscarCategoriasProdutoDoBanco(),
      buscarCamposPersonalizadosProduto(),
    ]).then(([listaProdutos, listaUnidades, listaCategorias, campos]) => {
      if (!montado) return;
      if (listaProdutos && listaProdutos.length > 0) setProdutos(listaProdutos);
      if (listaUnidades && listaUnidades.length > 0) setUnidadesMedidas(listaUnidades);
      if (listaCategorias && listaCategorias.length > 0) setCategoriasProduto(listaCategorias);
      if (campos) setCamposDefinicoes(campos);
    });
    return () => {
      montado = false;
    };
  }, []);

  const exibirFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  };

  const abrirModalNovoProduto = () => {
    setProdutoEditando(null);
    setNome('');
    setDescricao('');
    setSku('');
    setValor('');
    setUnidadeMedidaId(unidadesMedidas[0]?.id || DADOS_UNIDADES_MEDIDAS[0].id);
    setCategoriaId(categoriasProduto[0]?.id || DADOS_CATEGORIAS_PRODUTO[0].id);
    setAtivo(true);
    setImagemUrl('');
    setValoresPersonalizados({});
    setCriandoCampoInline(false);
    setModalAberta(true);
  };

  const abrirModalEditarProduto = (prod: Produto) => {
    const unidadeEncontrada = unidadesMedidas.find(
      (u) => u.id === prod.unidades_medidas || u.nome === prod.unidade_medida
    );
    const categoriaEncontrada = categoriasProduto.find(
      (c) => c.id === prod.categoria_produto || c.nome === prod.categoria_nome
    );
    setProdutoEditando(prod);
    setNome(prod.nome);
    setDescricao(prod.descricao || '');
    setSku(prod.codigo_sku || '');
    setValor(String(prod.valor ?? 0));
    setUnidadeMedidaId(
      prod.unidades_medidas || unidadeEncontrada?.id || unidadesMedidas[0]?.id || DADOS_UNIDADES_MEDIDAS[0].id
    );
    setCategoriaId(
      prod.categoria_produto || categoriaEncontrada?.id || categoriasProduto[0]?.id || DADOS_CATEGORIAS_PRODUTO[0].id
    );
    setAtivo(prod.ativo !== false);
    setImagemUrl(prod.imagem_url || '');
    setValoresPersonalizados({ ...(prod.campos_personalizados || {}) });
    setCriandoCampoInline(false);
    setModalAberta(true);
  };

  const handleSelecionarArquivoImagem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessandoImagem(true);
    try {
      const urlGerada = await processarEEnviarImagemProduto(file);
      setImagemUrl(urlGerada);
    } catch (err) {
      console.error('Erro ao processar imagem do produto:', err);
    } finally {
      setProcessandoImagem(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCriarNovoCampo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!novoCampoLabel.trim()) return;

    setSalvandoCampo(true);
    try {
      const opcoesLista =
        novoCampoTipo === 'selecao'
          ? novoCampoOpcoes
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
          : [];

      const criado = await criarCampoPersonalizadoProduto({
        label: novoCampoLabel.trim(),
        tipo: novoCampoTipo,
        opcoes: opcoesLista,
        obrigatorio: novoCampoObrigatorio,
        ordem: camposDefinicoes.length + 1,
      });

      setCamposDefinicoes((prev) => {
        const semDuplicata = prev.filter((c) => c.nome_chave !== criado.nome_chave);
        return [...semDuplicata, criado];
      });

      setNovoCampoLabel('');
      setNovoCampoTipo('texto');
      setNovoCampoOpcoes('');
      setNovoCampoObrigatorio(false);
      setCriandoCampoInline(false);
      exibirFeedback(`Campo personalizado "${criado.label}" salvo no Supabase!`);
    } catch (err) {
      console.error('Erro ao criar campo personalizado:', err);
    } finally {
      setSalvandoCampo(false);
    }
  };

  const handleRemoverCampoPersonalizado = async (campo: CampoPersonalizadoDefinicao) => {
    if (!confirm(`Deseja remover o campo personalizado "${campo.label}"?`)) return;

    await removerCampoPersonalizadoProduto(campo.id);
    setCamposDefinicoes((prev) => prev.filter((c) => c.id !== campo.id));
    exibirFeedback(`Campo "${campo.label}" removido.`);
  };

  const handleAlterarValorPersonalizado = (chave: string, valorCampo: any) => {
    setValoresPersonalizados((prev) => ({
      ...prev,
      [chave]: valorCampo,
    }));
  };

  const handleSalvarProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !valor) return;

    setSalvando(true);
    try {
      const valorNumerico = parseFloat(valor.replace(',', '.'));
      const valorFinal = isNaN(valorNumerico) ? 0 : valorNumerico;
      const unidadeItem = unidadesMedidas.find((u) => u.id === unidadeMedidaId);
      const nomeUnidade = unidadeItem?.nome || 'Unidade';
      const categoriaItem = categoriasProduto.find((c) => c.id === categoriaId);
      const nomeCategoria = categoriaItem?.nome || 'Crachás';

      if (produtoEditando) {
        await atualizarProdutoNoBanco(produtoEditando.id, {
          nome: nome.trim(),
          descricao: descricao.trim(),
          codigo_sku: sku.trim() || produtoEditando.codigo_sku,
          valor: valorFinal,
          unidades_medidas: unidadeMedidaId,
          unidade_medida: nomeUnidade,
          categoria_produto: categoriaId,
          categoria_nome: nomeCategoria,
          ativo: ativo,
          imagem_url: imagemUrl || undefined,
          campos_personalizados: valoresPersonalizados,
        });

        const atualizado: Produto = {
          ...produtoEditando,
          nome: nome.trim(),
          descricao: descricao.trim(),
          codigo_sku: sku.trim() || produtoEditando.codigo_sku,
          valor: valorFinal,
          unidades_medidas: unidadeMedidaId,
          unidade_medida: nomeUnidade,
          categoria_produto: categoriaId,
          categoria_nome: nomeCategoria,
          ativo: ativo,
          imagem_url: imagemUrl || undefined,
          campos_personalizados: valoresPersonalizados,
        };

        setProdutos((prev) => prev.map((p) => (p.id === atualizado.id ? atualizado : p)));
        exibirFeedback(`Produto "${atualizado.nome}" atualizado no Supabase!`);
      } else {
        const novoProduto = await criarProdutoNoBanco({
          nome: nome.trim(),
          descricao: descricao.trim(),
          codigo_sku: sku.trim() || `SKU-${Math.floor(Math.random() * 9000 + 1000)}`,
          valor: valorFinal,
          unidades_medidas: unidadeMedidaId,
          unidade_medida: nomeUnidade,
          categoria_produto: categoriaId,
          categoria_nome: nomeCategoria,
          ativo: ativo,
          imagem_url: imagemUrl || undefined,
          campos_personalizados: valoresPersonalizados,
        });

        setProdutos((prev) => [novoProduto, ...prev]);
        exibirFeedback(`Produto "${novoProduto.nome}" cadastrado com sucesso no Supabase!`);
      }

      setModalAberta(false);
    } catch (err) {
      console.error('Erro ao salvar produto:', err);
    } finally {
      setSalvando(false);
    }
  };

  const handleAlternarStatusProduto = async (prod: Produto) => {
    const novoStatus = prod.ativo === false ? true : false;
    setProdutos((prev) =>
      prev.map((p) => (p.id === prod.id ? { ...p, ativo: novoStatus } : p))
    );
    await atualizarProdutoNoBanco(prod.id, {
      ativo: novoStatus,
      unidade_medida: prod.unidade_medida,
      imagem_url: prod.imagem_url,
      campos_personalizados: prod.campos_personalizados,
    });
    exibirFeedback(
      `Produto "${prod.nome}" marcado como ${novoStatus ? 'Ativo' : 'Inativo'} no Supabase!`
    );
  };

  const handleExcluirProduto = async (prod: Produto) => {
    if (!confirm(`Tem certeza que deseja excluir o produto "${prod.nome}"?`)) return;
    await excluirProdutoNoBanco(prod.id);
    setProdutos((prev) => prev.filter((p) => p.id !== prod.id));
    exibirFeedback(`Produto "${prod.nome}" removido do catálogo.`);
  };

  const produtosFiltrados = produtos.filter(
    (p) =>
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (p.codigo_sku && p.codigo_sku.toLowerCase().includes(busca.toLowerCase())) ||
      (p.descricao && p.descricao.toLowerCase().includes(busca.toLowerCase()))
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onAbrirNovoNegocio={() => { }} />
        <CommandPalette />

        {/* Header do Módulo */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/40 px-6 py-4">
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
              Itens, planos, imagens e campos personalizados sincronizados com o Supabase.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative w-60">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou SKU..."
                className="pl-8"
              />
            </div>

            <Button
              id="btn-gerenciar-campos-produto"
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalCamposAberta(true)}
              className="gap-1.5 text-xs"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-emerald-400" />
              <span>Campos Personalizados ({camposDefinicoes.length})</span>
            </Button>

            <Button
              id="btn-novo-produto"
              onClick={abrirModalNovoProduto}
              size="sm"
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Novo Produto</span>
            </Button>
          </div>
        </div>

        {feedback && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-400 shadow-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="font-medium">{feedback}</span>
          </div>
        )}

        {/* Tabela de Produtos */}
        <div className="flex-1 overflow-auto p-6">
          <div className="rounded-lg border border-border bg-card/60 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/30 text-muted-foreground select-none">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Produto / Imagem</th>
                  <th className="py-2.5 px-4 font-medium">Código SKU</th>
                  <th className="py-2.5 px-4 font-medium">Categoria</th>
                  <th className="py-2.5 px-4 font-medium">Unidade de Medida</th>
                  <th className="py-2.5 px-4 font-medium">Valor Unitário</th>
                  <th className="py-2.5 px-4 font-medium">Campos Personalizados</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {produtosFiltrados.length > 0 ? (
                  produtosFiltrados.map((prod) => {
                    const customEntries = Object.entries(prod.campos_personalizados || {}).filter(
                      ([k, v]) =>
                        k !== '_imagem_url' &&
                        k !== '_unidade_medida' &&
                        k !== 'unidade_medida' &&
                        k !== '_categoria_produto' &&
                        k !== 'categoria_produto' &&
                        v !== '' &&
                        v !== null &&
                        v !== undefined
                    );

                    return (
                      <tr
                        key={prod.id}
                        className="hover:bg-accent/40 transition-colors group"
                      >
                        <td className="py-2.5 px-4 font-medium text-foreground">
                          <div className="flex items-center gap-3">
                            {prod.imagem_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={prod.imagem_url}
                                alt={prod.nome}
                                className="h-10 w-10 rounded-lg object-cover border border-border bg-muted shrink-0"
                              />
                            ) : (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground">
                                <Package className="h-4 w-4" />
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-foreground">{prod.nome}</div>
                              {prod.descricao && (
                                <div className="text-[11px] text-muted-foreground line-clamp-1 max-w-md">
                                  {prod.descricao}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-4 font-mono text-[11px] text-muted-foreground">
                          {prod.codigo_sku || '-'}
                        </td>

                        <td className="py-2.5 px-4">
                          <Badge variant="secondary" className="text-[11px] font-medium">
                            {prod.categoria_nome || 'Crachás'}
                          </Badge>
                        </td>

                        <td className="py-2.5 px-4">
                          <Badge variant="outline" className="text-[11px] font-medium">
                            {prod.unidade_medida || 'Unidade'}
                          </Badge>
                        </td>

                        <td className="py-2.5 px-4 font-semibold text-emerald-400 font-mono">
                          {formatarMoeda(prod.valor)}
                        </td>

                        <td className="py-2.5 px-4">
                          {customEntries.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {customEntries.map(([chave, val]) => {
                                const def = camposDefinicoes.find((c) => c.nome_chave === chave);
                                const labelExibicao = def ? def.label : chave;
                                const valorFormatado =
                                  typeof val === 'boolean'
                                    ? val
                                      ? 'Sim'
                                      : 'Não'
                                    : String(val);
                                return (
                                  <span
                                    key={chave}
                                    className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                                  >
                                    <strong className="text-foreground">{labelExibicao}:</strong>{' '}
                                    {valorFormatado}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/60">—</span>
                          )}
                        </td>

                        <td className="py-2.5 px-4">
                          <button
                            type="button"
                            onClick={() => handleAlternarStatusProduto(prod)}
                            title="Clique para alternar entre Ativo e Inativo"
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border transition-colors ${prod.ativo !== false
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'
                              }`}
                          >
                            {prod.ativo !== false ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Ativo</span>
                              </>
                            ) : (
                              <>
                                <X className="h-3 w-3" />
                                <span>Inativo</span>
                              </>
                            )}
                          </button>
                        </td>

                        <td className="py-2.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => abrirModalEditarProduto(prod)}
                              className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                              title="Editar produto, imagem e campos"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExcluirProduto(prod)}
                              className="rounded p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                              title="Excluir produto"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={7}
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

        {/* Modal de Criação / Edição de Produto */}
        <Dialog open={modalAberta} onOpenChange={setModalAberta}>
          <form onSubmit={handleSalvarProduto} className="max-h-[82vh] overflow-y-auto pr-1">
            <DialogHeader>
              <DialogTitle>
                {produtoEditando ? 'Editar Produto ou Serviço' : 'Novo Produto ou Serviço'}
              </DialogTitle>
              <DialogDescription>
                Cadastre as informações, imagem do produto e preencha ou crie novos campos personalizados salvos no Supabase.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              {/* Upload e Preview da Imagem do Produto */}
              <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImagePlus className="h-3.5 w-3.5 text-emerald-400" />
                    Imagem do Produto
                  </span>
                  {imagemUrl && (
                    <button
                      type="button"
                      onClick={() => setImagemUrl('')}
                      className="text-[11px] text-rose-400 hover:underline flex items-center gap-0.5"
                    >
                      <X className="h-3 w-3" />
                      Remover imagem
                    </button>
                  )}
                </label>

                <div className="flex items-center gap-3.5">
                  {imagemUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imagemUrl}
                      alt="Preview do produto"
                      className="h-16 w-16 rounded-xl object-cover border border-border bg-card shrink-0 shadow-sm"
                    />
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex h-16 w-16 shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-colors text-muted-foreground"
                    >
                      {processandoImagem ? (
                        <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
                      ) : (
                        <ImagePlus className="h-5 w-5" />
                      )}
                    </div>
                  )}

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleSelecionarArquivoImagem}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={processandoImagem}
                        onClick={() => fileInputRef.current?.click()}
                        className="h-7 text-xs gap-1.5"
                      >
                        {processandoImagem ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Processando...</span>
                          </>
                        ) : (
                          <>
                            <ImagePlus className="h-3 w-3" />
                            <span>Enviar Arquivo de Imagem</span>
                          </>
                        )}
                      </Button>
                    </div>
                    <Input
                      value={imagemUrl.startsWith('data:') ? '' : imagemUrl}
                      onChange={(e) => setImagemUrl(e.target.value)}
                      placeholder="Ou cole a URL de uma imagem (https://...)"
                      className="h-7 text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* Campos Padrão */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-foreground mb-1 block">
                    Nome do Produto / Plano *
                  </label>
                  <Input
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Crachá PVC Personalizado"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">
                    Categoria *
                  </label>
                  <select
                    value={categoriaId}
                    onChange={(e) => setCategoriaId(e.target.value)}
                    className="flex h-8 w-full rounded-md border border-input bg-background/50 px-2 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {categoriasProduto.map((cat) => (
                      <option key={cat.id} value={cat.id} className="bg-card">
                        {cat.nome}
                      </option>
                    ))}
                  </select>
                </div>
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
                    Unidade de Medida *
                  </label>
                  <select
                    value={unidadeMedidaId}
                    onChange={(e) => setUnidadeMedidaId(e.target.value)}
                    className="flex h-8 w-full rounded-md border border-input bg-background/50 px-2 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {unidadesMedidas.map((op) => (
                      <option key={op.id} value={op.id} className="bg-card">
                        {op.nome} ({op.sigla})
                      </option>
                    ))}
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

              {/* Opção de Status do Produto: Ativo ou Inativo */}
              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-3.5 py-2.5">
                <div>
                  <span className="text-xs font-semibold text-foreground block">
                    Status do Produto no Catálogo
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {ativo
                      ? 'Ativo: disponível para ser adicionado aos cards do funil.'
                      : 'Inativo: oculto na seleção de produtos dos cards.'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAtivo(true)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${ativo
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-card text-muted-foreground border border-border hover:text-foreground'
                      }`}
                  >
                    Ativo
                  </button>
                  <button
                    type="button"
                    onClick={() => setAtivo(false)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${!ativo
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-card text-muted-foreground border border-border hover:text-foreground'
                      }`}
                  >
                    Inativo
                  </button>
                </div>
              </div>

              {/* Seção de Campos Personalizados do Produto */}
              <div className="rounded-xl border border-border bg-card/80 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-emerald-400" />
                    Campos Personalizados do Produto ({camposDefinicoes.length})
                  </span>
                  {!criandoCampoInline && (
                    <button
                      type="button"
                      onClick={() => setCriandoCampoInline(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300"
                    >
                      <Plus className="h-3 w-3" />
                      Criar Novo Campo
                    </button>
                  )}
                </div>

                {/* Formulário Inline para Criar Novo Campo no Supabase */}
                {criandoCampoInline && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Novo Campo Personalizado (Salvo no Supabase)
                      </span>
                      <button
                        type="button"
                        onClick={() => setCriandoCampoInline(false)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold uppercase text-muted-foreground block mb-1">
                          Nome do Campo *
                        </label>
                        <Input
                          value={novoCampoLabel}
                          onChange={(e) => setNovoCampoLabel(e.target.value)}
                          placeholder="Ex: Garantia (Meses), Fornecedor, Peso..."
                          className="h-7 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold uppercase text-muted-foreground block mb-1">
                          Tipo do Campo
                        </label>
                        <select
                          value={novoCampoTipo}
                          onChange={(e) => setNovoCampoTipo(e.target.value as any)}
                          className="flex h-7 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground"
                        >
                          <option value="texto">Texto Livre</option>
                          <option value="numero">Número</option>
                          <option value="moeda">Moeda (R$)</option>
                          <option value="data">Data</option>
                          <option value="selecao">Lista de Opções</option>
                          <option value="booleano">Sim / Não (Checkbox)</option>
                        </select>
                      </div>
                    </div>

                    {novoCampoTipo === 'selecao' && (
                      <div>
                        <label className="text-[10px] font-semibold uppercase text-muted-foreground block mb-1">
                          Opções separadas por vírgula
                        </label>
                        <Input
                          value={novoCampoOpcoes}
                          onChange={(e) => setNovoCampoOpcoes(e.target.value)}
                          placeholder="Ex: Software, Hardware, Licenciamento"
                          className="h-7 text-xs"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setCriandoCampoInline(false)}
                        className="h-7 text-xs"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={salvandoCampo || !novoCampoLabel.trim()}
                        onClick={() => handleCriarNovoCampo()}
                        className="h-7 text-xs gap-1"
                      >
                        {salvandoCampo ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Plus className="h-3 w-3" />
                        )}
                        <span>Adicionar Campo</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Renderização Dinâmica dos Campos Criados */}
                {camposDefinicoes.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {camposDefinicoes.map((campo) => {
                      const val = valoresPersonalizados[campo.nome_chave] ?? '';

                      return (
                        <div key={campo.id} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-foreground">
                              {campo.label}
                              {campo.obrigatorio ? ' *' : ''}
                            </label>
                            <button
                              type="button"
                              onClick={() => handleRemoverCampoPersonalizado(campo)}
                              className="text-[10px] text-muted-foreground hover:text-rose-400"
                              title={`Remover campo ${campo.label}`}
                            >
                              remover
                            </button>
                          </div>

                          {campo.tipo === 'selecao' ? (
                            <select
                              value={String(val)}
                              onChange={(e) =>
                                handleAlterarValorPersonalizado(campo.nome_chave, e.target.value)
                              }
                              className="flex h-8 w-full rounded-md border border-input bg-background/50 px-2 py-1 text-xs text-foreground"
                            >
                              <option value="">Selecione...</option>
                              {(campo.opcoes_json || []).map((op) => (
                                <option key={op} value={op}>
                                  {op}
                                </option>
                              ))}
                            </select>
                          ) : campo.tipo === 'booleano' ? (
                            <label className="flex items-center gap-2 h-8 px-2 rounded-md border border-input bg-background/30 cursor-pointer text-xs">
                              <input
                                type="checkbox"
                                checked={Boolean(val)}
                                onChange={(e) =>
                                  handleAlterarValorPersonalizado(
                                    campo.nome_chave,
                                    e.target.checked
                                  )
                                }
                                className="rounded border-border"
                              />
                              <span>{val ? 'Sim' : 'Não'}</span>
                            </label>
                          ) : (
                            <Input
                              type={
                                campo.tipo === 'numero' || campo.tipo === 'moeda'
                                  ? 'number'
                                  : campo.tipo === 'data'
                                    ? 'date'
                                    : 'text'
                              }
                              step={campo.tipo === 'moeda' ? '0.01' : undefined}
                              value={String(val)}
                              onChange={(e) =>
                                handleAlterarValorPersonalizado(campo.nome_chave, e.target.value)
                              }
                              placeholder={`Preencher ${campo.label.toLowerCase()}...`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Nenhum campo extra configurado ainda. Clique em{' '}
                    <strong className="text-foreground">&quot;+ Criar Novo Campo&quot;</strong> acima
                    para adicionar atributos personalizados ao cadastro de produtos.
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalAberta(false)}
                disabled={salvando}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando || processandoImagem} className="gap-1.5">
                {salvando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{produtoEditando ? 'Salvar Alterações' : 'Cadastrar Produto'}</span>
              </Button>
            </DialogFooter>
          </form>
        </Dialog>

        {/* Modal Gerenciador de Campos Personalizados de Produto */}
        <Dialog open={modalCamposAberta} onOpenChange={setModalCamposAberta}>
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Campos Personalizados de Produtos</DialogTitle>
              <DialogDescription>
                Crie os campos específicos que sua operação precisa para os produtos. Todos os campos e valores são salvos no Supabase.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={handleCriarNovoCampo}
              className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">
                    Nome do Campo *
                  </label>
                  <Input
                    required
                    value={novoCampoLabel}
                    onChange={(e) => setNovoCampoLabel(e.target.value)}
                    placeholder="Ex: Prazo de Entrega, Categoria, SLA..."
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">
                    Tipo de Dado
                  </label>
                  <select
                    value={novoCampoTipo}
                    onChange={(e) => setNovoCampoTipo(e.target.value as any)}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground"
                  >
                    <option value="texto">Texto Livre</option>
                    <option value="numero">Número</option>
                    <option value="moeda">Moeda (R$)</option>
                    <option value="data">Data</option>
                    <option value="selecao">Lista de Seleção</option>
                    <option value="booleano">Sim / Não</option>
                  </select>
                </div>
              </div>

              {novoCampoTipo === 'selecao' && (
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">
                    Opções da Lista (separadas por vírgula)
                  </label>
                  <Input
                    value={novoCampoOpcoes}
                    onChange={(e) => setNovoCampoOpcoes(e.target.value)}
                    placeholder="Ex: Básico, Profissional, Enterprise"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={novoCampoObrigatorio}
                    onChange={(e) => setNovoCampoObrigatorio(e.target.checked)}
                  />
                  <span>Campo obrigatório no cadastro</span>
                </label>

                <Button type="submit" size="sm" disabled={salvandoCampo || !novoCampoLabel.trim()} className="gap-1.5">
                  {salvandoCampo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  <span>Criar Campo no Supabase</span>
                </Button>
              </div>
            </form>

            {/* Lista de Campos Existentes */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {camposDefinicoes.length > 0 ? (
                camposDefinicoes.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-foreground">{c.label}</span>
                      <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                        ({c.nome_chave} • {c.tipo})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoverCampoPersonalizado(c)}
                      className="p-1 text-muted-foreground hover:text-rose-400 transition-colors"
                      title="Excluir campo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-center py-4 text-xs text-muted-foreground">
                  Nenhum campo personalizado criado ainda.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalCamposAberta(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      </div>
    </div>
  );
}
