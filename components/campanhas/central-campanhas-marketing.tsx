'use client';

import * as React from 'react';
import {
  Megaphone,
  Plus,
  Send,
  CalendarClock,
  Users,
  BarChart3,
  Download,
  Eye,
  Copy,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  MousePointerClick,
  MailOpen,
  UserMinus,
  TrendingUp,
  Play,
  Loader2,
  Filter,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  listarListasMarketingNoBanco,
  salvarListaMarketingNoBanco,
  excluirListaMarketingNoBanco,
  resolverDestinatariosLista,
  listarCampanhasMarketingNoBanco,
  salvarCampanhaMarketingNoBanco,
  excluirCampanhaMarketingNoBanco,
  listarEnviosCampanhaNoBanco,
  listarCliquesCampanhaNoBanco,
  buscarTemplatesEmailDoBanco,
  buscarConfigServidorEmail,
  type DestinatarioResolvido,
} from '@/lib/supabase/service';
import type {
  CampanhaClique,
  CampanhaEnvio,
  CampanhaMarketing,
  ListaMarketing,
  TemplateEmail,
} from '@/lib/mock-data';

type AbaMarketing = 'campanhas' | 'nova' | 'listas' | 'comparativo';

function formatarPct(parte: number, total: number): string {
  if (!total || total <= 0) return '0,0%';
  return `${((parte / total) * 100).toFixed(1).replace('.', ',')}%`;
}

function formatarDataHora(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor || 0);
}

function baixarCsv(nomeArquivo: string, linhas: string[][]) {
  const csvContent =
    '\uFEFF' +
    linhas
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
          .join(';')
      )
      .join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}

export function CentralCampanhasMarketing() {
  const [aba, setAba] = React.useState<AbaMarketing>('campanhas');
  const [carregando, setCarregando] = React.useState(true);
  const [aviso, setAviso] = React.useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const [campanhas, setCampanhas] = React.useState<CampanhaMarketing[]>([]);
  const [listas, setListas] = React.useState<ListaMarketing[]>([]);
  const [templates, setTemplates] = React.useState<TemplateEmail[]>([]);
  const [remetentePadrao, setRemetentePadrao] = React.useState({
    nome: 'Comercial Brinday Personalizados',
    email: 'comercial@brindaypersonalizados.com.br',
  });

  // Form Nova/Editar Campanha
  const [campanhaEditId, setCampanhaEditId] = React.useState<string | undefined>(undefined);
  const [nomeCampanha, setNomeCampanha] = React.useState('');
  const [listaIdSelecionada, setListaIdSelecionada] = React.useState('');
  const [templateIdSelecionado, setTemplateIdSelecionado] = React.useState('');
  const [assunto, setAssunto] = React.useState('');
  const [nomeRemetente, setNomeRemetente] = React.useState('');
  const [emailRemetente, setEmailRemetente] = React.useState('');
  const [corpoHtml, setCorpoHtml] = React.useState('');
  const [utmCampaign, setUtmCampaign] = React.useState('');
  const [agendadoPara, setAgendadoPara] = React.useState('');
  const [emailTeste, setEmailTeste] = React.useState('');
  const [previaAudiencia, setPreviaAudiencia] = React.useState<{
    elegiveis: DestinatarioResolvido[];
    bloqueados: DestinatarioResolvido[];
  }>({ elegiveis: [], bloqueados: [] });
  const [enviandoTeste, setEnviandoTeste] = React.useState(false);
  const [salvandoCampanha, setSalvandoCampanha] = React.useState(false);
  const [disparandoId, setDisparandoId] = React.useState<string | null>(null);
  const [processandoAgendadas, setProcessandoAgendadas] = React.useState(false);
  const [mostrarPreviewModal, setMostrarPreviewModal] = React.useState(false);

  // Relatório detalhado da campanha
  const [campanhaRelatorio, setCampanhaRelatorio] = React.useState<CampanhaMarketing | null>(null);
  const [enviosRelatorio, setEnviosRelatorio] = React.useState<CampanhaEnvio[]>([]);
  const [cliquesRelatorio, setCliquesRelatorio] = React.useState<CampanhaClique[]>([]);
  const [carregandoRelatorio, setCarregandoRelatorio] = React.useState(false);

  // Nova / Editar Lista
  const [modalListaAberto, setModalListaAberto] = React.useState(false);
  const [listaNome, setListaNome] = React.useState('');
  const [listaDesc, setListaDesc] = React.useState('');
  const [listaTipo, setListaTipo] = React.useState<'dinamica' | 'estatica'>('dinamica');
  const [listaStatusNeg, setListaStatusNeg] = React.useState<'todos' | 'aberto' | 'ganho' | 'perdido'>('todos');
  const [listaOrigem, setListaOrigem] = React.useState('');
  const [listaProduto, setListaProduto] = React.useState('');
  const [listaUtm, setListaUtm] = React.useState('');
  const [listaInatividade, setListaInatividade] = React.useState('');
  const [listaContatosTexto, setListaContatosTexto] = React.useState('');
  const [listaPreviewDest, setListaPreviewDest] = React.useState<{
    lista: ListaMarketing;
    elegiveis: DestinatarioResolvido[];
    bloqueados: DestinatarioResolvido[];
  } | null>(null);

  const carregarTudo = React.useCallback(async () => {
    setCarregando(true);
    try {
      const [camps, lsts, tmpls, smtpCfg] = await Promise.all([
        listarCampanhasMarketingNoBanco(),
        listarListasMarketingNoBanco(),
        buscarTemplatesEmailDoBanco(),
        buscarConfigServidorEmail(),
      ]);
      setCampanhas(camps);
      setListas(lsts);
      setTemplates(tmpls);
      const rem = {
        nome: smtpCfg.nome_remetente || 'Comercial Brinday Personalizados',
        email: smtpCfg.email_remetente || 'comercial@brindaypersonalizados.com.br',
      };
      setRemetentePadrao(rem);
      if (!nomeRemetente) setNomeRemetente(rem.nome);
      if (!emailRemetente) setEmailRemetente(rem.email);
      if (!listaIdSelecionada && lsts[0]) setListaIdSelecionada(lsts[0].id);
    } finally {
      setCarregando(false);
    }
  }, [emailRemetente, listaIdSelecionada, nomeRemetente]);

  React.useEffect(() => {
    carregarTudo();
  }, [carregarTudo]);

  React.useEffect(() => {
    const lista = listas.find((l) => l.id === listaIdSelecionada);
    if (!lista) return;
    resolverDestinatariosLista(lista).then(setPreviaAudiencia).catch(() => { });
  }, [listaIdSelecionada, listas]);

  const totaisGerais = React.useMemo(() => {
    return campanhas.reduce(
      (acc, c) => {
        acc.enviados += c.total_enviados || 0;
        acc.entregues += c.total_entregues || 0;
        acc.aberturas += c.total_aberturas || 0;
        acc.cliques += c.total_cliques || 0;
        acc.bounces += (c.total_bounces_temp || 0) + (c.total_bounces_perm || 0);
        acc.descadastramentos += c.total_descadastramentos || 0;
        acc.conversoes += c.total_conversoes || 0;
        acc.receita += c.receita_convertida || 0;
        return acc;
      },
      {
        enviados: 0,
        entregues: 0,
        aberturas: 0,
        cliques: 0,
        bounces: 0,
        descadastramentos: 0,
        conversoes: 0,
        receita: 0,
      }
    );
  }, [campanhas]);

  const aplicarTemplate = (tid: string) => {
    setTemplateIdSelecionado(tid);
    const tmpl = templates.find((t) => t.id === tid);
    if (tmpl) {
      setAssunto(tmpl.assunto);
      setCorpoHtml(tmpl.corpo_html);
    }
  };

  const abrirRelatorioDetalhado = async (camp: CampanhaMarketing) => {
    setCampanhaRelatorio(camp);
    setCarregandoRelatorio(true);
    try {
      const [envs, clqs] = await Promise.all([
        listarEnviosCampanhaNoBanco(camp.id),
        listarCliquesCampanhaNoBanco(camp.id),
      ]);
      setEnviosRelatorio(envs);
      setCliquesRelatorio(clqs);
    } finally {
      setCarregandoRelatorio(false);
    }
  };

  const handleTestarEnvio = async () => {
    if (!emailTeste.trim()) {
      setAviso({ tipo: 'erro', texto: 'Informe um e-mail destinatário para o teste.' });
      return;
    }
    setEnviandoTeste(true);
    setAviso(null);
    try {
      const res = await fetch('/api/campanhas/disparar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'testar',
          email_teste: emailTeste.trim(),
          assunto: assunto || `[Teste] ${nomeCampanha || 'Campanha'}`,
          corpo_html: corpoHtml,
          nome_remetente: nomeRemetente || remetentePadrao.nome,
          email_remetente: emailRemetente || remetentePadrao.email,
          template_id: templateIdSelecionado || undefined,
        }),
      });
      const json = await res.json();
      setAviso({
        tipo: json.sucesso ? 'ok' : 'erro',
        texto: json.mensagem || json.erro || 'Teste concluído.',
      });
    } catch {
      setAviso({ tipo: 'erro', texto: 'Erro de rede ao testar envio.' });
    } finally {
      setEnviandoTeste(false);
    }
  };

  const handleSalvarCampanha = async (modo: 'rascunho' | 'agendar' | 'disparar') => {
    if (!nomeCampanha.trim() || !assunto.trim()) {
      setAviso({ tipo: 'erro', texto: 'Preencha o Nome da Campanha e o Assunto.' });
      return;
    }
    if (modo === 'agendar' && !agendadoPara) {
      setAviso({ tipo: 'erro', texto: 'Informe Data e Horário para agendar a campanha.' });
      return;
    }

    setSalvandoCampanha(true);
    setAviso(null);
    try {
      const lista = listas.find((l) => l.id === listaIdSelecionada);
      const tmpl = templates.find((t) => t.id === templateIdSelecionado);

      const salva = await salvarCampanhaMarketingNoBanco({
        id: campanhaEditId,
        nome: nomeCampanha.trim(),
        lista_id: lista?.id || '',
        lista_nome: lista?.nome || 'Segmento Geral',
        template_id: tmpl?.id,
        template_nome: tmpl?.nome || 'Modelo Personalizado',
        assunto: assunto.trim(),
        nome_remetente: nomeRemetente || remetentePadrao.nome,
        email_remetente: emailRemetente || remetentePadrao.email,
        corpo_html: corpoHtml,
        utm_campaign:
          utmCampaign.trim() ||
          nomeCampanha
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_|_$/g, ''),
        utm_source: 'alldot_crm',
        utm_medium: 'email_marketing',
        status: modo === 'agendar' ? 'agendada' : 'rascunho',
        agendado_para: agendadoPara ? new Date(agendadoPara).toISOString() : undefined,
        total_destinatarios: previaAudiencia.elegiveis.length,
      });

      if (modo === 'disparar') {
        const res = await fetch('/api/campanhas/disparar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ acao: 'disparar_agora', campanha_id: salva.id }),
        });
        const json = await res.json();
        setAviso({
          tipo: json.sucesso ? 'ok' : 'erro',
          texto: json.mensagem || json.erro || 'Campanha disparada.',
        });
      } else {
        setAviso({
          tipo: 'ok',
          texto:
            modo === 'agendar'
              ? `Campanha agendada para ${formatarDataHora(salva.agendado_para)}!`
              : 'Rascunho de campanha salvo com sucesso!',
        });
      }

      setCampanhaEditId(undefined);
      setNomeCampanha('');
      setAssunto('');
      setCorpoHtml('');
      setUtmCampaign('');
      setAgendadoPara('');
      await carregarTudo();
      setAba('campanhas');
    } finally {
      setSalvandoCampanha(false);
    }
  };

  const handleDispararExistente = async (camp: CampanhaMarketing) => {
    setDisparandoId(camp.id);
    setAviso(null);
    try {
      const res = await fetch('/api/campanhas/disparar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'disparar_agora', campanha_id: camp.id }),
      });
      const json = await res.json();
      setAviso({
        tipo: json.sucesso ? 'ok' : 'erro',
        texto: json.mensagem || json.erro || 'Disparo concluído.',
      });
      await carregarTudo();
    } finally {
      setDisparandoId(null);
    }
  };

  const handleProcessarAgendadas = async () => {
    setProcessandoAgendadas(true);
    setAviso(null);
    try {
      const res = await fetch('/api/campanhas/disparar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'processar_agendadas' }),
      });
      const json = await res.json();
      setAviso({
        tipo: json.sucesso ? 'ok' : 'erro',
        texto: `Verificação concluída: ${json.processadas || 0} campanha(s) agendada(s) disparada(s).`,
      });
      await carregarTudo();
    } finally {
      setProcessandoAgendadas(false);
    }
  };

  const handleDuplicarCampanha = (camp: CampanhaMarketing) => {
    setCampanhaEditId(undefined);
    setNomeCampanha(`${camp.nome} (Cópia)`);
    setListaIdSelecionada(camp.lista_id || listas[0]?.id || '');
    setTemplateIdSelecionado(camp.template_id || '');
    setAssunto(camp.assunto);
    setNomeRemetente(camp.nome_remetente);
    setEmailRemetente(camp.email_remetente);
    setCorpoHtml(camp.corpo_html);
    setUtmCampaign(`${camp.utm_campaign || 'campanha'}_v2`);
    setAba('nova');
  };

  const handleExportarCsvCampanha = async (camp: CampanhaMarketing) => {
    const [envs, clqs] = await Promise.all([
      listarEnviosCampanhaNoBanco(camp.id),
      listarCliquesCampanhaNoBanco(camp.id),
    ]);

    const linhas: string[][] = [
      ['Campanha', camp.nome],
      ['Segmento', camp.lista_nome],
      ['Status', camp.status],
      ['Enviados', String(camp.total_enviados)],
      ['Entregues', `${camp.total_entregues} (${formatarPct(camp.total_entregues, camp.total_enviados)})`],
      ['Aberturas', `${camp.total_aberturas} (${formatarPct(camp.total_aberturas, camp.total_entregues)})`],
      ['Cliques', `${camp.total_cliques} (${formatarPct(camp.total_cliques, camp.total_entregues)})`],
      ['Bounces Temporários', String(camp.total_bounces_temp)],
      ['Bounces Permanentes', String(camp.total_bounces_perm)],
      ['Descadastramentos', String(camp.total_descadastramentos)],
      ['Conversões', String(camp.total_conversoes)],
      ['Receita Convertida', formatarMoeda(camp.receita_convertida)],
      [],
      ['--- DETALHAMENTO POR DESTINATÁRIO ---'],
      ['Nome', 'E-mail', 'Status', 'Código SMTP', 'Aberturas', 'Cliques', 'Descadastrado', 'Converteu', 'Valor Conversão'],
      ...envs.map((e) => [
        e.destinatario_nome || '',
        e.destinatario_email,
        e.status,
        e.smtp_codigo || '',
        String(e.aberturas_qtd),
        String(e.cliques_qtd),
        e.descadastrado ? 'Sim' : 'Não',
        e.converteu ? 'Sim' : 'Não',
        String(e.valor_conversao || 0),
      ]),
      [],
      ['--- CLIQUES POR CONTATO ---'],
      ['Nome', 'E-mail', 'URL Clicada', 'Data/Hora'],
      ...clqs.map((c) => [
        c.destinatario_nome || '',
        c.destinatario_email,
        c.url_destino,
        formatarDataHora(c.clicado_em),
      ]),
    ];

    baixarCsv(`relatorio_campanha_${camp.utm_campaign || camp.id.slice(0, 8)}.csv`, linhas);
  };

  const handleSalvarLista = async () => {
    if (!listaNome.trim()) return;
    const contatosEstaticos =
      listaTipo === 'estatica'
        ? listaContatosTexto
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean)
          .map((linha) => {
            const [email, nome] = linha.split(',').map((s) => s.trim());
            return { email, nome };
          })
          .filter((c) => c.email.includes('@'))
        : undefined;

    await salvarListaMarketingNoBanco({
      nome: listaNome.trim().toUpperCase().replace(/\s+/g, '_'),
      descricao: listaDesc.trim() || 'Segmentação personalizada de e-mail marketing',
      tipo: listaTipo,
      criterios: {
        status_negocio: listaStatusNeg,
        origem_contem: listaOrigem.trim() || undefined,
        produto_ou_interesse_contem: listaProduto.trim() || undefined,
        utm_campaign_contem: listaUtm.trim() || undefined,
        dias_inatividade_min: listaInatividade ? Number(listaInatividade) : undefined,
      },
      contatos_estaticos: contatosEstaticos,
      ativa: true,
    });

    setModalListaAberto(false);
    setListaNome('');
    setListaDesc('');
    setListaContatosTexto('');
    await carregarTudo();
  };

  return (
    <div className="space-y-6">
      {/* Navegação por Abas */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'campanhas', label: 'Campanhas & Resultados', icone: Megaphone },
            { id: 'nova', label: 'Nova / Agendar Campanha', icone: Plus },
            { id: 'listas', label: 'Listas & Segmentações', icone: Users },
            { id: 'comparativo', label: 'Comparativo & Exportação', icone: BarChart3 },
          ].map((item) => {
            const Icon = item.icone;
            const ativo = aba === item.id;
            return (
              <Button
                key={item.id}
                variant={ativo ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAba(item.id as AbaMarketing)}
                className="gap-1.5"
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleProcessarAgendadas}
            disabled={processandoAgendadas}
            className="gap-1.5 text-xs"
          >
            {processandoAgendadas ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Processar Agendadas
          </Button>
          <Button
            size="sm"
            onClick={() => setAba('nova')}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Criar Campanha
          </Button>
        </div>
      </div>

      {aviso && (
        <div
          className={`flex items-center justify-between rounded-lg border px-4 py-3 text-xs ${aviso.tipo === 'ok'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
            }`}
        >
          <div className="flex items-center gap-2">
            {aviso.tipo === 'ok' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            <span>{aviso.texto}</span>
          </div>
          <button onClick={() => setAviso(null)} className="text-[11px] underline ml-4">
            Fechar
          </button>
        </div>
      )}

      {/* ABA 1: CAMPANHAS & RESULTADOS */}
      {aba === 'campanhas' && (
        <div className="space-y-6">
          {/* KPIs Consolidados */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="rounded-xl border border-border bg-card p-3.5">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Enviados</span>
                <Send className="h-3.5 w-3.5 text-indigo-500" />
              </div>
              <p className="mt-1 text-xl font-bold">{totaisGerais.enviados}</p>
              <p className="text-[10px] text-muted-foreground">Submetidos ao SMTP</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-3.5">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Entregues</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <p className="mt-1 text-xl font-bold">
                {formatarPct(totaisGerais.entregues, totaisGerais.enviados)}
              </p>
              <p className="text-[10px] text-muted-foreground">{totaisGerais.entregues} aceitos</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-3.5">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Abertura</span>
                <MailOpen className="h-3.5 w-3.5 text-sky-500" />
              </div>
              <p className="mt-1 text-xl font-bold">
                {formatarPct(totaisGerais.aberturas, totaisGerais.entregues)}
              </p>
              <p className="text-[10px] text-muted-foreground">{totaisGerais.aberturas} aberturas</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-3.5">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Cliques (CTR)</span>
                <MousePointerClick className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <p className="mt-1 text-xl font-bold">
                {formatarPct(totaisGerais.cliques, totaisGerais.entregues)}
              </p>
              <p className="text-[10px] text-muted-foreground">{totaisGerais.cliques} contatos</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-3.5">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Rejeições</span>
                <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
              </div>
              <p className="mt-1 text-xl font-bold">{totaisGerais.bounces}</p>
              <p className="text-[10px] text-muted-foreground">Soft + Hard bounces</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-3.5">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Opt-out</span>
                <UserMinus className="h-3.5 w-3.5 text-slate-500" />
              </div>
              <p className="mt-1 text-xl font-bold">{totaisGerais.descadastramentos}</p>
              <p className="text-[10px] text-muted-foreground">Descadastramentos</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-3.5">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Conversões</span>
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <p className="mt-1 text-xl font-bold">{totaisGerais.conversoes}</p>
              <p className="text-[10px] text-emerald-600 font-medium">
                {formatarMoeda(totaisGerais.receita)}
              </p>
            </div>
          </div>

          {/* Lista de Campanhas */}
          <div className="space-y-3">
            {carregando ? (
              <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Carregando campanhas...
              </div>
            ) : campanhas.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-10 text-center text-xs text-muted-foreground">
                Nenhuma campanha criada ainda. Clique em &ldquo;Criar Campanha&rdquo; para começar.
              </div>
            ) : (
              campanhas.map((camp) => (
                <div
                  key={camp.id}
                  className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">{camp.nome}</h3>
                        <Badge
                          variant={
                            camp.status === 'concluida'
                              ? 'default'
                              : camp.status === 'agendada'
                                ? 'secondary'
                                : 'outline'
                          }
                          className="text-[10px] uppercase"
                        >
                          {camp.status}
                        </Badge>
                        <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                          {camp.lista_nome}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <strong>Assunto:</strong> {camp.assunto} • <strong>Remetente:</strong>{' '}
                        {camp.nome_remetente} &lt;{camp.email_remetente}&gt;
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {camp.agendado_para
                          ? `Programada para: ${formatarDataHora(camp.agendado_para)}`
                          : `Criada em: ${formatarDataHora(camp.criado_em)}`}
                        {camp.utm_campaign ? ` • utm_campaign=${camp.utm_campaign}` : ''}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {(camp.status === 'rascunho' || camp.status === 'agendada') && (
                        <Button
                          size="sm"
                          onClick={() => handleDispararExistente(camp)}
                          disabled={disparandoId === camp.id}
                          className="h-7 text-xs gap-1"
                        >
                          {disparandoId === camp.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Play className="h-3 w-3" />
                          )}
                          Disparar
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => abrirRelatorioDetalhado(camp)}
                        className="h-7 text-xs gap-1"
                      >
                        <BarChart3 className="h-3 w-3" />
                        Detalhes & Cliques
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDuplicarCampanha(camp)}
                        className="h-7 text-xs gap-1"
                      >
                        <Copy className="h-3 w-3" />
                        Reutilizar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportarCsvCampanha(camp)}
                        className="h-7 text-xs gap-1"
                      >
                        <Download className="h-3 w-3" />
                        CSV
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          await excluirCampanhaMarketingNoBanco(camp.id);
                          carregarTudo();
                        }}
                        className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600"
                        title="Excluir campanha"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Barra de Métricas da Campanha */}
                  <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 rounded-lg bg-muted/40 p-2.5 text-center text-[11px]">
                    <div>
                      <span className="block text-muted-foreground">Enviados</span>
                      <strong className="text-foreground">{camp.total_enviados}</strong>
                    </div>
                    <div>
                      <span className="block text-muted-foreground">Entregues</span>
                      <strong className="text-emerald-600">
                        {camp.total_entregues} ({formatarPct(camp.total_entregues, camp.total_enviados)})
                      </strong>
                    </div>
                    <div>
                      <span className="block text-muted-foreground">Aberturas</span>
                      <strong className="text-sky-600">
                        {camp.total_aberturas} ({formatarPct(camp.total_aberturas, camp.total_entregues)})
                      </strong>
                    </div>
                    <div>
                      <span className="block text-muted-foreground">Cliques</span>
                      <strong className="text-amber-600">
                        {camp.total_cliques} ({formatarPct(camp.total_cliques, camp.total_entregues)})
                      </strong>
                    </div>
                    <div>
                      <span className="block text-muted-foreground">Bounces (T/P)</span>
                      <strong className="text-rose-600">
                        {camp.total_bounces_temp}/{camp.total_bounces_perm}
                      </strong>
                    </div>
                    <div>
                      <span className="block text-muted-foreground">Opt-out</span>
                      <strong>{camp.total_descadastramentos}</strong>
                    </div>
                    <div>
                      <span className="block text-muted-foreground">Conversões</span>
                      <strong className="text-emerald-600">
                        {camp.total_conversoes} ({formatarMoeda(camp.receita_convertida)})
                      </strong>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ABA 2: NOVA / AGENDAR CAMPANHA */}
      {aba === 'nova' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              Configuração da Campanha de E-mail Marketing
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Nome da Campanha *
                </label>
                <Input
                  value={nomeCampanha}
                  onChange={(e) => setNomeCampanha(e.target.value)}
                  placeholder="Ex: Campanha Natal 2026 — Brindes"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Lista / Segmentação *
                </label>
                <select
                  value={listaIdSelecionada}
                  onChange={(e) => setListaIdSelecionada(e.target.value)}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
                >
                  {listas.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nome} ({l.tipo})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Reutilizar Modelo de E-mail (Opcional)
                </label>
                <select
                  value={templateIdSelecionado}
                  onChange={(e) => aplicarTemplate(e.target.value)}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
                >
                  <option value="">-- Escrever conteúdo personalizado --</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome} ({t.categoria})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  UTM Campaign (Atribuição de Conversões)
                </label>
                <Input
                  value={utmCampaign}
                  onChange={(e) => setUtmCampaign(e.target.value)}
                  placeholder="Ex: natal_brindes_2026"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Assunto do E-mail *
              </label>
              <Input
                value={assunto}
                onChange={(e) => setAssunto(e.target.value)}
                placeholder="Use {{nome_contato}} para personalizar o assunto"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Nome do Remetente
                </label>
                <Input
                  value={nomeRemetente}
                  onChange={(e) => setNomeRemetente(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  E-mail do Remetente
                </label>
                <Input
                  value={emailRemetente}
                  onChange={(e) => setEmailRemetente(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">
                  Conteúdo HTML / Mensagem da Campanha
                </label>
                <span className="text-[10px] text-muted-foreground">
                  Links https:// são rastreados automaticamente • Rodapé de descadastro incluído
                </span>
              </div>
              <textarea
                rows={8}
                value={corpoHtml}
                onChange={(e) => setCorpoHtml(e.target.value)}
                placeholder="<p>Olá {{nome_contato}},</p><p>Confira nossas ofertas...</p>"
                className="mt-1 w-full rounded-md border border-input bg-background p-3 text-xs font-mono"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border">
              <div>
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Agendar Data e Horário
                </label>
                <Input
                  type="datetime-local"
                  value={agendadoPara}
                  onChange={(e) => setAgendadoPara(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="flex items-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setMostrarPreviewModal(true)}
                  className="gap-1.5 text-xs"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Pré-visualizar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSalvarCampanha('rascunho')}
                  disabled={salvandoCampanha}
                  className="text-xs"
                >
                  Salvar Rascunho
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleSalvarCampanha('agendar')}
                  disabled={salvandoCampanha}
                  className="text-xs gap-1"
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  Agendar
                </Button>
                <Button
                  onClick={() => handleSalvarCampanha('disparar')}
                  disabled={salvandoCampanha}
                  className="text-xs gap-1"
                >
                  {salvandoCampanha ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Disparar Agora
                </Button>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Audiência & Teste de Envio */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Resumo da Segmentação
              </h3>
              <div className="flex items-center justify-between text-xs">
                <span>Contatos elegíveis:</span>
                <Badge variant="default">{previaAudiencia.elegiveis.length}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>Ignorados (Opt-out / Sem consentimento):</span>
                <Badge variant="outline">{previaAudiencia.bloqueados.length}</Badge>
              </div>
              <div className="max-h-40 overflow-y-auto rounded border border-border/60 p-2 space-y-1 text-[11px]">
                {previaAudiencia.elegiveis.slice(0, 12).map((d) => (
                  <div key={d.email} className="flex justify-between text-muted-foreground">
                    <span className="truncate max-w-[120px] font-medium text-foreground">
                      {d.nome}
                    </span>
                    <span className="truncate">{d.email}</span>
                  </div>
                ))}
                {previaAudiencia.elegiveis.length === 0 && (
                  <span className="text-muted-foreground">
                    Nenhum destinatário encontrado nesta segmentação.
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Teste de Envio (SMTP)
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Valide o layout, links rastreados e entrega real antes de disparar para a lista.
              </p>
              <Input
                type="email"
                value={emailTeste}
                onChange={(e) => setEmailTeste(e.target.value)}
                placeholder="seu-email@empresa.com.br"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestarEnvio}
                disabled={enviandoTeste}
                className="w-full gap-1.5 text-xs"
              >
                {enviandoTeste ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Enviar E-mail de Teste
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: LISTAS & SEGMENTAÇÕES */}
      {aba === 'listas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Gerencie listas estáticas ou segmentações dinâmicas conectadas aos contatos e negócios do CRM.
            </p>
            <Button size="sm" onClick={() => setModalListaAberto(true)} className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              Nova Lista / Segmentação
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listas.map((lista) => (
              <div key={lista.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {lista.nome}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">{lista.descricao}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {lista.tipo}
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const res = await resolverDestinatariosLista(lista);
                      setListaPreviewDest({ lista, ...res });
                    }}
                    className="h-7 text-xs gap-1"
                  >
                    <Filter className="h-3 w-3" />
                    Ver Contatos
                  </Button>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setListaIdSelecionada(lista.id);
                        setAba('nova');
                      }}
                      className="h-7 text-xs"
                    >
                      Criar Campanha
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await excluirListaMarketingNoBanco(lista.id);
                        carregarTudo();
                      }}
                      className="h-7 w-7 p-0 text-rose-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA 4: COMPARATIVO & EXPORTAÇÃO */}
      {aba === 'comparativo' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Compare o desempenho entre campanhas e exporte o relatório consolidado para análise externa.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                baixarCsv('comparativo_campanhas_alldot.csv', [
                  [
                    'Campanha',
                    'Lista',
                    'Status',
                    'Enviados',
                    'Entregues',
                    'Taxa Entrega',
                    'Aberturas',
                    'Taxa Abertura',
                    'Cliques',
                    'CTR',
                    'Bounces Temp',
                    'Bounces Perm',
                    'Descadastramentos',
                    'Conversões',
                    'Receita',
                  ],
                  ...campanhas.map((c) => [
                    c.nome,
                    c.lista_nome,
                    c.status,
                    String(c.total_enviados),
                    String(c.total_entregues),
                    formatarPct(c.total_entregues, c.total_enviados),
                    String(c.total_aberturas),
                    formatarPct(c.total_aberturas, c.total_entregues),
                    String(c.total_cliques),
                    formatarPct(c.total_cliques, c.total_entregues),
                    String(c.total_bounces_temp),
                    String(c.total_bounces_perm),
                    String(c.total_descadastramentos),
                    String(c.total_conversoes),
                    formatarMoeda(c.receita_convertida),
                  ]),
                ]);
              }}
              className="gap-1.5 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar Comparativo (CSV)
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/50 text-[11px] text-muted-foreground">
                <tr>
                  <th className="p-3">Campanha</th>
                  <th className="p-3">Segmento</th>
                  <th className="p-3 text-right">Enviados</th>
                  <th className="p-3 text-right">Entrega</th>
                  <th className="p-3 text-right">Abertura</th>
                  <th className="p-3 text-right">Cliques (CTR)</th>
                  <th className="p-3 text-right">Bounces (T/P)</th>
                  <th className="p-3 text-right">Opt-out</th>
                  <th className="p-3 text-right">Conversões</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {campanhas.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="p-3 font-medium">{c.nome}</td>
                    <td className="p-3 font-mono text-[11px]">{c.lista_nome}</td>
                    <td className="p-3 text-right">{c.total_enviados}</td>
                    <td className="p-3 text-right text-emerald-600 font-medium">
                      {formatarPct(c.total_entregues, c.total_enviados)}
                    </td>
                    <td className="p-3 text-right text-sky-600 font-medium">
                      {formatarPct(c.total_aberturas, c.total_entregues)}
                    </td>
                    <td className="p-3 text-right text-amber-600 font-medium">
                      {formatarPct(c.total_cliques, c.total_entregues)}
                    </td>
                    <td className="p-3 text-right text-rose-600">
                      {c.total_bounces_temp} / {c.total_bounces_perm}
                    </td>
                    <td className="p-3 text-right">{c.total_descadastramentos}</td>
                    <td className="p-3 text-right font-semibold text-emerald-600">
                      {c.total_conversoes} ({formatarMoeda(c.receita_convertida)})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL RELATÓRIO DETALHADO & CLIQUES POR CONTATO */}
      <Dialog
        open={Boolean(campanhaRelatorio)}
        onOpenChange={(open) => !open && setCampanhaRelatorio(null)}
      >
        <DialogHeader>
          <DialogTitle>Relatório Detalhado — {campanhaRelatorio?.nome}</DialogTitle>
          <DialogDescription>
            Status por destinatário (SMTP/Bounce/Opt-out) e identificação individual de cliques por contato.
          </DialogDescription>
        </DialogHeader>

        {carregandoRelatorio ? (
          <div className="py-10 text-center text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
            Carregando métricas...
          </div>
        ) : (
          <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
            <div>
              <h4 className="text-xs font-semibold mb-2">Cliques por Contato ({cliquesRelatorio.length})</h4>
              {cliquesRelatorio.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum clique registrado até o momento.</p>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 text-[11px]">
                      <tr>
                        <th className="p-2">Contato</th>
                        <th className="p-2">E-mail</th>
                        <th className="p-2">Link Clicado</th>
                        <th className="p-2">Horário</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {cliquesRelatorio.map((clq) => (
                        <tr key={clq.id}>
                          <td className="p-2 font-medium">{clq.destinatario_nome || '—'}</td>
                          <td className="p-2">{clq.destinatario_email}</td>
                          <td className="p-2 text-indigo-600 truncate max-w-[240px]">{clq.url_destino}</td>
                          <td className="p-2 text-muted-foreground">{formatarDataHora(clq.clicado_em)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-semibold mb-2">Destinatários & Status de Entrega ({enviosRelatorio.length})</h4>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 text-[11px]">
                    <tr>
                      <th className="p-2">Contato</th>
                      <th className="p-2">E-mail</th>
                      <th className="p-2">Status</th>
                      <th className="p-2 text-center">Abriu</th>
                      <th className="p-2 text-center">Clicou</th>
                      <th className="p-2">Retorno SMTP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {enviosRelatorio.map((env) => (
                      <tr key={env.id}>
                        <td className="p-2 font-medium">{env.destinatario_nome || '—'}</td>
                        <td className="p-2">{env.destinatario_email}</td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-[10px]">
                            {env.status}
                          </Badge>
                        </td>
                        <td className="p-2 text-center">{env.aberto ? `Sim (${env.aberturas_qtd})` : 'Não'}</td>
                        <td className="p-2 text-center">{env.clicou ? `Sim (${env.cliques_qtd})` : 'Não'}</td>
                        <td className="p-2 text-[11px] text-muted-foreground truncate max-w-[200px]">
                          {env.smtp_codigo ? `[${env.smtp_codigo}] ` : ''}
                          {env.smtp_resposta || env.motivo_erro || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {campanhaRelatorio && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportarCsvCampanha(campanhaRelatorio)}
              className="gap-1.5 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar CSV
            </Button>
          )}
          <Button size="sm" onClick={() => setCampanhaRelatorio(null)}>
            Fechar
          </Button>
        </DialogFooter>
      </Dialog>

      {/* MODAL PRÉ-VISUALIZAÇÃO HTML */}
      <Dialog open={mostrarPreviewModal} onOpenChange={setMostrarPreviewModal}>
        <DialogHeader>
          <DialogTitle>Pré-visualização — {assunto || 'Sem assunto'}</DialogTitle>
          <DialogDescription>
            De: {nomeRemetente} &lt;{emailRemetente}&gt;
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-border bg-white overflow-hidden">
          <iframe
            title="Pré-visualização segura do e-mail"
            sandbox=""
            className="w-full h-[360px] border-0 bg-white"
            srcDoc={`<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;font-size:14px;color:#1e293b;padding:20px;margin:0;">${(
              corpoHtml || '<p>Sem conteúdo.</p>'
            ).replace(
              /\{\{\s*nome_contato\s*\}\}/gi,
              'Maria Silva (Exemplo)'
            )}<div style="margin-top:24px;padding-top:14px;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;text-align:center;">Rodapé automático de descadastramento (opt-out) e pixel de abertura incluídos no disparo.</div></body></html>`}
          />
        </div>
        <DialogFooter>
          <Button size="sm" onClick={() => setMostrarPreviewModal(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </Dialog>

      {/* MODAL NOVA LISTA */}
      <Dialog open={modalListaAberto} onOpenChange={setModalListaAberto}>
        <DialogHeader>
          <DialogTitle>Nova Lista / Segmentação</DialogTitle>
          <DialogDescription>
            Crie uma segmentação dinâmica por regras do CRM ou uma lista estática de e-mails.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium">Nome da Lista (ex: LEAD_CAMPANHA_PASCOA)</label>
            <Input value={listaNome} onChange={(e) => setListaNome(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium">Descrição</label>
            <Input value={listaDesc} onChange={(e) => setListaDesc(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium">Tipo</label>
            <select
              value={listaTipo}
              onChange={(e) => setListaTipo(e.target.value as 'dinamica' | 'estatica')}
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
            >
              <option value="dinamica">Dinâmica (Critérios do CRM)</option>
              <option value="estatica">Estática (Lista manual de e-mails)</option>
            </select>
          </div>

          {listaTipo === 'dinamica' ? (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium">Status do Negócio</label>
                <select
                  value={listaStatusNeg}
                  onChange={(e) =>
                    setListaStatusNeg(e.target.value as 'todos' | 'aberto' | 'ganho' | 'perdido')
                  }
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="todos">Todos</option>
                  <option value="aberto">Aberto</option>
                  <option value="ganho">Ganho (Clientes Ativos)</option>
                  <option value="perdido">Perdido</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium">Inatividade mín. (dias)</label>
                <Input
                  type="number"
                  value={listaInatividade}
                  onChange={(e) => setListaInatividade(e.target.value)}
                  placeholder="Ex: 30"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium">Origem contém</label>
                <Input
                  value={listaOrigem}
                  onChange={(e) => setListaOrigem(e.target.value)}
                  placeholder="Ex: evento, landing"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium">Produto/Interesse contém</label>
                <Input
                  value={listaProduto}
                  onChange={(e) => setListaProduto(e.target.value)}
                  placeholder="Ex: cordão, crachá"
                  className="mt-1"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[11px] font-medium">UTM Campaign contém</label>
                <Input
                  value={listaUtm}
                  onChange={(e) => setListaUtm(e.target.value)}
                  placeholder="Ex: natal, black_friday"
                  className="mt-1"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="text-[11px] font-medium">
                E-mails (um por linha, formato: email@dominio.com, Nome)
              </label>
              <textarea
                rows={5}
                value={listaContatosTexto}
                onChange={(e) => setListaContatosTexto(e.target.value)}
                placeholder={'joao@empresa.com.br, João Silva\nmaria@cliente.com.br, Maria'}
                className="mt-1 w-full rounded-md border border-input bg-background p-2 text-xs font-mono"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setModalListaAberto(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSalvarLista}>
            Salvar Lista
          </Button>
        </DialogFooter>
      </Dialog>

      {/* MODAL CONTATOS DA LISTA */}
      <Dialog
        open={Boolean(listaPreviewDest)}
        onOpenChange={(open) => !open && setListaPreviewDest(null)}
      >
        <DialogHeader>
          <DialogTitle>Contatos — {listaPreviewDest?.lista.nome}</DialogTitle>
          <DialogDescription>
            {listaPreviewDest?.elegiveis.length || 0} elegíveis •{' '}
            {listaPreviewDest?.bloqueados.length || 0} ignorados (opt-out/sem consentimento)
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-64 overflow-y-auto space-y-1.5 text-xs">
          {listaPreviewDest?.elegiveis.map((d) => (
            <div key={d.email} className="flex justify-between rounded border border-border/60 px-2.5 py-1.5">
              <span className="font-medium">{d.nome}</span>
              <span className="text-muted-foreground">{d.email}</span>
            </div>
          ))}
          {listaPreviewDest?.elegiveis.length === 0 && (
            <p className="text-muted-foreground">Nenhum contato correspondente encontrado.</p>
          )}
        </div>
        <DialogFooter>
          <Button size="sm" onClick={() => setListaPreviewDest(null)}>
            Fechar
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
