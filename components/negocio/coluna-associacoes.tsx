'use client';

import * as React from 'react';
import {
  Users,
  Building2,
  Mail,
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
  Plus,
  Loader2,
  CheckCircle2,
  Edit2,
  PauseCircle,
  PlayCircle,
  CalendarClock,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DADOS_EMPRESAS,
  DADOS_CONTATOS,
  type Negocio,
  type Empresa,
  type Contato,
  type AutomacaoProgramada,
} from '@/lib/mock-data';
import {
  buscarEmpresasDoBanco,
  buscarContatosDoBanco,
  criarEmpresaNoBanco,
  criarContatoNoBanco,
  atualizarPropriedadesNegocioBanco,
  buscarAutomacoesProgramadasDoBanco,
  alternarPausaAutomacoesNegocio,
  cancelarAutomacaoProgramadaNoBanco,
  atualizarPreferenciasEmailNegocioOuContato,
} from '@/lib/supabase/service';

interface ColunaAssociacoesProps {
  negocio: Negocio;
  onAtualizarNegocio?: (atualizado: Partial<Negocio>) => void;
}

export function ColunaAssociacoes({
  negocio,
  onAtualizarNegocio,
}: ColunaAssociacoesProps) {
  const [copiado, setCopiado] = React.useState(false);
  const [empresasBanco, setEmpresasBanco] = React.useState<Empresa[]>(DADOS_EMPRESAS);
  const [contatosBanco, setContatosBanco] = React.useState<Contato[]>(DADOS_CONTATOS);

  // Edição posterior pelo vendedor (dados do lead ou vínculo formal)
  const [editandoDadosLead, setEditandoDadosLead] = React.useState(false);
  const [leadNome, setLeadNome] = React.useState('');
  const [leadEmail, setLeadEmail] = React.useState('');
  const [leadEmpresa, setLeadEmpresa] = React.useState('');
  const [leadCelular, setLeadCelular] = React.useState('');
  const [cnpjOpcional, setCnpjOpcional] = React.useState('');
  const [salvandoVinculo, setSalvandoVinculo] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [programadas, setProgramadas] = React.useState<AutomacaoProgramada[]>([]);
  const [atualizandoControle, setAtualizandoControle] = React.useState(false);

  const cp = negocio.campos_personalizados || {};

  const nomeExibicao =
    negocio.contato_nome ||
    negocio.lead_nome ||
    cp.lead_nome ||
    'Contato não informado';
  const emailExibicao =
    negocio.contato_email ||
    negocio.lead_email ||
    cp.lead_email ||
    '';
  const whatsappExibicao =
    negocio.contato_whatsapp ||
    negocio.lead_celular ||
    cp.lead_celular ||
    '';
  const empresaExibicao =
    negocio.empresa_nome ||
    negocio.lead_empresa ||
    cp.lead_empresa ||
    'Empresa não informada';

  React.useEffect(() => {
    setLeadNome(nomeExibicao === 'Contato não informado' ? '' : nomeExibicao);
    setLeadEmail(emailExibicao);
    setLeadEmpresa(empresaExibicao === 'Empresa não informada' ? '' : empresaExibicao);
    setLeadCelular(whatsappExibicao);
  }, [
    negocio.id,
    nomeExibicao,
    emailExibicao,
    empresaExibicao,
    whatsappExibicao,
  ]);

  React.useEffect(() => {
    Promise.all([
      buscarEmpresasDoBanco(),
      buscarContatosDoBanco(),
      buscarAutomacoesProgramadasDoBanco(negocio.id),
    ]).then(([emps, conts, fila]) => {
      if (emps && emps.length > 0) setEmpresasBanco(emps);
      if (conts && conts.length > 0) setContatosBanco(conts);
      setProgramadas(fila || []);
    });
  }, [negocio.id]);

  const automacoesPausadas = Boolean(
    negocio.automacoes_pausadas ?? cp.automacoes_pausadas ?? false
  );
  const consentimentoEmail =
    negocio.consentimento_email ?? cp.consentimento_email ?? true;
  const descadastradoEmail = Boolean(
    negocio.descadastrado_email ?? cp.descadastrado_email ?? false
  );

  const handleTogglePausaAutomacoes = async () => {
    setAtualizandoControle(true);
    try {
      const novoEstado = !automacoesPausadas;
      await alternarPausaAutomacoesNegocio(
        negocio.id,
        novoEstado,
        negocio.responsavel_nome || 'Vendedor'
      );
      onAtualizarNegocio?.({
        automacoes_pausadas: novoEstado,
        automacoes_pausadas_por: novoEstado
          ? negocio.responsavel_nome || 'Vendedor'
          : undefined,
        automacoes_pausadas_em: novoEstado ? new Date().toISOString() : undefined,
        campos_personalizados: {
          ...cp,
          automacoes_pausadas: novoEstado,
        },
      });
      const filaAtual = await buscarAutomacoesProgramadasDoBanco(negocio.id);
      setProgramadas(filaAtual);
    } finally {
      setAtualizandoControle(false);
    }
  };

  const handleAlterarPreferenciasContato = async (
    novoConsentimento: boolean,
    novoDescadastrado: boolean
  ) => {
    setAtualizandoControle(true);
    try {
      await atualizarPreferenciasEmailNegocioOuContato({
        negocioId: negocio.id,
        contatoId: negocio.contato_id || undefined,
        consentimentoEmail: novoConsentimento,
        descadastradoEmail: novoDescadastrado,
      });
      onAtualizarNegocio?.({
        consentimento_email: novoConsentimento,
        descadastrado_email: novoDescadastrado,
        campos_personalizados: {
          ...cp,
          consentimento_email: novoConsentimento,
          descadastrado_email: novoDescadastrado,
        },
      });
    } finally {
      setAtualizandoControle(false);
    }
  };

  const handleCancelarProgramacaoCard = async (programacaoId: string) => {
    await cancelarAutomacaoProgramadaNoBanco(
      programacaoId,
      'Cancelada pelo vendedor na Visão 360º do card'
    );
    const filaAtual = await buscarAutomacoesProgramadasDoBanco(negocio.id);
    setProgramadas(filaAtual);
  };

  const contatoCadastrado = contatosBanco.find((c) => c.id === negocio.contato_id);
  const empresaCadastrada = empresasBanco.find((e) => e.id === negocio.empresa_id);

  const semContatoFormal = !negocio.contato_id;
  const semEmpresaFormal = !negocio.empresa_id;

  const copiarEmail = () => {
    if (!emailExibicao) return;
    navigator.clipboard.writeText(emailExibicao);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const whatsappLimpo = whatsappExibicao.replace(/\D/g, '');

  const handleSalvarDadosNoCard = async () => {
    setSalvandoVinculo(true);
    try {
      const novosCamposPersonalizados = {
        ...cp,
        lead_nome: leadNome.trim(),
        lead_email: leadEmail.trim(),
        lead_empresa: leadEmpresa.trim(),
        lead_celular: leadCelular.trim(),
      };

      await atualizarPropriedadesNegocioBanco(negocio.id, {
        campos_personalizados: novosCamposPersonalizados,
      });

      onAtualizarNegocio?.({
        contato_nome: leadNome.trim(),
        contato_email: leadEmail.trim(),
        contato_whatsapp: leadCelular.trim(),
        empresa_nome: leadEmpresa.trim(),
        lead_nome: leadNome.trim(),
        lead_email: leadEmail.trim(),
        lead_empresa: leadEmpresa.trim(),
        lead_celular: leadCelular.trim(),
        campos_personalizados: novosCamposPersonalizados,
      });

      setEditandoDadosLead(false);
      setFeedback('Dados do lead salvos no card!');
      setTimeout(() => setFeedback(null), 3500);
    } finally {
      setSalvandoVinculo(false);
    }
  };

  const handleEfetivarCadastroEmpresaEContato = async () => {
    if (!leadNome.trim() && !leadEmpresa.trim()) return;
    setSalvandoVinculo(true);
    try {
      let empresaIdFinal = negocio.empresa_id || '';
      let empresaNomeFinal = leadEmpresa.trim() || empresaExibicao;

      if (!empresaIdFinal && leadEmpresa.trim()) {
        const novaEmp = await criarEmpresaNoBanco({
          nome: leadEmpresa.trim(),
          razao_social: leadEmpresa.trim(),
          cnpj: cnpjOpcional.trim() || '-',
          contato_principal: leadNome.trim(),
          whatsapp_principal: leadCelular.trim(),
          email_principal: leadEmail.trim(),
          origem_lead: negocio.origem_lead || cp.origem_lead || 'Landing Page Brinday',
          responsavel_id: negocio.responsavel_id,
        });
        empresaIdFinal = novaEmp.id;
        empresaNomeFinal = novaEmp.nome;
        setEmpresasBanco((prev) => [novaEmp, ...prev]);
      }

      let contatoIdFinal = negocio.contato_id || '';
      if (!contatoIdFinal && leadNome.trim()) {
        const novoCont = await criarContatoNoBanco({
          nome: leadNome.trim(),
          email: leadEmail.trim(),
          telefone_whatsapp: leadCelular.trim(),
          empresa_id: empresaIdFinal,
          empresa_nome: empresaNomeFinal,
          cargo: 'Lead Landing Page',
          responsavel_id: negocio.responsavel_id,
        });
        contatoIdFinal = novoCont.id;
        setContatosBanco((prev) => [novoCont, ...prev]);
      }

      const novosCamposPersonalizados = {
        ...cp,
        lead_nome: leadNome.trim(),
        lead_email: leadEmail.trim(),
        lead_empresa: leadEmpresa.trim(),
        lead_celular: leadCelular.trim(),
      };

      await atualizarPropriedadesNegocioBanco(negocio.id, {
        empresa_id: empresaIdFinal,
        contato_id: contatoIdFinal,
        campos_personalizados: novosCamposPersonalizados,
      });

      onAtualizarNegocio?.({
        empresa_id: empresaIdFinal,
        empresa_nome: empresaNomeFinal,
        contato_id: contatoIdFinal,
        contato_nome: leadNome.trim(),
        contato_email: leadEmail.trim(),
        contato_whatsapp: leadCelular.trim(),
        campos_personalizados: novosCamposPersonalizados,
      });

      setEditandoDadosLead(false);
      setFeedback('Empresa e Contato cadastrados e vinculados ao card!');
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setSalvandoVinculo(false);
    }
  };

  return (
    <div className="space-y-4 text-xs text-foreground p-1 select-none">
      {feedback && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Aviso de Lead sem Empresa/Contato criados ainda */}
      {(semContatoFormal || semEmpresaFormal) && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-400">
              Card criado sem Empresa/Contato
            </span>
            <Badge variant="warning" className="text-[9px]">
              Preenchimento Vendedor
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Este card foi aberto via formulário sem gerar registro nas tabelas de Empresas/Contatos. O vendedor pode completar e efetivar o cadastro abaixo quando qualificar o lead.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setEditandoDadosLead((v) => !v)}
            className="w-full h-7 text-[11px] gap-1.5 border-amber-500/40 text-amber-300 hover:bg-amber-500/20"
          >
            <Edit2 className="h-3 w-3" />
            <span>
              {editandoDadosLead
                ? 'Fechar Preenchimento'
                : 'Preencher / Efetivar Empresa e Contato'}
            </span>
          </Button>
        </div>
      )}

      {/* Formulário para o Vendedor preencher/efetivar posteriormente */}
      {editandoDadosLead && (
        <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5 shadow-sm">
          <h4 className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
            Dados do Lead / Efetivar Cadastro
          </h4>

          <div>
            <label className="text-[10px] text-muted-foreground block mb-0.5">
              Nome do Contato
            </label>
            <Input
              value={leadNome}
              onChange={(e) => setLeadNome(e.target.value)}
              placeholder="Nome do cliente"
              className="h-7 text-xs"
            />
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground block mb-0.5">
              E-mail
            </label>
            <Input
              type="email"
              value={leadEmail}
              onChange={(e) => setLeadEmail(e.target.value)}
              placeholder="cliente@empresa.com.br"
              className="h-7 text-xs"
            />
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground block mb-0.5">
              Celular / WhatsApp
            </label>
            <Input
              value={leadCelular}
              onChange={(e) => setLeadCelular(e.target.value)}
              placeholder="(11) 99999-9999"
              className="h-7 text-xs font-mono"
            />
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground block mb-0.5">
              Empresa Informada
            </label>
            <Input
              value={leadEmpresa}
              onChange={(e) => setLeadEmpresa(e.target.value)}
              placeholder="Nome da empresa"
              className="h-7 text-xs"
            />
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground block mb-0.5">
              CPF / CNPJ (para cadastrar Empresa)
            </label>
            <Input
              value={cnpjOpcional}
              onChange={(e) => setCnpjOpcional(e.target.value)}
              placeholder="00.000.000/0001-00"
              className="h-7 text-xs font-mono"
            />
          </div>

          <div className="flex flex-col gap-1.5 pt-1">
            <Button
              type="button"
              size="sm"
              disabled={salvandoVinculo}
              onClick={handleSalvarDadosNoCard}
              variant="outline"
              className="w-full h-7 text-[11px]"
            >
              {salvandoVinculo ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                'Apenas Atualizar Dados no Card'
              )}
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={salvandoVinculo}
              onClick={handleEfetivarCadastroEmpresaEContato}
              className="w-full h-7 text-[11px] gap-1"
            >
              {salvandoVinculo ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <Plus className="h-3 w-3" />
                  <span>Criar Empresa & Contato no CRM</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Card do Contato Principal / Lead */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-sky-400" />
            Contato / Lead
          </span>
          {contatoCadastrado ? (
            <Badge variant="info" className="text-[9px]">
              Contato Cadastrado
            </Badge>
          ) : (
            <Badge variant="warning" className="text-[9px]">
              Apenas no Card
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-300 border border-zinc-700 shrink-0">
            {(contatoCadastrado?.nome || nomeExibicao || 'L').charAt(0).toUpperCase()}
          </div>
          <div className="truncate">
            <h4 className="font-semibold text-foreground text-xs truncate">
              {contatoCadastrado?.nome || nomeExibicao}
            </h4>
            <p className="text-[11px] text-muted-foreground truncate">
              {contatoCadastrado?.cargo || 'Lead via Formulário'}
            </p>
          </div>
        </div>

        {/* E-mail com cópia rápida */}
        {emailExibicao && (
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-2.5 py-1.5">
            <div className="flex items-center gap-2 truncate">
              <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-[11px] text-foreground truncate">
                {contatoCadastrado?.email || emailExibicao}
              </span>
            </div>
            <button
              onClick={copiarEmail}
              className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
              title="Copiar e-mail"
            >
              {copiado ? (
                <Check className="h-3 w-3 text-emerald-400" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          </div>
        )}

        {/* Botão de 1-Clique para WhatsApp Web */}
        {whatsappLimpo && (
          <a
            href={`https://wa.me/${whatsappLimpo.startsWith('55') ? whatsappLimpo : `55${whatsappLimpo}`}`}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-800 bg-emerald-950/40 py-2 px-3 text-xs font-semibold text-emerald-300 hover:bg-emerald-950/70 transition-colors shadow-sm"
          >
            <MessageCircle className="h-4 w-4 text-emerald-400" />
            <span>Chamar no WhatsApp ({whatsappExibicao})</span>
          </a>
        )}
      </div>

      {/* Card da Empresa Associada / Informada no Formulário */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-amber-400" />
            Empresa
          </span>
          {empresaCadastrada ? (
            <Badge variant="secondary" className="text-[9px]">
              Conta Cadastrada
            </Badge>
          ) : (
            <Badge variant="warning" className="text-[9px]">
              Apenas no Card
            </Badge>
          )}
        </div>

        <div>
          <h4 className="font-semibold text-foreground text-xs truncate">
            {empresaCadastrada?.nome || empresaExibicao}
          </h4>
          <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
            {empresaCadastrada?.cnpj || 'CNPJ pendente de preenchimento'}
          </p>
        </div>

        {empresaCadastrada?.dominio && (
          <div className="flex items-center justify-between text-[11px] rounded-lg border border-border/60 bg-muted/20 px-2.5 py-1.5">
            <span className="text-muted-foreground">Website:</span>
            <a
              href={`https://${empresaCadastrada.dominio}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sky-400 hover:underline"
            >
              <span>{empresaCadastrada.dominio}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>

      {/* Card de Controle de Automações de E-mail, Consentimento (LGPD) & Fila Programada */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5 text-indigo-400" />
            Automações de E-mail
          </span>
          <Badge
            variant={automacoesPausadas ? 'warning' : 'success'}
            className="text-[9px]"
          >
            {automacoesPausadas ? 'Pausada' : 'Ativa'}
          </Badge>
        </div>

        <button
          type="button"
          onClick={handleTogglePausaAutomacoes}
          disabled={atualizandoControle}
          className={`flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors ${automacoesPausadas
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300'
            }`}
        >
          {automacoesPausadas ? (
            <>
              <PlayCircle className="h-3.5 w-3.5" />
              Retomar Automações neste Card
            </>
          ) : (
            <>
              <PauseCircle className="h-3.5 w-3.5" />
              Pausar Automações Manualmente
            </>
          )}
        </button>

        {/* Consentimento e Opt-out */}
        <div className="space-y-1.5 rounded-lg border border-border/60 bg-muted/20 p-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <ShieldCheck className="h-3 w-3 text-emerald-500" />
            Consentimento &amp; Descadastramento
          </div>
          <label className="flex items-center justify-between text-[11px] cursor-pointer">
            <span>Consentimento de e-mail ativo</span>
            <input
              type="checkbox"
              checked={consentimentoEmail}
              disabled={atualizandoControle}
              onChange={(e) =>
                handleAlterarPreferenciasContato(e.target.checked, descadastradoEmail)
              }
              className="h-3.5 w-3.5 rounded border-input text-indigo-600"
            />
          </label>
          <label className="flex items-center justify-between text-[11px] cursor-pointer">
            <span className={descadastradoEmail ? 'text-rose-500 font-semibold' : ''}>
              Descadastrado (Opt-out)
            </span>
            <input
              type="checkbox"
              checked={descadastradoEmail}
              disabled={atualizandoControle}
              onChange={(e) =>
                handleAlterarPreferenciasContato(consentimentoEmail, e.target.checked)
              }
              className="h-3.5 w-3.5 rounded border-input text-rose-600"
            />
          </label>
        </div>

        {/* Próximas Automações Programadas para este Negócio */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Próximas Programadas ({programadas.filter((p) => p.status === 'agendada' || p.status === 'pausada').length})
          </p>
          {programadas.length === 0 ? (
            <p className="text-[11px] text-muted-foreground italic">
              Nenhuma automação futura agendada para este negócio.
            </p>
          ) : (
            <div className="space-y-1.5">
              {programadas.slice(0, 4).map((prog) => (
                <div
                  key={prog.id}
                  className="rounded-lg border border-border/70 bg-background/70 p-2 text-[11px] space-y-1"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-foreground truncate">
                      {prog.automacao_nome}
                    </span>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${prog.status === 'agendada'
                          ? 'bg-indigo-500/10 text-indigo-500'
                          : prog.status === 'pausada'
                            ? 'bg-amber-500/10 text-amber-500'
                            : 'bg-rose-500/10 text-rose-500'
                        }`}
                    >
                      {prog.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    Modelo: {prog.template_nome}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>
                      Previsto:{' '}
                      {new Date(prog.agendado_para).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {(prog.status === 'agendada' || prog.status === 'pausada') && (
                      <button
                        type="button"
                        onClick={() => handleCancelarProgramacaoCard(prog.id)}
                        className="inline-flex items-center gap-0.5 text-rose-500 hover:underline"
                      >
                        <XCircle className="h-3 w-3" />
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
