'use client';

import * as React from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { KanbanColumn } from './kanban-column';
import { KanbanCard } from './kanban-card';
import { KanbanDropZones } from './kanban-drop-zones';
import { KanbanListView } from './kanban-list-view';
import { ModalMotivoPerda } from './modal-motivo-perda';
import { ModalNovoNegocio } from './modal-novo-negocio';
import { ModalNovoFunil } from './modal-novo-funil';
import { ModalGerenciarFases } from './modal-gerenciar-fases';
import { Visao360Drawer } from '@/components/negocio/visao-360-drawer';
import {
  DADOS_ETAPAS,
  DADOS_FUNIS,
  DADOS_NEGOCIOS,
  DADOS_MEMBROS,
  type Negocio,
  type Funil,
  type EtapaFunil,
} from '@/lib/mock-data';
import {
  buscarFunisDoBanco,
  buscarEtapasDoBanco,
  buscarNegociosDoBanco,
  salvarMovimentacaoEtapaBanco,
  criarNegocioNoBanco,
  atualizarPropriedadesNegocioBanco,
  atualizarNomeOuPropriedadesEtapaBanco,
} from '@/lib/supabase/service';
import { formatarMoeda } from '@/lib/utils';
import {
  Search,
  Filter,
  Plus,
  Users,
  Trophy,
  CheckCircle2,
  XCircle,
  Kanban as KanbanIcon,
  List as ListIcon,
  Sparkles,
  ChevronDown,
  Calendar,
  BarChart3,
  HelpCircle,
  Check,
  Layers,
  Settings,
  GripVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface KanbanBoardProps {
  onCardClick?: (negocio: Negocio) => void;
  onNovoNegocioClickRef?: (abrir: () => void) => void;
}

export function KanbanBoard({ onCardClick, onNovoNegocioClickRef }: KanbanBoardProps) {
  const [funis, setFunis] = React.useState<Funil[]>(DADOS_FUNIS);
  const [funilAtivo, setFunilAtivo] = React.useState<Funil>(DADOS_FUNIS[0]);
  const [dropdownFunisAberto, setDropdownFunisAberto] = React.useState(false);
  const [modalNovoFunilAberta, setModalNovoFunilAberta] = React.useState(false);
  const [modalGerenciarFasesAberta, setModalGerenciarFasesAberta] = React.useState(false);

  const [etapas, setEtapas] = React.useState<EtapaFunil[]>(DADOS_ETAPAS);
  const [negocios, setNegocios] = React.useState<Negocio[]>(DADOS_NEGOCIOS);
  const [carregandoBanco, setCarregandoBanco] = React.useState(false);
  const [activeNegocio, setActiveNegocio] = React.useState<Negocio | null>(null);
  const [activeColuna, setActiveColuna] = React.useState<EtapaFunil | null>(null);

  // Carregar dados reais do Supabase na inicialização
  React.useEffect(() => {
    let ativo = true;
    setCarregandoBanco(true);
    Promise.all([buscarFunisDoBanco(), buscarEtapasDoBanco(), buscarNegociosDoBanco()])
      .then(([funisDb, etapasDb, negociosDb]) => {
        if (ativo) {
          if (funisDb && funisDb.length > 0) {
            setFunis(funisDb);
            setFunilAtivo(funisDb[0]);
          }
          if (etapasDb && etapasDb.length > 0) setEtapas(etapasDb);
          if (negociosDb && negociosDb.length > 0) setNegocios(negociosDb);
        }
      })
      .finally(() => {
        if (ativo) setCarregandoBanco(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  // Troca de funil
  const handleSelecionarFunil = async (novoFunil: Funil) => {
    setFunilAtivo(novoFunil);
    setDropdownFunisAberto(false);
    try {
      const etapasDb = await buscarEtapasDoBanco(novoFunil.id);
      if (etapasDb && etapasDb.length > 0) {
        setEtapas(etapasDb);
      }
    } catch (err) {
      console.error('Erro ao carregar etapas do funil:', err);
    }
  };

  const handleFunilCriado = (novoFunil: Funil, novasEtapas: EtapaFunil[]) => {
    setFunis((prev) => [...prev, novoFunil]);
    setFunilAtivo(novoFunil);
    setEtapas(novasEtapas);
    setMensagemSucesso(`Funil "${novoFunil.nome}" criado com sucesso!`);
    setTimeout(() => setMensagemSucesso(null), 3500);
  };

  const handleEtapasAtualizadas = (
    novasEtapas: EtapaFunil[],
    negociosAtualizados?: Negocio[]
  ) => {
    setEtapas(novasEtapas);
    if (negociosAtualizados) {
      setNegocios(negociosAtualizados);
    }
    setMensagemSucesso('Fases do funil atualizadas com sucesso!');
    setTimeout(() => setMensagemSucesso(null), 3500);
  };

  // Modo de visualização: Quadro (Kanban) ou Lista (Estilo RD Station & ClickUp)
  const [modoVisualizacao, setModoVisualizacao] = React.useState<'quadro' | 'lista'>('quadro');

  // Visão 360º Drawer
  const [negocio360, setNegocio360] = React.useState<Negocio | null>(null);

  // Filtros rápidos em pílulas (Pill Filters do RD Station)
  const [busca, setBusca] = React.useState('');
  const [filtroResponsavel, setFiltroResponsavel] = React.useState('todos');
  const [filtroStatus, setFiltroStatus] = React.useState<'todos' | 'aberto' | 'ganho' | 'perdido'>('aberto');
  const [filtroOrdenacao, setFiltroOrdenacao] = React.useState('criadas_ultimo');

  // Modais
  const [modalNovoNegocioAberta, setModalNovoNegocioAberta] = React.useState(false);
  const [negocioParaPerda, setNegocioParaPerda] = React.useState<Negocio | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = React.useState<string | null>(null);

  // Expor função de abrir novo negócio para a Topbar sem disparar loop de re-render
  const onNovoNegocioRef = React.useRef(onNovoNegocioClickRef);
  onNovoNegocioRef.current = onNovoNegocioClickRef;

  React.useEffect(() => {
    if (onNovoNegocioRef.current) {
      onNovoNegocioRef.current(() => setModalNovoNegocioAberta(true));
    }
  }, []);

  // Sensor com distância mínima para não capturar cliques normais
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    })
  );

  // Filtragem dos negócios pelo funil ativo
  const negociosDoFunil = React.useMemo(() => {
    return negocios.filter((n) => {
      if (n.funil_id) {
        return n.funil_id === funilAtivo.id;
      }
      return funilAtivo.padrao || funilAtivo.id === DADOS_FUNIS[0].id;
    });
  }, [negocios, funilAtivo]);

  // Filtragem dos negócios da visualização por busca e status
  const negociosFiltrados = React.useMemo(() => {
    return negociosDoFunil.filter((n) => {
      const matchBusca =
        n.titulo.toLowerCase().includes(busca.toLowerCase()) ||
        (n.empresa_nome && n.empresa_nome.toLowerCase().includes(busca.toLowerCase())) ||
        (n.contato_nome && n.contato_nome.toLowerCase().includes(busca.toLowerCase()));

      const matchResponsavel =
        filtroResponsavel === 'todos' || n.responsavel_id === filtroResponsavel;

      const matchStatus =
        filtroStatus === 'todos' || n.status === filtroStatus;

      return matchBusca && matchResponsavel && matchStatus;
    });
  }, [negociosDoFunil, busca, filtroResponsavel, filtroStatus]);

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === 'Coluna') {
      setActiveColuna(active.data.current.etapa);
      return;
    }
    const negocio = negocios.find((n) => n.id === active.id);
    if (negocio) {
      setActiveNegocio(negocio);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveNegocio(null);
    setActiveColuna(null);

    if (!over) return;

    // Se estiver arrastando uma etapa/coluna do funil
    if (active.data.current?.type === 'Coluna') {
      const activeEtapaId = active.id as string;
      let overEtapaId = over.id as string;

      if (over.data.current?.type === 'Negocio') {
        overEtapaId = over.data.current.negocio.etapa_id;
      } else if (over.data.current?.type === 'Coluna') {
        overEtapaId = over.data.current.etapa.id;
      }

      if (activeEtapaId && overEtapaId && activeEtapaId !== overEtapaId) {
        const oldIndex = etapas.findIndex((e) => e.id === activeEtapaId);
        const newIndex = etapas.findIndex((e) => e.id === overEtapaId);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const novasEtapas = arrayMove(etapas, oldIndex, newIndex).map((e, idx) => ({
            ...e,
            ordem: idx + 1,
          }));
          setEtapas(novasEtapas);

          // Salvar nova ordem no Supabase para as etapas
          try {
            await Promise.all(
              novasEtapas.map((e) =>
                atualizarNomeOuPropriedadesEtapaBanco(e.id, { ordem: e.ordem })
              )
            );
            setMensagemSucesso('Ordem das etapas do funil atualizada!');
            setTimeout(() => setMensagemSucesso(null), 3500);
          } catch (err) {
            console.error('Erro ao salvar nova ordem das etapas:', err);
          }
        }
      }
      return;
    }

    const negocioId = active.id as string;
    const overId = over.id as string;
    const negocioAtual = negocios.find((n) => n.id === negocioId);
    if (!negocioAtual) return;

    if (overId === 'zone-ganho') {
      salvarMovimentacaoEtapaBanco(negocioId, negocioAtual.etapa_id, 'ganho');
      setNegocios((prev) =>
        prev.map((n) =>
          n.id === negocioId
            ? { ...n, status: 'ganho', ultima_atividade_em: new Date().toISOString() }
            : n
        )
      );
      setMensagemSucesso(`Parabéns! "${negocioAtual.titulo}" marcado como GANHO! 🎉`);
      setTimeout(() => setMensagemSucesso(null), 4000);
      return;
    }

    if (overId === 'zone-perdido') {
      setNegocioParaPerda(negocioAtual);
      return;
    }

    if (overId === 'zone-excluir') {
      setNegocios((prev) => prev.filter((n) => n.id !== negocioId));
      setMensagemSucesso(`Negócio "${negocioAtual.titulo}" excluído.`);
      setTimeout(() => setMensagemSucesso(null), 3000);
      return;
    }

    const etapaAlvo = etapas.find((e) => e.id === overId);
    if (etapaAlvo) {
      if (negocioAtual.etapa_id !== etapaAlvo.id) {
        salvarMovimentacaoEtapaBanco(negocioId, etapaAlvo.id, 'aberto');
        setNegocios((prev) =>
          prev.map((n) =>
            n.id === negocioId
              ? { ...n, etapa_id: etapaAlvo.id, ultima_atividade_em: new Date().toISOString() }
              : n
          )
        );
      }
      return;
    }

    const outroNegocio = negocios.find((n) => n.id === overId);
    if (outroNegocio && outroNegocio.etapa_id !== negocioAtual.etapa_id) {
      salvarMovimentacaoEtapaBanco(negocioId, outroNegocio.etapa_id, 'aberto');
      setNegocios((prev) =>
        prev.map((n) =>
          n.id === negocioId
            ? { ...n, etapa_id: outroNegocio.etapa_id, ultima_atividade_em: new Date().toISOString() }
            : n
        )
      );
    }
  };

  const handleConfirmarPerda = (negocioId: string, motivo: string) => {
    const negocio = negocios.find((n) => n.id === negocioId);
    if (negocio) {
      salvarMovimentacaoEtapaBanco(negocioId, negocio.etapa_id, 'perdido', motivo);
    }
    setNegocios((prev) =>
      prev.map((n) =>
        n.id === negocioId
          ? {
              ...n,
              status: 'perdido',
              motivo_perda: motivo,
              ultima_atividade_em: new Date().toISOString(),
            }
          : n
      )
    );
    setMensagemSucesso(`Negócio marcado como PERDIDO com motivo registrado.`);
    setTimeout(() => setMensagemSucesso(null), 3500);
  };

  const handleSalvarNovoNegocio = async (novo: Partial<Negocio>) => {
    const criado = await criarNegocioNoBanco(novo);
    setNegocios((prev) => [criado, ...prev]);
    setMensagemSucesso(`Negócio "${criado.titulo}" cadastrado com sucesso!`);
    setTimeout(() => setMensagemSucesso(null), 3500);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative bg-[#F8FAFC]">
      {/* Toast de Sucesso */}
      {mensagemSucesso && (
        <div className="absolute top-4 right-6 z-50 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-800 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{mensagemSucesso}</span>
        </div>
      )}

      {/* 1. Barra de Controle Principal do Funil (AllDot Pipeline Control) */}
      <div className="border-b border-slate-200/90 bg-white px-6 py-3.5 shrink-0 select-none shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Lado Esquerdo: Título do Pipeline + Seletor de Funil + Alternador de Visualização Segmentado */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
                <span>Pipeline</span>
                <span className="rounded-full bg-[#FFF0F3] px-2.5 py-0.5 text-[11px] font-bold text-[#E42358] font-mono border border-[#E42358]/20">
                  {negociosFiltrados.length} {negociosFiltrados.length === 1 ? 'negócio' : 'negócios'}
                </span>
              </h1>
            </div>

            {/* Seletor Dropdown de Funis AllDot */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownFunisAberto(!dropdownFunisAberto)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 shadow-xs transition-all hover:border-slate-300"
                title="Trocar funil / pipeline de vendas"
              >
                <Layers className="h-3.5 w-3.5 text-[#E42358]" />
                <span className="max-w-[140px] truncate">{funilAtivo.nome}</span>
                {funilAtivo.padrao && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-mono text-slate-500 font-medium">
                    Padrão
                  </span>
                )}
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {dropdownFunisAberto && (
                <div className="absolute left-0 top-full mt-1.5 z-40 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in-0 duration-150">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                    Seus Funis de Vendas
                  </div>
                  <div className="space-y-0.5">
                    {funis.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => handleSelecionarFunil(f)}
                        className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                          f.id === funilAtivo.id
                            ? 'bg-[#E42358]/10 text-[#E42358] font-bold'
                            : 'text-slate-700 hover:bg-slate-100 font-medium'
                        }`}
                      >
                        <span className="truncate">{f.nome}</span>
                        {f.id === funilAtivo.id && <Check className="h-3.5 w-3.5 shrink-0" />}
                      </button>
                    ))}
                  </div>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    type="button"
                    onClick={() => {
                      setDropdownFunisAberto(false);
                      setModalNovoFunilAberta(true);
                    }}
                    className="w-full flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#E42358] hover:bg-[#E42358]/10 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Criar Novo Funil</span>
                  </button>
                </div>
              )}
            </div>

            {/* Botão Personalizar Fases */}
            <button
              type="button"
              onClick={() => setModalGerenciarFasesAberta(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 shadow-xs transition-all hover:border-slate-300"
              title="Renomear, adicionar ou excluir fases deste funil"
            >
              <Settings className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden sm:inline">Personalizar Fases</span>
            </button>

            {/* Alternador Segmentado AllDot (Quadro vs Lista) */}
            <div className="flex items-center rounded-xl border border-slate-200/80 bg-slate-100/90 p-1 shadow-inner">
              <button
                onClick={() => setModoVisualizacao('quadro')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 ${
                  modoVisualizacao === 'quadro'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Visualização em Quadro Kanban"
              >
                <KanbanIcon className={`h-3.5 w-3.5 ${modoVisualizacao === 'quadro' ? 'text-[#E42358]' : ''}`} />
                <span>Quadro</span>
              </button>
              <button
                onClick={() => setModoVisualizacao('lista')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 ${
                  modoVisualizacao === 'lista'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Visualização em Lista Estruturada"
              >
                <ListIcon className={`h-3.5 w-3.5 ${modoVisualizacao === 'lista' ? 'text-[#E42358]' : ''}`} />
                <span>Lista</span>
              </button>
            </div>
          </div>

          {/* Lado Direito: Busca Rápida + Resumo de Forecast */}
          <div className="flex items-center gap-3">
            {/* Campo de Busca Rápida */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Filtrar nesta visualização..."
                className="h-8.5 w-48 lg:w-64 rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E42358]/30 transition-all"
              />
              {busca && (
                <button
                  onClick={() => setBusca('')}
                  className="absolute right-2.5 top-2.5 text-[10px] text-slate-400 hover:text-slate-700 font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Botão Nova Oportunidade */}
            <Button
              onClick={() => setModalNovoNegocioAberta(true)}
              size="sm"
              className="h-8.5 gap-1.5 bg-[#E42358] hover:bg-[#C91748] text-white font-bold text-xs px-3.5 rounded-xl shadow-md shadow-[#E42358]/25 transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Novo Negócio</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Barra de Filtros Inteligentes AllDot (Smart Filter Chips) */}
      <div className="border-b border-slate-200/80 bg-white/95 px-6 py-2.5 shrink-0 select-none backdrop-blur-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Chips de Filtragem de Acesso Rápido */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Chip: Todos Abertos */}
            <button
              onClick={() => setFiltroStatus('aberto')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                filtroStatus === 'aberto'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              Em Andamento
            </button>

            {/* Chip: Todos */}
            <button
              onClick={() => setFiltroStatus('todos')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                filtroStatus === 'todos'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              Todos os Status
            </button>

            {/* Chip: Ganhos */}
            <button
              onClick={() => setFiltroStatus('ganho')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                filtroStatus === 'ganho'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              Ganhos 🏆
            </button>

            {/* Chip: Perdidos */}
            <button
              onClick={() => setFiltroStatus('perdido')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                filtroStatus === 'perdido'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              Perdidos
            </button>

            <div className="h-4 w-px bg-slate-200 mx-1" />

            {/* Seletor de Vendedor Responsável */}
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 font-medium">
              <Users className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={filtroResponsavel}
                onChange={(e) => setFiltroResponsavel(e.target.value)}
                className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer"
              >
                <option value="todos">Todos os vendedores</option>
                {DADOS_MEMBROS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome_completo}
                  </option>
                ))}
              </select>
            </div>

            {/* Seletor de Ordenação */}
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 font-medium">
              <select
                value={filtroOrdenacao}
                onChange={(e) => setFiltroOrdenacao(e.target.value)}
                className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer"
              >
                <option value="criadas_ultimo">Mais recentes primeiro</option>
                <option value="maior_valor">Maior valor primeiro</option>
                <option value="data_fechamento">Data de fechamento</option>
              </select>
            </div>
          </div>

          {/* Métricas Resumidas em Tempo Real */}
          <div className="hidden md:flex items-center gap-3 text-xs font-mono">
            <span className="text-slate-400">Total filtrado:</span>
            <span className="font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
              {formatarMoeda(negociosFiltrados.reduce((acc, n) => acc + n.valor, 0))}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Área Principal: Visualização em Quadro (Kanban) ou Lista */}
      {modoVisualizacao === 'quadro' ? (
        <DndContext
          id="alldot-kanban-board-dnd"
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 overflow-x-auto p-6 bg-[#F8FAFC]">
            <div className="flex gap-4 h-full min-w-max pb-16">
              <SortableContext
                items={etapas.map((e) => e.id)}
                strategy={horizontalListSortingStrategy}
              >
                {etapas.map((etapa) => {
                  const dealsDaEtapa = negociosFiltrados.filter(
                    (n) => n.etapa_id === etapa.id
                  );

                  return (
                    <KanbanColumn
                      key={etapa.id}
                      etapa={etapa}
                      negocios={dealsDaEtapa}
                      onCardClick={(n) => {
                        setNegocio360(n);
                        onCardClick?.(n);
                      }}
                      onAdicionarNegocio={(etapaId) => {
                        setModalNovoNegocioAberta(true);
                      }}
                      onCriarTarefa={(n) => {
                        setNegocio360(n);
                      }}
                    />
                  );
                })}
              </SortableContext>
            </div>
          </div>

          {/* DragOverlay com Card Fantasma ou Coluna */}
          <DragOverlay>
            {activeNegocio ? (
              <KanbanCard negocio={activeNegocio} isOverlay />
            ) : activeColuna ? (
              <div className="w-[310px] rounded-2xl border-2 border-[#E42358] bg-white p-4 shadow-2xl opacity-95 rotate-1">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-[#E42358]" />
                  <span className="font-bold text-xs text-slate-900">{activeColuna.nome}</span>
                  <span className="rounded-full bg-[#FFF0F3] px-2 py-0.5 text-[10px] font-bold text-[#E42358] font-mono ml-auto">
                    {activeColuna.probabilidade_fechamento}%
                  </span>
                </div>
              </div>
            ) : null}
          </DragOverlay>

          {/* Zonas de Ação Rápida no Rodapé */}
          <KanbanDropZones visivel={!!activeNegocio} />
        </DndContext>
      ) : (
        /* Visualização em Lista / Tabela (ClickUp Inspiration + AllDot Identity) */
        <KanbanListView
          negocios={negociosFiltrados}
          etapas={etapas}
          onCardClick={(n) => {
            setNegocio360(n);
            onCardClick?.(n);
          }}
          onAdicionarTarefa={(n) => setNegocio360(n)}
          onAdicionarNegocio={(etapaId) => setModalNovoNegocioAberta(true)}
        />
      )}

      {/* Botão Flutuante de Ajuda & Atalhos (AllDot Style) */}
      <div className="fixed bottom-6 right-6 z-30">
        <button
          onClick={() => setModalNovoNegocioAberta(true)}
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#DE1B54] to-[#E42358] hover:from-[#C91748] hover:to-[#DE1B54] text-white px-4 py-2.5 font-bold text-xs shadow-xl shadow-[#E42358]/30 transition-all hover:scale-105 active:scale-95 border border-white/20"
        >
          <Plus className="h-4 w-4" />
          <span>Nova Oportunidade</span>
        </button>
      </div>


      {/* Visão 360º de Detalhes do Negócio (HubSpot UX) */}
      <Visao360Drawer
        negocio={negocio360}
        open={!!negocio360}
        onOpenChange={(open) => !open && setNegocio360(null)}
        etapas={etapas}
        onAtualizarNegocio={(id, campos) => {
          setNegocios((prev) =>
            prev.map((n) => (n.id === id ? { ...n, ...campos } : n))
          );
          setNegocio360((prev) => (prev && prev.id === id ? { ...prev, ...campos } : prev));
          atualizarPropriedadesNegocioBanco(id, campos);
        }}
        onMarcarGanho={(id) => {
          setNegocios((prev) =>
            prev.map((n) =>
              n.id === id
                ? { ...n, status: 'ganho', ultima_atividade_em: new Date().toISOString() }
                : n
            )
          );
          setNegocio360(null);
          setMensagemSucesso('Negócio marcado como GANHO com sucesso! 🎉');
          setTimeout(() => setMensagemSucesso(null), 3500);
        }}
        onMarcarPerdido={(n) => {
          setNegocio360(null);
          setNegocioParaPerda(n);
        }}
      />

      {/* Modais */}
      <ModalMotivoPerda
        negocio={negocioParaPerda}
        open={!!negocioParaPerda}
        onOpenChange={(open) => !open && setNegocioParaPerda(null)}
        onConfirmarPerda={handleConfirmarPerda}
      />

      <ModalNovoNegocio
        open={modalNovoNegocioAberta}
        onOpenChange={setModalNovoNegocioAberta}
        onSalvar={handleSalvarNovoNegocio}
        etapas={etapas}
        funilId={funilAtivo.id}
      />

      <ModalNovoFunil
        open={modalNovoFunilAberta}
        onOpenChange={setModalNovoFunilAberta}
        onFunilCriado={handleFunilCriado}
      />

      <ModalGerenciarFases
        open={modalGerenciarFasesAberta}
        onOpenChange={setModalGerenciarFasesAberta}
        funil={funilAtivo}
        etapas={etapas}
        negocios={negocios}
        onEtapasAtualizadas={handleEtapasAtualizadas}
      />
    </div>
  );
}
