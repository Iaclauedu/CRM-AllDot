import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { email, nome_completo, cargo, senha_inicial } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { erro: 'E-mail inválido.' },
        { status: 400 }
      );
    }

    const { origin } = new URL(request.url);
    const emailNormalizado = email.trim().toLowerCase();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin;
    const redirectUrl = `${appUrl}/login?type=recovery&email=${encodeURIComponent(emailNormalizado)}`;
    const linkAtivacao = `${appUrl}/login?convite=ativo&email=${encodeURIComponent(emailNormalizado)}`;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let emailEnviado = false;
    let avisoSmtp: string | null = null;
    let erroDetalhado: string | null = null;

    // 1. Se houver chave mestra (service_role) válida
    if (
      supabaseUrl &&
      serviceRoleKey &&
      !serviceRoleKey.includes('sua-chave') &&
      !serviceRoleKey.includes('placeholder')
    ) {
      try {
        const supabaseAdmin = createSupabaseClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        // Se uma senha inicial foi fornecida, cria ou atualiza o usuário no Auth
        if (senha_inicial) {
          await supabaseAdmin.auth.admin.createUser({
            email: emailNormalizado,
            password: senha_inicial,
            email_confirm: true,
            user_metadata: { nome_completo, cargo },
          });
        }

        // Dispara o convite oficial por e-mail via Supabase Auth
        const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
          emailNormalizado,
          {
            redirectTo: redirectUrl,
            data: { nome_completo, cargo },
          }
        );

        if (!inviteError) {
          emailEnviado = true;
        } else {
          erroDetalhado = inviteError.message;
          if (inviteError.message.toLowerCase().includes('rate') || inviteError.message.toLowerCase().includes('smtp')) {
            avisoSmtp = 'O limite de envio do servidor de e-mails padrão do banco de dados foi atingido ou o SMTP personalizado precisa ser configurado.';
          }
        }
      } catch (err: any) {
        erroDetalhado = err?.message || 'Erro ao conectar ao Auth Admin';
      }
    }

    // 2. Se não conseguiu enviar via admin, tenta disparar redefinição/primeiro acesso pelo cliente público
    if (!emailEnviado && supabaseUrl && anonKey) {
      try {
        const supabaseAnon = createSupabaseClient(supabaseUrl, anonKey);
        const { error: resetError } = await supabaseAnon.auth.resetPasswordForEmail(
          emailNormalizado,
          { redirectTo: redirectUrl }
        );

        if (!resetError) {
          emailEnviado = true;
        } else {
          erroDetalhado = resetError.message;
          if (
            resetError.message.toLowerCase().includes('rate') ||
            resetError.message.toLowerCase().includes('smtp') ||
            resetError.message.toLowerCase().includes('exceeded')
          ) {
            avisoSmtp =
              'O servidor de e-mails padrão do banco atingiu o limite por hora. Utilize o link direto de ativação abaixo.';
          }
        }
      } catch (err: any) {
        erroDetalhado = err?.message || 'Erro no cliente anon';
      }
    }

    // Se o serviço SMTP do Supabase não estiver configurado no projeto
    if (!emailEnviado && !avisoSmtp) {
      avisoSmtp =
        'Para disparo automático de e-mails, o banco de dados necessita de um provedor SMTP (ex: Resend, SendGrid) configurado nas configurações de autenticação do Supabase.';
    }

    return NextResponse.json({
      sucesso: true,
      emailEnviado,
      linkAtivacao,
      avisoSmtp,
      erroDetalhado,
    });
  } catch (error: any) {
    console.error('Erro na rota de convite:', error);
    return NextResponse.json(
      { erro: error?.message || 'Falha ao processar o convite do usuário.' },
      { status: 500 }
    );
  }
}
