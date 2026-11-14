import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import {
  buscarConfigServidorEmail,
  listarCampanhasMarketingNoBanco,
  listarListasMarketingNoBanco,
  buscarTemplatesEmailDoBanco,
  resolverDestinatariosLista,
  salvarCampanhaMarketingNoBanco,
  salvarEnvioCampanhaNoBanco,
  recalcularMetricasCampanhaNoBanco,
} from '@/lib/supabase/service';
import { enviarEmailViaSmtp } from '@/lib/email/smtp-client';
import { assinarLinkRastreamento } from '@/lib/security/tracking-hmac';
import { verificarAutorizacaoApi } from '@/lib/security/api-auth';
import type { CampanhaEnvio, CampanhaMarketing, ConfiguracaoServidorEmail } from '@/lib/mock-data';

function getBaseUrl(req: NextRequest): string {
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  const host = req.headers.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

function appendUtmToUrl(rawUrl: string, campanha: CampanhaMarketing): string {
  try {
    const parsed = new URL(rawUrl);
    if (campanha.utm_source && !parsed.searchParams.has('utm_source')) {
      parsed.searchParams.set('utm_source', campanha.utm_source);
    }
    if (campanha.utm_medium && !parsed.searchParams.has('utm_medium')) {
      parsed.searchParams.set('utm_medium', campanha.utm_medium);
    }
    if (campanha.utm_campaign && !parsed.searchParams.has('utm_campaign')) {
      parsed.searchParams.set('utm_campaign', campanha.utm_campaign);
    }
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

function prepararHtmlComRastreamento(params: {
  htmlOriginal: string;
  baseUrl: string;
  token: string;
  campanha: CampanhaMarketing;
  nomeContato: string;
  emailContato: string;
}): string {
  let html = params.htmlOriginal || '';

  // Substituição de variáveis básicas
  html = html
    .replace(/\{\{\s*nome_contato\s*\}\}/gi, params.nomeContato)
    .replace(/\{\{\s*email_contato\s*\}\}/gi, params.emailContato);

  // Se o texto não tiver tags HTML, converte quebras de linha em <br/>
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#1e293b;">${html.replace(
      /\r?\n/g,
      '<br />'
    )}</div>`;
  }

  // Reescreve links <a href="..."> para rastrear cliques por contato com assinatura HMAC
  html = html.replace(/href=(["'])(https?:\/\/[^"']+)\1/gi, (_m, quote, url) => {
    const comUtm = appendUtmToUrl(url, params.campanha);
    const sig = assinarLinkRastreamento(params.token, comUtm);
    const trackUrl = `${params.baseUrl}/api/marketing/track/click?token=${encodeURIComponent(
      params.token
    )}&url=${encodeURIComponent(comUtm)}&sig=${encodeURIComponent(sig)}`;
    return `href=${quote}${trackUrl}${quote}`;
  });

  const unsubUrl = `${params.baseUrl}/api/marketing/unsubscribe?token=${encodeURIComponent(
    params.token
  )}`;
  const openPixelUrl = `${params.baseUrl}/api/marketing/track/open?token=${encodeURIComponent(
    params.token
  )}`;

  const rodapeDescadastro = `
    <div style="margin-top:28px;padding-top:16px;border-top:1px solid #e2e8f0;font-family:Arial,sans-serif;font-size:11px;color:#64748b;text-align:center;">
      Você recebeu esta mensagem porque faz parte da lista <strong>${params.campanha.lista_nome}</strong>.<br/>
      Caso não deseje mais receber nossas campanhas, <a href="${unsubUrl}" style="color:#475569;text-decoration:underline;">clique aqui para se descadastrar</a>.
    </div>
    <img src="${openPixelUrl}" alt="" width="1" height="1" style="display:none;width:1px;height:1px;border:0;" />
  `;

  return `${html}\n${rodapeDescadastro}`;
}

function smtpTemCredenciaisCompletas(config: ConfiguracaoServidorEmail): boolean {
  return Boolean(
    config.smtp_host &&
      config.email_remetente &&
      (!config.autenticacao_requerida || (config.usuario_smtp && config.senha_smtp))
  );
}

async function executarDisparoCampanha(
  campanha: CampanhaMarketing,
  baseUrl: string
) {
  const [listas, templates, config] = await Promise.all([
    listarListasMarketingNoBanco(),
    buscarTemplatesEmailDoBanco(),
    buscarConfigServidorEmail(),
  ]);

  const lista = listas.find((l) => l.id === campanha.lista_id) || listas[0];
  const template = templates.find((t) => t.id === campanha.template_id);
  const { elegiveis, bloqueados } = await resolverDestinatariosLista(lista);

  const agora = new Date().toISOString();
  await salvarCampanhaMarketingNoBanco({
    ...campanha,
    status: 'enviando',
    iniciada_em: agora,
    total_destinatarios: elegiveis.length + bloqueados.length,
  });

  const smtpPronto = smtpTemCredenciaisCompletas(config);
  const resultados: CampanhaEnvio[] = [];

  for (const blq of bloqueados) {
    const envBloq: CampanhaEnvio = {
      id: crypto.randomUUID(),
      campanha_id: campanha.id,
      contato_id: blq.contato_id,
      negocio_id: blq.negocio_id,
      destinatario_email: blq.email,
      destinatario_nome: blq.nome,
      tracking_token: crypto.randomUUID(),
      status: 'bloqueado_optout',
      motivo_erro: blq.motivo_bloqueio || 'Contato descadastrado',
      aberto: false,
      aberturas_qtd: 0,
      clicou: false,
      cliques_qtd: 0,
      descadastrado: true,
      converteu: false,
      valor_conversao: 0,
    };
    await salvarEnvioCampanhaNoBanco(envBloq);
    resultados.push(envBloq);
  }

  for (const dest of elegiveis) {
    const token = crypto.randomUUID();
    const htmlFinal = prepararHtmlComRastreamento({
      htmlOriginal: campanha.corpo_html || template?.corpo_html || '',
      baseUrl,
      token,
      campanha,
      nomeContato: dest.nome,
      emailContato: dest.email,
    });

    const assuntoFinal = (campanha.assunto || template?.assunto || 'Campanha')
      .replace(/\{\{\s*nome_contato\s*\}\}/gi, dest.nome);

    const unsubUrl = `${baseUrl}/api/marketing/unsubscribe?token=${encodeURIComponent(token)}`;
    const envioAgora = new Date().toISOString();

    if (smtpPronto) {
      const resSmtp = await enviarEmailViaSmtp(config, {
        paraEmail: dest.email,
        paraNome: dest.nome,
        assunto: assuntoFinal,
        html: htmlFinal,
        remetenteNome: campanha.nome_remetente || config.nome_remetente,
        remetenteEmail: campanha.email_remetente || config.email_remetente,
        listUnsubscribeUrl: unsubUrl,
        imagensInline: template?.imagens_corpo,
        anexos: template?.anexos,
      });

      const env: CampanhaEnvio = {
        id: crypto.randomUUID(),
        campanha_id: campanha.id,
        contato_id: dest.contato_id,
        negocio_id: dest.negocio_id,
        destinatario_email: dest.email,
        destinatario_nome: dest.nome,
        tracking_token: token,
        status: resSmtp.status,
        smtp_codigo: resSmtp.codigo,
        smtp_resposta: resSmtp.resposta,
        motivo_erro: resSmtp.ok ? undefined : resSmtp.resposta,
        enviado_em: envioAgora,
        entregue_em: resSmtp.ok ? envioAgora : undefined,
        aberto: false,
        aberturas_qtd: 0,
        clicou: false,
        cliques_qtd: 0,
        descadastrado: false,
        converteu: false,
        valor_conversao: 0,
      };
      await salvarEnvioCampanhaNoBanco(env);
      resultados.push(env);
    } else {
      // Modo simulado controlado quando senha SMTP ainda não foi configurada
      const envSim: CampanhaEnvio = {
        id: crypto.randomUUID(),
        campanha_id: campanha.id,
        contato_id: dest.contato_id,
        negocio_id: dest.negocio_id,
        destinatario_email: dest.email,
        destinatario_nome: dest.nome,
        tracking_token: token,
        status: 'enviado',
        smtp_codigo: 'SIM',
        smtp_resposta: 'Simulado (configure a senha SMTP em Automação de E-mails para envio real)',
        enviado_em: envioAgora,
        aberto: false,
        aberturas_qtd: 0,
        clicou: false,
        cliques_qtd: 0,
        descadastrado: false,
        converteu: false,
        valor_conversao: 0,
      };
      await salvarEnvioCampanhaNoBanco(envSim);
      resultados.push(envSim);
    }
  }

  await salvarCampanhaMarketingNoBanco({
    ...campanha,
    status: 'concluida',
    iniciada_em: agora,
    concluida_em: new Date().toISOString(),
    total_destinatarios: elegiveis.length + bloqueados.length,
  });

  await recalcularMetricasCampanhaNoBanco(campanha.id);

  return {
    smtpReal: smtpPronto,
    totalElegiveis: elegiveis.length,
    totalBloqueadosOptOut: bloqueados.length,
    enviados: resultados.filter((r) => r.status !== 'bloqueado_optout').length,
    entregues: resultados.filter((r) => r.status === 'entregue').length,
    bouncesTemp: resultados.filter((r) => r.status === 'bounce_temporario').length,
    bouncesPerm: resultados.filter((r) => r.status === 'bounce_permanente').length,
  };
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verificarAutorizacaoApi(req, { permitirCronSecret: true });
    if (!auth.autorizado) {
      return NextResponse.json({ sucesso: false, erro: auth.motivo }, { status: 401 });
    }

    const body = await req.json();
    const acao = body.acao || 'disparar_agora';
    const baseUrl = getBaseUrl(req);

    if (acao === 'testar') {
      const { email_teste, assunto, corpo_html, nome_remetente, email_remetente, template_id } = body;
      if (!email_teste) {
        return NextResponse.json(
          { sucesso: false, erro: 'Informe o e-mail destinatário para o teste.' },
          { status: 400 }
        );
      }

      const [config, templates] = await Promise.all([
        buscarConfigServidorEmail(),
        buscarTemplatesEmailDoBanco(),
      ]);
      const template = templates.find((t) => t.id === template_id);

      const campanhaTemp: CampanhaMarketing = {
        id: 'teste-preview',
        nome: 'Envio de Teste',
        lista_id: '',
        lista_nome: 'Lista de Teste',
        template_id,
        template_nome: template?.nome || 'Modelo',
        assunto: assunto || '[Teste] Campanha',
        nome_remetente: nome_remetente || config.nome_remetente,
        email_remetente: email_remetente || config.email_remetente,
        corpo_html: corpo_html || template?.corpo_html || '',
        utm_campaign: 'teste_campanha',
        utm_source: 'alldot_crm',
        utm_medium: 'email_marketing',
        status: 'rascunho',
        total_destinatarios: 1,
        total_enviados: 0,
        total_entregues: 0,
        total_aberturas: 0,
        total_cliques: 0,
        total_bounces_temp: 0,
        total_bounces_perm: 0,
        total_descadastramentos: 0,
        total_conversoes: 0,
        receita_convertida: 0,
        criado_em: new Date().toISOString(),
      };

      const htmlFinal = prepararHtmlComRastreamento({
        htmlOriginal: campanhaTemp.corpo_html,
        baseUrl,
        token: `teste-${Date.now()}`,
        campanha: campanhaTemp,
        nomeContato: 'Destinatário de Teste',
        emailContato: email_teste,
      });

      if (!smtpTemCredenciaisCompletas(config)) {
        return NextResponse.json({
          sucesso: true,
          modo: 'simulado',
          mensagem:
            'Prévia validada em modo simulado! Para envio real na caixa de entrada, informe a Senha SMTP em Automação de E-mails → Conta & Servidor SMTP.',
        });
      }

      const resSmtp = await enviarEmailViaSmtp(config, {
        paraEmail: email_teste,
        paraNome: 'Teste de Campanha CRM',
        assunto: `[TESTE] ${assunto || 'Pré-visualização de Campanha'}`,
        html: htmlFinal,
        remetenteNome: nome_remetente || config.nome_remetente,
        remetenteEmail: email_remetente || config.email_remetente,
        imagensInline: template?.imagens_corpo,
        anexos: template?.anexos,
      });

      return NextResponse.json({
        sucesso: resSmtp.ok,
        modo: 'smtp_real',
        codigo: resSmtp.codigo,
        mensagem: resSmtp.ok
          ? `E-mail de teste enviado via SMTP para ${email_teste} (Código ${resSmtp.codigo}).`
          : `Falha no envio SMTP (${resSmtp.codigo}): ${resSmtp.resposta}`,
      });
    }

    if (acao === 'processar_agendadas') {
      const campanhas = await listarCampanhasMarketingNoBanco();
      const agoraMs = Date.now();
      const pendentes = campanhas.filter(
        (c) => c.status === 'agendada' && c.agendado_para && new Date(c.agendado_para).getTime() <= agoraMs
      );

      const processadas = [];
      for (const camp of pendentes) {
        const res = await executarDisparoCampanha(camp, baseUrl);
        processadas.push({ id: camp.id, nome: camp.nome, ...res });
      }

      return NextResponse.json({
        sucesso: true,
        processadas: processadas.length,
        detalhes: processadas,
      });
    }

    // Disparo imediato de uma campanha específica
    const { campanha_id } = body;
    if (!campanha_id) {
      return NextResponse.json(
        { sucesso: false, erro: 'Informe o campanha_id para disparar.' },
        { status: 400 }
      );
    }

    const campanhas = await listarCampanhasMarketingNoBanco();
    const campanha = campanhas.find((c) => c.id === campanha_id);
    if (!campanha) {
      return NextResponse.json(
        { sucesso: false, erro: 'Campanha não encontrada.' },
        { status: 404 }
      );
    }

    const resumo = await executarDisparoCampanha(campanha, baseUrl);
    return NextResponse.json({
      sucesso: true,
      ...resumo,
      mensagem: resumo.smtpReal
        ? `Campanha disparada via SMTP: ${resumo.entregues}/${resumo.enviados} aceitos (${resumo.bouncesTemp} soft bounces, ${resumo.bouncesPerm} hard bounces, ${resumo.totalBloqueadosOptOut} opt-out ignorados).`
        : `Campanha processada em modo simulado (${resumo.enviados} envios gerados, ${resumo.totalBloqueadosOptOut} opt-out ignorados). Configure a senha SMTP para entrega real.`,
    });
  } catch (err) {
    return NextResponse.json(
      {
        sucesso: false,
        erro: err instanceof Error ? err.message : 'Erro interno ao processar campanha.',
      },
      { status: 500 }
    );
  }
}
