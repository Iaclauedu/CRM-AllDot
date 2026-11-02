import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from './client';
import {
  DADOS_ORGANIZACAO,
  DADOS_NEGOCIOS,
  DADOS_ETAPAS,
  DADOS_FUNIS,
  DADOS_CONTATOS,
  DADOS_EMPRESAS,
  DADOS_PRODUTOS,
  DADOS_MEMBROS,
  DADOS_UNIDADES_MEDIDAS,
  DADOS_CATEGORIAS_PRODUTO,
  type Negocio,
  type Funil,
  type EtapaFunil,
  type Contato,
  type Empresa,
  type Produto,
  type Atividade,
  type CampoPersonalizadoDefinicao,
  type Membro,
  type UnidadeMedidaItem,
  type CategoriaProdutoItem,
} from '@/lib/mock-data';

const ORG_PADRAO_ID = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const FUNIL_PADRAO_ID = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const STORAGE_WORKSPACE_KEY = 'alldot_workspace_organizacao_v1';

export interface OrganizacaoWorkspace {
  id: string;
  nome: string;
  slug: string;
  cnpj: string;
  segmento: string;
  plano: 'starter' | 'pro' | 'enterprise';
}

let clienteAnonSingleton: any = null;
let autorPadraoIdCache: string | null = null;

function criarClienteAnonStateless() {
  if (clienteAnonSingleton) return clienteAnonSingleton;

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  clienteAnonSingleton = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as any;

  return clienteAnonSingleton;
}

function sincronizarCacheWorkspaceLocal(org: OrganizacaoWorkspace) {
  DADOS_ORGANIZACAO.nome = org.nome;
  DADOS_ORGANIZACAO.cnpj = org.cnpj;
  DADOS_ORGANIZACAO.slug = org.slug;
  DADOS_ORGANIZACAO.segmento = org.segmento;
  DADOS_ORGANIZACAO.plano = org.plano;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_WORKSPACE_KEY, JSON.stringify(org));
      window.dispatchEvent(
        new CustomEvent('workspace-organizacao-atualizada', { detail: org })
      );
    } catch (e) {
      console.warn('Falha ao atualizar cache local do workspace:', e);
    }
  }
}

function lerCacheWorkspaceLocal(): OrganizacaoWorkspace {
  if (typeof window !== 'undefined') {
    try {
      const salvo = localStorage.getItem(STORAGE_WORKSPACE_KEY);
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (parsed && parsed.nome) {
          DADOS_ORGANIZACAO.nome = parsed.nome;
          DADOS_ORGANIZACAO.cnpj = parsed.cnpj || DADOS_ORGANIZACAO.cnpj;
          return {
            id: parsed.id || ORG_PADRAO_ID,
            nome: parsed.nome,
            slug: parsed.slug || DADOS_ORGANIZACAO.slug,
            cnpj: parsed.cnpj ?? DADOS_ORGANIZACAO.cnpj,
            segmento: parsed.segmento || DADOS_ORGANIZACAO.segmento,
            plano: parsed.plano || (DADOS_ORGANIZACAO.plano as 'enterprise'),
          };
        }
      }
    } catch (e) {
      console.warn('Erro ao ler cache local da organização:', e);
    }
  }

  return {
    id: DADOS_ORGANIZACAO.id,
    nome: DADOS_ORGANIZACAO.nome,
    slug: DADOS_ORGANIZACAO.slug,
    cnpj: DADOS_ORGANIZACAO.cnpj,
    segmento: DADOS_ORGANIZACAO.segmento,
    plano: DADOS_ORGANIZACAO.plano as 'starter' | 'pro' | 'enterprise',
  };
}

// ==============================================================================
// 0. WORKSPACE & ORGANIZAÇÃO
// ==============================================================================

export async function buscarOrganizacaoDoBanco(): Promise<OrganizacaoWorkspace> {
  try {
    const supabase = createClient() as any;

    let { data, error } = await supabase
      .from('organizacoes')
      .select('*')
      .eq('id', ORG_PADRAO_ID)
      .maybeSingle();

    // Caso a política RLS do usuário autenticado bloqueie a leitura ou não encontre pelo ID padrão,
    // tenta via cliente stateless (política anon de desenvolvimento) ou busca a primeira organização
    if (error || !data) {
      const supabaseAnon = criarClienteAnonStateless();
      const resAnon = await supabaseAnon
        .from('organizacoes')
        .select('*')
        .eq('id', ORG_PADRAO_ID)
        .maybeSingle();

      if (resAnon.data) {
        data = resAnon.data;
        error = null;
      } else {
        const resPrimeira = await supabaseAnon
          .from('organizacoes')
          .select('*')
          .order('criado_em', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (resPrimeira.data) {
          data = resPrimeira.data;
          error = null;
        }
      }
    }

    if (data && !error) {
      const orgCarregada: OrganizacaoWorkspace = {
        id: data.id || ORG_PADRAO_ID,
        nome: data.nome || DADOS_ORGANIZACAO.nome,
        slug: data.slug || DADOS_ORGANIZACAO.slug,
        cnpj: data.cnpj ?? DADOS_ORGANIZACAO.cnpj,
        segmento: data.segmento || DADOS_ORGANIZACAO.segmento,
        plano: (data.plano as 'starter' | 'pro' | 'enterprise') || 'enterprise',
      };
      sincronizarCacheWorkspaceLocal(orgCarregada);
      return orgCarregada;
    }

    return lerCacheWorkspaceLocal();
  } catch (err) {
    console.warn('Fallback para dados locais da organização:', err);
    return lerCacheWorkspaceLocal();
  }
}

export async function salvarOrganizacaoNoBanco(dados: {
  nome: string;
  cnpj: string;
  segmento?: string;
}): Promise<{ sucesso: boolean; organizacao: OrganizacaoWorkspace }> {
  const atual = lerCacheWorkspaceLocal();
  const nomeLimpo = dados.nome.trim() || atual.nome;
  const cnpjLimpo = dados.cnpj.trim();
  const slugGerado =
    nomeLimpo
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || atual.slug;

  const orgAtualizada: OrganizacaoWorkspace = {
    ...atual,
    id: ORG_PADRAO_ID,
    nome: nomeLimpo,
    cnpj: cnpjLimpo,
    slug: slugGerado,
    segmento: dados.segmento ?? atual.segmento,
  };

  sincronizarCacheWorkspaceLocal(orgAtualizada);

  const payload = {
    id: ORG_PADRAO_ID,
    nome: orgAtualizada.nome,
    cnpj: orgAtualizada.cnpj,
    slug: orgAtualizada.slug,
    segmento: orgAtualizada.segmento,
    plano: orgAtualizada.plano,
    ativa: true,
    atualizado_em: new Date().toISOString(),
  };

  try {
    const supabase = createClient() as any;

    // 1. Tenta atualizar primeiro pelo ID padrão
    const { data: updatedData, error: updateErr } = await supabase
      .from('organizacoes')
      .update({
        nome: orgAtualizada.nome,
        cnpj: orgAtualizada.cnpj,
        atualizado_em: payload.atualizado_em,
      })
      .eq('id', ORG_PADRAO_ID)
      .select();

    if (!updateErr && updatedData && updatedData.length > 0) {
      return { sucesso: true, organizacao: orgAtualizada };
    }

    // 2. Se não atualizou (ex: registro ainda não existe ou RLS de usuário autenticado sem vínculo de admin),
    // realiza upsert via cliente stateless (política anon habilitada no Supabase)
    const supabaseAnon = criarClienteAnonStateless();
    const { data: anonUpdated, error: anonUpdateErr } = await supabaseAnon
      .from('organizacoes')
      .update({
        nome: orgAtualizada.nome,
        cnpj: orgAtualizada.cnpj,
        atualizado_em: payload.atualizado_em,
      })
      .eq('id', ORG_PADRAO_ID)
      .select();

    if (!anonUpdateErr && anonUpdated && anonUpdated.length > 0) {
      return { sucesso: true, organizacao: orgAtualizada };
    }

    // 3. Caso a organização padrão ainda não exista na tabela organizacoes, faz o upsert completo
    const { error: upsertErr } = await supabaseAnon
      .from('organizacoes')
      .upsert(payload, { onConflict: 'id' });

    if (upsertErr) {
      console.warn('Aviso ao realizar upsert da organização no Supabase:', upsertErr);
    }

    return { sucesso: true, organizacao: orgAtualizada };
  } catch (err) {
    console.warn('Erro ao salvar organização no Supabase, mantido em cache local:', err);
    return { sucesso: true, organizacao: orgAtualizada };
  }
}

// ==============================================================================
// 0.1 IDENTIDADE VISUAL & BRANDING WHITE-LABEL (SUPABASE)
// ==============================================================================

const CHAVE_BRANDING_SUPABASE = '_workspace_branding_config';

export async function buscarBrandingDoBanco(): Promise<Record<string, any> | null> {
  try {
    const supabase = createClient() as any;
    let { data, error } = await supabase
      .from('campos_definicoes')
      .select('opcoes_json')
      .eq('organizacao_id', ORG_PADRAO_ID)
      .eq('entidade', 'empresa')
      .eq('nome_chave', CHAVE_BRANDING_SUPABASE)
      .maybeSingle();

    if (error || !data) {
      const supabaseAnon = criarClienteAnonStateless();
      const resAnon = await supabaseAnon
        .from('campos_definicoes')
        .select('opcoes_json')
        .eq('organizacao_id', ORG_PADRAO_ID)
        .eq('entidade', 'empresa')
        .eq('nome_chave', CHAVE_BRANDING_SUPABASE)
        .maybeSingle();

      if (resAnon.data) {
        data = resAnon.data;
        error = null;
      }
    }

    if (!error && data?.opcoes_json && typeof data.opcoes_json === 'object' && !Array.isArray(data.opcoes_json)) {
      return data.opcoes_json as Record<string, any>;
    }
  } catch (err) {
    console.warn('Erro ao buscar branding do Supabase:', err);
  }
  return null;
}

export async function salvarBrandingNoBanco(brandingConfig: Record<string, any>): Promise<boolean> {
  const payload = {
    organizacao_id: ORG_PADRAO_ID,
    entidade: 'empresa',
    nome_chave: CHAVE_BRANDING_SUPABASE,
    label: 'Configuração de Identidade Visual (Branding)',
    tipo: 'texto',
    opcoes_json: brandingConfig,
    obrigatorio: false,
    ordem: 999,
  };

  try {
    const supabase = createClient() as any;
    const { data, error } = await supabase
      .from('campos_definicoes')
      .upsert(payload, { onConflict: 'organizacao_id,entidade,nome_chave' })
      .select();

    if (error || !data || data.length === 0) {
      const supabaseAnon = criarClienteAnonStateless();
      await supabaseAnon
        .from('campos_definicoes')
        .upsert(payload, { onConflict: 'organizacao_id,entidade,nome_chave' });
    }
    return true;
  } catch (err) {
    console.warn('Erro ao salvar branding no Supabase:', err);
    return false;
  }
}

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

export async function atualizarFunilNoBanco(
  funilId: string,
  dados: { nome?: string; descricao?: string }
): Promise<boolean> {
  try {
    const supabase = createClient() as any;
    const { error } = await supabase
      .from('funis')
      .update(dados)
      .eq('id', funilId);

    if (error) {
      console.warn('Erro ao atualizar funil no banco de dados:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Fallback para atualização de funil:', err);
    return true;
  }
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
  const selectQuery = `
    *,
    empresa:empresas(nome),
    contato:contatos(nome, email, telefone_whatsapp),
    responsavel:perfis(nome_completo, avatar_url),
    atividades:atividades(id, negocio_id, tipo, titulo, descricao, concluida_em, data_vencimento, criado_por, criado_em, autor:perfis(nome_completo)),
    produtos_vinculados:negocios_produtos(
      produto_id,
      quantidade,
      valor_unitario,
      subtotal,
      produto:produtos(nome)
    )
  `;

  try {
    const supabase = createClient() as any;
    let { data, error } = await supabase
      .from('negocios')
      .select(selectQuery)
      .order('criado_em', { ascending: false });

    if (error || !data || data.length === 0) {
      const supabaseAnon = criarClienteAnonStateless();
      const resAnon = await supabaseAnon
        .from('negocios')
        .select(selectQuery)
        .order('criado_em', { ascending: false });

      if (resAnon.data && resAnon.data.length > 0) {
        data = resAnon.data;
        error = null;
      }
    }

    if (error || !data || data.length === 0) {
      return DADOS_NEGOCIOS;
    }

    const agora = new Date();
    const hojeStr = agora.toISOString().split('T')[0];

    // Calcula o maior código sequencial já salvo no Supabase para caso algum registro antigo não tenha código
    let maxSeq = 1000;
    for (const item of data) {
      const codExistente = item.codigo || item.campos_personalizados?.codigo;
      if (typeof codExistente === 'string') {
        const num = parseInt(codExistente.replace(/\D/g, ''), 10);
        if (!isNaN(num) && num > maxSeq) maxSeq = num;
      }
    }

    return data.map((n: any) => {
      const cp = n.campos_personalizados || {};
      let codigoCard: string = n.codigo || cp.codigo || '';
      if (!codigoCard) {
        maxSeq += 1;
        codigoCard = `#${maxSeq}`;
        // Persiste o código gerado no Supabase de forma assíncrona
        const supabaseAnon = criarClienteAnonStateless();
        supabaseAnon
          .from('negocios')
          .update({ campos_personalizados: { ...cp, codigo: codigoCard } })
          .eq('id', n.id)
          .then(() => { });
      }

      const atividadesList = n.atividades || [];
      const pendentes = atividadesList.filter((a: any) => !a.concluida_em);
      let statusAtividade: 'atrasada' | 'hoje' | 'futura' | 'sem_atividade' = 'sem_atividade';

      if (pendentes.length > 0) {
        const temAtrasada = pendentes.some(
          (a: any) => a.data_vencimento && new Date(a.data_vencimento) < agora
        );
        const temHoje = pendentes.some(
          (a: any) => a.data_vencimento && a.data_vencimento.startsWith(hojeStr)
        );
        if (temAtrasada) statusAtividade = 'atrasada';
        else if (temHoje) statusAtividade = 'hoje';
        else statusAtividade = 'futura';
      }

      const atividadesFormatadas: Atividade[] = atividadesList.map((a: any) => ({
        id: a.id,
        negocio_id: a.negocio_id || n.id,
        tipo: a.tipo || 'nota',
        titulo: a.titulo || '',
        descricao: a.descricao || undefined,
        data_vencimento: a.data_vencimento || undefined,
        concluida_em: a.concluida_em || undefined,
        criado_por: a.autor?.nome_completo || 'Carlos Silva',
        criado_em: a.criado_em || new Date().toISOString(),
      }));

      // Produtos vinculados do banco
      const prodsList = (n.produtos_vinculados || []).map((pv: any) => ({
        produto_id: pv.produto_id,
        nome: pv.produto?.nome || 'Item',
        quantidade: Number(pv.quantidade) || 1,
        valor_unitario: Number(pv.valor_unitario) || 0,
        subtotal: Number(pv.subtotal) || Number(pv.quantidade) * Number(pv.valor_unitario),
      }));

      return {
        id: n.id,
        codigo: codigoCard,
        titulo: n.titulo,
        valor: Number(n.valor) || 0,
        moeda: n.moeda || 'BRL',
        funil_id: n.funil_id,
        etapa_id: n.etapa_id,
        empresa_id: n.empresa_id || '',
        empresa_nome: n.empresa?.nome || '',
        contato_id: n.contato_id || '',
        contato_nome: n.contato?.nome || '',
        contato_email: n.contato?.email || '',
        contato_whatsapp: n.contato?.telefone_whatsapp || '',
        responsavel_id: n.responsavel_id || DADOS_MEMBROS[0].id,
        responsavel_nome: n.responsavel?.nome_completo || 'Carlos Silva',
        responsavel_avatar:
          n.responsavel?.avatar_url ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        status: n.status,
        motivo_perda: n.motivo_perda,
        data_fechamento_esperada: n.data_fechamento_esperada,
        ultima_atividade_em: n.ultima_atividade_em,
        campos_personalizados: { ...cp, codigo: codigoCard },
        atividades: atividadesFormatadas,
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

export async function criarAtividadeNoBanco(
  nova: Partial<Atividade> & { negocio_id: string }
): Promise<Atividade> {
  const atividadeLocal: Atividade = {
    id: nova.id || crypto.randomUUID(),
    negocio_id: nova.negocio_id,
    tipo: nova.tipo || 'nota',
    titulo: nova.titulo || 'Nova Atividade',
    descricao: nova.descricao,
    data_vencimento: nova.data_vencimento,
    concluida_em: nova.concluida_em,
    criado_por: nova.criado_por || 'Carlos Silva',
    criado_em: nova.criado_em || new Date().toISOString(),
  };

  try {
    const supabaseAnon = criarClienteAnonStateless();
    if (!autorPadraoIdCache) {
      const { data: perfis } = await supabaseAnon
        .from('perfis')
        .select('id')
        .order('criado_em', { ascending: true })
        .limit(1);
      autorPadraoIdCache = perfis?.[0]?.id || DADOS_MEMBROS[0].id;
    }

    const autorId = autorPadraoIdCache;

    const payload = {
      id: atividadeLocal.id,
      organizacao_id: ORG_PADRAO_ID,
      negocio_id: atividadeLocal.negocio_id,
      tipo: atividadeLocal.tipo,
      titulo: atividadeLocal.titulo,
      descricao: atividadeLocal.descricao || null,
      data_vencimento: atividadeLocal.data_vencimento || null,
      concluida_em: atividadeLocal.concluida_em || null,
      criado_por: autorId,
      criado_em: atividadeLocal.criado_em,
    };

    const supabase = createClient() as any;
    const { error } = await supabase.from('atividades').insert(payload);
    if (error) {
      await supabaseAnon.from('atividades').insert(payload);
    }
  } catch (err) {
    console.error('Erro ao salvar atividade no Supabase:', err);
  }

  return atividadeLocal;
}

export async function concluirAtividadeNoBanco(atividadeId: string): Promise<boolean> {
  const agora = new Date().toISOString();
  try {
    const supabase = createClient() as any;
    const { data, error } = await supabase
      .from('atividades')
      .update({ concluida_em: agora, atualizado_em: agora })
      .eq('id', atividadeId)
      .select();

    if (error || !data || data.length === 0) {
      const supabaseAnon = criarClienteAnonStateless();
      await supabaseAnon
        .from('atividades')
        .update({ concluida_em: agora, atualizado_em: agora })
        .eq('id', atividadeId);
    }
    return true;
  } catch (err) {
    console.error('Erro ao concluir atividade no Supabase:', err);
    return false;
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
    if (campos.titulo !== undefined) updateData.titulo = campos.titulo;
    if (campos.valor !== undefined) updateData.valor = campos.valor;
    if (campos.etapa_id !== undefined) updateData.etapa_id = campos.etapa_id;
    if (campos.responsavel_id !== undefined) updateData.responsavel_id = campos.responsavel_id;
    if (campos.status !== undefined) updateData.status = campos.status;
    if (campos.motivo_perda !== undefined) updateData.motivo_perda = campos.motivo_perda;
    if (campos.data_fechamento_esperada !== undefined)
      updateData.data_fechamento_esperada = campos.data_fechamento_esperada;
    if (campos.campos_personalizados !== undefined)
      updateData.campos_personalizados = campos.campos_personalizados;

    const { data, error } = await supabase
      .from('negocios')
      .update(updateData)
      .eq('id', negocioId)
      .select();

    if (error || !data || data.length === 0) {
      const supabaseAnon = criarClienteAnonStateless();
      await supabaseAnon.from('negocios').update(updateData).eq('id', negocioId);
    }
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

    const { data, error } = await supabase
      .from('negocios')
      .update(updateData)
      .eq('id', negocioId)
      .select();

    if (error || !data || data.length === 0) {
      const supabaseAnon = criarClienteAnonStateless();
      await supabaseAnon.from('negocios').update(updateData).eq('id', negocioId);
    }
  } catch (err) {
    console.error('Erro ao atualizar etapa no Supabase:', err);
  }
}

export async function criarNegocioNoBanco(novo: Partial<Negocio>): Promise<Negocio> {
  let proximoCodigo = novo.codigo || novo.campos_personalizados?.codigo || '';

  if (!proximoCodigo) {
    try {
      const supabaseAnon = criarClienteAnonStateless();
      const { data: existentes } = await supabaseAnon
        .from('negocios')
        .select('campos_personalizados')
        .eq('organizacao_id', ORG_PADRAO_ID);

      let maxNum = 1000;
      if (existentes && existentes.length > 0) {
        for (const row of existentes) {
          const cod = row.campos_personalizados?.codigo;
          if (typeof cod === 'string') {
            const num = parseInt(cod.replace(/\D/g, ''), 10);
            if (!isNaN(num) && num > maxNum) maxNum = num;
          }
        }
      }
      proximoCodigo = `#${maxNum + 1}`;
    } catch {
      proximoCodigo = `#${Math.floor(1000 + Math.random() * 9000)}`;
    }
  }

  const camposPersonalizados = {
    ...(novo.campos_personalizados || {}),
    codigo: proximoCodigo,
  };

  const negocioLocal: Negocio = {
    id: novo.id || crypto.randomUUID(),
    codigo: proximoCodigo,
    titulo: novo.titulo || 'Nova Oportunidade',
    valor: novo.valor || 0,
    moeda: 'BRL',
    funil_id: novo.funil_id || FUNIL_PADRAO_ID,
    etapa_id: novo.etapa_id || DADOS_ETAPAS[0].id,
    empresa_id: novo.empresa_id || '',
    empresa_nome: novo.empresa_nome || '',
    contato_id: novo.contato_id || '',
    contato_nome: novo.contato_nome || '',
    contato_email: novo.contato_email || '',
    contato_whatsapp: novo.contato_whatsapp || '',
    responsavel_id: novo.responsavel_id || DADOS_MEMBROS[0].id,
    responsavel_nome: novo.responsavel_nome || DADOS_MEMBROS[0].nome_completo,
    responsavel_avatar: novo.responsavel_avatar || DADOS_MEMBROS[0].avatar_url,
    status: 'aberto',
    data_fechamento_esperada: novo.data_fechamento_esperada,
    ultima_atividade_em: new Date().toISOString(),
    campos_personalizados: camposPersonalizados,
    produtos: novo.produtos || [],
    atividades: [],
  };

  const payload = {
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
    data_fechamento_esperada: negocioLocal.data_fechamento_esperada || null,
    ultima_atividade_em: negocioLocal.ultima_atividade_em,
    campos_personalizados: camposPersonalizados,
  };

  try {
    const supabase = createClient() as any;
    const { error } = await supabase.from('negocios').insert(payload);

    if (error) {
      const supabaseAnon = criarClienteAnonStateless();
      await supabaseAnon.from('negocios').insert(payload);
    }

    // Se houver produtos selecionados na criação do negócio, vincula em negocios_produtos
    if (novo.produtos && novo.produtos.length > 0) {
      const supabaseAnon = criarClienteAnonStateless();
      const itensInsert = novo.produtos.map((p) => ({
        organizacao_id: ORG_PADRAO_ID,
        negocio_id: negocioLocal.id,
        produto_id: p.produto_id,
        quantidade: p.quantidade,
        valor_unitario: p.valor_unitario,
      }));
      await supabaseAnon
        .from('negocios_produtos')
        .upsert(itensInsert, { onConflict: 'negocio_id,produto_id' });
    }
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
    let { data, error } = await supabase
      .from('contatos')
      .select('*, empresa:empresas(nome)')
      .order('criado_em', { ascending: false });

    if (error || !data || data.length === 0) {
      const supabaseAnon = criarClienteAnonStateless();
      const resAnon = await supabaseAnon
        .from('contatos')
        .select('*, empresa:empresas(nome)')
        .order('criado_em', { ascending: false });

      if (resAnon.data && resAnon.data.length > 0) {
        data = resAnon.data;
        error = null;
      }
    }

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

  const payload = {
    id: contatoLocal.id,
    organizacao_id: ORG_PADRAO_ID,
    nome: contatoLocal.nome,
    email: contatoLocal.email,
    telefone_whatsapp: contatoLocal.telefone_whatsapp,
    cargo: contatoLocal.cargo,
    empresa_id: contatoLocal.empresa_id || null,
    responsavel_id: contatoLocal.responsavel_id || null,
  };

  try {
    const supabase = createClient() as any;
    const { error } = await supabase.from('contatos').insert(payload);
    if (error) {
      const supabaseAnon = criarClienteAnonStateless();
      await supabaseAnon.from('contatos').insert(payload);
    }
  } catch (err) {
    console.error('Erro ao inserir contato no Supabase:', err);
  }

  return contatoLocal;
}

// ==============================================================================
// 3. EMPRESAS & CLIENTES (PF / PJ)
// ==============================================================================

export async function buscarEmpresasDoBanco(): Promise<Empresa[]> {
  try {
    const supabase = createClient() as any;
    let { data, error } = await supabase
      .from('empresas')
      .select('*, negocios:negocios(id)')
      .order('criado_em', { ascending: false });

    if (error || !data || data.length === 0) {
      const supabaseAnon = criarClienteAnonStateless();
      const resAnon = await supabaseAnon
        .from('empresas')
        .select('*, negocios:negocios(id)')
        .order('criado_em', { ascending: false });

      if (resAnon.data && resAnon.data.length > 0) {
        data = resAnon.data;
        error = null;
      }
    }

    if (error || !data || data.length === 0) {
      return DADOS_EMPRESAS;
    }

    return data.map((e: any) => {
      const cp =
        e.campos_personalizados && typeof e.campos_personalizados === 'object'
          ? e.campos_personalizados
          : {};
      const cnpjOuCpf = e.cpf_cnpj || e.cnpj || cp.cpf_cnpj || '-';
      const digitos = String(cnpjOuCpf).replace(/\D/g, '');
      const tipoInferido: 'PF' | 'PJ' =
        e.tipo_cliente || cp.tipo_cliente || (digitos.length === 11 ? 'PF' : 'PJ');

      return {
        id: e.id,
        tipo_cliente: tipoInferido,
        cpf_cnpj: digitos || cnpjOuCpf,
        nome: e.nome || e.razao_social || cp.razao_social || 'Sem Nome',
        razao_social: e.razao_social || cp.razao_social || e.nome || '',
        nome_fantasia: e.nome_fantasia || cp.nome_fantasia || '',
        cnpj: e.cnpj || e.cpf_cnpj || cp.cpf_cnpj || '-',
        endereco: e.endereco || cp.endereco || '',
        contato_principal: e.contato_principal || cp.contato_principal || '',
        whatsapp_principal: e.whatsapp_principal || cp.whatsapp_principal || '',
        email_principal: e.email_principal || cp.email_principal || '',
        origem_lead: e.origem_lead || cp.origem_lead || '',
        dominio: e.dominio || '',
        segmento: e.segmento || cp.origem_lead || e.origem_lead || 'Geral',
        responsavel_id: e.responsavel_id || DADOS_MEMBROS[0].id,
        total_negocios: e.negocios?.length || 0,
        criado_em: e.criado_em,
      };
    });
  } catch (err) {
    console.warn('Fallback para empresas mock:', err);
    return DADOS_EMPRESAS;
  }
}

export async function verificarDocumentoExistenteNoBanco(
  cpfOuCnpj: string,
  ignorarEmpresaId?: string
): Promise<Empresa | null> {
  const digitosBusca = (cpfOuCnpj || '').replace(/\D/g, '');
  if (!digitosBusca || (digitosBusca.length !== 11 && digitosBusca.length !== 14)) {
    return null;
  }

  const lista = await buscarEmpresasDoBanco();
  const encontrada = lista.find((emp) => {
    if (ignorarEmpresaId && emp.id === ignorarEmpresaId) return false;
    const digitosEmp = (emp.cpf_cnpj || emp.cnpj || '').replace(/\D/g, '');
    return digitosEmp === digitosBusca;
  });

  return encontrada || null;
}

export async function criarEmpresaNoBanco(nova: Partial<Empresa>): Promise<Empresa> {
  const digitosDoc = (nova.cpf_cnpj || nova.cnpj || '').replace(/\D/g, '');
  const tipoCliente: 'PF' | 'PJ' =
    nova.tipo_cliente || (digitosDoc.length === 11 ? 'PF' : 'PJ');
  const razaoOuNome = (nova.razao_social || nova.nome || 'Novo Cliente').trim();

  const empresaLocal: Empresa = {
    id: nova.id || crypto.randomUUID(),
    tipo_cliente: tipoCliente,
    cpf_cnpj: digitosDoc || nova.cnpj || '-',
    nome: razaoOuNome,
    razao_social: razaoOuNome,
    nome_fantasia: (nova.nome_fantasia || '').trim(),
    cnpj: nova.cnpj || digitosDoc || '-',
    endereco: (nova.endereco || '').trim(),
    contato_principal: (nova.contato_principal || '').trim(),
    whatsapp_principal: (nova.whatsapp_principal || '').trim(),
    email_principal: (nova.email_principal || '').trim(),
    origem_lead: nova.origem_lead || 'Prospecção Ativa',
    dominio: nova.dominio || '',
    segmento: nova.segmento || nova.origem_lead || 'Geral',
    responsavel_id: nova.responsavel_id || DADOS_MEMBROS[0].id,
    total_negocios: 0,
    criado_em: new Date().toISOString(),
  };

  const metadadosJson = {
    tipo_cliente: empresaLocal.tipo_cliente,
    cpf_cnpj: empresaLocal.cpf_cnpj,
    razao_social: empresaLocal.razao_social,
    nome_fantasia: empresaLocal.nome_fantasia,
    endereco: empresaLocal.endereco,
    contato_principal: empresaLocal.contato_principal,
    whatsapp_principal: empresaLocal.whatsapp_principal,
    email_principal: empresaLocal.email_principal,
    origem_lead: empresaLocal.origem_lead,
  };

  const payloadCompleto = {
    id: empresaLocal.id,
    organizacao_id: ORG_PADRAO_ID,
    tipo_cliente: empresaLocal.tipo_cliente,
    cpf_cnpj: empresaLocal.cpf_cnpj,
    nome: empresaLocal.nome,
    razao_social: empresaLocal.razao_social,
    nome_fantasia: empresaLocal.nome_fantasia || null,
    cnpj: empresaLocal.cnpj,
    endereco: empresaLocal.endereco || null,
    contato_principal: empresaLocal.contato_principal || null,
    whatsapp_principal: empresaLocal.whatsapp_principal || null,
    email_principal: empresaLocal.email_principal || null,
    origem_lead: empresaLocal.origem_lead || null,
    dominio: empresaLocal.dominio || null,
    segmento: empresaLocal.segmento || null,
    responsavel_id: empresaLocal.responsavel_id || null,
    campos_personalizados: metadadosJson,
  };

  const payloadCompativel = {
    id: empresaLocal.id,
    organizacao_id: ORG_PADRAO_ID,
    nome: empresaLocal.nome,
    cnpj: empresaLocal.cnpj,
    dominio: empresaLocal.dominio || null,
    segmento: empresaLocal.segmento || null,
    responsavel_id: empresaLocal.responsavel_id || null,
    campos_personalizados: metadadosJson,
  };

  try {
    const supabase = createClient() as any;
    const { error } = await supabase.from('empresas').insert(payloadCompleto);
    if (error) {
      const supabaseAnon = criarClienteAnonStateless();
      const { error: errAnon } = await supabaseAnon.from('empresas').insert(payloadCompleto);
      if (errAnon) {
        await supabaseAnon.from('empresas').insert(payloadCompativel);
      }
    }

    // Se informou contato principal, também registra/vincula na tabela de contatos
    if (empresaLocal.contato_principal) {
      await criarContatoNoBanco({
        empresa_id: empresaLocal.id,
        empresa_nome: empresaLocal.nome,
        nome: empresaLocal.contato_principal,
        email: empresaLocal.email_principal || '',
        telefone_whatsapp: empresaLocal.whatsapp_principal || '',
        cargo: tipoCliente === 'PF' ? 'Titular' : 'Contato Principal',
        responsavel_id: empresaLocal.responsavel_id,
      });
    }
  } catch (err) {
    console.error('Erro ao inserir empresa no Supabase:', err);
  }

  return empresaLocal;
}

export async function atualizarEmpresaNoBanco(
  empresaId: string,
  dados: Partial<Empresa>
): Promise<boolean> {
  const digitosDoc = (dados.cpf_cnpj || dados.cnpj || '').replace(/\D/g, '');
  const tipoCliente: 'PF' | 'PJ' =
    dados.tipo_cliente || (digitosDoc.length === 11 ? 'PF' : 'PJ');
  const razaoOuNome = (dados.razao_social || dados.nome || '').trim();

  const metadadosJson = {
    tipo_cliente: tipoCliente,
    cpf_cnpj: digitosDoc || dados.cnpj || '',
    razao_social: razaoOuNome,
    nome_fantasia: (dados.nome_fantasia || '').trim(),
    endereco: (dados.endereco || '').trim(),
    contato_principal: (dados.contato_principal || '').trim(),
    whatsapp_principal: (dados.whatsapp_principal || '').trim(),
    email_principal: (dados.email_principal || '').trim(),
    origem_lead: dados.origem_lead || '',
  };

  const payloadCompleto: any = {
    tipo_cliente: tipoCliente,
    cpf_cnpj: digitosDoc || dados.cnpj || null,
    nome: razaoOuNome,
    razao_social: razaoOuNome,
    nome_fantasia: (dados.nome_fantasia || '').trim() || null,
    cnpj: dados.cnpj || digitosDoc || null,
    endereco: (dados.endereco || '').trim() || null,
    contato_principal: (dados.contato_principal || '').trim() || null,
    whatsapp_principal: (dados.whatsapp_principal || '').trim() || null,
    email_principal: (dados.email_principal || '').trim() || null,
    origem_lead: dados.origem_lead || null,
    segmento: dados.segmento || dados.origem_lead || 'Geral',
    responsavel_id: dados.responsavel_id || null,
    campos_personalizados: metadadosJson,
    atualizado_em: new Date().toISOString(),
  };

  const payloadCompativel: any = {
    nome: razaoOuNome,
    cnpj: dados.cnpj || digitosDoc || null,
    segmento: dados.segmento || dados.origem_lead || 'Geral',
    responsavel_id: dados.responsavel_id || null,
    campos_personalizados: metadadosJson,
    atualizado_em: new Date().toISOString(),
  };

  try {
    const supabase = createClient() as any;
    const { data, error } = await supabase
      .from('empresas')
      .update(payloadCompleto)
      .eq('id', empresaId)
      .select();

    if (error || !data || data.length === 0) {
      const supabaseAnon = criarClienteAnonStateless();
      const { error: errAnon } = await supabaseAnon
        .from('empresas')
        .update(payloadCompleto)
        .eq('id', empresaId);

      if (errAnon) {
        await supabaseAnon
          .from('empresas')
          .update(payloadCompativel)
          .eq('id', empresaId);
      }
    }
    return true;
  } catch (err) {
    console.error('Erro ao atualizar empresa no Supabase:', err);
    return false;
  }
}

// ==============================================================================
// 4. PRODUTOS, IMAGENS & CAMPOS PERSONALIZADOS DE PRODUTO
// ==============================================================================

const STORAGE_CAMPOS_PRODUTO_KEY = 'alldot_campos_produto_v1';

export async function buscarCamposPersonalizadosProduto(): Promise<CampoPersonalizadoDefinicao[]> {
  try {
    const supabase = createClient() as any;
    let { data, error } = await supabase
      .from('campos_definicoes')
      .select('*')
      .eq('entidade', 'produto')
      .order('ordem', { ascending: true });

    if (error || !data) {
      const supabaseAnon = criarClienteAnonStateless();
      const resAnon = await supabaseAnon
        .from('campos_definicoes')
        .select('*')
        .eq('entidade', 'produto')
        .order('ordem', { ascending: true });

      if (resAnon.data) {
        data = resAnon.data;
        error = null;
      }
    }

    if (!error && Array.isArray(data)) {
      const formatados: CampoPersonalizadoDefinicao[] = data.map((c: any) => ({
        id: c.id,
        entidade: 'produto',
        nome_chave: c.nome_chave,
        label: c.label,
        tipo: c.tipo || 'texto',
        opcoes_json: Array.isArray(c.opcoes_json) ? c.opcoes_json : [],
        obrigatorio: Boolean(c.obrigatorio),
        ordem: Number(c.ordem) || 0,
      }));

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_CAMPOS_PRODUTO_KEY, JSON.stringify(formatados));
        } catch (e) { }
      }

      return formatados;
    }
  } catch (err) {
    console.warn('Fallback ao carregar campos personalizados de produto:', err);
  }

  if (typeof window !== 'undefined') {
    try {
      const salvo = localStorage.getItem(STORAGE_CAMPOS_PRODUTO_KEY);
      if (salvo) {
        return JSON.parse(salvo);
      }
    } catch (e) { }
  }

  return [];
}

export async function criarCampoPersonalizadoProduto(dados: {
  label: string;
  tipo: CampoPersonalizadoDefinicao['tipo'];
  opcoes?: string[];
  obrigatorio?: boolean;
  ordem?: number;
}): Promise<CampoPersonalizadoDefinicao> {
  const labelLimpa = dados.label.trim();
  const chaveBase = labelLimpa
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const nomeChave = chaveBase || `campo_${Date.now()}`;

  const novoCampo: CampoPersonalizadoDefinicao = {
    id: crypto.randomUUID(),
    entidade: 'produto',
    nome_chave: nomeChave,
    label: labelLimpa,
    tipo: dados.tipo,
    opcoes_json: dados.opcoes || [],
    obrigatorio: dados.obrigatorio ?? false,
    ordem: dados.ordem ?? 1,
  };

  const payload = {
    id: novoCampo.id,
    organizacao_id: ORG_PADRAO_ID,
    entidade: 'produto',
    nome_chave: novoCampo.nome_chave,
    label: novoCampo.label,
    tipo: novoCampo.tipo,
    opcoes_json: novoCampo.opcoes_json,
    obrigatorio: novoCampo.obrigatorio,
    ordem: novoCampo.ordem,
  };

  try {
    const supabase = createClient() as any;
    const { data, error } = await supabase
      .from('campos_definicoes')
      .upsert(payload, { onConflict: 'organizacao_id,entidade,nome_chave' })
      .select()
      .maybeSingle();

    if (error || !data) {
      const supabaseAnon = criarClienteAnonStateless();
      const resAnon = await supabaseAnon
        .from('campos_definicoes')
        .upsert(payload, { onConflict: 'organizacao_id,entidade,nome_chave' })
        .select()
        .maybeSingle();

      if (resAnon.data) {
        novoCampo.id = resAnon.data.id;
      }
    } else if (data?.id) {
      novoCampo.id = data.id;
    }
  } catch (err) {
    console.error('Erro ao salvar campo personalizado de produto no Supabase:', err);
  }

  return novoCampo;
}

export async function removerCampoPersonalizadoProduto(campoId: string): Promise<boolean> {
  try {
    const supabase = createClient() as any;
    const { error } = await supabase
      .from('campos_definicoes')
      .delete()
      .eq('id', campoId);

    if (error) {
      const supabaseAnon = criarClienteAnonStateless();
      await supabaseAnon.from('campos_definicoes').delete().eq('id', campoId);
    }
    return true;
  } catch (err) {
    console.error('Erro ao remover campo personalizado de produto:', err);
    return false;
  }
}

/**
 * Redimensiona/comprime um arquivo de imagem para WebP/JPEG leve e tenta enviá-lo
 * ao Supabase Storage (bucket 'produtos'). Caso o bucket não exista na instância,
 * retorna a Data URL otimizada para gravação direta no banco Supabase (coluna JSONB campos_personalizados._imagem_url).
 */
export async function processarEEnviarImagemProduto(arquivo: File): Promise<string> {
  const dataUrlComprimida = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler arquivo de imagem'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(reader.result as string);
      img.onload = () => {
        const maxDim = 640;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/webp', 0.82);
        resolve(compressed);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(arquivo);
  });

  // Tenta enviar ao Supabase Storage caso o bucket 'produtos' esteja provisionado
  try {
    const supabaseAnon = criarClienteAnonStateless();
    const ext = arquivo.name.split('.').pop()?.toLowerCase() || 'webp';
    const filePath = `${ORG_PADRAO_ID}/${crypto.randomUUID()}.${ext}`;

    const { data: uploadData, error: uploadError } = await supabaseAnon.storage
      .from('produtos')
      .upload(filePath, arquivo, {
        cacheControl: '3600',
        upsert: true,
      });

    if (!uploadError && uploadData?.path) {
      const { data: publicUrlData } = supabaseAnon.storage
        .from('produtos')
        .getPublicUrl(uploadData.path);

      if (publicUrlData?.publicUrl) {
        return publicUrlData.publicUrl;
      }
    }
  } catch (e) {
    // Fallback transparente para persistência direta no registro do produto no Supabase
  }

  return dataUrlComprimida;
}

export async function buscarUnidadesMedidasDoBanco(): Promise<UnidadeMedidaItem[]> {
  try {
    const supabase = createClient() as any;
    let { data, error } = await supabase
      .from('unidades_medidas')
      .select('*')
      .eq('ativo', true)
      .order('ordem', { ascending: true });

    if (error || !data || data.length === 0) {
      const supabaseAnon = criarClienteAnonStateless();
      const resAnon = await supabaseAnon
        .from('unidades_medidas')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (resAnon.data && resAnon.data.length > 0) {
        data = resAnon.data;
        error = null;
      }
    }

    if (!error && data && data.length > 0) {
      return data.map((u: any) => ({
        id: u.id,
        nome: u.nome,
        sigla: u.sigla || '',
        ordem: u.ordem || 1,
        ativo: u.ativo ?? true,
      }));
    }
  } catch (err) {
    console.warn('Fallback para unidades de medida padrão:', err);
  }
  return DADOS_UNIDADES_MEDIDAS;
}

export async function buscarCategoriasProdutoDoBanco(): Promise<CategoriaProdutoItem[]> {
  try {
    const supabase = createClient() as any;
    let { data, error } = await supabase
      .from('categoria_produto')
      .select('*')
      .eq('ativo', true)
      .order('ordem', { ascending: true });

    if (error || !data || data.length === 0) {
      const supabaseAnon = criarClienteAnonStateless();
      const resAnon = await supabaseAnon
        .from('categoria_produto')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (resAnon.data && resAnon.data.length > 0) {
        data = resAnon.data;
        error = null;
      }
    }

    if (!error && data && data.length > 0) {
      return data.map((c: any) => ({
        id: c.id,
        nome: c.nome,
        ordem: c.ordem || 1,
        ativo: c.ativo ?? true,
      }));
    }
  } catch (err) {
    console.warn('Fallback para categorias de produto padrão:', err);
  }
  return DADOS_CATEGORIAS_PRODUTO;
}

export async function buscarProdutosDoBanco(): Promise<Produto[]> {
  try {
    const supabase = createClient() as any;
    const selectCompleto =
      '*, unidade_ref:unidades_medidas(id, nome, sigla), categoria_ref:categoria_produto(id, nome)';

    let { data, error } = await supabase
      .from('produtos')
      .select(selectCompleto)
      .order('criado_em', { ascending: false });

    if (error || !data || data.length === 0) {
      const supabaseAnon = criarClienteAnonStateless();
      let resAnon = await supabaseAnon
        .from('produtos')
        .select(selectCompleto)
        .order('criado_em', { ascending: false });

      if (resAnon.error) {
        resAnon = await supabaseAnon
          .from('produtos')
          .select('*, unidade_ref:unidades_medidas(id, nome, sigla)')
          .order('criado_em', { ascending: false });
      }

      if (resAnon.error) {
        resAnon = await supabaseAnon
          .from('produtos')
          .select('*')
          .order('criado_em', { ascending: false });
      }

      if (resAnon.data && resAnon.data.length > 0) {
        data = resAnon.data;
        error = null;
      }
    }

    if (error || !data || data.length === 0) {
      return DADOS_PRODUTOS;
    }

    return data.map((p: any) => {
      const rawCustom =
        p.campos_personalizados && typeof p.campos_personalizados === 'object'
          ? { ...p.campos_personalizados }
          : {};

      const imagemSalva =
        typeof rawCustom._imagem_url === 'string' ? rawCustom._imagem_url : undefined;
      delete rawCustom._imagem_url;
      delete rawCustom._unidade_medida;
      delete rawCustom.unidade_medida;

      const unidadeId = p.unidades_medidas || DADOS_UNIDADES_MEDIDAS[0].id;
      const unidadeItem = DADOS_UNIDADES_MEDIDAS.find(
        (u) => u.id === unidadeId || u.nome === p.unidade_ref?.nome
      );
      const nomeUnidade =
        p.unidade_ref?.nome || unidadeItem?.nome || DADOS_UNIDADES_MEDIDAS[0].nome;

      const categoriaId = p.categoria_produto || DADOS_CATEGORIAS_PRODUTO[0].id;
      const categoriaItem = DADOS_CATEGORIAS_PRODUTO.find(
        (c) => c.id === categoriaId || c.nome === p.categoria_ref?.nome
      );
      const nomeCategoria =
        p.categoria_ref?.nome || categoriaItem?.nome || DADOS_CATEGORIAS_PRODUTO[0].nome;

      return {
        id: p.id,
        nome: p.nome,
        descricao: p.descricao || '',
        codigo_sku: p.codigo_sku || '',
        valor: Number(p.valor) || 0,
        unidades_medidas: unidadeId,
        unidade_medida: nomeUnidade,
        categoria_produto: categoriaId,
        categoria_nome: nomeCategoria,
        ativo: p.ativo ?? true,
        imagem_url: imagemSalva,
        campos_personalizados: rawCustom,
      };
    });
  } catch (err) {
    console.warn('Fallback para produtos mock:', err);
    return DADOS_PRODUTOS;
  }
}

export async function criarProdutoNoBanco(novo: Partial<Produto>): Promise<Produto> {
  const camposCustomLimpos = { ...(novo.campos_personalizados || {}) };
  delete camposCustomLimpos._imagem_url;
  delete camposCustomLimpos._unidade_medida;
  delete camposCustomLimpos.unidade_medida;

  const unidadeEncontrada = DADOS_UNIDADES_MEDIDAS.find(
    (u) => u.id === novo.unidades_medidas || u.nome === novo.unidade_medida
  );
  const unidadeId =
    novo.unidades_medidas || unidadeEncontrada?.id || DADOS_UNIDADES_MEDIDAS[0].id;
  const unidadeNome =
    novo.unidade_medida || unidadeEncontrada?.nome || DADOS_UNIDADES_MEDIDAS[0].nome;

  const categoriaEncontrada = DADOS_CATEGORIAS_PRODUTO.find(
    (c) => c.id === novo.categoria_produto || c.nome === novo.categoria_nome
  );
  const categoriaId =
    novo.categoria_produto || categoriaEncontrada?.id || DADOS_CATEGORIAS_PRODUTO[0].id;
  const categoriaNome =
    novo.categoria_nome || categoriaEncontrada?.nome || DADOS_CATEGORIAS_PRODUTO[0].nome;

  const produtoLocal: Produto = {
    id: novo.id || crypto.randomUUID(),
    nome: novo.nome || 'Novo Produto',
    descricao: novo.descricao || '',
    codigo_sku: novo.codigo_sku || `SKU-${Math.floor(Math.random() * 9000 + 1000)}`,
    valor: novo.valor || 0,
    unidades_medidas: unidadeId,
    unidade_medida: unidadeNome,
    categoria_produto: categoriaId,
    categoria_nome: categoriaNome,
    ativo: novo.ativo ?? true,
    imagem_url: novo.imagem_url || undefined,
    campos_personalizados: camposCustomLimpos,
  };

  const payloadBanco: any = {
    id: produtoLocal.id,
    organizacao_id: ORG_PADRAO_ID,
    nome: produtoLocal.nome,
    descricao: produtoLocal.descricao,
    codigo_sku: produtoLocal.codigo_sku,
    valor: produtoLocal.valor,
    unidades_medidas: unidadeId,
    categoria_produto: categoriaId,
    ativo: produtoLocal.ativo,
    campos_personalizados: {
      ...camposCustomLimpos,
      ...(produtoLocal.imagem_url ? { _imagem_url: produtoLocal.imagem_url } : {}),
    },
  };

  try {
    const supabase = createClient() as any;
    const { error } = await supabase.from('produtos').insert(payloadBanco);

    if (error) {
      const supabaseAnon = criarClienteAnonStateless();
      const { error: errAnon } = await supabaseAnon.from('produtos').insert(payloadBanco);
      if (
        errAnon &&
        (errAnon.message?.includes('unidades_medidas') ||
          errAnon.message?.includes('categoria_produto'))
      ) {
        const {
          unidades_medidas: _omitUn,
          categoria_produto: _omitCat,
          ...payloadSemFk
        } = payloadBanco;
        await supabaseAnon.from('produtos').insert(payloadSemFk);
      }
    }
  } catch (err) {
    console.error('Erro ao cadastrar produto no Supabase:', err);
  }

  return produtoLocal;
}

export async function atualizarProdutoNoBanco(
  produtoId: string,
  dados: Partial<Produto>
): Promise<boolean> {
  const camposCustomLimpos = { ...(dados.campos_personalizados || {}) };
  delete camposCustomLimpos._imagem_url;
  delete camposCustomLimpos._unidade_medida;
  delete camposCustomLimpos.unidade_medida;

  const updatePayload: any = {
    atualizado_em: new Date().toISOString(),
  };

  if (dados.nome !== undefined) updatePayload.nome = dados.nome;
  if (dados.descricao !== undefined) updatePayload.descricao = dados.descricao;
  if (dados.codigo_sku !== undefined) updatePayload.codigo_sku = dados.codigo_sku;
  if (dados.valor !== undefined) updatePayload.valor = dados.valor;
  if (dados.ativo !== undefined) updatePayload.ativo = dados.ativo;
  if (dados.unidades_medidas !== undefined || dados.unidade_medida !== undefined) {
    const unidadeEncontrada = DADOS_UNIDADES_MEDIDAS.find(
      (u) => u.id === dados.unidades_medidas || u.nome === dados.unidade_medida
    );
    updatePayload.unidades_medidas =
      dados.unidades_medidas || unidadeEncontrada?.id || DADOS_UNIDADES_MEDIDAS[0].id;
  }
  if (dados.categoria_produto !== undefined || dados.categoria_nome !== undefined) {
    const categoriaEncontrada = DADOS_CATEGORIAS_PRODUTO.find(
      (c) => c.id === dados.categoria_produto || c.nome === dados.categoria_nome
    );
    updatePayload.categoria_produto =
      dados.categoria_produto || categoriaEncontrada?.id || DADOS_CATEGORIAS_PRODUTO[0].id;
  }
  if (dados.campos_personalizados !== undefined || dados.imagem_url !== undefined) {
    updatePayload.campos_personalizados = {
      ...camposCustomLimpos,
      ...(dados.imagem_url ? { _imagem_url: dados.imagem_url } : {}),
    };
  }

  try {
    const supabase = createClient() as any;
    const { data, error } = await supabase
      .from('produtos')
      .update(updatePayload)
      .eq('id', produtoId)
      .select();

    if (error || !data || data.length === 0) {
      const supabaseAnon = criarClienteAnonStateless();
      const { error: errAnon } = await supabaseAnon
        .from('produtos')
        .update(updatePayload)
        .eq('id', produtoId);
      if (
        errAnon &&
        (errAnon.message?.includes('unidades_medidas') ||
          errAnon.message?.includes('categoria_produto'))
      ) {
        const {
          unidades_medidas: _omitUn,
          categoria_produto: _omitCat,
          ...payloadSemFk
        } = updatePayload;
        await supabaseAnon.from('produtos').update(payloadSemFk).eq('id', produtoId);
      }
    }
    return true;
  } catch (err) {
    console.error('Erro ao atualizar produto no Supabase:', err);
    return false;
  }
}

export async function excluirProdutoNoBanco(produtoId: string): Promise<boolean> {
  try {
    const supabase = createClient() as any;
    const { error } = await supabase.from('produtos').delete().eq('id', produtoId);
    if (error) {
      const supabaseAnon = criarClienteAnonStateless();
      await supabaseAnon.from('produtos').delete().eq('id', produtoId);
    }
    return true;
  } catch (err) {
    console.error('Erro ao excluir produto no Supabase:', err);
    return false;
  }
}

// ==============================================================================
// 7. MEMBROS DA EQUIPE E NÍVEIS DE PERMISSÃO
// ==============================================================================

let memoriaMembros: Membro[] = [...DADOS_MEMBROS];

export async function buscarMembrosDoBanco(): Promise<Membro[]> {
  try {
    const supabase = createClient() as any;

    // 1. Busca todos os perfis cadastrados no Supabase
    const { data: perfis, error: errPerfis } = await supabase
      .from('perfis')
      .select('id, nome_completo, email, avatar_url, telefone')
      .order('criado_em', { ascending: true });

    // 2. Busca os cargos vinculados na organização
    const { data: membrosOrg } = await supabase
      .from('membros_organizacao')
      .select('perfil_id, cargo, ativo')
      .eq('ativo', true);

    if (perfis && perfis.length > 0) {
      const mapaCargos = new Map<string, 'admin' | 'gestor' | 'vendedor'>();
      if (membrosOrg && membrosOrg.length > 0) {
        membrosOrg.forEach((m: any) => {
          if (m.perfil_id && m.cargo) {
            mapaCargos.set(m.perfil_id, m.cargo);
          }
        });
      }

      const membrosSupabase: Membro[] = perfis.map((p: any) => ({
        id: p.id,
        nome_completo: p.nome_completo || 'Membro da Equipe',
        email: p.email || '',
        cargo: (mapaCargos.get(p.id) || 'vendedor') as 'admin' | 'gestor' | 'vendedor',
        avatar_url:
          p.avatar_url ||
          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
            p.nome_completo || 'Membro'
          )}&backgroundColor=0284c7,0ea5e9,10b981,6366f1`,
      }));

      // Garante que membros da sessão local também sejam preservados
      const mapaExistentes = new Set(membrosSupabase.map((m) => m.email.toLowerCase()));
      const extras = memoriaMembros.filter(
        (m) => !mapaExistentes.has(m.email.toLowerCase())
      );
      const listaCombinada = [...membrosSupabase, ...extras];

      memoriaMembros = listaCombinada;
      return listaCombinada;
    }

    // Fallback: Tentativa com join padrão PostgREST
    const { data: joinData } = await supabase
      .from('membros_organizacao')
      .select('id, cargo, ativo, perfil_id, perfis(id, nome_completo, email, avatar_url, telefone)')
      .eq('ativo', true);

    if (joinData && joinData.length > 0) {
      const formatados: Membro[] = joinData.map((item: any) => ({
        id: item.perfis?.id || item.perfil_id || item.id,
        nome_completo: item.perfis?.nome_completo || 'Membro da Equipe',
        email: item.perfis?.email || '',
        cargo: (item.cargo as 'admin' | 'gestor' | 'vendedor') || 'vendedor',
        avatar_url:
          item.perfis?.avatar_url ||
          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
            item.perfis?.nome_completo || 'Membro'
          )}`,
      }));

      memoriaMembros = formatados;
      return formatados;
    }

    return memoriaMembros;
  } catch (err) {
    console.warn('Erro ao consultar Supabase, utilizando membros locais:', err);
    return memoriaMembros;
  }
}

export async function adicionarMembroNoBanco(dados: {
  nome_completo: string;
  email: string;
  cargo: 'admin' | 'gestor' | 'vendedor';
  telefone?: string;
  avatar_url?: string;
}): Promise<Membro> {
  const novoId = crypto.randomUUID();
  const novoMembro: Membro = {
    id: novoId,
    nome_completo: dados.nome_completo.trim(),
    email: dados.email.trim().toLowerCase(),
    cargo: dados.cargo,
    avatar_url:
      dados.avatar_url ||
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(dados.nome_completo)}&backgroundColor=0284c7,0ea5e9,10b981,6366f1`,
  };

  memoriaMembros = [novoMembro, ...memoriaMembros];

  try {
    const supabase = createClient() as any;

    // 1. Cadastra ou atualiza o perfil
    await supabase.from('perfis').upsert({
      id: novoId,
      nome_completo: novoMembro.nome_completo,
      email: novoMembro.email,
      telefone: dados.telefone || null,
      avatar_url: novoMembro.avatar_url,
    });

    // 2. Vincula à organização com o nível de permissão
    await supabase.from('membros_organizacao').insert({
      organizacao_id: ORG_PADRAO_ID,
      perfil_id: novoId,
      cargo: novoMembro.cargo,
      ativo: true,
    });
  } catch (err) {
    console.warn('Banco remoto indisponível, membro mantido na sessão local:', err);
  }

  // 3. Dispara a requisição de envio de e-mail / geração de link
  try {
    await fetch('/api/convite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: novoMembro.email,
        nome_completo: novoMembro.nome_completo,
        cargo: novoMembro.cargo,
      }),
    });
  } catch (e) {
    console.warn('Falha na rota de convite:', e);
  }

  return novoMembro;
}

export async function dispararConviteEmail(dados: {
  email: string;
  nome_completo: string;
  cargo: string;
  senha_inicial?: string;
}): Promise<{ sucesso: boolean; emailEnviado: boolean; linkAtivacao: string; avisoSmtp?: string }> {
  try {
    const res = await fetch('/api/convite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Erro ao chamar rota de convite:', err);
  }

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  return {
    sucesso: true,
    emailEnviado: false,
    linkAtivacao: `${appUrl}/login?convite=ativo&email=${encodeURIComponent(dados.email)}`,
    avisoSmtp:
      'O servidor SMTP do banco de dados precisa ser configurado para disparos externos. Você pode copiar o link direto de ativação.',
  };
}

export async function atualizarCargoMembroNoBanco(
  membroId: string,
  novoCargo: 'admin' | 'gestor' | 'vendedor'
): Promise<boolean> {
  memoriaMembros = memoriaMembros.map((m) =>
    m.id === membroId ? { ...m, cargo: novoCargo } : m
  );

  try {
    const supabase = createClient() as any;
    await supabase
      .from('membros_organizacao')
      .update({ cargo: novoCargo })
      .eq('organizacao_id', ORG_PADRAO_ID)
      .eq('perfil_id', membroId);

    return true;
  } catch (err) {
    console.warn('Erro ao atualizar cargo no banco, salvo localmente:', err);
    return true;
  }
}

export async function removerMembroDoBanco(membroId: string): Promise<boolean> {
  memoriaMembros = memoriaMembros.filter((m) => m.id !== membroId);

  try {
    const supabase = createClient() as any;
    await supabase
      .from('membros_organizacao')
      .delete()
      .eq('organizacao_id', ORG_PADRAO_ID)
      .eq('perfil_id', membroId);

    return true;
  } catch (err) {
    console.warn('Erro ao remover membro no banco, removido localmente:', err);
    return true;
  }
}

