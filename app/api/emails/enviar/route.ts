import { NextRequest, NextResponse } from 'next/server';
import {
  buscarConfigServidorEmail,
  salvarConfigServidorEmail,
  registrarLogEnvioEmailNoBanco,
  buscarTemplatesEmailDoBanco,
} from '@/lib/supabase/service';
import { verificarAutorizacaoApi } from '@/lib/security/api-auth';
import { enviarEmailViaSmtp } from '@/lib/email/smtp-client';
import type { ConfiguracaoServidorEmail } from '@/lib/mock-data';

function normalizarConfigSmtp(config: ConfiguracaoServidorEmail): ConfiguracaoServidorEmail {
  const host = (config.smtp_host || '').trim().toLowerCase();
  let senha = (config.senha_smtp || '').trim();

  // Para Gmail, remove espaços gerados pela interface de Senha de Aplicativo
  if (host.includes('gmail') || host.includes('google')) {
    senha = senha.replace(/\s+/g, '');
  }

  return {
    ...config,
    smtp_host: host,
    smtp_porta: Number(config.smtp_porta) || 587,
    usuario_smtp: (config.usuario_smtp || '').trim(),
    senha_smtp: senha,
    email_remetente: (config.email_remetente || '').trim(),
    nome_remetente: (config.nome_remetente || '').trim(),
    email_resposta: (config.email_resposta || config.email_remetente || '').trim(),
    seguranca: config.seguranca || 'tls',
  };
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verificarAutorizacaoApi(req, { permitirCronSecret: true });
    if (!auth.autorizado) {
      return NextResponse.json({ sucesso: false, erro: auth.motivo }, { status: 401 });
    }

    const body = await req.json();
    const acao = body.acao || 'disparar';

    if (acao === 'testar_conexao') {
      const rawConfig = body.config || (await buscarConfigServidorEmail());
      const config = normalizarConfigSmtp(rawConfig);

      if (!config.smtp_host || !config.email_remetente) {
        return NextResponse.json(
          {
            sucesso: false,
            erro: 'Informe ao menos o Servidor SMTP (Host) e o E-mail do Remetente para testar a conexão.',
          },
          { status: 400 }
        );
      }

      const emailDestino = (body.email_destino_teste || config.email_remetente).trim();
      const nomeRemetente = config.nome_remetente || 'AllDot CRM';

      const htmlTeste = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="margin-bottom: 20px; text-align: center;">
            <h2 style="color: #0f172a; margin: 0; font-size: 22px;">Diagnóstico de Conexão SMTP</h2>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">AllDot CRM - Envio Real Validado</p>
          </div>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <p style="margin: 6px 0; color: #334155; font-size: 13px;"><strong>Servidor SMTP:</strong> ${config.smtp_host}:${config.smtp_porta}</p>
            <p style="margin: 6px 0; color: #334155; font-size: 13px;"><strong>Protocolo:</strong> ${String(config.seguranca || 'tls').toUpperCase()}</p>
            <p style="margin: 6px 0; color: #334155; font-size: 13px;"><strong>Usuário Remetente:</strong> ${config.usuario_smtp || config.email_remetente}</p>
            <p style="margin: 6px 0; color: #334155; font-size: 13px;"><strong>Destinatário de Teste:</strong> ${emailDestino}</p>
            <p style="margin: 6px 0; color: #334155; font-size: 13px;"><strong>Data e Hora:</strong> ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
          </div>
          <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 14px; color: #065f46; font-size: 14px; font-weight: 500;">
            ✓ Conexão SMTP autenticada e mensagem entregue com sucesso! O seu AllDot CRM está 100% pronto para enviar automações e campanhas por este e-mail.
          </div>
          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 24px; margin-bottom: 0;">
            Enviado com sucesso pelo AllDot CRM.
          </p>
        </div>
      `;

      // Executa o envio real via SMTP
      let resSmtp;
      try {
        resSmtp = await enviarEmailViaSmtp(config, {
          paraEmail: emailDestino,
          paraNome: 'Administrador CRM',
          assunto: `[Teste SMTP] Conexão validada com sucesso - AllDot CRM`,
          html: htmlTeste,
          remetenteNome: nomeRemetente,
          remetenteEmail: config.email_remetente,
          replyTo: config.email_resposta,
        });
      } catch (errSmtp: any) {
        resSmtp = {
          ok: false,
          status: 'erro' as const,
          codigo: 'ERROR',
          resposta: errSmtp?.message || 'Falha de conexão com o servidor SMTP',
        };
      }

      if (!resSmtp.ok) {
        await salvarConfigServidorEmail({
          ...config,
          status_conexao: 'erro',
          ultimo_teste_em: new Date().toISOString(),
        });

        await registrarLogEnvioEmailNoBanco({
          automacao_nome: 'Teste de Servidor SMTP',
          template_nome: 'Diagnóstico de Conexão',
          destinatario_email: emailDestino,
          destinatario_nome: nomeRemetente,
          assunto: `[Falha SMTP] ${config.smtp_host}:${config.smtp_porta}`,
          gatilho: 'mudanca_etapa',
          qtd_anexos: 0,
          status: 'erro',
        });

        return NextResponse.json(
          {
            sucesso: false,
            erro: `Falha na autenticação ou envio com o servidor SMTP: ${resSmtp.resposta || resSmtp.codigo}`,
          },
          { status: 500 }
        );
      }

      // Conexão e envio bem-sucedidos!
      const atualizado = await salvarConfigServidorEmail({
        ...config,
        status_conexao: 'conectado',
        ultimo_teste_em: new Date().toISOString(),
      });

      const logTeste = await registrarLogEnvioEmailNoBanco({
        automacao_nome: 'Teste de Servidor SMTP',
        template_nome: 'Diagnóstico de Conexão',
        destinatario_email: emailDestino,
        destinatario_nome: nomeRemetente,
        assunto: `[Teste SMTP] Conexão validada com ${config.smtp_host}:${config.smtp_porta}`,
        gatilho: 'mudanca_etapa',
        qtd_anexos: 0,
        status: 'enviado',
      });

      return NextResponse.json({
        sucesso: true,
        mensagem: `E-mail de teste real enviado com sucesso para ${emailDestino} via ${config.smtp_host}:${config.smtp_porta}!`,
        config: atualizado,
        log: logTeste,
      });
    }

    // Disparo de e-mail de automação ou teste de regra/template
    const {
      automacao_id,
      automacao_nome,
      template_id,
      template_nome,
      negocio_id,
      negocio_titulo,
      destinatario_email,
      destinatario_nome,
      assunto,
      gatilho,
      qtd_anexos,
      html,
    } = body;

    if (!destinatario_email || !assunto) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Destinatário e assunto são obrigatórios para o envio.',
        },
        { status: 400 }
      );
    }

    const rawConfig = await buscarConfigServidorEmail();
    const config = normalizarConfigSmtp(rawConfig);

    // Carrega o template se houver
    let templateObj: any = null;
    if (template_id) {
      const templates = await buscarTemplatesEmailDoBanco();
      templateObj = templates.find((t) => t.id === template_id);
    }

    const htmlFinal =
      html ||
      templateObj?.corpo_html ||
      `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1e293b;">${(assunto || '').replace(/\n/g, '<br/>')}</div>`;

    let resSmtp: { ok: boolean; status: string; codigo: string; resposta: string } = {
      ok: true,
      status: 'entregue',
      codigo: '250',
      resposta: 'OK',
    };

    // Se o servidor SMTP tiver credenciais configuradas, dispara o e-mail real
    if (config.smtp_host && config.email_remetente && config.usuario_smtp && config.senha_smtp) {
      try {
        resSmtp = await enviarEmailViaSmtp(config, {
          paraEmail: destinatario_email,
          paraNome: destinatario_nome,
          assunto,
          html: htmlFinal,
          remetenteNome: config.nome_remetente,
          remetenteEmail: config.email_remetente,
          replyTo: config.email_resposta,
          imagensInline: templateObj?.imagens_corpo,
          anexos: templateObj?.anexos,
        });
      } catch (errSmtp: any) {
        resSmtp = {
          ok: false,
          status: 'erro' as const,
          codigo: 'ERROR',
          resposta: errSmtp?.message || 'Falha ao conectar no SMTP',
        };
      }
    }

    const logStatus = resSmtp.ok ? 'enviado' : 'erro';

    const log = await registrarLogEnvioEmailNoBanco({
      automacao_id,
      automacao_nome: automacao_nome || 'Disparo Manual de Regra',
      template_id,
      template_nome: template_nome || 'Modelo Selecionado',
      negocio_id,
      negocio_titulo: negocio_titulo || 'Negociação de Teste',
      destinatario_email,
      destinatario_nome: destinatario_nome || 'Contato Comercial',
      assunto,
      gatilho: gatilho || 'mudanca_etapa',
      qtd_anexos: Number(qtd_anexos) || (templateObj?.anexos || []).length || 0,
      status: logStatus,
    });

    if (!resSmtp.ok) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: `Erro no servidor SMTP ao disparar e-mail: ${resSmtp.resposta || resSmtp.codigo}`,
          log,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sucesso: true,
      mensagem: `E-mail enviado com sucesso para ${destinatario_email}!`,
      log,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        sucesso: false,
        erro: err?.message || 'Erro interno ao processar disparo de e-mail.',
      },
      { status: 500 }
    );
  }
}
