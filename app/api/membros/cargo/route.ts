import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

const ORG_PADRAO_ID = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const CARGOS_VALIDOS = new Set(['admin', 'gestor', 'vendedor']);

function temServiceRoleConfigurada() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(
    serviceRoleKey &&
      !serviceRoleKey.includes('sua-chave') &&
      !serviceRoleKey.includes('placeholder')
  );
}

function criarClienteSessao(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return null;

  return createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        // read-only inside route handler
      },
    },
  });
}

function criarClienteDados(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl) return null;

  if (temServiceRoleConfigurada() && serviceRoleKey) {
    return createSupabaseClient(supabaseUrl, serviceRoleKey);
  }

  return criarClienteSessao(request);
}

async function garantirPerfil(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  membroId: string,
  email?: string,
  nomeCompleto?: string
): Promise<{ perfilId: string | null; erro?: string }> {
  const { data: perfilPorId } = await supabase
    .from('perfis')
    .select('id')
    .eq('id', membroId)
    .maybeSingle();

  if (perfilPorId?.id) {
    return { perfilId: perfilPorId.id };
  }

  const emailLimpo = email?.trim().toLowerCase();
  if (emailLimpo) {
    const { data: perfilPorEmail } = await supabase
      .from('perfis')
      .select('id')
      .eq('email', emailLimpo)
      .maybeSingle();

    if (perfilPorEmail?.id) {
      return { perfilId: perfilPorEmail.id };
    }
  }

  if (!temServiceRoleConfigurada() || !emailLimpo) {
    return {
      perfilId: null,
      erro: 'Este membro ainda não possui perfil cadastrado no sistema.',
    };
  }

  const nomeLimpo = (nomeCompleto || emailLimpo.split('@')[0]).trim();
  let authUserId: string | null = null;

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: emailLimpo,
    email_confirm: true,
    user_metadata: { nome_completo: nomeLimpo },
  });

  if (!createErr && created?.user?.id) {
    authUserId = created.user.id;
  } else {
    const { data: listData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existente = listData?.users?.find(
      (u: { email?: string }) => u.email?.toLowerCase() === emailLimpo
    );
    if (existente?.id) {
      authUserId = existente.id;
    } else {
      return {
        perfilId: null,
        erro: createErr?.message || 'Não foi possível criar o perfil do usuário.',
      };
    }
  }

  const { error: errUpsertPerfil } = await supabase.from('perfis').upsert({
    id: authUserId,
    nome_completo: nomeLimpo,
    email: emailLimpo,
    avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(nomeLimpo)}&backgroundColor=0284c7,0ea5e9,10b981,6366f1`,
  });

  if (errUpsertPerfil) {
    return { perfilId: null, erro: 'Não foi possível salvar os dados do usuário.' };
  }

  return { perfilId: authUserId };
}

export async function PATCH(request: NextRequest) {
  try {
    const supabaseSessao = criarClienteSessao(request);
    const supabase = criarClienteDados(request);
    if (!supabaseSessao || !supabase) {
      return NextResponse.json(
        { erro: 'Serviço indisponível no momento.' },
        { status: 500 }
      );
    }

    const {
      data: { user },
      error: authErr,
    } = await supabaseSessao.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json(
        { erro: 'Sessão autenticada obrigatória para alterar permissões.' },
        { status: 401 }
      );
    }

    // Garante que apenas usuários com perfil Admin possam alterar permissões
    const { data: vinculoSolicitante, error: errSolicitante } = await supabase
      .from('membros_organizacao')
      .select('cargo')
      .eq('organizacao_id', ORG_PADRAO_ID)
      .eq('perfil_id', user.id)
      .eq('ativo', true)
      .maybeSingle();

    if (errSolicitante || vinculoSolicitante?.cargo !== 'admin') {
      return NextResponse.json(
        { erro: 'Acesso negado: apenas usuários Admin podem alterar permissões.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const membroId = typeof body?.membroId === 'string' ? body.membroId.trim() : '';
    const novoCargo = typeof body?.novoCargo === 'string' ? body.novoCargo.trim() : '';
    const email = typeof body?.email === 'string' ? body.email.trim() : undefined;
    const nomeCompleto =
      typeof body?.nome_completo === 'string' ? body.nome_completo.trim() : undefined;

    if (!membroId || !CARGOS_VALIDOS.has(novoCargo)) {
      return NextResponse.json(
        { erro: 'Parâmetros inválidos para atualização de permissão.' },
        { status: 400 }
      );
    }

    const { perfilId, erro: erroPerfil } = await garantirPerfil(
      supabase,
      membroId,
      email,
      nomeCompleto
    );

    if (!perfilId) {
      return NextResponse.json({ erro: erroPerfil || 'Perfil não encontrado.' }, { status: 400 });
    }

    const { data: vinculoExistente, error: errBusca } = await supabase
      .from('membros_organizacao')
      .select('id')
      .eq('organizacao_id', ORG_PADRAO_ID)
      .eq('perfil_id', perfilId)
      .maybeSingle();

    if (errBusca) {
      return NextResponse.json(
        { erro: 'Não foi possível consultar o usuário.' },
        { status: 500 }
      );
    }

    if (vinculoExistente?.id) {
      const { data: atualizado, error: errUpdate } = await supabase
        .from('membros_organizacao')
        .update({ cargo: novoCargo, ativo: true })
        .eq('id', vinculoExistente.id)
        .select('id, cargo');

      if (errUpdate || !atualizado || atualizado.length === 0) {
        return NextResponse.json(
          { erro: 'Não foi possível atualizar a permissão deste usuário.' },
          { status: errUpdate ? 500 : 403 }
        );
      }
    } else {
      const { data: inserido, error: errInsert } = await supabase
        .from('membros_organizacao')
        .insert({
          organizacao_id: ORG_PADRAO_ID,
          perfil_id: perfilId,
          cargo: novoCargo,
          ativo: true,
        })
        .select('id, cargo');

      if (errInsert || !inserido || inserido.length === 0) {
        return NextResponse.json(
          { erro: 'Não foi possível registrar a permissão deste usuário.' },
          { status: errInsert ? 500 : 403 }
        );
      }
    }

    return NextResponse.json({
      sucesso: true,
      membroId: perfilId,
      cargo: novoCargo,
    });
  } catch {
    return NextResponse.json(
      { erro: 'Erro interno ao atualizar permissão.' },
      { status: 500 }
    );
  }
}
