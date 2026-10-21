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
  atualizarNomeOuPropriedadesEtapaBanco,
  adicionarEtapaAoFunilBanco,
  removerEtapaDoFunilBanco,
} from '@/lib/supabase/service';
import { type Funil, type EtapaFunil, type Negocio } from '@/lib/mock-data';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
  Layers,
  AlertCircle,
  Check,
  Edit2,
  Flame,
} from 'lucide-react';

interface ModalGerenciarFasesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funil: Funil;
  etapas: EtapaFunil[];
  negocios: Negocio[];
  onEtapasAtualizadas: (novasEtapas: EtapaFunil[], negociosAtualizados?: Negocio[]) => void;
}

export function ModalGerenciarFases({
  open,
  onOpenChange,
  funil,
  etapas: etapasProp,
  negocios,
  onEtapasAtualizadas,
}: ModalGerenciarFasesProps) {
  const [etapas, setEtapas] = React.useState<EtapaFunil[]>(etapasProp);
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  // Nova fase rápida
  const [adicionando, setAdicionando] = React.useState(false);
  const [novoNome, setNovoNome] = React.useState('');
  const [novaProbabilidade, setNovaProbabilidade] = React.useState<number>(50);
  const [novoDiasEstagnacao, setNovoDiasEstagnacao] = React.useState<number>(7);

  // Confirmação de exclusão com migração
  const [etapaParaRemover, setEtapaParaRemover] = React.useState<EtapaFunil | null>(null);
  const [etapaDestinoId, setEtapaDestinoId] = React.useState<string>('');

  React.useEffect(() => {
    setEtapas(etapasProp);
  }, [etapasProp, open]);

  // Contagem de negócios por etapa
  const contarNegocios = (etapaId: string) => {
    return negocios.filter((n) => n.etapa_id === etapaId).length;
  };

  // Alterar nome localmente
  const handleMudarNome = (etapaId: string, nome: string) => {
    setEtapas((prev) =>
      prev.map((e) => (e.id === etapaId ? { ...e, nome } : e))
    );
  };

  // Alterar probabilidade
  const handleMudarProbabilidade = (etapaId: string, prob: number) => {
    const limpo = Math.max(0, Math.min(100, prob || 0));
    setEtapas((prev) =>
      prev.map((e) => (e.id === etapaId ? { ...e, probabilidade_fechamento: limpo } : e))
    );
  };

  // Alterar dias de estagnação (Rotting)
  const handleMudarDiasEstagnacao = (etapaId: string, dias: number) => {
    const limpo = Math.max(1, Math.min(365, dias || 7));
    setEtapas((prev) =>
      prev.map((e) => (e.id === etapaId ? { ...e, dias_estagnacao: limpo } : e))
    );
  };

  // Mover ordem para cima/baixo
  const handleMover = (idx: number, direcao: 'cima' | 'baixo') => {
    const novoIdx = direcao === 'cima' ? idx - 1 : idx + 1;
    if (novoIdx < 0 || novoIdx >= etapas.length) return;

    const copia = [...etapas];
    const item = copia.splice(idx, 1)[0];
    copia.splice(novoIdx, 0, item);

    // Reatribui ordem sequencial
    const reordenadas = copia.map((e, i) => ({ ...e, ordem: i + 1 }));
    setEtapas(reordenadas);
  };

  // Adicionar nova etapa
  const handleConfirmarAdicionarEtapa = async () => {
    if (!novoNome.trim()) return;

    setSalvando(true);
    try {
      const novaOrdem = etapas.length + 1;
      const criada = await adicionarEtapaAoFunilBanco(
        funil.id,
        novoNome.trim(),
        novaOrdem,
        novaProbabilidade,
        novoDiasEstagnacao
      );

      const listaNova = [...etapas, criada];
      setEtapas(listaNova);
      onEtapasAtualizadas(listaNova);

      setNovoNome('');
      setNovaProbabilidade(50);
      setNovoDiasEstagnacao(7);
      setAdicionando(false);
    } catch (err) {
      console.error('Erro ao adicionar etapa:', err);
      setErro('Falha ao adicionar nova fase.');
    } finally {
      setSalvando(false);
    }
  };

  // Iniciar exclusão de etapa
  const handleSolicitarRemover = (etapa: EtapaFunil) => {
    if (etapas.length <= 1) {
      setErro('O funil precisa conter pelo menos 1 fase.');
      return;
    }

    const qtdDeals = contarNegocios(etapa.id);
    if (qtdDeals > 0) {
      // Precisa escolher uma etapa de destino
      const outraEtapa = etapas.find((e) => e.id !== etapa.id);
      setEtapaDestinoId(outraEtapa?.id || '');
      setEtapaParaRemover(etapa);
    } else {
      // Exclui direto
      executarExclusao(etapa.id);
    }
  };

  const executarExclusao = async (etapaId: string, destinoId?: string) => {
    setSalvando(true);
    try {
      await removerEtapaDoFunilBanco(etapaId, destinoId);

      const listaNova = etapas
        .filter((e) => e.id !== etapaId)
        .map((e, i) => ({ ...e, ordem: i + 1 }));

      setEtapas(listaNova);

      let negociosAtualizados: Negocio[] | undefined = undefined;
      if (destinoId) {
        negociosAtualizados = negocios.map((n) =>
          n.etapa_id === etapaId ? { ...n, etapa_id: destinoId } : n
        );
      }

      onEtapasAtualizadas(listaNova, negociosAtualizados);
      setEtapaParaRemover(null);
    } catch (err) {
      console.error('Erro ao remover etapa:', err);
      setErro('Falha ao remover fase.');
    } finally {
      setSalvando(false);
    }
  };

  // Salvar alterações de nomes/probabilidades
  const handleSalvarTudo = async () => {
    setSalvando(true);
    setErro(null);

    try {
      for (const etapa of etapas) {
        await atualizarNomeOuPropriedadesEtapaBanco(etapa.id, {
          nome: etapa.nome,
          ordem: etapa.ordem,
          probabilidade_fechamento: etapa.probabilidade_fechamento,
          dias_estagnacao: etapa.dias_estagnacao,
        });
      }

      onEtapasAtualizadas(etapas);
      onOpenChange(false);
    } catch (err) {
      console.error('Erro ao salvar fases:', err);
      setErro('Ocorreu um erro ao persistir as alterações.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="space-y-4">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[#E42358]/10 text-[#E42358] flex items-center justify-center font-bold">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Personalizar Fases do Funil
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Configurando fases de: <span className="font-semibold text-foreground">{funil.nome}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {erro && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {/* Confirmação de Migração de Negócios antes da exclusão */}
        {etapaParaRemover && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 space-y-2.5 text-xs text-amber-900 animate-in fade-in-0">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span>Atenção: Existem {contarNegocios(etapaParaRemover.id)} negócios nesta fase!</span>
            </div>
            <p className="text-[11px] text-amber-800">
              Para excluir a fase <strong>{etapaParaRemover.nome}</strong>, escolha para qual fase do funil os negócios existentes serão movidos:
            </p>
            <div className="flex items-center gap-2">
              <select
                value={etapaDestinoId}
                onChange={(e) => setEtapaDestinoId(e.target.value)}
                className="h-8 flex-1 rounded-md border border-amber-300 bg-white px-2 py-1 text-xs text-slate-800 font-medium"
              >
                {etapas
                  .filter((e) => e.id !== etapaParaRemover.id)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.ordem}. {e.nome}
                    </option>
                  ))}
              </select>
              <Button
                size="sm"
                variant="destructive"
                disabled={salvando}
                onClick={() => executarExclusao(etapaParaRemover.id, etapaDestinoId)}
                className="text-xs h-8 px-3 font-bold"
              >
                Mover & Excluir
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEtapaParaRemover(null)}
                className="text-xs h-8"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Lista de Fases do Funil */}
        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
          {etapas.map((etapa, idx) => {
            const qtdDeals = contarNegocios(etapa.id);

            return (
              <div
                key={etapa.id}
                className="flex items-center gap-2.5 rounded-xl border border-border/80 bg-muted/20 p-2.5 transition-all hover:border-slate-300 dark:hover:border-slate-700"
              >
                {/* Botões de Ordem */}
                <div className="flex flex-col items-center justify-center shrink-0">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMover(idx, 'cima')}
                    className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20"
                    title="Mover para cima"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <span className="font-mono text-[10px] font-bold text-muted-foreground">
                    {idx + 1}
                  </span>
                  <button
                    type="button"
                    disabled={idx === etapas.length - 1}
                    onClick={() => handleMover(idx, 'baixo')}
                    className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20"
                    title="Mover para baixo"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Nome da Fase (Input Editável) */}
                <div className="flex-1 min-w-[130px]">
                  <Input
                    value={etapa.nome}
                    onChange={(e) => handleMudarNome(etapa.id, e.target.value)}
                    placeholder="Nome da fase..."
                    className="h-8 text-xs font-semibold"
                  />
                </div>

                {/* Probabilidade de Fechamento % */}
                <div className="w-20 shrink-0 flex items-center gap-1" title="Probabilidade de Fechamento (%)">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={etapa.probabilidade_fechamento}
                    onChange={(e) =>
                      handleMudarProbabilidade(etapa.id, parseInt(e.target.value) || 0)
                    }
                    className="h-8 text-xs font-mono text-center pr-1"
                    title="Probabilidade de Fechamento (%)"
                  />
                  <span className="text-[10px] font-bold text-muted-foreground font-mono">%</span>
                </div>

                {/* Alerta de Estagnação / Rotting em dias */}
                <div className="w-20 shrink-0 flex items-center gap-1" title="Alerta de Estagnação / Rotting (dias sem atividade)">
                  <Flame className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <Input
                    type="number"
                    min="1"
                    max="365"
                    value={etapa.dias_estagnacao || 7}
                    onChange={(e) =>
                      handleMudarDiasEstagnacao(etapa.id, parseInt(e.target.value) || 7)
                    }
                    className="h-8 text-xs font-mono text-center pr-1"
                    title="Alerta de Rotting (dias)"
                  />
                  <span className="text-[10px] font-bold text-muted-foreground font-mono">d</span>
                </div>

                {/* Badge de Negócios Vinculados */}
                <Badge
                  variant={qtdDeals > 0 ? 'secondary' : 'outline'}
                  className="shrink-0 text-[10px] font-mono h-6 px-1.5"
                  title={`${qtdDeals} oportunidades nesta fase`}
                >
                  {qtdDeals} {qtdDeals === 1 ? 'deal' : 'deals'}
                </Badge>

                {/* Botão de Excluir */}
                <button
                  type="button"
                  onClick={() => handleSolicitarRemover(etapa)}
                  disabled={etapas.length <= 1}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors disabled:opacity-20"
                  title="Remover esta fase do funil"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Adicionar Nova Fase */}
        {!adicionando ? (
          <button
            type="button"
            onClick={() => setAdicionando(true)}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#E42358]/40 bg-[#E42358]/5 py-2 text-xs font-bold text-[#E42358] hover:bg-[#E42358]/10 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar Nova Fase ao Funil
          </button>
        ) : (
          <div className="rounded-xl border border-[#E42358]/30 bg-[#E42358]/5 p-3 space-y-2.5 animate-in fade-in-0">
            <span className="text-xs font-bold text-foreground flex items-center gap-1">
              <Plus className="h-3.5 w-3.5 text-[#E42358]" />
              Nova Fase
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-6">
                <Input
                  autoFocus
                  placeholder="Nome da fase (Ex: Validação Legal...)"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  className="h-8 text-xs font-semibold"
                />
              </div>
              <div className="sm:col-span-3 flex items-center gap-1" title="Probabilidade de Fechamento">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={novaProbabilidade}
                  onChange={(e) => setNovaProbabilidade(parseInt(e.target.value) || 0)}
                  placeholder="Prob. %"
                  className="h-8 text-xs font-mono text-center"
                />
                <span className="text-[10px] font-bold text-muted-foreground font-mono">%</span>
              </div>
              <div className="sm:col-span-3 flex items-center gap-1" title="Dias para Estagnação (Rotting)">
                <Flame className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={novoDiasEstagnacao}
                  onChange={(e) => setNovoDiasEstagnacao(parseInt(e.target.value) || 7)}
                  placeholder="Dias"
                  className="h-8 text-xs font-mono text-center"
                />
                <span className="text-[10px] font-bold text-muted-foreground font-mono">d</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
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
                disabled={salvando || !novoNome.trim()}
                onClick={handleConfirmarAdicionarEtapa}
                className="bg-[#E42358] hover:bg-[#c91848] text-white text-xs h-7 px-3 font-bold"
              >
                Adicionar Fase
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-border/40">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Fechar
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={salvando}
            onClick={handleSalvarTudo}
            className="bg-[#0B132B] hover:bg-[#1C2541] text-white text-xs font-bold px-4"
          >
            {salvando ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Salvando Fases...
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5 mr-1.5" />
                Salvar Alterações
              </>
            )}
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
