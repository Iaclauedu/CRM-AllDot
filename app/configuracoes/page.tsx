'use client';

import * as React from 'react';
import {
  Settings,
  Building2,
  Users,
  Shield,
  Layers,
  Sparkles,
  Check,
  Flame,
  Clock,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { CommandPalette } from '@/components/layout/command-palette';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DADOS_ORGANIZACAO,
  DADOS_MEMBROS,
  DADOS_ETAPAS,
  DADOS_FUNIS,
  type Funil,
  type EtapaFunil,
} from '@/lib/mock-data';
import {
  buscarFunisDoBanco,
  buscarEtapasDoBanco,
  atualizarNomeOuPropriedadesEtapaBanco,
  adicionarEtapaAoFunilBanco,
  removerEtapaDoFunilBanco,
} from '@/lib/supabase/service';

export default function PaginaConfiguracoes() {
  const [nome, setNome] = React.useState(DADOS_ORGANIZACAO.nome);
  const [cnpj, setCnpj] = React.useState(DADOS_ORGANIZACAO.cnpj);
  const [salvo, setSalvo] = React.useState(false);

  // Estados para Gestão de Funis e Etapas
  const [funis, setFunis] = React.useState<Funil[]>(DADOS_FUNIS);
  const [funilSelecionadoId, setFunilSelecionadoId] = React.useState<string>(DADOS_FUNIS[0].id);
  const [etapas, setEtapas] = React.useState<EtapaFunil[]>(DADOS_ETAPAS);
  const [salvandoEtapas, setSalvandoEtapas] = React.useState(false);
  const [mensagemSucesso, setMensagemSucesso] = React.useState<string | null>(null);

  // Nova etapa
  const [adicionando, setAdicionando] = React.useState(false);
  const [novoNome, setNovoNome] = React.useState('');
  const [novaProbabilidade, setNovaProbabilidade] = React.useState<number>(50);
  const [novosDiasEstagnacao, setNovosDiasEstagnacao] = React.useState<number>(7);

  // Carrega funis e etapas do Supabase
  React.useEffect(() => {
    buscarFunisDoBanco().then((f) => {
      if (f && f.length > 0) {
        setFunis(f);
        setFunilSelecionadoId(f[0].id);
        buscarEtapasDoBanco(f[0].id).then((e) => {
          if (e && e.length > 0) setEtapas(e);
        });
      }
    });
  }, []);

  const handleTrocarFunil = async (novoFunilId: string) => {
    setFunilSelecionadoId(novoFunilId);
    const etapasDb = await buscarEtapasDoBanco(novoFunilId);
    if (etapasDb) {
      setEtapas(etapasDb);
    }
  };

  const handleMudarCampoEtapa = (
    etapaId: string,
    campo: keyof EtapaFunil,
    valor: any
  ) => {
    setEtapas((prev) =>
      prev.map((e) => (e.id === etapaId ? { ...e, [campo]: valor } : e))
    );
  };

  const handleMoverOrdem = (idx: number, direcao: 'cima' | 'baixo') => {
    const novoIdx = direcao === 'cima' ? idx - 1 : idx + 1;
    if (novoIdx < 0 || novoIdx >= etapas.length) return;

    const copia = [...etapas];
    const item = copia.splice(idx, 1)[0];
    copia.splice(novoIdx, 0, item);

    const reordenadas = copia.map((e, i) => ({ ...e, ordem: i + 1 }));
    setEtapas(reordenadas);
  };

  const handleAdicionarEtapa = async () => {
    if (!novoNome.trim()) return;

    setSalvandoEtapas(true);
    try {
      const novaOrdem = etapas.length + 1;
      const criada = await adicionarEtapaAoFunilBanco(
        funilSelecionadoId,
        novoNome.trim(),
        novaOrdem,
        novaProbabilidade,
        novosDiasEstagnacao
      );

      setEtapas((prev) => [...prev, criada]);
      setNovoNome('');
      setNovaProbabilidade(50);
      setNovosDiasEstagnacao(7);
      setAdicionando(false);
      setMensagemSucesso('Nova etapa adicionada com sucesso!');
      setTimeout(() => setMensagemSucesso(null), 3000);
    } catch (err) {
      console.error('Erro ao adicionar etapa:', err);
    } finally {
      setSalvandoEtapas(false);
    }
  };

  const handleRemoverEtapa = async (etapaId: string) => {
    if (etapas.length <= 1) {
      alert('O funil deve conter pelo menos uma etapa.');
      return;
    }

    if (!confirm('Tem certeza que deseja remover esta etapa?')) return;

    setSalvandoEtapas(true);
    try {
      // Migra para a primeira etapa restante se necessário
      const destino = etapas.find((e) => e.id !== etapaId)?.id;
      await removerEtapaDoFunilBanco(etapaId, destino);

      const novaLista = etapas
        .filter((e) => e.id !== etapaId)
        .map((e, idx) => ({ ...e, ordem: idx + 1 }));

      setEtapas(novaLista);
      setMensagemSucesso('Etapa removida com sucesso!');
      setTimeout(() => setMensagemSucesso(null), 3000);
    } catch (err) {
      console.error('Erro ao remover etapa:', err);
    } finally {
      setSalvandoEtapas(false);
    }
  };

  const handleSalvarConfiguracoesEtapas = async () => {
    setSalvandoEtapas(true);
    try {
      for (const e of etapas) {
        await atualizarNomeOuPropriedadesEtapaBanco(e.id, {
          nome: e.nome,
          ordem: e.ordem,
          probabilidade_fechamento: e.probabilidade_fechamento,
          dias_estagnacao: e.dias_estagnacao,
        });
      }
      setMensagemSucesso('Configurações de Etapas e Rotting salvas com sucesso no Supabase!');
      setTimeout(() => setMensagemSucesso(null), 3500);
    } catch (err) {
      console.error('Erro ao salvar etapas:', err);
    } finally {
      setSalvandoEtapas(false);
    }
  };

  const handleSalvarWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2500);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <CommandPalette />

        <div className="flex-1 overflow-y-auto p-8 max-w-5xl space-y-6">
          {mensagemSucesso && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-800 shadow-md animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{mensagemSucesso}</span>
            </div>
          )}

          <div className="border-b border-border/80 pb-4">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-lg font-bold text-foreground">
                Configurações da Organização
              </h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Gerencie parâmetros do workspace multi-tenant, membros da equipe, etapas do pipeline e alertas de estagnação.
            </p>
          </div>

          {/* Dados Gerais da Organização */}
          <form onSubmit={handleSalvarWorkspace} className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-emerald-400" />
              Informações do Workspace
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Nome da Organização
                </label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  CNPJ
                </label>
                <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} className="font-mono" />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Plano Atual:</span>
                <Badge variant="success" className="uppercase font-mono text-[10px]">
                  {DADOS_ORGANIZACAO.plano}
                </Badge>
              </div>

              <Button type="submit" size="sm" className="gap-1.5">
                {salvo ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : null}
                <span>{salvo ? 'Salvo com sucesso' : 'Salvar Alterações'}</span>
              </Button>
            </div>
          </form>

          {/* Membros e Permissões */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Users className="h-4 w-4 text-sky-400" />
                Membros da Equipe ({DADOS_MEMBROS.length})
              </h2>
              <Button variant="outline" size="sm" className="text-xs">
                Convidar Membro
              </Button>
            </div>

            <div className="divide-y divide-border/60">
              {DADOS_MEMBROS.map((membro) => (
                <div key={membro.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={membro.avatar_url}
                      alt={membro.nome_completo}
                      className="h-7 w-7 rounded-full object-cover border border-border"
                    />
                    <div>
                      <p className="text-xs font-medium text-foreground">{membro.nome_completo}</p>
                      <p className="text-[11px] text-muted-foreground">{membro.email}</p>
                    </div>
                  </div>
                  <Badge variant={membro.cargo === 'admin' ? 'info' : 'secondary'} className="capitalize">
                    {membro.cargo}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Etapas do Funil & Dias de Estagnação (Rotting) - Totalmente Editáveis */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-amber-500" />
                  Etapas do Funil & Alertas de Estagnação (Rotting)
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Edite os nomes das fases, probabilidades e a quantidade de dias sem atividade para acionar o alerta visual de estagnação.
                </p>
              </div>

              {/* Seletor do Funil para Configuração */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">Funil:</span>
                <select
                  value={funilSelecionadoId}
                  onChange={(e) => handleTrocarFunil(e.target.value)}
                  className="h-8 rounded-lg border border-input bg-background px-2.5 py-1 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {funis.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome} {f.padrao ? '(Padrão)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cabeçalho da Tabela de Fases */}
            <div className="grid grid-cols-12 gap-2 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
              <div className="col-span-1 text-center">Ordem</div>
              <div className="col-span-4">Nome da Fase</div>
              <div className="col-span-3">Probabilidade (%)</div>
              <div className="col-span-3 flex items-center gap-1">
                <Flame className="h-3 w-3 text-rose-500" />
                <span>Estagnação (Rotting)</span>
              </div>
              <div className="col-span-1 text-center">Ações</div>
            </div>

            {/* Lista Editável de Etapas */}
            <div className="space-y-2.5">
              {etapas.map((etapa, idx) => (
                <div
                  key={etapa.id}
                  className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-xl border border-border/80 bg-muted/20 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  {/* Ordem & Controles */}
                  <div className="col-span-1 flex items-center justify-center gap-0.5">
                    <span className="font-mono text-xs font-bold text-muted-foreground w-4 text-center">
                      {idx + 1}
                    </span>
                    <div className="flex flex-col">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoverOrdem(idx, 'cima')}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-20 p-0.5"
                        title="Subir etapa"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === etapas.length - 1}
                        onClick={() => handleMoverOrdem(idx, 'baixo')}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-20 p-0.5"
                        title="Descer etapa"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Nome da Fase */}
                  <div className="col-span-4">
                    <Input
                      value={etapa.nome}
                      onChange={(e) => handleMudarCampoEtapa(etapa.id, 'nome', e.target.value)}
                      className="h-8 text-xs font-semibold"
                      placeholder="Nome da etapa..."
                    />
                  </div>

                  {/* Probabilidade % */}
                  <div className="col-span-3 flex items-center gap-1.5">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={etapa.probabilidade_fechamento}
                      onChange={(e) =>
                        handleMudarCampoEtapa(
                          etapa.id,
                          'probabilidade_fechamento',
                          Math.max(0, Math.min(100, parseInt(e.target.value) || 0))
                        )
                      }
                      className="h-8 text-xs font-mono"
                    />
                    <span className="text-xs font-mono text-muted-foreground">%</span>
                  </div>

                  {/* Dias de Estagnação / Rotting */}
                  <div className="col-span-3 flex items-center gap-1.5">
                    <Input
                      type="number"
                      min="1"
                      max="365"
                      value={etapa.dias_estagnacao}
                      onChange={(e) =>
                        handleMudarCampoEtapa(
                          etapa.id,
                          'dias_estagnacao',
                          Math.max(1, parseInt(e.target.value) || 1)
                        )
                      }
                      className="h-8 text-xs font-mono"
                    />
                    <span className="text-[11px] text-muted-foreground font-mono whitespace-nowrap">
                      dias
                    </span>
                  </div>

                  {/* Botão Excluir */}
                  <div className="col-span-1 flex items-center justify-center">
                    <button
                      type="button"
                      disabled={etapas.length <= 1}
                      onClick={() => handleRemoverEtapa(etapa.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors disabled:opacity-20"
                      title="Excluir etapa"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Adicionar Nova Etapa */}
            {!adicionando ? (
              <button
                type="button"
                onClick={() => setAdicionando(true)}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#E42358]/40 bg-[#E42358]/5 py-2.5 text-xs font-bold text-[#E42358] hover:bg-[#E42358]/10 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar Nova Etapa a este Funil
              </button>
            ) : (
              <div className="rounded-xl border border-[#E42358]/30 bg-[#E42358]/5 p-4 space-y-3 animate-in fade-in-0">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5 text-[#E42358]" />
                  Nova Etapa do Funil
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-6">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">
                      Nome da Etapa
                    </label>
                    <Input
                      autoFocus
                      placeholder="Ex: Auditoria Técnica, Contrato Assinado..."
                      value={novoNome}
                      onChange={(e) => setNovoNome(e.target.value)}
                      className="h-8 text-xs font-semibold"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">
                      Probabilidade (%)
                    </label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={novaProbabilidade}
                        onChange={(e) => setNovaProbabilidade(parseInt(e.target.value) || 0)}
                        className="h-8 text-xs font-mono"
                      />
                      <span className="text-xs font-mono text-muted-foreground">%</span>
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">
                      Alerta Rotting (Dias)
                    </label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min="1"
                        max="180"
                        value={novosDiasEstagnacao}
                        onChange={(e) => setNovosDiasEstagnacao(parseInt(e.target.value) || 1)}
                        className="h-8 text-xs font-mono"
                      />
                      <span className="text-[11px] font-mono text-muted-foreground">dias</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setNovoNome('');
                      setAdicionando(false);
                    }}
                    className="text-xs h-7"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={salvandoEtapas || !novoNome.trim()}
                    onClick={handleAdicionarEtapa}
                    className="bg-[#E42358] hover:bg-[#c91848] text-white text-xs h-7 px-3.5 font-bold"
                  >
                    Salvar Nova Etapa
                  </Button>
                </div>
              </div>
            )}

            {/* Rodapé com Botão Salvar Todas as Configurações */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                <span>O alerta de rotting (fogo vermelho no card) dispara automaticamente após X dias sem novas atividades.</span>
              </div>

              <Button
                type="button"
                onClick={handleSalvarConfiguracoesEtapas}
                disabled={salvandoEtapas}
                className="bg-[#0B132B] hover:bg-[#1C2541] text-white text-xs font-bold gap-1.5 px-4 h-8.5"
              >
                {salvandoEtapas ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    Salvando no Banco...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Salvar Alterações de Fases & Rotting
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
