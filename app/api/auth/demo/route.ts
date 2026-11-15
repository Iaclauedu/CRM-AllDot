import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const ORG_PADRAO_ID = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';

const DEMO_USERS: Record<string, { nome: string; cargo: 'admin' | 'gestor' | 'vendedor' }> = {
  'carlos.admin@acme.com': { nome: 'Carlos Silva', cargo: 'admin' },
  'mariana.gestora@acme.com': { nome: 'Mariana Souza', cargo: 'gestor' },
  'lucas.vendedor@acme.com': { nome: 'Lucas Vendas', cargo: 'vendedor' },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    const demoInfo = DEMO_USERS[email];
    if (!demoInfo || password !== 'senha123') {
      return NextResponse.json(
        { erro: 'Credenciais de demonstração inválidas.' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (
      !supabaseUrl ||
      !serviceRoleKey ||
      serviceRoleKey.includes('sua-chave') ||
      serviceRoleKey.includes('placeholder')
    ) {
      return NextResponse.json(
        { erro: 'Provisionamento automático indisponível no servidor.' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createSupabaseClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: listData } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });

    const existente = listData?.users?.find(
      (u) => u.email?.toLowerCase() === email
    );

    let userId: string | null = existente?.id || null;

    if (userId) {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: 'senha123',
        email_confirm: true,
        user_metadata: { nome_completo: demoInfo.nome },
      });
    } else {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: 'senha123',
        email_confirm: true,
        user_metadata: { nome_completo: demoInfo.nome },
      });
      if (createErr || !created?.user?.id) {
        return NextResponse.json(
          { erro: createErr?.message || 'Não foi possível criar o usuário de teste.' },
          { status: 500 }
        );
      }
      userId = created.user.id;
    }

    await supabaseAdmin.from('perfis').upsert({
      id: userId,
      nome_completo: demoInfo.nome,
      email,
      avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
        demoInfo.nome
      )}&backgroundColor=0284c7,0ea5e9,10b981,6366f1`,
    });

    const { data: vinculoExistente } = await supabaseAdmin
      .from('membros_organizacao')
      .select('id')
      .eq('organizacao_id', ORG_PADRAO_ID)
      .eq('perfil_id', userId)
      .maybeSingle();

    if (!vinculoExistente) {
      await supabaseAdmin.from('membros_organizacao').insert({
        organizacao_id: ORG_PADRAO_ID,
        perfil_id: userId,
        cargo: demoInfo.cargo,
        ativo: true,
      });
    }

    return NextResponse.json({ sucesso: true, userId });
  } catch {
    return NextResponse.json(
      { erro: 'Erro ao preparar usuário de demonstração.' },
      { status: 500 }
    );
  }
}
