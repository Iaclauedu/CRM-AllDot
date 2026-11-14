'use client';

import * as React from 'react';
import {
  Globe,
  Copy,
  Check,
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
  Code2,
  Sliders,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DADOS_FUNIS,
  DADOS_ETAPAS,
  DADOS_MEMBROS,
  type Funil,
  type EtapaFunil,
  type Membro,
  type RegraCriacaoNegocioLP,
} from '@/lib/mock-data';
import {
  buscarConfiguracaoIntegracaoLP,
  salvarConfiguracaoIntegracaoLP,
  buscarFunisDoBanco,
  buscarEtapasDoBanco,
  buscarMembrosDoBanco,
} from '@/lib/supabase/service';

export function IntegracaoLandingPage() {
  const [funis, setFunis] = React.useState<Funil[]>(DADOS_FUNIS);
  const [todasEtapas, setTodasEtapas] = React.useState<EtapaFunil[]>(DADOS_ETAPAS);
  const [etapas, setEtapas] = React.useState<EtapaFunil[]>(DADOS_ETAPAS);
  const [membros, setMembros] = React.useState<Membro[]>(DADOS_MEMBROS);
  const [carregandoEtapas, setCarregandoEtapas] = React.useState(false);

  const [urlLandingPage, setUrlLandingPage] = React.useState(
    'https://brindes.brindaypersonalizados.com.br/'
  );
  const [origemPadrao, setOrigemPadrao] = React.useState('Landing Page Brinday');
  const [funilId, setFunilId] = React.useState(DADOS_FUNIS[0].id);
  const [etapaId, setEtapaId] = React.useState(DADOS_ETAPAS[0].id);
  const [responsavelId, setResponsavelId] = React.useState(DADOS_MEMBROS[0].id);
  const [regraCriacao, setRegraCriacao] =
    React.useState<RegraCriacaoNegocioLP>('atualizar_aberto');
  const [atualizarContatoExistente, setAtualizarContatoExistente] =
    React.useState(true);

  const [salvandoConfig, setSalvandoConfig] = React.useState(false);
  const [feedbackConfig, setFeedbackConfig] = React.useState<string | null>(null);
  const [copiadoWebhook, setCopiadoWebhook] = React.useState(false);
  const [copiadoScript, setCopiadoScript] = React.useState(false);

  // Estados do Simulador de Envio da Landing Page
  const [simNome, setSimNome] = React.useState('Fernanda Costa');
  const [simEmail, setSimEmail] = React.useState('fernanda.costa@eventoscorp.com.br');
  const [simEmpresa, setSimEmpresa] = React.useState('EventosCorp Brasil');
  const [simCelular, setSimCelular] = React.useState('+55 (11) 99123-4567');
  const [simProdutoInteresse, setSimProdutoInteresse] = React.useState(
    'Cordões Personalizados & Crachás'
  );
  const [simCampanha, setSimCampanha] = React.useState('Brindes Corporativos Q4');
  const [simMidia, setSimMidia] = React.useState('Google Ads Search');
  const [simConjunto, setSimConjunto] = React.useState('Compradores B2B SP');
  const [simUtmSource, setSimUtmSource] = React.useState('google');
  const [simUtmMedium, setSimUtmMedium] = React.useState('cpc');
  const [simUtmCampaign, setSimUtmCampaign] = React.useState('brindes_personalizados');
  const [simUtmContent, setSimUtmContent] = React.useState('anuncio_kit_vip');
  const [simUtmTerm, setSimUtmTerm] = React.useState('brindes personalizados empresas');
  const [enviandoTeste, setEnviandoTeste] = React.useState(false);
  const [resultadoTeste, setResultadoTeste] = React.useState<string | null>(null);

  // Carrega funis, todas as etapas reais do banco, membros e configurações do Supabase
  React.useEffect(() => {
    let montado = true;
    setCarregandoEtapas(true);

    Promise.all([
      buscarConfiguracaoIntegracaoLP(),
      buscarFunisDoBanco(),
      buscarEtapasDoBanco(),
      buscarMembrosDoBanco(),
    ])
      .then(async ([cfg, listaFunis, listaTodasEtapas, listaMembros]) => {
        if (!montado) return;

        const funisReais =
          listaFunis && listaFunis.length > 0 ? listaFunis : DADOS_FUNIS;
        setFunis(funisReais);

        if (listaTodasEtapas && listaTodasEtapas.length > 0) {
          setTodasEtapas(listaTodasEtapas);
        }

        if (listaMembros && listaMembros.length > 0) {
          setMembros(listaMembros);
        }

        // Garante que o funil selecionado exista na lista real de funis do banco (prioriza Funil Padrão)
        const funilPadrao = funisReais.find((f) => f.padrao) || funisReais[0];
        const funilValido =
          funisReais.find((f) => f.id === cfg?.funil_id) || funilPadrao;
        const funilIdSelecionado = funilValido.id;
        setFunilId(funilIdSelecionado);

        if (cfg) {
          setUrlLandingPage(cfg.url_landing_page);
          setOrigemPadrao(cfg.origem_padrao);
          setRegraCriacao(cfg.regra_criacao_negocio);
          setAtualizarContatoExistente(cfg.atualizar_contato_existente);

          if (
            listaMembros &&
            listaMembros.some((m) => m.id === cfg.responsavel_id)
          ) {
            setResponsavelId(cfg.responsavel_id);
          } else if (listaMembros && listaMembros.length > 0) {
            setResponsavelId(listaMembros[0].id);
          }
        }

        // Filtra imediatamente pelas etapas já carregadas e confirma via consulta específica do funil
        const etapasFiltradas = (listaTodasEtapas || [])
          .filter((e) => e.funil_id === funilIdSelecionado)
          .map((e, idx) => ({ ...e, ordem: idx + 1 }));

        if (etapasFiltradas.length > 0) {
          setEtapas(etapasFiltradas);
          const etapaExiste = etapasFiltradas.some((e) => e.id === cfg?.etapa_id);
          setEtapaId(etapaExiste ? cfg!.etapa_id : etapasFiltradas[0].id);
        } else {
          const etapasDoFunil = await buscarEtapasDoBanco(funilIdSelecionado);
          if (!montado) return;
          if (etapasDoFunil && etapasDoFunil.length > 0) {
            setEtapas(etapasDoFunil);
            const etapaExisteNoFunil = etapasDoFunil.some(
              (e) => e.id === cfg?.etapa_id
            );
            setEtapaId(
              etapaExisteNoFunil ? cfg!.etapa_id : etapasDoFunil[0].id
            );
          }
        }
      })
      .finally(() => {
        if (montado) setCarregandoEtapas(false);
      });

    return () => {
      montado = false;
    };
  }, []);

  const handleTrocarFunilDestino = async (novoFunilId: string) => {
    setFunilId(novoFunilId);

    // 1. Atualização imediata usando as etapas já em memória do banco
    const etapasEmMemoria = todasEtapas
      .filter((e) => e.funil_id === novoFunilId)
      .map((e, idx) => ({ ...e, ordem: idx + 1 }));

    if (etapasEmMemoria.length > 0) {
      setEtapas(etapasEmMemoria);
      setEtapaId(etapasEmMemoria[0].id);
    }

    // 2. Sincronização com o Supabase para garantir dados atualizados
    setCarregandoEtapas(true);
    try {
      const etapasFunil = await buscarEtapasDoBanco(novoFunilId);
      if (etapasFunil && etapasFunil.length > 0) {
        setEtapas(etapasFunil);
        setEtapaId((atual) =>
          etapasFunil.some((e) => e.id === atual) ? atual : etapasFunil[0].id
        );
      }
    } finally {
      setCarregandoEtapas(false);
    }
  };

  const handleSalvarConfiguracoes = async () => {
    setSalvandoConfig(true);
    try {
      await salvarConfiguracaoIntegracaoLP({
        url_landing_page: urlLandingPage.trim(),
        origem_padrao: origemPadrao.trim(),
        funil_id: funilId,
        etapa_id: etapaId,
        responsavel_id: responsavelId,
        regra_criacao_negocio: regraCriacao,
        atualizar_contato_existente: atualizarContatoExistente,
        ativo: true,
      });
      setFeedbackConfig(
        'Configurações de Funil, Etapa Inicial e Regra de Negociação salvas no Supabase!'
      );
      setTimeout(() => setFeedbackConfig(null), 4000);
    } finally {
      setSalvandoConfig(false);
    }
  };

  const originUrl =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const webhookEndpoint = `${originUrl}/api/webhooks/landing-page`;

  const scriptIntegracao = `<!-- Script de Integração AllDot CRM para https://brindes.brindaypersonalizados.com.br/ -->
<script>
(function() {
  const WEBHOOK_URL = "${webhookEndpoint}";

  function getParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name) || "";
  }

  document.addEventListener("submit", function(e) {
    const form = e.target;
    if (!form || form.tagName !== "FORM") return;

    const formData = new FormData(form);
    const entries = Object.fromEntries(formData.entries());

    const nome = entries.nome || entries.name || entries["form_fields[nome]"] || entries["form_fields[name]"] || "";
    const email = entries.email || entries["e-mail"] || entries["form_fields[email]"] || "";
    const empresa = entries.empresa || entries.company || entries["form_fields[empresa]"] || "";
    const celular = entries.celular || entries.telefone || entries.whatsapp || entries["form_fields[celular]"] || entries["form_fields[telefone]"] || "";

    if (!nome && !email && !celular) return;

    const payload = {
      nome: nome,
      email: email,
      empresa: empresa,
      celular: celular,
      origem_lead: "${origemPadrao}",
      url_conversao: window.location.href || "https://brindes.brindaypersonalizados.com.br/",
      campanha: getParam("campanha") || getParam("utm_campaign"),
      midia: getParam("midia") || getParam("utm_medium"),
      conjunto_anuncios: getParam("conjunto_anuncios") || getParam("adset") || getParam("utm_content"),
      utm_source: getParam("utm_source"),
      utm_medium: getParam("utm_medium"),
      utm_campaign: getParam("utm_campaign"),
      utm_content: getParam("utm_content"),
      utm_term: getParam("utm_term"),
      produto_interesse: entries.produto_interesse || entries.interesse || getParam("produto") || "",
      data_hora_cadastro: new Date().toISOString()
    };

    fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(function(err) {
      console.warn("AllDot CRM Webhook:", err);
    });
  }, true);
})();
</script>`;

  const handleTestarWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviandoTeste(true);
    setResultadoTeste(null);
    try {
      // Garante que as escolhas atuais de funil, etapa e regra sejam salvas antes do disparo
      await salvarConfiguracaoIntegracaoLP({
        url_landing_page: urlLandingPage.trim(),
        origem_padrao: origemPadrao.trim(),
        funil_id: funilId,
        etapa_id: etapaId,
        responsavel_id: responsavelId,
        regra_criacao_negocio: regraCriacao,
        atualizar_contato_existente: atualizarContatoExistente,
        ativo: true,
      });

      const res = await fetch('/api/webhooks/landing-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: simNome,
          email: simEmail,
          empresa: simEmpresa,
          celular: simCelular,
          origem_lead: origemPadrao,
          url_conversao: urlLandingPage,
          campanha: simCampanha,
          midia: simMidia,
          conjunto_anuncios: simConjunto,
          utm_source: simUtmSource,
          utm_medium: simUtmMedium,
          utm_campaign: simUtmCampaign,
          utm_content: simUtmContent,
          utm_term: simUtmTerm,
          produto_interesse: simProdutoInteresse,
          data_hora_cadastro: new Date().toISOString(),
          regra_criacao_negocio: regraCriacao,
        }),
      });

      const data = await res.json();
      if (res.ok && data.sucesso) {
        setResultadoTeste(data.mensagem);
      } else {
        setResultadoTeste(`Erro: ${data.erro || 'Falha ao enviar lead.'}`);
      }
    } catch {
      setResultadoTeste('Erro de conexão ao testar webhook.');
    } finally {
      setEnviandoTeste(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Bloco 1: Destino no Funil, Etapa Inicial e Regra de Negociação */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-emerald-400" />
              Integração Landing Page & Regras do Funil
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Configure o funil, a fase inicial de entrada e a regra de criação de negociação para leads capturados na Landing Page.
            </p>
          </div>

          <Badge variant="success" className="uppercase font-mono text-[10px]">
            Integração Ativa
          </Badge>
        </div>

        {feedbackConfig && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-xs text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{feedbackConfig}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              URL da Landing Page Integrada
            </label>
            <Input
              value={urlLandingPage}
              onChange={(e) => setUrlLandingPage(e.target.value)}
              placeholder="https://brindes.brindaypersonalizados.com.br/"
              className="font-mono text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              Origem Padrão do Lead
            </label>
            <Input
              value={origemPadrao}
              onChange={(e) => setOrigemPadrao(e.target.value)}
              placeholder="Landing Page Brinday"
              className="text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              Funil de Destino do Card
            </label>
            <select
              value={funilId}
              onChange={(e) => handleTrocarFunilDestino(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {funis.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome} {f.padrao ? '(Padrão)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground flex items-center justify-between mb-1">
              <span>Etapa Inicial no Funil</span>
              {carregandoEtapas && (
                <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
              )}
            </label>
            <select
              value={etapaId}
              disabled={carregandoEtapas}
              onChange={(e) => setEtapaId(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              {etapas.map((et) => (
                <option key={et.id} value={et.id}>
                  {et.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              Vendedor Responsável Padrão
            </label>
            <select
              value={responsavelId}
              onChange={(e) => setResponsavelId(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {membros.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome_completo} ({m.cargo})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Regra Configurável de Criação de Nova Negociação & Deduplicação */}
        <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3">
          <div className="flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Regra de Criação de Nova Negociação & Deduplicação
            </span>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              Quando o mesmo Lead (E-mail ou Celular) converter novamente na Landing Page:
            </label>
            <select
              value={regraCriacao}
              onChange={(e) =>
                setRegraCriacao(e.target.value as RegraCriacaoNegocioLP)
              }
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="atualizar_aberto">
                Atualizar negociação aberta existente com novos dados/UTMs (Recomendado)
              </option>
              <option value="sempre_criar">
                Sempre criar um novo card no funil a cada preenchimento do formulário
              </option>
              <option value="bloquear_duplicado">
                Manter card aberto existente sem duplicar (apenas registrar tentativa no histórico)
              </option>
            </select>
          </div>

          <label className="flex items-center gap-2.5 text-xs text-muted-foreground cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={atualizarContatoExistente}
              onChange={(e) => setAtualizarContatoExistente(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-[#E42358]"
            />
            <span>
              Localizar contatos existentes por <strong className="text-foreground">E-mail e/ou Telefone</strong> para reduzir duplicidades e atualizar seus dados (sem criar novos registros de empresa/contato quando não existirem).
            </span>
          </label>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Layers className="h-3.5 w-3.5 text-amber-500" />
            <span>
              Os cards entram automaticamente na etapa selecionada sem criar Empresa ou Contato até a qualificação do vendedor.
            </span>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handleSalvarConfiguracoes}
            disabled={salvandoConfig}
            className="bg-[#0B132B] hover:bg-[#1C2541] text-white text-xs font-bold gap-1.5 px-4 h-8.5"
          >
            {salvandoConfig ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Salvando no Banco...</span>
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Salvar Alterações</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Bloco 2: Endpoint do Webhook & Script JS */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Code2 className="h-4 w-4 text-sky-400" />
            Webhook & Script de Captura Automática
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Utilize a URL do Webhook ou cole o script automático na sua Landing Page para enviar os leads e UTMs ao CRM.
          </p>
        </div>

        <div>
          <label className="text-xs font-medium text-foreground block mb-1">
            URL do Webhook (Método POST)
          </label>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={webhookEndpoint}
              className="font-mono text-xs bg-muted/20"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(webhookEndpoint);
                setCopiadoWebhook(true);
                setTimeout(() => setCopiadoWebhook(false), 2500);
              }}
              className="text-xs gap-1.5 shrink-0"
            >
              {copiadoWebhook ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span>{copiadoWebhook ? 'Copiado!' : 'Copiar Link'}</span>
            </Button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-foreground">
              Script Plug & Play para a Landing Page
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(scriptIntegracao);
                setCopiadoScript(true);
                setTimeout(() => setCopiadoScript(false), 2500);
              }}
              className="h-7 text-xs gap-1.5"
            >
              {copiadoScript ? (
                <Check className="h-3 w-3 text-emerald-400" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              <span>{copiadoScript ? 'Script Copiado!' : 'Copiar Script'}</span>
            </Button>
          </div>
          <pre className="rounded-xl border border-border/80 bg-muted/20 p-3.5 text-[11px] font-mono text-foreground overflow-x-auto max-h-48">
            {scriptIntegracao}
          </pre>
        </div>
      </div>

      {/* Bloco 3: Simulador de Conversão da Landing Page */}
      <form
        onSubmit={handleTestarWebhook}
        className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4"
      >
        <div>
          <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Simulador de Conversão da Landing Page
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Dispare um teste com os 4 campos obrigatórios e as UTMs provisionadas para criar o card imediatamente no funil selecionado acima.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">
              Nome (Obrigatório) *
            </label>
            <Input
              required
              value={simNome}
              onChange={(e) => setSimNome(e.target.value)}
              className="h-8 text-xs font-semibold"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">
              E-mail (Obrigatório) *
            </label>
            <Input
              required
              type="email"
              value={simEmail}
              onChange={(e) => setSimEmail(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">
              Empresa (Obrigatório) *
            </label>
            <Input
              required
              value={simEmpresa}
              onChange={(e) => setSimEmpresa(e.target.value)}
              className="h-8 text-xs font-semibold"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">
              Celular (Obrigatório) *
            </label>
            <Input
              required
              value={simCelular}
              onChange={(e) => setSimCelular(e.target.value)}
              className="h-8 text-xs font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">
              Produto / Categoria de Interesse
            </label>
            <Input
              value={simProdutoInteresse}
              onChange={(e) => setSimProdutoInteresse(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">
              Campanha
            </label>
            <Input
              value={simCampanha}
              onChange={(e) => setSimCampanha(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">
              Mídia
            </label>
            <Input
              value={simMidia}
              onChange={(e) => setSimMidia(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">
              Conjunto de Anúncios
            </label>
            <Input
              value={simConjunto}
              onChange={(e) => setSimConjunto(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 rounded-xl border border-border/80 bg-muted/20">
          <div>
            <label className="text-[10px] font-mono text-muted-foreground uppercase font-bold mb-1 block">
              utm_source
            </label>
            <Input
              value={simUtmSource}
              onChange={(e) => setSimUtmSource(e.target.value)}
              className="h-8 font-mono text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono text-muted-foreground uppercase font-bold mb-1 block">
              utm_medium
            </label>
            <Input
              value={simUtmMedium}
              onChange={(e) => setSimUtmMedium(e.target.value)}
              className="h-8 font-mono text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono text-muted-foreground uppercase font-bold mb-1 block">
              utm_campaign
            </label>
            <Input
              value={simUtmCampaign}
              onChange={(e) => setSimUtmCampaign(e.target.value)}
              className="h-8 font-mono text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono text-muted-foreground uppercase font-bold mb-1 block">
              utm_content
            </label>
            <Input
              value={simUtmContent}
              onChange={(e) => setSimUtmContent(e.target.value)}
              className="h-8 font-mono text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono text-muted-foreground uppercase font-bold mb-1 block">
              utm_term
            </label>
            <Input
              value={simUtmTerm}
              onChange={(e) => setSimUtmTerm(e.target.value)}
              className="h-8 font-mono text-xs"
            />
          </div>
        </div>

        {resultadoTeste && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-xs text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{resultadoTeste}</span>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-border">
          <Button
            type="submit"
            size="sm"
            disabled={enviandoTeste}
            className="bg-[#E42358] hover:bg-[#c91848] text-white text-xs font-bold gap-1.5 px-4 h-8.5"
          >
            {enviandoTeste ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Enviando Lead...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Simular Envio da Landing Page e Criar Card</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
