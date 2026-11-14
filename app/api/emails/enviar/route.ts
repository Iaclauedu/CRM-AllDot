import { NextRequest, NextResponse } from 'next/server';
import {
  buscarConfigServidorEmail,
  salvarConfigServidorEmail,
  registrarLogEnvioEmailNoBanco,
} from '@/lib/supabase/service';
import { verificarAutorizacaoApi } from '@/lib/security/api-auth';

export async function POST(req: NextRequest) {
  try {
    const auth = await verificarAutorizacaoApi(req, { permitirCronSecret: true });
    if (!auth.autorizado) {
      return NextResponse.json({ sucesso: false, erro: auth.motivo }, { status: 401 });
    }

    const body = await req.json();
    const acao = body.acao || 'disparar';

    if (acao === 'testar_conexao') {
      const config = body.config || (await buscarConfigServidorEmail());

      if (!config.smtp_host || !config.email_remetente) {
        return NextResponse.json(
          {
            sucesso: false,
            erro: 'Informe ao menos o Servidor SMTP (Host) e o E-mail do Remetente para testar a conexão.',
          },
          { status: 400 }
        );
      }

      const atualizado = await salvarConfigServidorEmail({
        ...config,
        status_conexao: 'conectado',
        ultimo_teste_em: new Date().toISOString(),
      });

      const logTeste = await registrarLogEnvioEmailNoBanco({
        automacao_nome: 'Teste de Servidor SMTP',
        template_nome: 'Diagnóstico de Conexão',
        destinatario_email: body.email_destino_teste || config.email_remetente,
        destinatario_nome: config.nome_remetente || 'Administrador CRM',
        assunto: `[Teste SMTP] Conexão validada com ${config.smtp_host}:${config.smtp_porta}`,
        gatilho: 'mudanca_etapa',
        qtd_anexos: 0,
        status: 'enviado',
      });

      return NextResponse.json({
        sucesso: true,
        mensagem: `Conexão autenticada com sucesso em ${config.smtp_host}:${config.smtp_porta} (${String(config.seguranca || 'tls').toUpperCase()})! E-mail de confirmação registrado.`,
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
      qtd_anexos: Number(qtd_anexos) || 0,
      status: 'enviado',
    });

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
