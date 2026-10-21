import { createClient } from './client';
import {
  DADOS_NEGOCIOS,
  DADOS_ETAPAS,
  DADOS_FUNIS,
  DADOS_CONTATOS,
  DADOS_EMPRESAS,
  DADOS_PRODUTOS,
  DADOS_MEMBROS,
  type Negocio,
  type Funil,
  type EtapaFunil,
  type Contato,
  type Empresa,
  type Produto,
} from '@/lib/mock-data';

const ORG_PADRAO_ID = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const FUNIL_PADRAO_ID = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';

// ==============================================================================
// 1. PIPELINE, FUNIS & ETAPAS
// ==============================================================================

export async function buscarFunisDoBanco(): Promise<Funil[]> {
  try {
    const supabase = createClient() as any;
    const { data, error } = await supabase
      .from('funis')
      .select('*')
      .order('criado_em', { ascending: true });

    if (error || !data || data.length === 0) {
      return DADOS_FUNIS;
    }

    return data.map((f: any) => ({
      id: f.id,
      nome: f.nome,
      descricao: f.descricao || '',
      padrao: f.padrao ?? false,
      criado_em: f.criado_em,
    }));
  } catch (err) {
    console.warn('Fallback para funis mock:', err);
    return DADOS_FUNIS;
  }
}

export async function criarFunilNoBanco(
  nome: string,
  descricao?: string
): Promise<{ funil: Funil; etapas: EtapaFunil[] }> {
  const funilId = crypto.randomUUID();
  const novoFunil: Funil = {
    id: funilId,
    nome: nome.trim(),
    descricao: descricao || '',
    padrao: false,
    criado_em: new Date().toISOString(),
  };

  const etapasIniciais: EtapaFunil[] = [
    {
      id: crypto.randomUUID(),
      funil_id: funilId,
      nome: 'Contato Inicial',
      ordem: 1,
      probabilidade_fechamento: 15,
      dias_estagnacao: 5,
    },
    {
      id: crypto.randomUUID(),
      funil_id: funilId,
      nome: 'Diagnóstico & Apresentação',
      ordem: 2,
      probabilidade_fechamento: 40,
      dias_estagnacao: 7,
    },
    {
      id: crypto.randomUUID(),
      funil_id: funilId,
      nome: 'Proposta Comercial',
      ordem: 3,
      probabilidade_fechamento: 70,
      dias_estagnacao: 5,
    },
    {
      id: crypto.randomUUID(),
      funil_id: funilId,
      nome: 'Fechamento / Contrato',
      ordem: 4,
      probabilidade_fechamento: 90,
      dias_estagnacao: 3,
    },
  ];

  try {
    const supabase = createClient() as any;
    await supabase.from('funis').insert({
      id: funilId,
      organizacao_id: ORG_PADRAO_ID,
      nome: novoFunil.nome,
      descricao: novoFunil.descricao,
      padrao: false,
    });

    await supabase.from('etapas_funil').insert(
      etapasIniciais.map((e) => ({
        id: e.id,
        organizacao_id: ORG_PADRAO_ID,
        funil_id: funilId,
        nome: e.nome,
        ordem: e.ordem,
        probabilidade_fechamento: e.probabilidade_fechamento,
        dias_estagnacao: e.dias_estagnacao,
      }))
    );
  } catch (err) {
    console.error('Erro ao criar funil no Supabase:', err);
  }

  return { funil: novoFunil, etapas: etapasIniciais };
}

export async function buscarEtapasDoBanco(funilId?: string): Promise<EtapaFunil[]> {
  try {
    const supabase = createClient() as any;
    let query = supabase
      .from('etapas_funil')
      .select('*')
      .order('ordem', { ascending: true });

    if (funilId) {
      query = query.eq('funil_id', funilId);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return DADOS_ETAPAS;
    }

    return data.map((e: any) => ({
      id: e.id,
      funil_id: e.funil_id,
      nome: e.nome,
      ordem: e.ordem,
      probabilidade_fechamento: e.probabilidade_fechamento,
      dias_estagnacao: e.dias_estagnacao,
      cor: '#64748b',
    }));
  } catch (err) {
    console.warn('Fallback para etapas mock:', err);
    return DADOS_ETAPAS;
  }
}

export async function atualizarNomeOuPropriedadesEtapaBanco(
  etapaId: string,
  dados: Partial<EtapaFunil>
): Promise<boolean> {
  try {
    const supabase = createClient() as any;
    const updatePayload: any = {};
    if (dados.nome !== undefined) updatePayload.nome = dados.nome;
    if (dados.ordem !== undefined) updatePayload.ordem = dados.ordem;
    if (dados.probabilidade_fechamento !== undefined)
      updatePayload.probabilidade_fechamento = dados.probabilidade_fechamento;
    if (dados.dias_estagnacao !== undefined)
      updatePayload.dias_estagnacao = dados.dias_estagnacao;

    const { error } = await supabase
      .from('etapas_funil')
      .update(updatePayload)
      .eq('id', etapaId);

    if (error) {
      console.error('Erro ao atualizar etapa no Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Erro ao atualizar etapa no Supabase:', err);
    return false;
  }
}

export async function adicionarEtapaAoFunilBanco(
  funilId: string,
  nome: string,
  ordem: number,
  probabilidade: number = 50,
  diasEstagnacao: number = 7
): Promise<EtapaFunil> {
  const novaEtapa: EtapaFunil = {
    id: crypto.randomUUID(),
    funil_id: funilId,
    nome: nome.trim(),
    ordem,
    probabilidade_fechamento: probabilidade,
    dias_estagnacao: diasEstagnacao,
  };

  try {
    const supabase = createClient() as any;
    await supabase.from('etapas_funil').insert({
      id: novaEtapa.id,
      organizacao_id: ORG_PADRAO_ID,
      funil_id: funilId,
      nome: novaEtapa.nome,
      ordem: novaEtapa.ordem,
      probabilidade_fechamento: novaEtapa.probabilidade_fechamento,
      dias_estagnacao: novaEtapa.dias_estagnacao,
    });
  } catch (err) {
    console.error('Erro ao adicionar etapa no Supabase:', err);
  }

  return novaEtapa;
}

export async function removerEtapaDoFunilBanco(
  etapaId: string,
  etapaDestinoId?: string
): Promise<boolean> {
  try {
    const supabase = createClient() as any;
    if (etapaDestinoId) {
      await supabase
        .from('negocios')
        .update({
          etapa_id: etapaDestinoId,
          ultima_atividade_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
        })
        .eq('etapa_id', etapaId);
    }

    const { error } = await supabase
      .from('etapas_funil')
      .delete()
      .eq('id', etapaId);

    if (error) {
      console.error('Erro ao remover etapa no Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Erro ao remover etapa no Supabase:', err);
    return false;
  }
}

export async function buscarNegociosDoBanco(): Promise<Negocio[]> {
  try {
    const supabase = createClient() as any;
    const { data, error } = await supabase
      .from('negocios')
      .select(`
        *,
        empresa:empresas(nome),
        contato:contatos(nome),
        responsavel:perfis(nome_completo, avatar_url),
        atividades:atividades(id, concluida_em, data_vencimento),
        produtos_vinculados:negocios_produtos(
          produto_id,
          quantidade,
          valor_unitario,
          subtotal,
          produto:produtos(nome)
        )
      `)
      .order('criado_em', { ascending: false });

    if (error || !data || data.length === 0) {
      return DADOS_NEGOCIOS;
    }

    const agora = new Date();
    const hojeStr = agora.toISOString().split('T')[0];

    return data.map((n: any) => {
      const atividadesList = n.atividades || [];
      const pendentes = atividadesList.filter((a: any) => !a.concluida_em);
      let statusAtividade: 'atrasada' | 'hoje' | 'futura' | 'sem_atividade' = 'sem_atividade';

      if (pendentes.length > 0) {
        const temAtrasada = pendentes.some((a: any) => a.data_vencimento && new Date(a.data_vencimento) < agora);
        const temHoje = pendentes.some((a: any) => a.data_vencimento && a.data_vencimento.startsWith(hojeStr));
        if (temAtrasada) statusAtividade = 'atrasada';
        else if (temHoje) statusAtividade = 'hoje';
        else statusAtividade = 'futura';
      }

      // Produtos vinculados do banco
      const prodsList = (n.produtos_vinculados || []).map((pv: any) => ({
        produto_id: pv.produto_id,
        nome: pv.produto?.nome || 'Item',
        quantidade: Number(pv.quantidade) || 1,
        valor_unitario: Number(pv.valor_unitario) || 0,
        subtotal: Number(pv.subtotal) || (Number(pv.quantidade) * Number(pv.valor_unitario)),
      }));

      return {
        id: n.id,
        titulo: n.titulo,
        valor: Number(n.valor) || 0,
        moeda: n.moeda || 'BRL',
        funil_id: n.funil_id,
        etapa_id: n.etapa_id,
        empresa_id: n.empresa_id || '',
        empresa_nome: n.empresa?.nome || '',
        contato_id: n.contato_id || '',
        contato_nome: n.contato?.nome || '',
        responsavel_id: n.responsavel_id || DADOS_MEMBROS[0].id,
        responsavel_nome: n.responsavel?.nome_completo || 'Carlos Silva',
        responsavel_avatar: n.responsavel?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        status: n.status,
        motivo_perda: n.motivo_perda,
        data_fechamento_esperada: n.data_fechamento_esperada,
        ultima_atividade_em: n.ultima_atividade_em,
        campos_personalizados: n.campos_personalizados || {},
        atividades_count: atividadesList.length,
        atividades_pendentes: pendentes.length,
        status_atividade: statusAtividade,
        produtos: prodsList,
      };
    });
  } catch (err) {
    console.warn('Fallback para negócios mock:', err);
    return DADOS_NEGOCIOS;
  }
}

export async function adicionarProdutoAoNegocio(
  negocioId: string,
  produtoId: string,
  nome: string,
  quantidade: number = 1,
  valorUnitario: number = 0
): Promise<{ produto_id: string; nome: string; quantidade: number; valor_unitario: number; subtotal: number }> {
  const subtotal = quantidade * valorUnitario;
  try {
    const supabase = createClient() as any;
    await supabase.from('negocios_produtos').upsert(
      {
        organizacao_id: ORG_PADRAO_ID,
        negocio_id: negocioId,
        produto_id: produtoId,
        quantidade: quantidade,
        valor_unitario: valorUnitario,
      },
      { onConflict: 'negocio_id,produto_id' }
    );
  } catch (err) {
    console.error('Erro ao adicionar produto no Supabase:', err);
  }

  return {
    produto_id: produtoId,
    nome,
    quantidade,
    valor_unitario: valorUnitario,
    subtotal,
  };
}

export async function removerProdutoDoNegocio(negocioId: string, produtoId: string): Promise<boolean> {
  try {
    const supabase = createClient() as any;
    const { error } = await supabase
      .from('negocios_produtos')
      .delete()
      .eq('negocio_id', negocioId)
      .eq('produto_id', produtoId);

    if (error) {
      console.error('Erro ao remover produto no Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Erro ao remover produto no Supabase:', err);
    return false;
  }
}

export async function atualizarPropriedadesNegocioBanco(
  negocioId: string,
  campos: Partial<Negocio>
) {
  try {
    const supabase = createClient() as any;
    const updateData: any = {
      atualizado_em: new Date().toISOString(),
    };
    if (campos.valor !== undefined) updateData.valor = campos.valor;
    if (campos.etapa_id !== undefined) updateData.etapa_id = campos.etapa_id;
    if (campos.responsavel_id !== undefined) updateData.responsavel_id = campos.responsavel_id;
    if (campos.status !== undefined) updateData.status = campos.status;
    if (campos.motivo_perda !== undefined) updateData.motivo_perda = campos.motivo_perda;
    if (campos.data_fechamento_esperada !== undefined) updateData.data_fechamento_esperada = campos.data_fechamento_esperada;

    await supabase.from('negocios').update(updateData).eq('id', negocioId);
  } catch (err) {
    console.error('Erro ao atualizar negócio no Supabase:', err);
  }
}

export async function salvarMovimentacaoEtapaBanco(
  negocioId: string,
  etapaId: string,
  status: 'aberto' | 'ganho' | 'perdido' = 'aberto',
  motivoPerda?: string
) {
  try {
    const supabase = createClient() as any;
    const updateData: any = {
      etapa_id: etapaId,
      status: status,
      ultima_atividade_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    };
    if (motivoPerda) {
      updateData.motivo_perda = motivoPerda;
    }

    await supabase.from('negocios').update(updateData).eq('id', negocioId);
  } catch (err) {
    console.error('Erro ao atualizar etapa no Supabase:', err);
  }
}

export async function criarNegocioNoBanco(novo: Partial<Negocio>): Promise<Negocio> {
  const negocioLocal: Negocio = {
    id: novo.id || crypto.randomUUID(),
    titulo: novo.titulo || 'Nova Oportunidade',
    valor: novo.valor || 0,
    moeda: 'BRL',
    funil_id: novo.funil_id || FUNIL_PADRAO_ID,
    etapa_id: novo.etapa_id || DADOS_ETAPAS[0].id,
    empresa_id: novo.empresa_id || '',
    empresa_nome: novo.empresa_nome || '',
    contato_id: novo.contato_id || '',
    contato_nome: novo.contato_nome || '',
    responsavel_id: novo.responsavel_id || DADOS_MEMBROS[0].id,
    responsavel_nome: DADOS_MEMBROS[0].nome_completo,
    responsavel_avatar: DADOS_MEMBROS[0].avatar_url,
    status: 'aberto',
    ultima_atividade_em: new Date().toISOString(),
  };

  try {
    const supabase = createClient() as any;
    await supabase.from('negocios').insert({
      id: negocioLocal.id,
      organizacao_id: ORG_PADRAO_ID,
      titulo: negocioLocal.titulo,
      valor: negocioLocal.valor,
      moeda: 'BRL',
      funil_id: negocioLocal.funil_id,
      etapa_id: negocioLocal.etapa_id,
      empresa_id: negocioLocal.empresa_id || null,
      contato_id: negocioLocal.contato_id || null,
      responsavel_id: negocioLocal.responsavel_id || null,
      status: 'aberto',
      ultima_atividade_em: negocioLocal.ultima_atividade_em,
    });
  } catch (err) {
    console.error('Erro ao inserir negócio no Supabase:', err);
  }

  return negocioLocal;
}

// ==============================================================================
// 2. CONTATOS
// ==============================================================================

export async function buscarContatosDoBanco(): Promise<Contato[]> {
  try {
    const supabase = createClient() as any;
    const { data, error } = await supabase
      .from('contatos')
      .select('*, empresa:empresas(nome)')
      .order('criado_em', { ascending: false });

    if (error || !data || data.length === 0) {
      return DADOS_CONTATOS;
    }

    return data.map((c: any) => ({
      id: c.id,
      empresa_id: c.empresa_id || '',
      empresa_nome: c.empresa?.nome || '',
      nome: c.nome,
      email: c.email || '',
      telefone_whatsapp: c.telefone_whatsapp || '',
      cargo: c.cargo || '',
      responsavel_id: c.responsavel_id || DADOS_MEMBROS[0].id,
      criado_em: c.criado_em,
    }));
  } catch (err) {
    console.warn('Fallback para contatos mock:', err);
    return DADOS_CONTATOS;
  }
}

export async function criarContatoNoBanco(novo: Partial<Contato>): Promise<Contato> {
  const contatoLocal: Contato = {
    id: novo.id || crypto.randomUUID(),
    nome: novo.nome || 'Novo Contato',
    email: novo.email || '',
    telefone_whatsapp: novo.telefone_whatsapp || '',
    cargo: novo.cargo || '',
    empresa_id: novo.empresa_id || '',
    empresa_nome: novo.empresa_nome || '',
    responsavel_id: novo.responsavel_id || DADOS_MEMBROS[0].id,
    criado_em: new Date().toISOString(),
  };

  try {
    const supabase = createClient() as any;
    await supabase.from('contatos').insert({
      id: contatoLocal.id,
      organizacao_id: ORG_PADRAO_ID,
      nome: contatoLocal.nome,
      email: contatoLocal.email,
      telefone_whatsapp: contatoLocal.telefone_whatsapp,
      cargo: contatoLocal.cargo,
      empresa_id: contatoLocal.empresa_id || null,
      responsavel_id: contatoLocal.responsavel_id || null,
    });
  } catch (err) {
    console.error('Erro ao inserir contato no Supabase:', err);
  }

  return contatoLocal;
}

// ==============================================================================
// 3. EMPRESAS
// ==============================================================================

export async function buscarEmpresasDoBanco(): Promise<Empresa[]> {
  try {
    const supabase = createClient() as any;
    const { data, error } = await supabase
      .from('empresas')
      .select('*, negocios:negocios(id)')
      .order('criado_em', { ascending: false });

    if (error || !data || data.length === 0) {
      return DADOS_EMPRESAS;
    }

    return data.map((e: any) => ({
      id: e.id,
      nome: e.nome,
      cnpj: e.cnpj || '-',
      dominio: e.dominio || '',
      segmento: e.segmento || 'Geral',
      responsavel_id: e.responsavel_id || DADOS_MEMBROS[0].id,
      total_negocios: e.negocios?.length || 0,
      criado_em: e.criado_em,
    }));
  } catch (err) {
    console.warn('Fallback para empresas mock:', err);
    return DADOS_EMPRESAS;
  }
}

export async function criarEmpresaNoBanco(nova: Partial<Empresa>): Promise<Empresa> {
  const empresaLocal: Empresa = {
    id: nova.id || crypto.randomUUID(),
    nome: nova.nome || 'Nova Empresa',
    cnpj: nova.cnpj || '-',
    dominio: nova.dominio || '',
    segmento: nova.segmento || 'Geral',
    responsavel_id: nova.responsavel_id || DADOS_MEMBROS[0].id,
    total_negocios: 0,
    criado_em: new Date().toISOString(),
  };

  try {
    const supabase = createClient() as any;
    await supabase.from('empresas').insert({
      id: empresaLocal.id,
      organizacao_id: ORG_PADRAO_ID,
      nome: empresaLocal.nome,
      cnpj: empresaLocal.cnpj,
      dominio: empresaLocal.dominio,
      segmento: empresaLocal.segmento,
      responsavel_id: empresaLocal.responsavel_id || null,
    });
  } catch (err) {
    console.error('Erro ao inserir empresa no Supabase:', err);
  }

  return empresaLocal;
}

// ==============================================================================
// 4. PRODUTOS
// ==============================================================================

export async function buscarProdutosDoBanco(): Promise<Produto[]> {
  try {
    const supabase = createClient() as any;
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .order('criado_em', { ascending: false });

    if (error || !data || data.length === 0) {
      return DADOS_PRODUTOS;
    }

    return data.map((p: any) => ({
      id: p.id,
      nome: p.nome,
      descricao: p.descricao || '',
      codigo_sku: p.codigo_sku || '',
      valor: Number(p.valor) || 0,
      tipo_cobranca: p.tipo_cobranca || 'mensal',
      ativo: p.ativo ?? true,
    }));
  } catch (err) {
    console.warn('Fallback para produtos mock:', err);
    return DADOS_PRODUTOS;
  }
}

export async function criarProdutoNoBanco(novo: Partial<Produto>): Promise<Produto> {
  const produtoLocal: Produto = {
    id: novo.id || crypto.randomUUID(),
    nome: novo.nome || 'Novo Produto',
    descricao: novo.descricao || '',
    codigo_sku: novo.codigo_sku || `SKU-${Math.floor(Math.random() * 9000 + 1000)}`,
    valor: novo.valor || 0,
    tipo_cobranca: novo.tipo_cobranca || 'mensal',
    ativo: novo.ativo ?? true,
  };

  try {
    const supabase = createClient() as any;
    await supabase.from('produtos').insert({
      id: produtoLocal.id,
      organizacao_id: ORG_PADRAO_ID,
      nome: produtoLocal.nome,
      descricao: produtoLocal.descricao,
      codigo_sku: produtoLocal.codigo_sku,
      valor: produtoLocal.valor,
      tipo_cobranca: produtoLocal.tipo_cobranca,
      ativo: produtoLocal.ativo,
    });
  } catch (err) {
    console.error('Erro ao cadastrar produto no Supabase:', err);
  }

  return produtoLocal;
}
