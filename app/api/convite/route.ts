import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { verificarAutorizacaoApi } from '@/lib/security/api-auth';

const ORG_PADRAO_ID = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';

export async function POST(request: NextRequest) {
  try {
    const auth = await verificarAutorizacaoApi(request);
    if (!auth.autorizado) {
      return NextResponse.json({ erro: auth.motivo }, { status: 401 });
    }

    const { email, nome_completo, cargo, telefone, avatar_url, senha_inicial } =
      await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ erro: 'E-mail inválido.' }, { status: 400 });
    }

    const { origin } = new URL(request.url);
    const emailNormalizado = email.trim().toLowerCase();
    const nomeLimpo = (nome_completo || emailNormalizado.split('@')[0]).trim();
    const cargoLimpo = cargo || 'vendedor';
    const avatarPadrao =
      avatar_url ||
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
        nomeLimpo
      )}&backgroundColor=0284c7,0ea5e9,10b981,6366f1`;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin;
    const redirectUrl = `${appUrl}/login?type=recovery&email=${encodeURIComponent(
      emailNormalizado
    )}`;
    const linkAtivacao = `${appUrl}/login?convite=ativo&email=${encodeURIComponent(
      emailNormalizado
    )}`;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let userId: string | null = null;
    let perfilSalvoNoBanco = false;
    let emailEnviado = false;
    let avisoSmtp: string | null = null;
    let erroDetalhado: string | null = null;

    // 1. Fluxo oficial com service_role: cria/convida em auth.users e grava perfis + membros_organizacao
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

        // Verifica se o usuário já existe no Auth
        const { data: listaUsers } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });
        const existente = listaUsers?.users?.find(
          (u) => u.email?.toLowerCase() === emailNormalizado
        );

        if (existente) {
          userId = existente.id;
        } else if (senha_inicial) {
          const { data: created, error: createErr } =
            await supabaseAdmin.auth.admin.createUser({
              email: emailNormalizado,
              password: senha_inicial,
              email_confirm: true,
              user_metadata: { nome_completo: nomeLimpo, cargo: cargoLimpo },
            });
          if (createErr) {
            erroDetalhado = createErr.message;
          } else {
            userId = created.user?.id || null;
            emailEnviado = true;
          }
        } else {
          const { data: invited, error: inviteError } =
            await supabaseAdmin.auth.admin.inviteUserByEmail(emailNormalizado, {
              redirectTo: redirectUrl,
              data: { nome_completo: nomeLimpo, cargo: cargoLimpo },
            });

          if (!inviteError) {
            userId = invited.user?.id || null;
            emailEnviado = true;
          } else {
            erroDetalhado = inviteError.message;
            if (
              inviteError.message.toLowerCase().includes('rate') ||
              inviteError.message.toLowerCase().includes('smtp')
            ) {
              avisoSmtp =
                'O limite de envio do servidor de e-mails padrão do banco foi atingido ou o SMTP precisa ser configurado.';
            }
          }
        }

        // Grava em public.perfis e public.membros_organizacao com o userId real do Auth
        if (userId) {
          const { error: errPerfil } = await supabaseAdmin.from('perfis').upsert({
            id: userId,
            nome_completo: nomeLimpo,
            email: emailNormalizado,
            telefone: telefone || null,
            avatar_url: avatarPadrao,
          });

          if (!errPerfil) {
            const { data: vinculoExistente } = await supabaseAdmin
              .from('membros_organizacao')
              .select('id')
              .eq('organizacao_id', ORG_PADRAO_ID)
              .eq('perfil_id', userId)
              .maybeSingle();

            if (!vinculoExistente) {
              const { error: errMembro } = await supabaseAdmin
                .from('membros_organizacao')
                .insert({
                  organizacao_id: ORG_PADRAO_ID,
                  perfil_id: userId,
                  cargo: cargoLimpo,
                  ativo: true,
                });
              if (!errMembro) perfilSalvoNoBanco = true;
              else erroDetalhado = errMembro.message;
            } else {
              await supabaseAdmin
                .from('membros_organizacao')
                .update({ cargo: cargoLimpo, ativo: true })
                .eq('id', vinculoExistente.id);
              perfilSalvoNoBanco = true;
            }
          } else {
            erroDetalhado = errPerfil.message;
          }
        }
      } catch (err: unknown) {
        erroDetalhado =
          err instanceof Error ? err.message : 'Erro ao conectar ao Auth Admin';
      }
    }

    // 2. Fallback sem service_role: se informou senha_inicial, cria via signUp público
    if (!userId && senha_inicial && supabaseUrl && anonKey) {
      try {
        const supabaseAnon = createSupabaseClient(supabaseUrl, anonKey);
        const { data: signUpData, error: signUpErr } = await supabaseAnon.auth.signUp({
          email: emailNormalizado,
          password: senha_inicial,
          options: {
            data: { nome_completo: nomeLimpo, cargo: cargoLimpo },
          },
        });
        if (!signUpErr && signUpData.user?.id) {
          userId = signUpData.user.id;
          const { error: errP } = await supabaseAnon.from('perfis').upsert({
            id: userId,
            nome_completo: nomeLimpo,
            email: emailNormalizado,
            telefone: telefone || null,
            avatar_url: avatarPadrao,
          });
          if (!errP) {
            await supabaseAnon.from('membros_organizacao').insert({
              organizacao_id: ORG_PADRAO_ID,
              perfil_id: userId,
              cargo: cargoLimpo,
              ativo: true,
            });
            perfilSalvoNoBanco = true;
          }
          emailEnviado = true;
        } else if (signUpErr) {
          erroDetalhado = signUpErr.message;
        }
      } catch (err: unknown) {
        erroDetalhado = err instanceof Error ? err.message : 'Erro no signUp';
      }
    }

    // 3. Fallback de envio de link de recuperação/ativação caso ainda não tenha enviado
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
      } catch (err: unknown) {
        erroDetalhado = err instanceof Error ? err.message : 'Erro no cliente anon';
      }
    }

    if (!emailEnviado && !avisoSmtp) {
      avisoSmtp =
        'Configure a SUPABASE_SERVICE_ROLE_KEY no .env.local (e/ou SMTP no Supabase Auth) para criar o usuário em auth.users e disparar o convite oficial.';
    }

    return NextResponse.json({
      sucesso: true,
      userId,
      perfilSalvoNoBanco,
      emailEnviado,
      linkAtivacao,
      avisoSmtp,
      erroDetalhado,
    });
  } catch (error: unknown) {
    console.error('Erro na rota de convite:', error);
    return NextResponse.json(
      {
        erro:
          error instanceof Error
            ? error.message
            : 'Falha ao processar o convite do usuário.',
      },
      { status: 500 }
    );
  }
}
