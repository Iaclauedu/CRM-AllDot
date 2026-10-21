'use client';

import * as React from 'react';
import {
  FileText,
  CheckSquare,
  PhoneCall,
  MessageCircle,
  Clock,
  Send,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Layers,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatarDataHora, formatarData } from '@/lib/utils';
import type { Negocio, Atividade } from '@/lib/mock-data';

interface ColunaTimelineProps {
  negocio: Negocio;
  onAdicionarAtividade: (atividade: Atividade) => void;
  onConcluirAtividade: (atividadeId: string) => void;
}

export function ColunaTimeline({
  negocio,
  onAdicionarAtividade,
  onConcluirAtividade,
}: ColunaTimelineProps) {
  const [abaAtiva, setAbaAtiva] = React.useState<'nota' | 'tarefa' | 'log'>('nota');

  // Estados dos formulários de ação rápida
  const [conteudoNota, setConteudoNota] = React.useState('');

  const [tituloTarefa, setTituloTarefa] = React.useState('');
  const [tipoTarefa, setTipoTarefa] = React.useState<'tarefa' | 'reuniao' | 'ligacao' | 'whatsapp'>('reuniao');
  const [dataVencimento, setDataVencimento] = React.useState('');

  const [tituloLog, setTituloLog] = React.useState('');
  const [tipoLog, setTipoLog] = React.useState<'ligacao' | 'whatsapp'>('whatsapp');
  const [descricaoLog, setDescricaoLog] = React.useState('');

  const handleSalvarNota = (e: React.FormEvent) => {
    e.preventDefault();
    if (!conteudoNota.trim()) return;

    onAdicionarAtividade({
      id: crypto.randomUUID(),
      negocio_id: negocio.id,
      tipo: 'nota',
      titulo: conteudoNota,
      concluida_em: new Date().toISOString(),
      criado_por: 'Carlos Silva',
      criado_em: new Date().toISOString(),
    });

    setConteudoNota('');
  };

  const handleSalvarTarefa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tituloTarefa.trim()) return;

    onAdicionarAtividade({
      id: crypto.randomUUID(),
      negocio_id: negocio.id,
      tipo: tipoTarefa,
      titulo: tituloTarefa,
      data_vencimento: dataVencimento || new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      criado_por: 'Carlos Silva',
      criado_em: new Date().toISOString(),
    });

    setTituloTarefa('');
    setDataVencimento('');
  };

  const handleSalvarLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tituloLog.trim()) return;

    onAdicionarAtividade({
      id: crypto.randomUUID(),
      negocio_id: negocio.id,
      tipo: tipoLog,
      titulo: tituloLog,
      descricao: descricaoLog,
      concluida_em: new Date().toISOString(),
      criado_por: 'Carlos Silva',
      criado_em: new Date().toISOString(),
    });

    setTituloLog('');
    setDescricaoLog('');
  };

  // Timeline unificada ordenada por data decrescente
  const atividadesOrdenadas = React.useMemo(() => {
    const list = [...(negocio.atividades || [])];
    return list.sort(
      (a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
    );
  }, [negocio.atividades]);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Abas Superiores de Criação Rápida */}
      <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-1 border-b border-border/60 pb-2 mb-3">
          <button
            onClick={() => setAbaAtiva('nota')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              abaAtiva === 'nota'
                ? 'bg-accent text-foreground font-semibold'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
            }`}
          >
            <FileText className="h-3.5 w-3.5 text-amber-400" />
            <span>Criar Nota</span>
          </button>

          <button
            onClick={() => setAbaAtiva('tarefa')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              abaAtiva === 'tarefa'
                ? 'bg-accent text-foreground font-semibold'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
            }`}
          >
            <CheckSquare className="h-3.5 w-3.5 text-emerald-400" />
            <span>Agendar Tarefa</span>
          </button>

          <button
            onClick={() => setAbaAtiva('log')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              abaAtiva === 'log'
                ? 'bg-accent text-foreground font-semibold'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
            }`}
          >
            <PhoneCall className="h-3.5 w-3.5 text-sky-400" />
            <span>Log Ligação/WhatsApp</span>
          </button>
        </div>

        {/* Formulário Aba Nota */}
        {abaAtiva === 'nota' && (
          <form onSubmit={handleSalvarNota} className="space-y-2.5">
            <textarea
              value={conteudoNota}
              onChange={(e) => setConteudoNota(e.target.value)}
              placeholder="Digite anotações importantes sobre a negociação..."
              rows={3}
              className="w-full rounded-lg border border-input bg-background/50 p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <div className="flex justify-end">
              <Button type="submit" size="sm" className="gap-1.5">
                <Send className="h-3.5 w-3.5" />
                <span>Salvar Nota</span>
              </Button>
            </div>
          </form>
        )}

        {/* Formulário Aba Tarefa */}
        {abaAtiva === 'tarefa' && (
          <form onSubmit={handleSalvarTarefa} className="space-y-2.5">
            <Input
              value={tituloTarefa}
              onChange={(e) => setTituloTarefa(e.target.value)}
              placeholder="O que precisa ser feito? (Ex: Apresentar proposta técnica)"
              className="h-8"
              required
            />
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] text-muted-foreground block mb-0.5">Tipo</label>
                <select
                  value={tipoTarefa}
                  onChange={(e) => setTipoTarefa(e.target.value as any)}
                  className="flex h-8 w-full rounded-md border border-input bg-background/50 px-2 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="reuniao" className="bg-card">Reunião / Demo</option>
                  <option value="tarefa" className="bg-card">Tarefa Geral</option>
                  <option value="ligacao" className="bg-card">Ligação de Follow-up</option>
                  <option value="whatsapp" className="bg-card">Mensagem WhatsApp</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground block mb-0.5">Vencimento</label>
                <Input
                  type="datetime-local"
                  value={dataVencimento}
                  onChange={(e) => setDataVencimento(e.target.value)}
                  className="h-8 text-[11px]"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm" className="gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>Agendar Tarefa</span>
              </Button>
            </div>
          </form>
        )}

        {/* Formulário Aba Log Ligação / WhatsApp */}
        {abaAtiva === 'log' && (
          <form onSubmit={handleSalvarLog} className="space-y-2.5">
            <div className="grid grid-cols-3 gap-2.5">
              <div className="col-span-2">
                <Input
                  value={tituloLog}
                  onChange={(e) => setTituloLog(e.target.value)}
                  placeholder="Resumo da conversa ou ligação..."
                  className="h-8"
                  required
                />
              </div>
              <div>
                <select
                  value={tipoLog}
                  onChange={(e) => setTipoLog(e.target.value as any)}
                  className="flex h-8 w-full rounded-md border border-input bg-background/50 px-2 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="whatsapp" className="bg-card">WhatsApp</option>
                  <option value="ligacao" className="bg-card">Ligação Telefônica</option>
                </select>
              </div>
            </div>
            <textarea
              value={descricaoLog}
              onChange={(e) => setDescricaoLog(e.target.value)}
              placeholder="Principais pontos abordados, objeções ou próximos passos..."
              rows={2}
              className="w-full rounded-lg border border-input bg-background/50 p-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <div className="flex justify-end">
              <Button type="submit" size="sm" className="gap-1.5">
                <Check className="h-3.5 w-3.5" />
                <span>Registrar Log</span>
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Linha do Tempo Unificada (Timeline Reversa) */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
          Histórico e Atividades ({atividadesOrdenadas.length + 1})
        </h4>

        {/* Evento de Criação da Oportunidade */}
        <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-900/60">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </span>
              <span className="font-semibold text-foreground">Oportunidade Criada</span>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">
              {formatarData(negocio.ultima_atividade_em)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground pl-8">
            Negócio criado e adicionado à etapa do funil por Carlos Silva.
          </p>
        </div>

        {/* Eventos Dinâmicos da Timeline */}
        {atividadesOrdenadas.map((ativ) => {
          const isConcluida = !!ativ.concluida_em;

          return (
            <div
              key={ativ.id}
              className={`rounded-xl border p-3.5 transition-colors space-y-2 ${
                isConcluida
                  ? 'border-border/60 bg-card/40'
                  : 'border-amber-900/40 bg-card shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  {/* Ícone por tipo */}
                  <div className="mt-0.5">
                    {ativ.tipo === 'nota' && (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-950/60 text-amber-400 border border-amber-900/60">
                        <FileText className="h-3.5 w-3.5" />
                      </span>
                    )}
                    {ativ.tipo === 'reuniao' && (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-950/60 text-purple-400 border border-purple-900/60">
                        <Calendar className="h-3.5 w-3.5" />
                      </span>
                    )}
                    {ativ.tipo === 'whatsapp' && (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-900/60">
                        <MessageCircle className="h-3.5 w-3.5" />
                      </span>
                    )}
                    {ativ.tipo === 'ligacao' && (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-950/60 text-sky-400 border border-sky-900/60">
                        <PhoneCall className="h-3.5 w-3.5" />
                      </span>
                    )}
                    {ativ.tipo === 'tarefa' && (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                        <CheckSquare className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>

                  <div>
                    <span
                      className={`text-xs font-semibold ${
                        isConcluida ? 'text-foreground line-through opacity-80' : 'text-foreground'
                      }`}
                    >
                      {ativ.titulo}
                    </span>
                    {ativ.descricao && (
                      <p className="text-xs text-muted-foreground mt-0.5">{ativ.descricao}</p>
                    )}
                  </div>
                </div>

                {/* Checkbox de Conclusão ou Status */}
                <div>
                  {!isConcluida ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onConcluirAtividade(ativ.id)}
                      className="h-7 text-[11px] gap-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40"
                    >
                      <Check className="h-3 w-3" />
                      <span>Concluir</span>
                    </Button>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                      Concluída
                    </Badge>
                  )}
                </div>
              </div>

              {/* Data e autor */}
              <div className="flex items-center justify-between text-[10px] text-muted-foreground pl-8 pt-1 border-t border-border/30">
                <span>Por: {ativ.criado_por}</span>
                <span>
                  {ativ.data_vencimento
                    ? `Vencimento: ${formatarDataHora(ativ.data_vencimento)}`
                    : formatarDataHora(ativ.criado_em)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
