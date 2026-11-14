'use client';

import * as React from 'react';
import {
  Mail,
  Zap,
  Server,
  FileText,
  Plus,
  Trash2,
  Check,
  Send,
  Image as ImageIcon,
  Paperclip,
  Clock,
  ArrowRightLeft,
  Sparkles,
  Trophy,
  XCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Upload,
  RefreshCw,
  Edit3,
  History,
  ShieldCheck,
  Power,
  Play,
  CalendarClock,
  ShieldAlert,
  Ban,
  PauseCircle,
  PlayCircle,
} from 'lucide-react';
import {
  buscarFunisDoBanco,
  buscarEtapasDoBanco,
  buscarConfigServidorEmail,
  salvarConfigServidorEmail,
  buscarTemplatesEmailDoBanco,
  salvarTemplateEmailNoBanco,
  removerTemplateEmailDoBanco,
  buscarAutomacoesEmailDoBanco,
  salvarAutomacaoEmailNoBanco,
  removerAutomacaoEmailDoBanco,
  buscarLogsEnvioEmailDoBanco,
  buscarAutomacoesProgramadasDoBanco,
  cancelarAutomacaoProgramadaNoBanco,
  interpolarVariaveisTemplateEmail,
  verificarEDispararInatividadeEmail,
} from '@/lib/supabase/service';
import {
  DADOS_FUNIS,
  DADOS_ETAPAS,
  CONFIG_SERVIDOR_EMAIL_PADRAO,
  type Funil,
  type EtapaFunil,
  type ConfiguracaoServidorEmail,
  type TipoContaEmail,
  type SegurancaSmtp,
  type TemplateEmail,
  type ImagemEmailInline,
  type AnexoEmailTemplate,
  type RegraAutomacaoEmail,
  type GatilhoAutomacaoEmail,
  type DestinatarioAutomacaoEmail,
  type PoliticaInterrupcaoAutomacao,
  type LogEnvioEmail,
  type AutomacaoProgramada,
} from '@/lib/mock-data';

type AbaEmailAutomacao = 'regras' | 'programadas' | 'templates' | 'servidor' | 'historico';

const PRESETS_CONTA_EMAIL: Record<
  TipoContaEmail,
  {
    label: string;
    descricao: string;
    provedor_nome: string;
    smtp_host: string;
    smtp_porta: number;
    seguranca: SegurancaSmtp;
    dica: string;
  }
> = {
  gmail_workspace: {
    label: 'Google Workspace / Gmail',
    descricao: 'Contas @gmail.com ou domínio corporativo no Google Workspace',
    provedor_nome: 'Google Workspace (Gmail Corporativo)',
    smtp_host: 'smtp.gmail.com',
    smtp_porta: 587,
    seguranca: 'tls',
    dica: 'Utilize uma "Senha de App" gerada na conta Google (Segurança > Verificação em duas etapas > Senhas de app).',
  },
  office365_outlook: {
    label: 'Microsoft 365 / Outlook',
    descricao: 'Contas corporativas Microsoft Exchange Online / Office 365',
    provedor_nome: 'Microsoft 365 (Outlook)',
    smtp_host: 'smtp.office365.com',
    smtp_porta: 587,
    seguranca: 'tls',
    dica: 'Certifique-se de que o "Authenticated SMTP" está habilitado no painel Microsoft 365 Admin Center.',
  },
  cpanel_titan: {
    label: 'E-mail Corporativo (cPanel / Titan / HostGator)',
    descricao: 'Hospedagem própria de domínio (Titan, Locaweb, Hostinger, cPanel)',
    provedor_nome: 'Servidor Corporativo cPanel / Titan',
    smtp_host: 'mail.brindaypersonalizados.com.br',
    smtp_porta: 465,
    seguranca: 'ssl',
    dica: 'Geralmente utiliza porta 465 com SSL ativo e o endereço de e-mail completo como usuário.',
  },
  ses_sendgrid_relay: {
    label: 'SMTP Relay (Amazon SES / SendGrid / Brevo)',
    descricao: 'Disparo transacional de alta entregabilidade via API/Relay SMTP',
    provedor_nome: 'SendGrid / Amazon SES Relay',
    smtp_host: 'smtp.sendgrid.net',
    smtp_porta: 587,
    seguranca: 'tls',
    dica: 'No SendGrid, o usuário padrão é "apikey" e a senha é a sua chave de API gerada no painel.',
  },
  smtp_personalizado: {
    label: 'Servidor SMTP Personalizado',
    descricao: 'Configure manualmente qualquer servidor SMTP ou servidor interno',
    provedor_nome: 'Servidor SMTP Dedicado',
    smtp_host: '',
    smtp_porta: 587,
    seguranca: 'tls',
    dica: 'Informe o host, porta e protocolo de criptografia fornecidos pelo administrador de rede.',
  },
};

const VARIAVEIS_DISPONIVEIS = [
  { chave: '{{nome_contato}}', label: 'Nome do Contato' },
  { chave: '{{nome_empresa}}', label: 'Nome da Empresa' },
  { chave: '{{titulo_negocio}}', label: 'Título do Negócio' },
  { chave: '{{valor_negocio}}', label: 'Valor da Proposta' },
  { chave: '{{etapa_funil}}', label: 'Nome da Etapa do Funil' },
  { chave: '{{nome_vendedor}}', label: 'Vendedor Responsável' },
  { chave: '{{dias_inatividade}}', label: 'Dias de Inatividade' },
];

function formatarTamanhoArquivo(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function CentralAutomacoesEmail() {
  const [abaAtiva, setAbaAtiva] = React.useState<AbaEmailAutomacao>('regras');
  const [carregando, setCarregando] = React.useState(true);
  const [feedbackToast, setFeedbackToast] = React.useState<{
    tipo: 'sucesso' | 'erro';
    texto: string;
  } | null>(null);

  // Dados gerais do CRM
  const [funis, setFunis] = React.useState<Funil[]>(DADOS_FUNIS);
  const [etapas, setEtapas] = React.useState<EtapaFunil[]>(DADOS_ETAPAS);

  // 1. Estado de Regras de Automação
  const [regras, setRegras] = React.useState<RegraAutomacaoEmail[]>([]);
  const [editandoRegraId, setEditandoRegraId] = React.useState<string | null>(null);
  const [mostrarFormRegra, setMostrarFormRegra] = React.useState(false);
  const [formRegra, setFormRegra] = React.useState<{
    nome: string;
    descricao: string;
    gatilho: GatilhoAutomacaoEmail;
    funil_id: string;
    etapa_destino_id: string;
    dias_inatividade: number;
    horas_atraso_envio: number;
    destinatario_tipo: DestinatarioAutomacaoEmail;
    email_personalizado: string;
    copia_cc: string;
    template_id: string;
    apenas_horario_comercial: boolean;
    permitir_redisparo_retorno_etapa: boolean;
    interromper_se_ganho_perdido: PoliticaInterrupcaoAutomacao;
    exigir_consentimento: boolean;
    respeitar_descadastramento: boolean;
    ativo: boolean;
  }>({
    nome: '',
    descricao: '',
    gatilho: 'mudanca_etapa',
    funil_id: DADOS_FUNIS[0].id,
    etapa_destino_id: DADOS_ETAPAS[0].id,
    dias_inatividade: 3,
    horas_atraso_envio: 0,
    destinatario_tipo: 'contato_principal',
    email_personalizado: '',
    copia_cc: '',
    template_id: '',
    apenas_horario_comercial: true,
    permitir_redisparo_retorno_etapa: false,
    interromper_se_ganho_perdido: 'ambos',
    exigir_consentimento: true,
    respeitar_descadastramento: true,
    ativo: false,
  });
  const [salvandoRegra, setSalvandoRegra] = React.useState(false);
  const [disparandoRegraId, setDisparandoRegraId] = React.useState<string | null>(null);
  const [verificandoInatividade, setVerificandoInatividade] = React.useState(false);
  const [emailTestePreviaRegra, setEmailTestePreviaRegra] = React.useState('');
  const [testandoPreviaRegra, setTestandoPreviaRegra] = React.useState(false);
  const [previaRegraTestada, setPreviaRegraTestada] = React.useState(false);
  const [regraEmPreviewId, setRegraEmPreviewId] = React.useState<string | null>(null);

  // 2. Estado de Templates de E-mail (com Imagens + Anexos)
  const [templates, setTemplates] = React.useState<TemplateEmail[]>([]);
  const [templateSelecionadoId, setTemplateSelecionadoId] = React.useState<string | null>(null);
  const [formTemplate, setFormTemplate] = React.useState<{
    id?: string;
    nome: string;
    categoria: string;
    assunto: string;
    corpo_html: string;
    imagens_corpo: ImagemEmailInline[];
    anexos: AnexoEmailTemplate[];
    ativo: boolean;
  }>({
    nome: '',
    categoria: 'Comercial',
    assunto: '',
    corpo_html: '',
    imagens_corpo: [],
    anexos: [],
    ativo: true,
  });
  const [novaUrlImagem, setNovaUrlImagem] = React.useState('');
  const [novaLegendaImagem, setNovaLegendaImagem] = React.useState('');
  const [novaLarguraImagem, setNovaLarguraImagem] = React.useState<'250px' | '450px' | '100%'>('450px');
  const [salvandoTemplate, setSalvandoTemplate] = React.useState(false);

  // 3. Estado de Configuração do Servidor de E-mail (SMTP)
  const [configServidor, setConfigServidor] = React.useState<ConfiguracaoServidorEmail>(
    CONFIG_SERVIDOR_EMAIL_PADRAO
  );
  const [mostrarSenhaSmtp, setMostrarSenhaSmtp] = React.useState(false);
  const [emailTesteDestino, setEmailTesteDestino] = React.useState('');
  const [salvandoServidor, setSalvandoServidor] = React.useState(false);
  const [testandoConexao, setTestandoConexao] = React.useState(false);

  // 4. Histórico de Disparos e Fila Programada
  const [logsEnvio, setLogsEnvio] = React.useState<LogEnvioEmail[]>([]);
  const [automacoesProgramadas, setAutomacoesProgramadas] = React.useState<AutomacaoProgramada[]>([]);

  const exibirToast = React.useCallback((tipo: 'sucesso' | 'erro', texto: string) => {
    setFeedbackToast({ tipo, texto });
    setTimeout(() => setFeedbackToast(null), 4500);
  }, []);

  const carregarTudo = React.useCallback(async () => {
    setCarregando(true);
    try {
      const [
        funisDb,
        etapasDb,
        cfgEmailDb,
        templatesDb,
        automacoesDb,
        logsDb,
        programadasDb,
      ] = await Promise.all([
        buscarFunisDoBanco(),
        buscarEtapasDoBanco(),
        buscarConfigServidorEmail(),
        buscarTemplatesEmailDoBanco(),
        buscarAutomacoesEmailDoBanco(),
        buscarLogsEnvioEmailDoBanco(),
        buscarAutomacoesProgramadasDoBanco(),
      ]);

      const listaFunis = funisDb.length > 0 ? funisDb : DADOS_FUNIS;
      const listaEtapas = etapasDb.length > 0 ? etapasDb : DADOS_ETAPAS;

      setFunis(listaFunis);
      setEtapas(listaEtapas);
      setConfigServidor(cfgEmailDb);
      setEmailTesteDestino(cfgEmailDb.email_remetente || 'comercial@brindaypersonalizados.com.br');
      setEmailTestePreviaRegra(cfgEmailDb.email_remetente || 'comercial@brindaypersonalizados.com.br');
      setTemplates(templatesDb);
      setRegras(automacoesDb);
      setLogsEnvio(logsDb);
      setAutomacoesProgramadas(programadasDb);

      if (templatesDb.length > 0) {
        const primeiro = templatesDb[0];
        setTemplateSelecionadoId(primeiro.id);
        setFormTemplate({
          id: primeiro.id,
          nome: primeiro.nome,
          categoria: primeiro.categoria || 'Comercial',
          assunto: primeiro.assunto,
          corpo_html: primeiro.corpo_html,
          imagens_corpo: primeiro.imagens_corpo || [],
          anexos: primeiro.anexos || [],
          ativo: primeiro.ativo,
        });
        setFormRegra((prev) => ({
          ...prev,
          funil_id: listaFunis[0].id,
          etapa_destino_id:
            listaEtapas.find((e) => e.funil_id === listaFunis[0].id)?.id ||
            listaEtapas[0].id,
          template_id: prev.template_id || primeiro.id,
        }));
      }
    } catch (err) {
      console.error('Erro ao carregar central de automações de e-mail:', err);
    } finally {
      setCarregando(false);
    }
  }, []);

  React.useEffect(() => {
    carregarTudo();
  }, [carregarTudo]);

  // Etapas filtradas pelo funil selecionado no formulário de regra
  const etapasDoFunilRegra = React.useMemo(() => {
    const filtradas = etapas
      .filter((e) => e.funil_id === formRegra.funil_id)
      .sort((a, b) => a.ordem - b.ordem);
    return filtradas.length > 0 ? filtradas : etapas;
  }, [etapas, formRegra.funil_id]);

  // ============================================================================
  // HANDLERS: REGRAS DE AUTOMAÇÃO
  // ============================================================================

  const handleAbrirNovaRegra = () => {
    const funilInicial = funis[0]?.id || DADOS_FUNIS[0].id;
    const primeiraEtapa =
      etapas.find((e) => e.funil_id === funilInicial)?.id || etapas[0]?.id || '';
    setEditandoRegraId(null);
    setPreviaRegraTestada(false);
    setFormRegra({
      nome: '',
      descricao: '',
      gatilho: 'mudanca_etapa',
      funil_id: funilInicial,
      etapa_destino_id: primeiraEtapa,
      dias_inatividade: 3,
      horas_atraso_envio: 0,
      destinatario_tipo: 'contato_principal',
      email_personalizado: '',
      copia_cc: '',
      template_id: templates[0]?.id || '',
      apenas_horario_comercial: true,
      permitir_redisparo_retorno_etapa: false,
      interromper_se_ganho_perdido: 'ambos',
      exigir_consentimento: true,
      respeitar_descadastramento: true,
      ativo: false,
    });
    setMostrarFormRegra(true);
  };

  const handleEditarRegra = (regra: RegraAutomacaoEmail) => {
    setEditandoRegraId(regra.id);
    setPreviaRegraTestada(false);
    setFormRegra({
      nome: regra.nome,
      descricao: regra.descricao || '',
      gatilho: regra.gatilho,
      funil_id: regra.funil_id || funis[0]?.id || '',
      etapa_destino_id: regra.etapa_destino_id || '',
      dias_inatividade: regra.dias_inatividade || 3,
      horas_atraso_envio: regra.horas_atraso_envio || 0,
      destinatario_tipo: regra.destinatario_tipo || 'contato_principal',
      email_personalizado: regra.email_personalizado || '',
      copia_cc: regra.copia_cc || '',
      template_id: regra.template_id || templates[0]?.id || '',
      apenas_horario_comercial: regra.apenas_horario_comercial ?? true,
      permitir_redisparo_retorno_etapa: regra.permitir_redisparo_retorno_etapa ?? false,
      interromper_se_ganho_perdido: regra.interromper_se_ganho_perdido || 'ambos',
      exigir_consentimento: regra.exigir_consentimento ?? true,
      respeitar_descadastramento: regra.respeitar_descadastramento ?? true,
      ativo: regra.ativo,
    });
    setMostrarFormRegra(true);
  };

  const handleSalvarRegra = async (ativarAposSalvar?: boolean) => {
    if (!formRegra.nome.trim()) {
      exibirToast('erro', 'Informe um nome para identificar a regra de automação.');
      return;
    }
    if (!formRegra.template_id) {
      exibirToast('erro', 'Selecione qual Modelo de E-mail será enviado por esta regra.');
      return;
    }

    setSalvandoRegra(true);
    try {
      const ativoFinal =
        typeof ativarAposSalvar === 'boolean' ? ativarAposSalvar : formRegra.ativo;
      const salva = await salvarAutomacaoEmailNoBanco({
        id: editandoRegraId || undefined,
        nome: formRegra.nome,
        descricao: formRegra.descricao,
        gatilho: formRegra.gatilho,
        funil_id: formRegra.funil_id,
        etapa_destino_id:
          formRegra.gatilho === 'mudanca_etapa' ||
            formRegra.gatilho === 'novo_negocio' ||
            formRegra.gatilho === 'tempo_inatividade'
            ? formRegra.etapa_destino_id || undefined
            : undefined,
        dias_inatividade: formRegra.dias_inatividade,
        horas_atraso_envio: formRegra.horas_atraso_envio,
        destinatario_tipo: formRegra.destinatario_tipo,
        email_personalizado: formRegra.email_personalizado,
        copia_cc: formRegra.copia_cc,
        template_id: formRegra.template_id,
        apenas_horario_comercial: formRegra.apenas_horario_comercial,
        permitir_redisparo_retorno_etapa: formRegra.permitir_redisparo_retorno_etapa,
        interromper_se_ganho_perdido: formRegra.interromper_se_ganho_perdido,
        exigir_consentimento: formRegra.exigir_consentimento,
        respeitar_descadastramento: formRegra.respeitar_descadastramento,
        ativo: ativoFinal,
      });

      const listaAtualizada = await buscarAutomacoesEmailDoBanco();
      setRegras(listaAtualizada);
      setMostrarFormRegra(false);
      setEditandoRegraId(null);
      exibirToast(
        'sucesso',
        `Regra "${salva.nome}" salva (${ativoFinal ? 'Ativada' : 'Salva em rascunho/pausada para validação'}).`
      );
    } catch {
      exibirToast('erro', 'Não foi possível salvar a regra de automação.');
    } finally {
      setSalvandoRegra(false);
    }
  };

  const handleTestarPreviaAntesDeAtivar = async () => {
    const template = templates.find((t) => t.id === formRegra.template_id);
    if (!template) {
      exibirToast('erro', 'Selecione um modelo de e-mail para testar antes de ativar.');
      return;
    }
    const emailAlvo =
      emailTestePreviaRegra.trim() || configServidor.email_remetente || 'teste@empresa.com.br';
    setTestandoPreviaRegra(true);
    try {
      const etapaNome =
        etapas.find((e) => e.id === formRegra.etapa_destino_id)?.nome || 'Proposta Enviada';
      const assuntoInterpolado = interpolarVariaveisTemplateEmail(template.assunto, {
        nome_contato: 'Mariana Costa',
        nome_empresa: 'Grupo Horizonte',
        titulo_negocio: 'Kits Corporativos Personalizados (200 un)',
        valor_negocio: 'R$ 14.200,00',
        etapa_funil: etapaNome,
        nome_vendedor: 'Carlos Silva',
        dias_inatividade: String(formRegra.dias_inatividade || 3),
      });

      const res = await fetch('/api/emails/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'disparar',
          automacao_nome: formRegra.nome.trim() || 'Pré-validação de Regra (Antes de Ativar)',
          template_id: template.id,
          template_nome: template.nome,
          negocio_titulo: 'Teste Pré-Ativação de Regra',
          destinatario_email: emailAlvo,
          destinatario_nome: 'Teste Pré-Ativação',
          assunto: assuntoInterpolado,
          gatilho: formRegra.gatilho,
          qtd_anexos: (template.anexos || []).length,
        }),
      });
      const json = await res.json();
      if (json.sucesso) {
        setPreviaRegraTestada(true);
        const logsAtuais = await buscarLogsEnvioEmailDoBanco();
        setLogsEnvio(logsAtuais);
        exibirToast(
          'sucesso',
          `Teste pré-ativação enviado para ${emailAlvo}! Você já pode ativar a regra com segurança.`
        );
      } else {
        exibirToast('erro', json.erro || 'Falha ao enviar e-mail de teste.');
      }
    } catch {
      exibirToast('erro', 'Erro ao testar e-mail da regra.');
    } finally {
      setTestandoPreviaRegra(false);
    }
  };

  const handleCancelarProgramacao = async (programacaoId: string) => {
    await cancelarAutomacaoProgramadaNoBanco(
      programacaoId,
      'Cancelada manualmente pelo vendedor/administrador'
    );
    const atualizada = await buscarAutomacoesProgramadasDoBanco();
    setAutomacoesProgramadas(atualizada);
    exibirToast('sucesso', 'Automação programada cancelada com sucesso.');
  };

  const handleAlternarRegraAtiva = async (regra: RegraAutomacaoEmail) => {
    const novoStatus = !regra.ativo;
    const agora = new Date().toISOString();
    setRegras((prev) =>
      prev.map((r) =>
        r.id === regra.id
          ? {
            ...r,
            ativo: novoStatus,
            pausado_por: novoStatus ? undefined : 'Administrador / Vendedor',
            pausado_em: novoStatus ? undefined : agora,
          }
          : r
      )
    );
    await salvarAutomacaoEmailNoBanco({
      ...regra,
      ativo: novoStatus,
      pausado_por: novoStatus ? undefined : 'Administrador / Vendedor',
      pausado_em: novoStatus ? undefined : agora,
    });
    exibirToast(
      'sucesso',
      `Automação "${regra.nome}" ${novoStatus ? 'ativada' : 'pausada manualmente'}.`
    );
  };

  const handleExcluirRegra = async (regraId: string) => {
    await removerAutomacaoEmailDoBanco(regraId);
    setRegras((prev) => prev.filter((r) => r.id !== regraId));
    exibirToast('sucesso', 'Regra de automação removida.');
  };

  const handleTestarDisparoRegra = async (regra: RegraAutomacaoEmail) => {
    setDisparandoRegraId(regra.id);
    try {
      const template = templates.find((t) => t.id === regra.template_id);
      const etapaNome =
        etapas.find((e) => e.id === regra.etapa_destino_id)?.nome || 'Proposta Enviada';

      const assuntoInterpolado = interpolarVariaveisTemplateEmail(
        template?.assunto || `Disparo automático: ${regra.nome}`,
        {
          nome_contato: 'Roberto Almeida',
          nome_empresa: 'TechCorp Inovação S.A.',
          titulo_negocio: 'Kits Corporativos Fim de Ano (250 un)',
          valor_negocio: 'R$ 18.500,00',
          etapa_funil: etapaNome,
          nome_vendedor: 'Carlos Silva',
          dias_inatividade: String(regra.dias_inatividade || 3),
        }
      );

      const res = await fetch('/api/emails/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'disparar',
          automacao_id: regra.id,
          automacao_nome: regra.nome,
          template_id: template?.id,
          template_nome: template?.nome || 'Modelo Padrão',
          negocio_titulo: 'Kits Corporativos Fim de Ano (250 un)',
          destinatario_email:
            regra.destinatario_tipo === 'email_personalizado' && regra.email_personalizado
              ? regra.email_personalizado
              : configServidor.email_remetente || 'roberto@techcorp.com.br',
          destinatario_nome: 'Roberto Almeida',
          assunto: assuntoInterpolado,
          gatilho: regra.gatilho,
          qtd_anexos: (template?.anexos || []).length,
        }),
      });

      const json = await res.json();
      if (json.sucesso) {
        await salvarAutomacaoEmailNoBanco({
          ...regra,
          total_disparos: (regra.total_disparos || 0) + 1,
          ultimo_disparo_em: new Date().toISOString(),
        });
        const [regrasAtuais, logsAtuais] = await Promise.all([
          buscarAutomacoesEmailDoBanco(),
          buscarLogsEnvioEmailDoBanco(),
        ]);
        setRegras(regrasAtuais);
        setLogsEnvio(logsAtuais);
        exibirToast(
          'sucesso',
          `Disparo de teste da regra "${regra.nome}" concluído e registrado no Histórico!`
        );
      } else {
        exibirToast('erro', json.erro || 'Falha ao testar disparo.');
      }
    } catch {
      exibirToast('erro', 'Erro ao comunicar com o serviço de disparo de e-mails.');
    } finally {
      setDisparandoRegraId(null);
    }
  };

  const handleExecutarVarreduraInatividade = async () => {
    setVerificandoInatividade(true);
    try {
      const resultado = await verificarEDispararInatividadeEmail();
      const [regrasAtuais, logsAtuais] = await Promise.all([
        buscarAutomacoesEmailDoBanco(),
        buscarLogsEnvioEmailDoBanco(),
      ]);
      setRegras(regrasAtuais);
      setLogsEnvio(logsAtuais);
      exibirToast(
        'sucesso',
        `Varredura concluída: ${resultado.verificados} negócios analisados e ${resultado.disparados} e-mail(s) de inatividade disparado(s).`
      );
    } catch {
      exibirToast('erro', 'Erro ao verificar negócios inativos.');
    } finally {
      setVerificandoInatividade(false);
    }
  };

  // ============================================================================
  // HANDLERS: TEMPLATES DE E-MAIL (IMAGENS INLINE E ANEXOS)
  // ============================================================================

  const handleSelecionarTemplate = (tpl: TemplateEmail) => {
    setTemplateSelecionadoId(tpl.id);
    setFormTemplate({
      id: tpl.id,
      nome: tpl.nome,
      categoria: tpl.categoria || 'Comercial',
      assunto: tpl.assunto,
      corpo_html: tpl.corpo_html,
      imagens_corpo: tpl.imagens_corpo || [],
      anexos: tpl.anexos || [],
      ativo: tpl.ativo,
    });
  };

  const handleNovoTemplate = () => {
    setTemplateSelecionadoId(null);
    setFormTemplate({
      id: undefined,
      nome: 'Novo Modelo de E-mail',
      categoria: 'Comercial',
      assunto: 'Novidades para a {{nome_empresa}} — {{titulo_negocio}}',
      corpo_html:
        'Olá, {{nome_contato}}!\n\nEstamos acompanhando a sua solicitação sobre "{{titulo_negocio}}" na etapa {{etapa_funil}}.\n\nConfira abaixo as imagens dos produtos e os materiais em anexo.\n\nUm abraço,\n{{nome_vendedor}}',
      imagens_corpo: [],
      anexos: [],
      ativo: true,
    });
  };

  const handleInserirVariavelNoCorpo = (variavel: string) => {
    setFormTemplate((prev) => ({
      ...prev,
      corpo_html: `${prev.corpo_html}${prev.corpo_html.endsWith(' ') || prev.corpo_html.endsWith('\n') ? '' : ' '}${variavel}`,
    }));
  };

  const handleUploadImagemCorpo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const arquivo = files[0];

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const novaImg: ImagemEmailInline = {
        id: crypto.randomUUID(),
        nome: arquivo.name,
        url_ou_base64: dataUrl,
        largura: novaLarguraImagem,
        alt: novaLegendaImagem.trim() || arquivo.name,
      };
      setFormTemplate((prev) => ({
        ...prev,
        imagens_corpo: [...prev.imagens_corpo, novaImg],
      }));
      setNovaLegendaImagem('');
      exibirToast('sucesso', `Imagem "${arquivo.name}" adicionada ao corpo do e-mail!`);
    };
    reader.readAsDataURL(arquivo);
    e.target.value = '';
  };

  const handleAdicionarImagemPorUrl = () => {
    if (!novaUrlImagem.trim()) {
      exibirToast('erro', 'Informe a URL da imagem para inserir no e-mail.');
      return;
    }
    const novaImg: ImagemEmailInline = {
      id: crypto.randomUUID(),
      nome: novaLegendaImagem.trim() || 'Imagem promocional',
      url_ou_base64: novaUrlImagem.trim(),
      largura: novaLarguraImagem,
      alt: novaLegendaImagem.trim() || 'Imagem do e-mail',
    };
    setFormTemplate((prev) => ({
      ...prev,
      imagens_corpo: [...prev.imagens_corpo, novaImg],
    }));
    setNovaUrlImagem('');
    setNovaLegendaImagem('');
    exibirToast('sucesso', 'Imagem vinculada ao corpo do e-mail!');
  };

  const handleRemoverImagemCorpo = (imgId: string) => {
    setFormTemplate((prev) => ({
      ...prev,
      imagens_corpo: prev.imagens_corpo.filter((i) => i.id !== imgId),
    }));
  };

  const handleUploadAnexos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((arquivo) => {
      const reader = new FileReader();
      reader.onload = () => {
        const novoAnexo: AnexoEmailTemplate = {
          id: crypto.randomUUID(),
          nome_arquivo: arquivo.name,
          tipo_mime: arquivo.type || 'application/octet-stream',
          tamanho_bytes: arquivo.size,
          conteudo_base64_ou_url: String(reader.result || ''),
        };
        setFormTemplate((prev) => ({
          ...prev,
          anexos: [...prev.anexos, novoAnexo],
        }));
      };
      reader.readAsDataURL(arquivo);
    });

    exibirToast(
      'sucesso',
      `${files.length} arquivo(s) anexado(s) ao modelo de e-mail!`
    );
    e.target.value = '';
  };

  const handleRemoverAnexo = (anexoId: string) => {
    setFormTemplate((prev) => ({
      ...prev,
      anexos: prev.anexos.filter((a) => a.id !== anexoId),
    }));
  };

  const handleSalvarTemplate = async () => {
    if (!formTemplate.nome.trim() || !formTemplate.assunto.trim()) {
      exibirToast('erro', 'Preencha o Nome do Modelo e o Assunto do E-mail.');
      return;
    }
    setSalvandoTemplate(true);
    try {
      const salvo = await salvarTemplateEmailNoBanco({
        id: formTemplate.id,
        nome: formTemplate.nome,
        categoria: formTemplate.categoria,
        assunto: formTemplate.assunto,
        corpo_html: formTemplate.corpo_html,
        imagens_corpo: formTemplate.imagens_corpo,
        anexos: formTemplate.anexos,
        ativo: formTemplate.ativo,
      });

      const atualizados = await buscarTemplatesEmailDoBanco();
      setTemplates(atualizados);
      setTemplateSelecionadoId(salvo.id);
      setFormTemplate((prev) => ({ ...prev, id: salvo.id }));
      exibirToast('sucesso', `Modelo de e-mail "${salvo.nome}" salvo com sucesso!`);
    } catch {
      exibirToast('erro', 'Erro ao salvar modelo de e-mail.');
    } finally {
      setSalvandoTemplate(false);
    }
  };

  const handleExcluirTemplate = async (id: string) => {
    await removerTemplateEmailDoBanco(id);
    const restantes = await buscarTemplatesEmailDoBanco();
    setTemplates(restantes);
    if (restantes.length > 0) {
      handleSelecionarTemplate(restantes[0]);
    } else {
      handleNovoTemplate();
    }
    exibirToast('sucesso', 'Modelo de e-mail removido.');
  };

  // ============================================================================
  // HANDLERS: CONTA & SERVIDOR DE E-MAIL (SMTP)
  // ============================================================================

  const handleSelecionarPresetConta = (tipo: TipoContaEmail) => {
    const preset = PRESETS_CONTA_EMAIL[tipo];
    setConfigServidor((prev) => ({
      ...prev,
      tipo_conta: tipo,
      provedor_nome: preset.provedor_nome,
      smtp_host: preset.smtp_host || prev.smtp_host,
      smtp_porta: preset.smtp_porta,
      seguranca: preset.seguranca,
    }));
  };

  const handleSalvarConfigServidor = async () => {
    if (!configServidor.smtp_host.trim() || !configServidor.email_remetente.trim()) {
      exibirToast('erro', 'Preencha ao menos o Servidor SMTP (Host) e o E-mail do Remetente.');
      return;
    }
    setSalvandoServidor(true);
    try {
      const salvo = await salvarConfigServidorEmail(configServidor);
      setConfigServidor(salvo);
      exibirToast('sucesso', 'Configurações de Conta e Servidor SMTP salvas com sucesso!');
    } catch {
      exibirToast('erro', 'Erro ao salvar configurações do servidor de e-mail.');
    } finally {
      setSalvandoServidor(false);
    }
  };

  const handleTestarConexaoSmtp = async () => {
    setTestandoConexao(true);
    try {
      const res = await fetch('/api/emails/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'testar_conexao',
          config: configServidor,
          email_destino_teste: emailTesteDestino || configServidor.email_remetente,
        }),
      });
      const json = await res.json();
      if (json.sucesso) {
        if (json.config) setConfigServidor(json.config);
        const logsAtuais = await buscarLogsEnvioEmailDoBanco();
        setLogsEnvio(logsAtuais);
        exibirToast('sucesso', json.mensagem);
      } else {
        exibirToast('erro', json.erro || 'Falha ao conectar no servidor SMTP.');
      }
    } catch {
      exibirToast('erro', 'Erro ao testar conexão com o servidor SMTP.');
    } finally {
      setTestandoConexao(false);
    }
  };

  const renderBadgeGatilho = (gatilho: GatilhoAutomacaoEmail) => {
    switch (gatilho) {
      case 'mudanca_etapa':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
            <ArrowRightLeft className="h-3 w-3" />
            Mudança de Fase do Funil
          </span>
        );
      case 'tempo_inatividade':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            <Clock className="h-3 w-3" />
            Tempo de Inatividade
          </span>
        );
      case 'novo_negocio':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <Sparkles className="h-3 w-3" />
            Novo Negócio / Lead
          </span>
        );
      case 'negocio_ganho':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 px-2.5 py-0.5 text-xs font-medium text-teal-600 dark:text-teal-400">
            <Trophy className="h-3 w-3" />
            Negócio Ganho
          </span>
        );
      case 'negocio_perdido':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-600 dark:text-rose-400">
            <XCircle className="h-3 w-3" />
            Negócio Perdido
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast de Feedback */}
      {feedbackToast && (
        <div
          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm shadow-sm transition-all ${feedbackToast.tipo === 'sucesso'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
            }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackToast.tipo === 'sucesso' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            )}
            <span className="font-medium">{feedbackToast.texto}</span>
          </div>
          <button
            onClick={() => setFeedbackToast(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Barra de Navegação das 5 Seções */}
      <div className="rounded-xl border border-border bg-card p-2 shadow-sm">
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-5">
          <button
            type="button"
            onClick={() => setAbaAtiva('regras')}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-all ${abaAtiva === 'regras'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
          >
            <Zap className="h-4 w-4 shrink-0" />
            <div>
              <p className="text-xs font-semibold">Regras de Automação</p>
              <p
                className={`text-[11px] ${abaAtiva === 'regras' ? 'text-indigo-100' : 'text-muted-foreground'
                  }`}
              >
                Gatilhos e governança
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('programadas')}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-all ${abaAtiva === 'programadas'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
          >
            <CalendarClock className="h-4 w-4 shrink-0" />
            <div>
              <p className="text-xs font-semibold">Próximas Programadas</p>
              <p
                className={`text-[11px] ${abaAtiva === 'programadas' ? 'text-indigo-100' : 'text-muted-foreground'
                  }`}
              >
                {automacoesProgramadas.filter((p) => p.status === 'agendada').length} na fila
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('templates')}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-all ${abaAtiva === 'templates'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
          >
            <FileText className="h-4 w-4 shrink-0" />
            <div>
              <p className="text-xs font-semibold">Modelos de E-mail</p>
              <p
                className={`text-[11px] ${abaAtiva === 'templates' ? 'text-indigo-100' : 'text-muted-foreground'
                  }`}
              >
                Imagens no corpo e anexos
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('servidor')}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-all ${abaAtiva === 'servidor'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
          >
            <Server className="h-4 w-4 shrink-0" />
            <div>
              <p className="text-xs font-semibold">Conta & Servidor SMTP</p>
              <p
                className={`text-[11px] ${abaAtiva === 'servidor' ? 'text-indigo-100' : 'text-muted-foreground'
                  }`}
              >
                Tipo de conta, host, porta e SSL
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('historico')}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-all ${abaAtiva === 'historico'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
          >
            <History className="h-4 w-4 shrink-0" />
            <div>
              <p className="text-xs font-semibold">Histórico de Envios</p>
              <p
                className={`text-[11px] ${abaAtiva === 'historico' ? 'text-indigo-100' : 'text-muted-foreground'
                  }`}
              >
                {logsEnvio.length} disparos registrados
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* =====================================================================
          ABA 1: REGRAS DE AUTOMAÇÃO DE E-MAIL
      ===================================================================== */}
      {abaAtiva === 'regras' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">
                  Regras de Disparo Automático de E-mails
                </h2>
                <p className="text-xs text-muted-foreground">
                  Automatize o envio de e-mails quando um card mudar de fase no funil, atingir tempo de inatividade ou entrar no CRM.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExecutarVarreduraInatividade}
                  disabled={verificandoInatividade}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${verificandoInatividade ? 'animate-spin' : ''}`}
                  />
                  Verificar Inatividade Agora
                </button>
                <button
                  type="button"
                  onClick={handleAbrirNovaRegra}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-indigo-500"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nova Regra de Automação
                </button>
              </div>
            </div>

            {/* Formulário de Criação / Edição de Regra */}
            {mostrarFormRegra && (
              <div className="mt-5 rounded-xl border border-indigo-500/30 bg-secondary/20 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    {editandoRegraId ? 'Editar Regra de Automação' : 'Criar Nova Regra de Automação'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setMostrarFormRegra(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Nome da Regra *
                    </label>
                    <input
                      type="text"
                      value={formRegra.nome}
                      onChange={(e) =>
                        setFormRegra((prev) => ({ ...prev, nome: e.target.value }))
                      }
                      placeholder="Ex: Enviar Catálogo ao mover para Proposta Enviada"
                      className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Gatilho de Disparo (Quando enviar?) *
                    </label>
                    <select
                      value={formRegra.gatilho}
                      onChange={(e) =>
                        setFormRegra((prev) => ({
                          ...prev,
                          gatilho: e.target.value as GatilhoAutomacaoEmail,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="mudanca_etapa">
                        Mudança de Fase de Funil (Card movido para etapa)
                      </option>
                      <option value="tempo_inatividade">
                        Tempo de Inatividade (Card parado sem interação)
                      </option>
                      <option value="novo_negocio">
                        Novo Card Criado (Entrada no Funil / Landing Page)
                      </option>
                      <option value="negocio_ganho">
                        Negócio Marcado como Ganho
                      </option>
                      <option value="negocio_perdido">
                        Negócio Marcado como Perdido
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Funil Monitorado
                    </label>
                    <select
                      value={formRegra.funil_id}
                      onChange={(e) => {
                        const novoFunilId = e.target.value;
                        const primeiraEtapa =
                          etapas
                            .filter((et) => et.funil_id === novoFunilId)
                            .sort((a, b) => a.ordem - b.ordem)[0]?.id || '';
                        setFormRegra((prev) => ({
                          ...prev,
                          funil_id: novoFunilId,
                          etapa_destino_id: primeiraEtapa,
                        }));
                      }}
                      className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="">Todos os Funis</option>
                      {funis.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  {(formRegra.gatilho === 'mudanca_etapa' ||
                    formRegra.gatilho === 'novo_negocio' ||
                    formRegra.gatilho === 'tempo_inatividade') && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">
                          {formRegra.gatilho === 'mudanca_etapa'
                            ? 'Fase / Etapa de Destino no Funil'
                            : formRegra.gatilho === 'tempo_inatividade'
                              ? 'Etapa Monitorada (Opcional)'
                              : 'Etapa de Entrada'}
                        </label>
                        <select
                          value={formRegra.etapa_destino_id}
                          onChange={(e) =>
                            setFormRegra((prev) => ({
                              ...prev,
                              etapa_destino_id: e.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                        >
                          {formRegra.gatilho === 'tempo_inatividade' && (
                            <option value="">Qualquer etapa deste funil</option>
                          )}
                          {etapasDoFunilRegra.map((et) => (
                            <option key={et.id} value={et.id}>
                              {et.nome}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                  {formRegra.gatilho === 'tempo_inatividade' && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Dias de Inatividade para Disparar *
                      </label>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={180}
                          value={formRegra.dias_inatividade}
                          onChange={(e) =>
                            setFormRegra((prev) => ({
                              ...prev,
                              dias_inatividade: Number(e.target.value) || 1,
                            }))
                          }
                          className="w-28 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                        />
                        <span className="text-xs text-muted-foreground">
                          dias sem movimentação ou atividade no card
                        </span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Modelo de E-mail a Enviar *
                    </label>
                    <select
                      value={formRegra.template_id}
                      onChange={(e) =>
                        setFormRegra((prev) => ({ ...prev, template_id: e.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    >
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nome} ({(t.imagens_corpo || []).length} img, {(t.anexos || []).length}{' '}
                          anexo)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Destinatário do E-mail
                    </label>
                    <select
                      value={formRegra.destinatario_tipo}
                      onChange={(e) =>
                        setFormRegra((prev) => ({
                          ...prev,
                          destinatario_tipo: e.target.value as DestinatarioAutomacaoEmail,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="contato_principal">
                        Contato / Cliente Principal do Card
                      </option>
                      <option value="responsavel">
                        Vendedor Responsável pelo Negócio
                      </option>
                      <option value="ambos">
                        Cliente Principal + Vendedor em Cópia
                      </option>
                      <option value="email_personalizado">
                        E-mail Fixo / Setor Específico
                      </option>
                    </select>
                  </div>

                  {formRegra.destinatario_tipo === 'email_personalizado' && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        E-mail de Destino Personalizado
                      </label>
                      <input
                        type="email"
                        value={formRegra.email_personalizado}
                        onChange={(e) =>
                          setFormRegra((prev) => ({
                            ...prev,
                            email_personalizado: e.target.value,
                          }))
                        }
                        placeholder="financeiro@empresa.com.br"
                        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Cópia Oculta / CC (Opcional)
                    </label>
                    <input
                      type="text"
                      value={formRegra.copia_cc}
                      onChange={(e) =>
                        setFormRegra((prev) => ({ ...prev, copia_cc: e.target.value }))
                      }
                      placeholder="gestao@brindaypersonalizados.com.br"
                      className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Descrição / Observação Interna
                    </label>
                    <input
                      type="text"
                      value={formRegra.descricao}
                      onChange={(e) =>
                        setFormRegra((prev) => ({ ...prev, descricao: e.target.value }))
                      }
                      placeholder="Explica o objetivo comercial desta regra para a equipe"
                      className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Controles Obrigatórios de Governança e Segurança */}
                <div className="rounded-xl border border-border bg-background/70 p-4 space-y-4">
                  <div className="flex items-center gap-2 border-b border-border pb-2.5">
                    <ShieldCheck className="h-4 w-4 text-indigo-500" />
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                      Controles Obrigatórios de Segurança, Duplicidade & Compliance
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Política ao Marcar Negócio como Ganho ou Perdido
                      </label>
                      <select
                        value={formRegra.interromper_se_ganho_perdido}
                        onChange={(e) =>
                          setFormRegra((prev) => ({
                            ...prev,
                            interromper_se_ganho_perdido: e.target
                              .value as PoliticaInterrupcaoAutomacao,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="ambos">
                          Interromper régua automaticamente em Ganho OU Perdido (Recomendado)
                        </option>
                        <option value="apenas_ganho">
                          Interromper apenas quando Negócio for Ganho
                        </option>
                        <option value="apenas_perdido">
                          Interromper apenas quando Negócio for Perdido
                        </option>
                        <option value="nunca">
                          Não interromper automaticamente
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Atraso Programado para Disparo (em horas)
                      </label>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={720}
                          value={formRegra.horas_atraso_envio}
                          onChange={(e) =>
                            setFormRegra((prev) => ({
                              ...prev,
                              horas_atraso_envio: Number(e.target.value) || 0,
                            }))
                          }
                          className="w-24 rounded-lg border border-input bg-background px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                        />
                        <span className="text-[11px] text-muted-foreground">
                          0 = envio imediato • &gt;0 = entra na fila programada visível ao vendedor
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <label className="flex items-start gap-2.5 rounded-lg border border-border/80 bg-secondary/20 p-2.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!formRegra.permitir_redisparo_retorno_etapa}
                        onChange={(e) =>
                          setFormRegra((prev) => ({
                            ...prev,
                            permitir_redisparo_retorno_etapa: !e.target.checked,
                          }))
                        }
                        className="mt-0.5 h-4 w-4 rounded border-input text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <span className="font-semibold text-foreground block">
                          Impedir disparos duplicados no retorno de etapa
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Bloqueia novo envio se a negociação voltar para uma fase anterior já disparada.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 rounded-lg border border-border/80 bg-secondary/20 p-2.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formRegra.respeitar_descadastramento}
                        onChange={(e) =>
                          setFormRegra((prev) => ({
                            ...prev,
                            respeitar_descadastramento: e.target.checked,
                          }))
                        }
                        className="mt-0.5 h-4 w-4 rounded border-input text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <span className="font-semibold text-foreground block">
                          Verificar descadastramento (Opt-out) antes de enviar
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Impede envio para contatos marcados como descadastrados.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 rounded-lg border border-border/80 bg-secondary/20 p-2.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formRegra.exigir_consentimento}
                        onChange={(e) =>
                          setFormRegra((prev) => ({
                            ...prev,
                            exigir_consentimento: e.target.checked,
                          }))
                        }
                        className="mt-0.5 h-4 w-4 rounded border-input text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <span className="font-semibold text-foreground block">
                          Exigir consentimento de e-mail ativo (LGPD)
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Valida se o contato/card autorizou comunicações antes do disparo.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 rounded-lg border border-border/80 bg-secondary/20 p-2.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formRegra.apenas_horario_comercial}
                        onChange={(e) =>
                          setFormRegra((prev) => ({
                            ...prev,
                            apenas_horario_comercial: e.target.checked,
                          }))
                        }
                        className="mt-0.5 h-4 w-4 rounded border-input text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <span className="font-semibold text-foreground block">
                          Restringir disparos ao horário comercial
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Respeita janela das 08h às 19h em dias úteis.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Pré-visualização e Teste Obrigatório Antes de Ativar a Regra */}
                {(() => {
                  const templatePrev = templates.find((t) => t.id === formRegra.template_id);
                  const etapaPrev =
                    etapas.find((e) => e.id === formRegra.etapa_destino_id)?.nome ||
                    'Etapa do Funil';
                  if (!templatePrev) return null;

                  return (
                    <div className="rounded-xl border border-indigo-500/30 bg-background p-4 space-y-3">
                      <div className="flex flex-col gap-2 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-indigo-500" />
                          <div>
                            <h4 className="text-xs font-semibold text-foreground">
                              Pré-visualização & Teste do E-mail Antes de Ativar a Regra
                            </h4>
                            <p className="text-[11px] text-muted-foreground">
                              Confira o texto, imagens e anexos abaixo e envie um teste antes de colocar em produção.
                            </p>
                          </div>
                        </div>
                        {previaRegraTestada && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            E-mail Testado!
                          </span>
                        )}
                      </div>

                      <div className="rounded-lg border border-border/80 bg-secondary/20 p-3 space-y-2 text-xs">
                        <p>
                          <strong className="text-muted-foreground">Assunto: </strong>
                          <span className="font-semibold text-foreground">
                            {interpolarVariaveisTemplateEmail(templatePrev.assunto, {
                              nome_contato: 'Mariana Costa',
                              nome_empresa: 'Grupo Horizonte',
                              titulo_negocio: 'Kits Corporativos (200 un)',
                              valor_negocio: 'R$ 14.200,00',
                              etapa_funil: etapaPrev,
                              nome_vendedor: 'Carlos Silva',
                              dias_inatividade: String(formRegra.dias_inatividade || 3),
                            })}
                          </span>
                        </p>
                        <p className="whitespace-pre-line text-foreground/90 leading-relaxed">
                          {interpolarVariaveisTemplateEmail(templatePrev.corpo_html, {
                            nome_contato: 'Mariana Costa',
                            nome_empresa: 'Grupo Horizonte',
                            titulo_negocio: 'Kits Corporativos (200 un)',
                            valor_negocio: 'R$ 14.200,00',
                            etapa_funil: etapaPrev,
                            nome_vendedor: 'Carlos Silva',
                            dias_inatividade: String(formRegra.dias_inatividade || 3),
                          })}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <ImageIcon className="h-3.5 w-3.5 text-indigo-500" />
                            {(templatePrev.imagens_corpo || []).length} imagem(ns) no corpo
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Paperclip className="h-3.5 w-3.5 text-emerald-500" />
                            {(templatePrev.anexos || []).length} anexo(s)
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          type="email"
                          value={emailTestePreviaRegra}
                          onChange={(e) => setEmailTestePreviaRegra(e.target.value)}
                          placeholder="Digite um e-mail para receber o teste pré-ativação"
                          className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleTestarPreviaAntesDeAtivar}
                          disabled={testandoPreviaRegra}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3.5 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-500/20 dark:text-indigo-300 disabled:opacity-50"
                        >
                          <Send className="h-3.5 w-3.5" />
                          {testandoPreviaRegra
                            ? 'Enviando Teste...'
                            : 'Testar E-mail Antes de Ativar'}
                        </button>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
                  <span className="text-[11px] text-muted-foreground">
                    Você pode salvar pausada para revisar com a equipe ou ativar imediatamente.
                  </span>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMostrarFormRegra(false)}
                      className="rounded-lg border border-border px-3.5 py-2 text-xs font-medium text-muted-foreground hover:bg-accent"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSalvarRegra(false)}
                      disabled={salvandoRegra}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3.5 py-2 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50"
                    >
                      <PauseCircle className="h-3.5 w-3.5 text-amber-500" />
                      Salvar Pausada (Rascunho)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSalvarRegra(true)}
                      disabled={salvandoRegra}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {salvandoRegra ? 'Salvando...' : 'Salvar e Ativar Regra'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Lista de Regras Cadastradas */}
            <div className="mt-5 space-y-3">
              {regras.map((regra) => {
                const funilObj = funis.find((f) => f.id === regra.funil_id);
                const etapaObj = etapas.find((e) => e.id === regra.etapa_destino_id);
                const templateObj = templates.find((t) => t.id === regra.template_id);

                return (
                  <div
                    key={regra.id}
                    className={`rounded-xl border p-4 transition-all ${regra.ativo
                        ? 'border-border bg-secondary/20'
                        : 'border-border/60 bg-secondary/5 opacity-70'
                      }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {regra.nome}
                          </span>
                          {renderBadgeGatilho(regra.gatilho)}
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${regra.ativo
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-muted text-muted-foreground'
                              }`}
                          >
                            {regra.ativo ? 'Ativa' : 'Pausada'}
                          </span>
                        </div>

                        {regra.descricao && (
                          <p className="text-xs text-muted-foreground">{regra.descricao}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
                          <span>
                            <strong className="text-foreground">Funil:</strong>{' '}
                            {funilObj ? funilObj.nome : 'Todos os Funis'}
                          </span>

                          {regra.gatilho === 'mudanca_etapa' && etapaObj && (
                            <span>
                              <strong className="text-foreground">Ao entrar na Fase:</strong>{' '}
                              {etapaObj.nome}
                            </span>
                          )}

                          {regra.gatilho === 'tempo_inatividade' && (
                            <span>
                              <strong className="text-foreground">Inatividade:</strong>{' '}
                              {regra.dias_inatividade} dias sem interação
                              {etapaObj ? ` (Fase: ${etapaObj.nome})` : ''}
                            </span>
                          )}

                          <span>
                            <strong className="text-foreground">E-mail:</strong>{' '}
                            {templateObj ? templateObj.nome : 'Modelo Padrão'}
                          </span>

                          <span>
                            <strong className="text-foreground">Disparos:</strong>{' '}
                            {regra.total_disparos || 0}
                          </span>
                        </div>

                        {/* Selos dos Controles de Governança Ativos */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                          <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
                            <ShieldCheck className="h-3 w-3 text-indigo-500" />
                            {regra.permitir_redisparo_retorno_etapa
                              ? 'Permite redisparo no retorno'
                              : 'Bloqueia duplicidade no retorno'}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
                            <Ban className="h-3 w-3 text-amber-500" />
                            {regra.interromper_se_ganho_perdido === 'nunca'
                              ? 'Continua se Ganho/Perdido'
                              : regra.interromper_se_ganho_perdido === 'apenas_ganho'
                                ? 'Interrompe se Ganho'
                                : regra.interromper_se_ganho_perdido === 'apenas_perdido'
                                  ? 'Interrompe se Perdido'
                                  : 'Interrompe em Ganho/Perdido'}
                          </span>
                          {(regra.exigir_consentimento !== false ||
                            regra.respeitar_descadastramento !== false) && (
                              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
                                <ShieldAlert className="h-3 w-3 text-emerald-500" />
                                Verifica Consentimento &amp; Opt-out
                              </span>
                            )}
                          {!regra.ativo && regra.pausado_por && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-700 dark:text-amber-300">
                              <PauseCircle className="h-3 w-3" />
                              Pausada por {regra.pausado_por}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setRegraEmPreviewId((prev) =>
                              prev === regra.id ? null : regra.id
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
                          title="Pré-visualizar o e-mail desta regra"
                        >
                          <Eye className="h-3.5 w-3.5 text-indigo-500" />
                          Pré-visualizar
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTestarDisparoRegra(regra)}
                          disabled={disparandoRegraId === regra.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50"
                          title="Simular e testar envio imediato desta regra"
                        >
                          <Play className="h-3.5 w-3.5 text-indigo-500" />
                          {disparandoRegraId === regra.id ? 'Enviando...' : 'Testar Disparo'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEditarRegra(regra)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAlternarRegraAtiva(regra)}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${regra.ativo
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'border-border bg-background text-muted-foreground'
                            }`}
                        >
                          <Power className="h-3.5 w-3.5" />
                          {regra.ativo ? 'Ativa' : 'Ativar'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleExcluirRegra(regra.id)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"
                          title="Excluir regra"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {regraEmPreviewId === regra.id && templateObj && (
                      <div className="mt-3 rounded-lg border border-indigo-500/30 bg-background p-3.5 space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                            Pré-visualização do E-mail ({templateObj.nome})
                          </span>
                          <button
                            type="button"
                            onClick={() => setRegraEmPreviewId(null)}
                            className="text-[11px] text-muted-foreground hover:text-foreground"
                          >
                            Ocultar
                          </button>
                        </div>
                        <p>
                          <strong className="text-muted-foreground">Assunto: </strong>
                          <span className="font-semibold">
                            {interpolarVariaveisTemplateEmail(templateObj.assunto, {
                              nome_contato: 'Roberto Almeida',
                              nome_empresa: 'TechCorp Inovação',
                              titulo_negocio: 'Kits Corporativos (250 un)',
                              valor_negocio: 'R$ 18.500,00',
                              etapa_funil: etapaObj?.nome || 'Etapa do Funil',
                              nome_vendedor: 'Carlos Silva',
                              dias_inatividade: String(regra.dias_inatividade || 3),
                            })}
                          </span>
                        </p>
                        <p className="whitespace-pre-line text-muted-foreground leading-relaxed">
                          {interpolarVariaveisTemplateEmail(templateObj.corpo_html, {
                            nome_contato: 'Roberto Almeida',
                            nome_empresa: 'TechCorp Inovação',
                            titulo_negocio: 'Kits Corporativos (250 un)',
                            valor_negocio: 'R$ 18.500,00',
                            etapa_funil: etapaObj?.nome || 'Etapa do Funil',
                            nome_vendedor: 'Carlos Silva',
                            dias_inatividade: String(regra.dias_inatividade || 3),
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ABA 1B: PRÓXIMAS AUTOMAÇÕES PROGRAMADAS (FILA VISÍVEL AO VENDEDOR)
      ===================================================================== */}
      {abaAtiva === 'programadas' && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">
                Próximas Automações Programadas (Fila de Envios)
              </h2>
              <p className="text-xs text-muted-foreground">
                Visualize os disparos futuros agendados por atraso programado ou tempo de inatividade. Negócios ganhos/perdidos ou pausados manualmente têm a régua interrompida automaticamente.
              </p>
            </div>
            <button
              type="button"
              onClick={carregarTudo}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Atualizar Fila
            </button>
          </div>

          {automacoesProgramadas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
              Nenhuma automação programada na fila no momento.
            </div>
          ) : (
            <div className="space-y-2.5">
              {automacoesProgramadas.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-secondary/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${item.status === 'agendada'
                            ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                            : item.status === 'pausada'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : item.status === 'cancelada'
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                : 'bg-emerald-500/10 text-emerald-600'
                          }`}
                      >
                        <CalendarClock className="h-3 w-3" />
                        {item.status === 'agendada'
                          ? 'Programada'
                          : item.status === 'pausada'
                            ? 'Pausada'
                            : item.status === 'cancelada'
                              ? 'Interrompida / Cancelada'
                              : 'Executada'}
                      </span>
                      <span className="text-xs font-semibold text-foreground">
                        {item.automacao_nome}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Card: <strong className="text-foreground">{item.negocio_titulo}</strong>
                      {item.etapa_nome ? ` (${item.etapa_nome})` : ''} • Para:{' '}
                      <strong>{item.destinatario_nome}</strong> &lt;{item.destinatario_email}&gt; •
                      Modelo: <strong>{item.template_nome}</strong>
                    </p>
                    {item.motivo_cancelamento && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400">
                        Motivo: {item.motivo_cancelamento}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs">
                      <p className="font-semibold text-foreground">
                        {new Date(item.agendado_para).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Previsão de envio</p>
                    </div>
                    {(item.status === 'agendada' || item.status === 'pausada') && (
                      <button
                        type="button"
                        onClick={() => handleCancelarProgramacao(item.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-500/20"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          ABA 2: MODELOS DE E-MAIL (TEMPLATES COM IMAGENS E ANEXOS)
      ===================================================================== */}
      {abaAtiva === 'templates' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Coluna Esquerda: Lista de Modelos */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h2 className="text-sm font-semibold">Modelos de E-mail</h2>
                  <p className="text-[11px] text-muted-foreground">
                    Templates usados nas automações
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleNovoTemplate}
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Novo E-mail
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {templates.map((tpl) => {
                  const selecionado = tpl.id === templateSelecionadoId;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => handleSelecionarTemplate(tpl)}
                      className={`cursor-pointer rounded-xl border p-3 transition-all ${selecionado
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-border bg-secondary/20 hover:bg-secondary/40'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-foreground">{tpl.nome}</p>
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                            {tpl.assunto}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExcluirTemplate(tpl.id);
                          }}
                          className="rounded p-1 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"
                          title="Remover modelo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <ImageIcon className="h-3 w-3 text-indigo-500" />
                          {(tpl.imagens_corpo || []).length} img
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Paperclip className="h-3 w-3 text-emerald-500" />
                          {(tpl.anexos || []).length} anexo(s)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Coluna Direita: Editor Completo + Imagens + Anexos + Preview */}
          <div className="lg:col-span-8 space-y-6">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
              <div className="flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold">
                    Editor de E-mail para Automação
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Personalize o assunto, variáveis dinâmicas, imagens incorporadas no corpo e arquivos em anexo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSalvarTemplate}
                  disabled={salvandoTemplate}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" />
                  {salvandoTemplate ? 'Salvando...' : 'Salvar Modelo de E-mail'}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Nome Interno do Modelo *
                  </label>
                  <input
                    type="text"
                    value={formTemplate.nome}
                    onChange={(e) =>
                      setFormTemplate((prev) => ({ ...prev, nome: e.target.value }))
                    }
                    placeholder="Ex: Envio de Proposta Comercial + Catálogo PDF"
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Categoria
                  </label>
                  <select
                    value={formTemplate.categoria}
                    onChange={(e) =>
                      setFormTemplate((prev) => ({ ...prev, categoria: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="Boas-vindas">Boas-vindas / Primeiro Contato</option>
                    <option value="Comercial">Proposta Comercial</option>
                    <option value="Follow-up">Follow-up / Inatividade</option>
                    <option value="Pós-venda">Pós-venda / Produção</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="text-xs font-medium text-muted-foreground">
                    Assunto do E-mail *
                  </label>
                  <input
                    type="text"
                    value={formTemplate.assunto}
                    onChange={(e) =>
                      setFormTemplate((prev) => ({ ...prev, assunto: e.target.value }))
                    }
                    placeholder="Ex: Proposta Comercial {{titulo_negocio}} — {{nome_empresa}}"
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Variáveis Dinâmicas */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Inserir Variáveis Dinâmicas no Texto (Clique para adicionar):
                </label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {VARIAVEIS_DISPONIVEIS.map((v) => (
                    <button
                      key={v.chave}
                      type="button"
                      onClick={() => handleInserirVariavelNoCorpo(v.chave)}
                      className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-500/20 dark:text-indigo-300"
                    >
                      {v.chave} <span className="opacity-70">({v.label})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Corpo do E-mail */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Mensagem / Corpo do E-mail *
                </label>
                <textarea
                  rows={6}
                  value={formTemplate.corpo_html}
                  onChange={(e) =>
                    setFormTemplate((prev) => ({ ...prev, corpo_html: e.target.value }))
                  }
                  placeholder="Escreva o conteúdo do e-mail..."
                  className="mt-1 w-full rounded-lg border border-input bg-background p-3 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Seção de Imagens no Corpo do E-mail */}
              <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      <ImageIcon className="h-4 w-4 text-indigo-500" />
                      Imagens no Corpo do E-mail ({formTemplate.imagens_corpo.length})
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Adicione banners, fotos de kits ou mockups que aparecerão abertos dentro da mensagem.
                    </p>
                  </div>

                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500">
                    <Upload className="h-3.5 w-3.5" />
                    Enviar Imagem do Computador
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadImagemCorpo}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Adicionar por URL + Tamanho */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                  <input
                    type="text"
                    value={novaUrlImagem}
                    onChange={(e) => setNovaUrlImagem(e.target.value)}
                    placeholder="Ou cole a URL de uma imagem (https://...)"
                    className="sm:col-span-5 rounded-lg border border-input bg-background px-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={novaLegendaImagem}
                    onChange={(e) => setNovaLegendaImagem(e.target.value)}
                    placeholder="Legenda / Descrição da imagem"
                    className="sm:col-span-3 rounded-lg border border-input bg-background px-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                  <select
                    value={novaLarguraImagem}
                    onChange={(e) =>
                      setNovaLarguraImagem(e.target.value as '250px' | '450px' | '100%')
                    }
                    className="sm:col-span-2 rounded-lg border border-input bg-background px-2 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="250px">Pequena (250px)</option>
                    <option value="450px">Média (450px)</option>
                    <option value="100%">Largura Total</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAdicionarImagemPorUrl}
                    className="sm:col-span-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
                  >
                    Inserir URL
                  </button>
                </div>

                {/* Lista de Imagens Incorporadas */}
                {formTemplate.imagens_corpo.length > 0 && (
                  <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                    {formTemplate.imagens_corpo.map((img) => (
                      <div
                        key={img.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-2.5"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <img
                            src={img.url_ou_base64}
                            alt={img.alt}
                            className="h-12 w-16 shrink-0 rounded object-cover border border-border"
                          />
                          <div className="truncate">
                            <p className="truncate text-xs font-medium text-foreground">
                              {img.nome}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              Largura: {img.largura} • {img.alt}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoverImagemCorpo(img.id)}
                          className="rounded p-1 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Seção de Anexos do E-mail */}
              <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      <Paperclip className="h-4 w-4 text-emerald-500" />
                      Arquivos em Anexo ({formTemplate.anexos.length})
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Anexe catálogos em PDF, apresentações comerciais, tabelas de preços ou imagens.
                    </p>
                  </div>

                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300">
                    <Paperclip className="h-3.5 w-3.5" />
                    Adicionar Arquivo(s) em Anexo
                    <input
                      type="file"
                      multiple
                      onChange={handleUploadAnexos}
                      className="hidden"
                    />
                  </label>
                </div>

                {formTemplate.anexos.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    Nenhum arquivo anexado a este modelo de e-mail.
                  </p>
                ) : (
                  <div className="space-y-2 pt-1">
                    {formTemplate.anexos.map((anexo) => (
                      <div
                        key={anexo.id}
                        className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <Paperclip className="h-4 w-4 shrink-0 text-emerald-500" />
                          <div className="truncate">
                            <p className="truncate text-xs font-medium text-foreground">
                              {anexo.nome_arquivo}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {anexo.tipo_mime} • {formatarTamanhoArquivo(anexo.tamanho_bytes)}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoverAnexo(anexo.id)}
                          className="rounded p-1 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pré-visualização Realista do E-mail */}
              <div className="rounded-xl border border-border bg-background p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Pré-visualização do E-mail (Como o cliente receberá)
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Remetente: {configServidor.nome_remetente} &lt;{configServidor.email_remetente}&gt;
                  </span>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="rounded-lg bg-secondary/30 px-3 py-2 text-xs">
                    <span className="font-semibold text-muted-foreground">Assunto: </span>
                    <span className="font-semibold text-foreground">
                      {interpolarVariaveisTemplateEmail(formTemplate.assunto, {
                        nome_contato: 'Mariana Costa',
                        nome_empresa: 'Grupo Horizonte',
                        titulo_negocio: 'Kits Onboarding Boas-Vindas (150 un)',
                        valor_negocio: 'R$ 14.200,00',
                        etapa_funil: 'Proposta Enviada',
                        nome_vendedor: 'Carlos Silva',
                        dias_inatividade: '3',
                      })}
                    </span>
                  </div>

                  <div className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                    {interpolarVariaveisTemplateEmail(formTemplate.corpo_html, {
                      nome_contato: 'Mariana Costa',
                      nome_empresa: 'Grupo Horizonte',
                      titulo_negocio: 'Kits Onboarding Boas-Vindas (150 un)',
                      valor_negocio: 'R$ 14.200,00',
                      etapa_funil: 'Proposta Enviada',
                      nome_vendedor: 'Carlos Silva',
                      dias_inatividade: '3',
                    })}
                  </div>

                  {/* Renderização das Imagens Inline no Preview */}
                  {formTemplate.imagens_corpo.length > 0 && (
                    <div className="space-y-3 pt-2">
                      {formTemplate.imagens_corpo.map((img) => (
                        <figure key={img.id} className="space-y-1">
                          <img
                            src={img.url_ou_base64}
                            alt={img.alt}
                            style={{ maxWidth: img.largura, width: '100%' }}
                            className="rounded-lg border border-border object-cover shadow-sm"
                          />
                          {img.alt && (
                            <figcaption className="text-[11px] text-muted-foreground">
                              {img.alt}
                            </figcaption>
                          )}
                        </figure>
                      ))}
                    </div>
                  )}

                  {/* Renderização dos Anexos no Preview */}
                  {formTemplate.anexos.length > 0 && (
                    <div className="border-t border-border pt-3">
                      <p className="mb-2 text-xs font-semibold text-muted-foreground">
                        Anexos ({formTemplate.anexos.length}):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {formTemplate.anexos.map((anexo) => (
                          <div
                            key={anexo.id}
                            className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-1.5 text-xs"
                          >
                            <Paperclip className="h-3.5 w-3.5 text-emerald-500" />
                            <span className="font-medium">{anexo.nome_arquivo}</span>
                            <span className="text-muted-foreground">
                              ({formatarTamanhoArquivo(anexo.tamanho_bytes)})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ABA 3: CONTA DE E-MAIL E CONFIGURAÇÃO DE SERVIDOR SMTP
      ===================================================================== */}
      {abaAtiva === 'servidor' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">
                  Configuração da Conta & Servidor de Envio (SMTP)
                </h2>
                <p className="text-xs text-muted-foreground">
                  Selecione o tipo de conta e configure os dados do servidor SMTP responsável pelos disparos automáticos do CRM.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${configServidor.status_conexao === 'conectado'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {configServidor.status_conexao === 'conectado'
                    ? 'Servidor SMTP Conectado'
                    : 'Aguardando Teste'}
                </span>
              </div>
            </div>

            {/* 1. Seleção do Tipo de Conta / Provedor */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                1. Tipo de Conta de E-mail / Provedor
              </label>
              <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(Object.keys(PRESETS_CONTA_EMAIL) as TipoContaEmail[]).map((tipo) => {
                  const preset = PRESETS_CONTA_EMAIL[tipo];
                  const ativo = configServidor.tipo_conta === tipo;
                  return (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => handleSelecionarPresetConta(tipo)}
                      className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-all ${ativo
                          ? 'border-indigo-500 bg-indigo-500/10 shadow-sm'
                          : 'border-border bg-secondary/20 hover:bg-secondary/40'
                        }`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">
                          {preset.label}
                        </span>
                        {ativo && (
                          <CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0" />
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {preset.descricao}
                      </p>
                    </button>
                  );
                })}
              </div>

              {PRESETS_CONTA_EMAIL[configServidor.tipo_conta]?.dica && (
                <p className="mt-2.5 rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-3 py-2 text-xs text-muted-foreground">
                  💡 <strong>Dica para {PRESETS_CONTA_EMAIL[configServidor.tipo_conta].label}:</strong>{' '}
                  {PRESETS_CONTA_EMAIL[configServidor.tipo_conta].dica}
                </p>
              )}
            </div>

            {/* 2. Parâmetros do Servidor SMTP */}
            <div className="space-y-4 border-t border-border pt-5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                2. Informações de Servidor SMTP & Autenticação
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Servidor de Saída (SMTP Host) *
                  </label>
                  <input
                    type="text"
                    value={configServidor.smtp_host}
                    onChange={(e) =>
                      setConfigServidor((prev) => ({ ...prev, smtp_host: e.target.value }))
                    }
                    placeholder="Ex: smtp.gmail.com ou mail.suaempresa.com.br"
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Porta do Servidor *
                  </label>
                  <select
                    value={configServidor.smtp_porta}
                    onChange={(e) =>
                      setConfigServidor((prev) => ({
                        ...prev,
                        smtp_porta: Number(e.target.value),
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value={587}>587 (Padrão STARTTLS / TLS)</option>
                    <option value={465}>465 (Criptografia SSL Direta)</option>
                    <option value={2525}>2525 ( Porta Alternativa Relay)</option>
                    <option value={25}>25 (Sem Criptografia / Interno)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Protocolo de Segurança
                  </label>
                  <select
                    value={configServidor.seguranca}
                    onChange={(e) =>
                      setConfigServidor((prev) => ({
                        ...prev,
                        seguranca: e.target.value as SegurancaSmtp,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="tls">STARTTLS / TLS (Recomendado - Porta 587)</option>
                    <option value="ssl">SSL / TLS Dedicado (Porta 465)</option>
                    <option value="nenhuma">Sem Criptografia (Porta 25)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Usuário / Login SMTP *
                  </label>
                  <input
                    type="text"
                    value={configServidor.usuario_smtp}
                    onChange={(e) =>
                      setConfigServidor((prev) => ({
                        ...prev,
                        usuario_smtp: e.target.value,
                      }))
                    }
                    placeholder="comercial@brindaypersonalizados.com.br"
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Senha SMTP / Senha de Aplicativo *
                  </label>
                  <div className="relative mt-1">
                    <input
                      type={mostrarSenhaSmtp ? 'text' : 'password'}
                      value={configServidor.senha_smtp}
                      onChange={(e) =>
                        setConfigServidor((prev) => ({
                          ...prev,
                          senha_smtp: e.target.value,
                        }))
                      }
                      placeholder="••••••••••••••••"
                      className="w-full rounded-lg border border-input bg-background pl-3 pr-9 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenhaSmtp((v) => !v)}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      {mostrarSenhaSmtp ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Limite Diário de Segurança (Disparos/dia)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={50000}
                    value={configServidor.limite_diario}
                    onChange={(e) =>
                      setConfigServidor((prev) => ({
                        ...prev,
                        limite_diario: Number(e.target.value) || 500,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 3. Identidade do Remetente */}
            <div className="space-y-4 border-t border-border pt-5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                3. Identidade do Remetente & Assinatura
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Nome de Exibição do Remetente *
                  </label>
                  <input
                    type="text"
                    value={configServidor.nome_remetente}
                    onChange={(e) =>
                      setConfigServidor((prev) => ({
                        ...prev,
                        nome_remetente: e.target.value,
                      }))
                    }
                    placeholder="Equipe Comercial Brinday"
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    E-mail do Remetente (From) *
                  </label>
                  <input
                    type="email"
                    value={configServidor.email_remetente}
                    onChange={(e) =>
                      setConfigServidor((prev) => ({
                        ...prev,
                        email_remetente: e.target.value,
                      }))
                    }
                    placeholder="comercial@brindaypersonalizados.com.br"
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    E-mail de Resposta (Reply-To)
                  </label>
                  <input
                    type="email"
                    value={configServidor.email_resposta}
                    onChange={(e) =>
                      setConfigServidor((prev) => ({
                        ...prev,
                        email_resposta: e.target.value,
                      }))
                    }
                    placeholder="atendimento@brindaypersonalizados.com.br"
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 4. Teste de Conexão e Salvamento */}
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-secondary/20 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="email"
                  value={emailTesteDestino}
                  onChange={(e) => setEmailTesteDestino(e.target.value)}
                  placeholder="E-mail para receber o teste de conexão"
                  className="w-full sm:max-w-xs rounded-lg border border-input bg-background px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleTestarConexaoSmtp}
                  disabled={testandoConexao}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3.5 py-2 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5 text-indigo-500" />
                  {testandoConexao
                    ? 'Testando Servidor...'
                    : 'Testar Conexão & Enviar E-mail Teste'}
                </button>
              </div>

              <button
                type="button"
                onClick={handleSalvarConfigServidor}
                disabled={salvandoServidor}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                {salvandoServidor ? 'Salvando...' : 'Salvar Configurações de Servidor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ABA 4: HISTÓRICO DE DISPAROS
      ===================================================================== */}
      {abaAtiva === 'historico' && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h2 className="text-base font-semibold">
                Histórico de E-mails Enviados pelas Automações
              </h2>
              <p className="text-xs text-muted-foreground">
                Registro auditável de todos os e-mails disparados automaticamente pelo funil ou em testes.
              </p>
            </div>
            <button
              type="button"
              onClick={carregarTudo}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Atualizar Lista
            </button>
          </div>

          <div className="space-y-2.5">
            {logsEnvio.map((log) => {
              const badgeStatus =
                log.status === 'enviado' || log.status === 'simulado'
                  ? {
                    classe:
                      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                    label: log.status === 'simulado' ? 'Simulado' : 'Enviado',
                  }
                  : log.status === 'bloqueado_duplicidade'
                    ? {
                      classe: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                      label: 'Bloqueado (Duplicidade)',
                    }
                    : log.status === 'bloqueado_optout'
                      ? {
                        classe: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
                        label: 'Bloqueado (Opt-out / Consentimento)',
                      }
                      : log.status === 'interrompido_status'
                        ? {
                          classe: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
                          label: 'Interrompido (Ganho/Perdido)',
                        }
                        : log.status === 'pausado'
                          ? {
                            classe: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                            label: 'Pausado Manualmente',
                          }
                          : {
                            classe: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
                            label: 'Erro no Envio',
                          };

              return (
                <div
                  key={log.id}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-secondary/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeStatus.classe}`}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {badgeStatus.label}
                      </span>
                      <span className="text-xs font-semibold text-foreground">
                        {log.assunto}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Para: <strong className="text-foreground">{log.destinatario_nome}</strong> &lt;
                      {log.destinatario_email}&gt; • Modelo:{' '}
                      <strong className="text-foreground">{log.template_nome}</strong> • Regra:{' '}
                      <strong>{log.automacao_nome}</strong> ({log.gatilho})
                      {log.negocio_titulo ? ` • Card: ${log.negocio_titulo}` : ''}
                      {log.etapa_nome ? ` • Etapa: ${log.etapa_nome}` : ''}
                    </p>
                    {log.motivo_bloqueio && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400">
                        Motivo: {log.motivo_bloqueio}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {log.qtd_anexos > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px]">
                        <Paperclip className="h-3 w-3 text-emerald-500" />
                        {log.qtd_anexos} anexo(s)
                      </span>
                    )}
                    <span>
                      {new Date(log.enviado_em).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
