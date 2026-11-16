import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { verificarAutorizacaoApi } from '@/lib/security/api-auth';

const ORG_PADRAO_ID = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';

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

// GET /api/negocios/produtos?negocioId=...
export async function GET(request: NextRequest) {
  try {
    const auth = await verificarAutorizacaoApi(request);
    if (!auth.autorizado) {
      return NextResponse.json({ erro: auth.motivo }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const negocioId = searchParams.get('negocioId');

    if (!negocioId) {
      return NextResponse.json({ erro: 'negocioId é obrigatório' }, { status: 400 });
    }

    const supabase = criarClienteDados(request);
    if (!supabase) {
      return NextResponse.json({ erro: 'Serviço indisponível' }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('negocios_produtos')
      .select('id, negocio_id, produto_id, quantidade, valor_unitario, subtotal, produto:produtos(nome)')
      .eq('negocio_id', negocioId)
      .order('criado_em', { ascending: true });

    if (error) {
      console.error('Erro ao buscar produtos do negócio:', error);
      return NextResponse.json({ erro: error.message }, { status: 500 });
    }

    const produtos = (data || []).map((pv: any) => ({
      id: pv.id,
      produto_id: pv.produto_id,
      nome: pv.produto?.nome || 'Item',
      quantidade: Number(pv.quantidade) || 1,
      valor_unitario: Number(pv.valor_unitario) || 0,
      subtotal: Number(pv.subtotal) || Number(pv.quantidade) * Number(pv.valor_unitario),
    }));

    return NextResponse.json({ produtos });
  } catch (err: any) {
    console.error('Erro na rota GET /api/negocios/produtos:', err);
    return NextResponse.json({ erro: err?.message || 'Erro interno' }, { status: 500 });
  }
}

// POST /api/negocios/produtos
// Body: { negocioId: string, produtoId: string, quantidade?: number, valorUnitario?: number }
export async function POST(request: NextRequest) {
  try {
    const auth = await verificarAutorizacaoApi(request);
    if (!auth.autorizado) {
      return NextResponse.json({ erro: auth.motivo }, { status: 401 });
    }

    const body = await request.json();
    const negocioId = typeof body?.negocioId === 'string' ? body.negocioId.trim() : '';
    const produtoId = typeof body?.produtoId === 'string' ? body.produtoId.trim() : '';
    const quantidade = Math.max(1, Number(body?.quantidade) || 1);
    const valorUnitario = Math.max(0, Number(body?.valorUnitario) || 0);

    if (!negocioId || !produtoId) {
      return NextResponse.json(
        { erro: 'negocioId e produtoId são obrigatórios.' },
        { status: 400 }
      );
    }

    const supabase = criarClienteDados(request);
    if (!supabase) {
      return NextResponse.json({ erro: 'Serviço indisponível' }, { status: 500 });
    }

    // 1. Verifica se o item já existe para este negócio
    const { data: itemExistente, error: errBusca } = await supabase
      .from('negocios_produtos')
      .select('id, quantidade, valor_unitario')
      .eq('negocio_id', negocioId)
      .eq('produto_id', produtoId)
      .maybeSingle();

    if (errBusca) {
      console.warn('Aviso ao consultar negocios_produtos:', errBusca);
    }

    if (itemExistente) {
      // Atualiza quantidade incrementando
      const novaQuantidade = Number(itemExistente.quantidade) + quantidade;
      const { error: errUpdate } = await supabase
        .from('negocios_produtos')
        .update({
          quantidade: novaQuantidade,
          valor_unitario: valorUnitario > 0 ? valorUnitario : itemExistente.valor_unitario,
        })
        .eq('id', itemExistente.id);

      if (errUpdate) {
        console.error('Erro ao atualizar quantidade do produto no negócio:', errUpdate);
        return NextResponse.json({ erro: errUpdate.message }, { status: 500 });
      }
    } else {
      // Insere novo registro (não passar 'subtotal' pois é coluna gerada)
      const { error: errInsert } = await supabase
        .from('negocios_produtos')
        .insert({
          organizacao_id: ORG_PADRAO_ID,
          negocio_id: negocioId,
          produto_id: produtoId,
          quantidade: quantidade,
          valor_unitario: valorUnitario,
        });

      if (errInsert) {
        console.error('Erro ao inserir produto no negócio:', errInsert);
        return NextResponse.json({ erro: errInsert.message }, { status: 500 });
      }
    }

    // 2. Recalcula o valor total do negócio e atualiza a tabela 'negocios'
    const { data: todosItens } = await supabase
      .from('negocios_produtos')
      .select('subtotal, quantidade, valor_unitario')
      .eq('negocio_id', negocioId);

    const novoValorTotal = (todosItens || []).reduce(
      (acc: number, item: any) =>
        acc + (Number(item.subtotal) || Number(item.quantidade) * Number(item.valor_unitario) || 0),
      0
    );

    await supabase
      .from('negocios')
      .update({
        valor: novoValorTotal,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', negocioId);

    return NextResponse.json({
      sucesso: true,
      negocioId,
      produtoId,
      novoValorTotal,
    });
  } catch (err: any) {
    console.error('Erro na rota POST /api/negocios/produtos:', err);
    return NextResponse.json({ erro: err?.message || 'Erro interno' }, { status: 500 });
  }
}

// DELETE /api/negocios/produtos
// Query ou Body: { negocioId: string, produtoId: string }
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verificarAutorizacaoApi(request);
    if (!auth.autorizado) {
      return NextResponse.json({ erro: auth.motivo }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let negocioId = searchParams.get('negocioId') || '';
    let produtoId = searchParams.get('produtoId') || '';

    if (!negocioId || !produtoId) {
      try {
        const body = await request.json();
        negocioId = negocioId || (typeof body?.negocioId === 'string' ? body.negocioId.trim() : '');
        produtoId = produtoId || (typeof body?.produtoId === 'string' ? body.produtoId.trim() : '');
      } catch {
        // ignore body parse error
      }
    }

    if (!negocioId || !produtoId) {
      return NextResponse.json(
        { erro: 'negocioId e produtoId são obrigatórios para exclusão.' },
        { status: 400 }
      );
    }

    const supabase = criarClienteDados(request);
    if (!supabase) {
      return NextResponse.json({ erro: 'Serviço indisponível' }, { status: 500 });
    }

    const { error: errDelete } = await supabase
      .from('negocios_produtos')
      .delete()
      .eq('negocio_id', negocioId)
      .eq('produto_id', produtoId);

    if (errDelete) {
      console.error('Erro ao deletar produto do negócio:', errDelete);
      return NextResponse.json({ erro: errDelete.message }, { status: 500 });
    }

    // Recalcula o valor total após remoção
    const { data: todosItens } = await supabase
      .from('negocios_produtos')
      .select('subtotal, quantidade, valor_unitario')
      .eq('negocio_id', negocioId);

    const novoValorTotal = (todosItens || []).reduce(
      (acc: number, item: any) =>
        acc + (Number(item.subtotal) || Number(item.quantidade) * Number(item.valor_unitario) || 0),
      0
    );

    await supabase
      .from('negocios')
      .update({
        valor: novoValorTotal,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', negocioId);

    return NextResponse.json({
      sucesso: true,
      negocioId,
      produtoId,
      novoValorTotal,
    });
  } catch (err: any) {
    console.error('Erro na rota DELETE /api/negocios/produtos:', err);
    return NextResponse.json({ erro: err?.message || 'Erro interno' }, { status: 500 });
  }
}

// PUT /api/negocios/produtos (para definir quantidade exata)
// Body: { negocioId: string, produtoId: string, quantidade: number, valorUnitario?: number }
export async function PUT(request: NextRequest) {
  try {
    const auth = await verificarAutorizacaoApi(request);
    if (!auth.autorizado) {
      return NextResponse.json({ erro: auth.motivo }, { status: 401 });
    }

    const body = await request.json();
    const negocioId = typeof body?.negocioId === 'string' ? body.negocioId.trim() : '';
    const produtoId = typeof body?.produtoId === 'string' ? body.produtoId.trim() : '';
    const quantidade = Number(body?.quantidade);
    const valorUnitario = body?.valorUnitario !== undefined ? Number(body.valorUnitario) : undefined;

    if (!negocioId || !produtoId || isNaN(quantidade)) {
      return NextResponse.json(
        { erro: 'negocioId, produtoId e quantidade são obrigatórios.' },
        { status: 400 }
      );
    }

    const supabase = criarClienteDados(request);
    if (!supabase) {
      return NextResponse.json({ erro: 'Serviço indisponível' }, { status: 500 });
    }

    if (quantidade <= 0) {
      // Se quantidade for zero ou negativa, remove o produto
      await supabase
        .from('negocios_produtos')
        .delete()
        .eq('negocio_id', negocioId)
        .eq('produto_id', produtoId);
    } else {
      const { data: itemExistente } = await supabase
        .from('negocios_produtos')
        .select('id, valor_unitario')
        .eq('negocio_id', negocioId)
        .eq('produto_id', produtoId)
        .maybeSingle();

      if (itemExistente) {
        await supabase
          .from('negocios_produtos')
          .update({
            quantidade,
            ...(valorUnitario !== undefined ? { valor_unitario: valorUnitario } : {}),
          })
          .eq('id', itemExistente.id);
      } else {
        await supabase
          .from('negocios_produtos')
          .insert({
            organizacao_id: ORG_PADRAO_ID,
            negocio_id: negocioId,
            produto_id: produtoId,
            quantidade,
            valor_unitario: valorUnitario || 0,
          });
      }
    }

    // Recalcula valor total
    const { data: todosItens } = await supabase
      .from('negocios_produtos')
      .select('subtotal, quantidade, valor_unitario')
      .eq('negocio_id', negocioId);

    const novoValorTotal = (todosItens || []).reduce(
      (acc: number, item: any) =>
        acc + (Number(item.subtotal) || Number(item.quantidade) * Number(item.valor_unitario) || 0),
      0
    );

    await supabase
      .from('negocios')
      .update({
        valor: novoValorTotal,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', negocioId);

    return NextResponse.json({
      sucesso: true,
      negocioId,
      produtoId,
      quantidade,
      novoValorTotal,
    });
  } catch (err: any) {
    console.error('Erro na rota PUT /api/negocios/produtos:', err);
    return NextResponse.json({ erro: err?.message || 'Erro interno' }, { status: 500 });
  }
}
