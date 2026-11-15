import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { verificarAutorizacaoApi } from '@/lib/security/api-auth';

function temServiceRoleConfigurada() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(
    serviceRoleKey &&
      !serviceRoleKey.includes('sua-chave') &&
      !serviceRoleKey.includes('placeholder')
  );
}

function criarClienteDados(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) return null;

  if (temServiceRoleConfigurada() && serviceRoleKey) {
    return createSupabaseClient(supabaseUrl, serviceRoleKey);
  }

  if (!anonKey) return null;

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

export async function PATCH(request: NextRequest) {
  try {
    const auth = await verificarAutorizacaoApi(request);
    if (!auth.autorizado) {
      return NextResponse.json({ erro: auth.motivo }, { status: 401 });
    }

    const body = await request.json();
    const produtoId = typeof body?.produtoId === 'string' ? body.produtoId.trim() : '';
    const dados = body?.dados;

    if (!produtoId || !dados || typeof dados !== 'object') {
      return NextResponse.json(
        { erro: 'Dados inválidos para atualizar o produto.' },
        { status: 400 }
      );
    }

    const supabase = criarClienteDados(request);
    if (!supabase) {
      return NextResponse.json(
        { erro: 'Serviço indisponível no momento.' },
        { status: 500 }
      );
    }

    const camposCustomLimpos = { ...(dados.campos_personalizados || {}) };
    delete camposCustomLimpos._imagem_url;
    delete camposCustomLimpos._unidade_medida;
    delete camposCustomLimpos.unidade_medida;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatePayload: Record<string, any> = {
      atualizado_em: new Date().toISOString(),
    };

    if (dados.nome !== undefined) updatePayload.nome = dados.nome;
    if (dados.descricao !== undefined) updatePayload.descricao = dados.descricao;
    if (dados.codigo_sku !== undefined) updatePayload.codigo_sku = dados.codigo_sku;
    if (dados.valor !== undefined) updatePayload.valor = dados.valor;
    if (dados.ativo !== undefined) updatePayload.ativo = dados.ativo;
    if (dados.unidades_medidas !== undefined) {
      updatePayload.unidades_medidas = dados.unidades_medidas;
    }
    if (dados.categoria_produto !== undefined) {
      updatePayload.categoria_produto = dados.categoria_produto;
    }
    if (dados.campos_personalizados !== undefined || dados.imagem_url !== undefined) {
      updatePayload.campos_personalizados = {
        ...camposCustomLimpos,
        ...(dados.imagem_url ? { _imagem_url: dados.imagem_url } : {}),
      };
    }

    const { data, error } = await supabase
      .from('produtos')
      .update(updatePayload)
      .eq('id', produtoId)
      .select('id, unidades_medidas, categoria_produto');

    if (error) {
      return NextResponse.json(
        { erro: `Não foi possível salvar as alterações do produto: ${error.message}` },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { erro: 'Produto não encontrado ou sem permissão para alteração.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      sucesso: true,
      produto: data[0],
    });
  } catch {
    return NextResponse.json(
      { erro: 'Erro interno ao atualizar produto.' },
      { status: 500 }
    );
  }
}
