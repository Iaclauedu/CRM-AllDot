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
  CONFIG_SERVIDOR_EMAIL_PADRAO,
  DADOS_TEMPLATES_EMAIL,
  DADOS_AUTOMACOES_EMAIL,
  DADOS_LOGS_EMAIL,
  DADOS_AUTOMACOES_PROGRAMADAS,
  DADOS_LISTAS_MARKETING,
  DADOS_CAMPANHAS_MARKETING,
  DADOS_CAMPANHAS_ENVIOS,
  DADOS_CAMPANHAS_CLIQUES,
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
  type ConfiguracaoIntegracaoLP,
  type RegraCriacaoNegocioLP,
  type ConfiguracaoServidorEmail,
  type TemplateEmail,
  type RegraAutomacaoEmail,
  type GatilhoAutomacaoEmail,
  type LogEnvioEmail,
  type AutomacaoProgramada,
  type CriteriosSegmentacaoLista,
  type ListaMarketing,
  type CampanhaMarketing,
  type CampanhaEnvio,
  type CampanhaClique,
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
let clienteServiceRoleSingleton: any = null;
let autorPadraoIdCache: string | null = null;

function criarClienteServidorPrivilegiado() {
  if (typeof window !== 'undefined') return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (
    !supabaseUrl ||
    !serviceRoleKey ||
    serviceRoleKey.includes('sua-chave') ||
    serviceRoleKey.includes('placeholder')
  ) {
    return null;
  }

  if (clienteServiceRoleSingleton) return clienteServiceRoleSingleton;

  clienteServiceRoleSingleton = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as any;

  return clienteServiceRoleSingleton;
}

function criarClienteAnonStateless() {
  // No servidor (webhooks, tracking e rotas internas), usa service_role para operar sem depender de políticas anon
  const clientePrivilegiado = criarClienteServidorPrivilegiado();
  if (clientePrivilegiado) return clientePrivilegiado;

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
    const supabaseAnon = criarClienteAnonStateless();
    let { data, error } = await supabaseAnon
      .from('funis')
      .select('*')
      .order('criado_em', { ascending: true });

    if (error || !data || data.length === 0) {
      const supabase = createClient() as any;
      const resAuth = await supabase
        .from('funis')
        .select('*')
        .order('criado_em', { ascending: true });

      if (resAuth.data && resAuth.data.length > 0) {
        data = resAuth.data;
        error = null;
      }
    }

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

  const payloadFunil = {
    id: funilId,
    organizacao_id: ORG_PADRAO_ID,
    nome: novoFunil.nome,
    descricao: novoFunil.descricao,
    padrao: false,
  };

  const payloadEtapas = etapasIniciais.map((e) => ({
    id: e.id,
    organizacao_id: ORG_PADRAO_ID,
    funil_id: funilId,
    nome: e.nome,
    ordem: e.ordem,
    probabilidade_fechamento: e.probabilidade_fechamento,
    dias_estagnacao: e.dias_estagnacao,
  }));

  try {
    const supabase = createClient() as any;
    const { error: errF } = await supabase.from('funis').insert(payloadFunil);
    if (errF) {
      const supabaseAnon = criarClienteAnonStateless();
      await supabaseAnon.from('funis').insert(payloadFunil);
      await supabaseAnon.from('etapas_funil').insert(payloadEtapas);
    } else {
      const { error: errE } = await supabase.from('etapas_funil').insert(payloadEtapas);
      if (errE) {
        const supabaseAnon = criarClienteAnonStateless();
        await supabaseAnon.from('etapas_funil').insert(payloadEtapas);
      }
    }
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
    const { data, error } = await supabase
      .from('funis')
      .update(dados)
      .eq('id', funilId)
      .select();

    if (error || !data || data.length === 0) {
      const supabaseAnon = criarClienteAnonStateless();
      await supabaseAnon.from('funis').update(dados).eq('id', funilId);
    }
    return true;
  } catch (err) {
    console.warn('Fallback para atualização de funil:', err);
    return true;
  }
}

export async function buscarEtapasDoBanco(funilId?: string): Promise<EtapaFunil[]> {
  try {
    const supabaseAnon = criarClienteAnonStateless();
    let queryAnon = supabaseAnon
      .from('etapas_funil')
      .select('*')
      .order('ordem', { ascending: true })
      .order('criado_em', { ascending: true });

    if (funilId) {
      queryAnon = queryAnon.eq('funil_id', funilId);
    }

    let { data, error } = await queryAnon;

    if (error || !data || data.length === 0) {
      try {
        const supabase = createClient() as any;
        let queryAuth = supabase
          .from('etapas_funil')
          .select('*')
          .order('ordem', { ascending: true })
          .order('criado_em', { ascending: true });

        if (funilId) {
          queryAuth = queryAuth.eq('funil_id', funilId);
        }

        const resAuth = await queryAuth;
        if (resAuth.data && resAuth.data.length > 0) {
          data = resAuth.data;
          error = null;
        }
      } catch {
        // Ignora erro do cliente browser e mantém fallback
      }
    }

    if (error || !data || data.length === 0) {
      return DADOS_ETAPAS.map((et, idx) => ({
        ...et,
        ordem: idx + 1,
        funil_id: funilId || et.funil_id || FUNIL_PADRAO_ID,
      }));
    }

    return data.map((e: any, idx: number) => ({
      id: e.id,
      funil_id: e.funil_id,
      nome: e.nome,
      ordem: funilId ? idx + 1 : e.ordem,
      probabilidade_fechamento: e.probabilidade_fechamento,
      dias_estagnacao: e.dias_estagnacao,
      cor: e.cor || '#64748b',
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

    const { data, error } = await supabase
      .from('etapas_funil')
      .update(updatePayload)
      .eq('id', etapaId)
      .select();

    if (error || !data || data.length === 0) {
      const supabaseAnon = criarClienteAnonStateless();
      await supabaseAnon
        .from('etapas_funil')
        .update(updatePayload)
        .eq('id', etapaId);
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

  const payload = {
    id: novaEtapa.id,
    organizacao_id: ORG_PADRAO_ID,
    funil_id: funilId,
    nome: novaEtapa.nome,
    ordem: novaEtapa.ordem,
    probabilidade_fechamento: novaEtapa.probabilidade_fechamento,
    dias_estagnacao: novaEtapa.dias_estagnacao,
  };

  try {
    const supabase = createClient() as any;
    const { error } = await supabase.from('etapas_funil').insert(payload);
    if (error) {
      const supabaseAnon = criarClienteAnonStateless();
      await supabaseAnon.from('etapas_funil').insert(payload);
    }
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
      const supabaseAnon = criarClienteAnonStateless();
      if (etapaDestinoId) {
        await supabaseAnon
          .from('negocios')
          .update({
            etapa_id: etapaDestinoId,
            ultima_atividade_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString(),
          })
          .eq('etapa_id', etapaId);
      }
      await supabaseAnon.from('etapas_funil').delete().eq('id', etapaId);
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

    if (error) {
      console.warn('Erro ao buscar negócios no Supabase:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
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
        empresa_nome:
          n.empresa?.nome ||
          n.lead_empresa ||
          cp.lead_empresa ||
          '',
        contato_id: n.contato_id || '',
        contato_nome:
          n.contato?.nome ||
          n.lead_nome ||
          cp.lead_nome ||
          '',
        contato_email:
          n.contato?.email ||
          n.lead_email ||
          cp.lead_email ||
          '',
        contato_whatsapp:
          n.contato?.telefone_whatsapp ||
          n.lead_celular ||
          cp.lead_celular ||
          '',
        lead_nome: n.lead_nome || cp.lead_nome || undefined,
        lead_email: n.lead_email || cp.lead_email || undefined,
        lead_empresa: n.lead_empresa || cp.lead_empresa || undefined,
        lead_celular: n.lead_celular || cp.lead_celular || undefined,
        origem_lead: n.origem_lead || cp.origem_lead || undefined,
        url_conversao: n.url_conversao || cp.url_conversao || undefined,
        campanha: n.campanha || cp.campanha || undefined,
        midia: n.midia || cp.midia || undefined,
        conjunto_anuncios: n.conjunto_anuncios || cp.conjunto_anuncios || undefined,
        utm_source: n.utm_source || cp.utm_source || undefined,
        utm_medium: n.utm_medium || cp.utm_medium || undefined,
        utm_campaign: n.utm_campaign || cp.utm_campaign || undefined,
        utm_content: n.utm_content || cp.utm_content || undefined,
        utm_term: n.utm_term || cp.utm_term || undefined,
        produto_interesse: n.produto_interesse || cp.produto_interesse || undefined,
        data_hora_cadastro:
          n.data_hora_cadastro || cp.data_hora_cadastro || n.criado_em || undefined,
        responsavel_id: n.responsavel_id || DADOS_MEMBROS[0].id,
        responsavel_nome: n.responsavel?.nome_completo || 'Carlos Silva',
        responsavel_avatar:
          n.responsavel?.avatar_url ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        status: n.status,
        motivo_perda: n.motivo_perda,
        data_fechamento_esperada: n.data_fechamento_esperada,
        ultima_atividade_em: n.ultima_atividade_em,
        automacoes_pausadas:
          n.automacoes_pausadas ?? cp.automacoes_pausadas ?? false,
        automacoes_pausadas_por:
          n.automacoes_pausadas_por || cp.automacoes_pausadas_por || undefined,
        automacoes_pausadas_em:
          n.automacoes_pausadas_em || cp.automacoes_pausadas_em || undefined,
        consentimento_email:
          n.consentimento_email ?? cp.consentimento_email ?? true,
        descadastrado_email:
          n.descadastrado_email ?? cp.descadastrado_email ?? false,
        campos_personalizados: { ...cp, codigo: codigoCard },
        atividades: atividadesFormatadas,
        atividades_count: atividadesList.length,
        atividades_pendentes: pendentes.length,
        status_atividade: statusAtividade,
        produtos: prodsList,
      };
    });
  } catch (err) {
    console.warn('Erro ao buscar negócios no Supabase:', err);
    return [];
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

  // No navegador, usa a rota de API com privilégios de service role para persistir no banco
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/negocios/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          negocioId,
          produtoId,
          quantidade,
          valorUnitario,
        }),
      });

      if (!res.ok) {
        const erroJson = await res.json().catch(() => ({}));
        console.warn('Aviso ao adicionar produto via API /api/negocios/produtos:', erroJson);
      }
    } catch (err) {
      console.error('Erro de rede ao adicionar produto via API:', err);
    }

    return {
      produto_id: produtoId,
      nome,
      quantidade,
      valor_unitario: valorUnitario,
      subtotal,
    };
  }

  // No servidor (SSR ou rotas internas)
  try {
    const supabase = criarClienteServidorPrivilegiado() || (createClient() as any);
    const { data: itemExistente } = await supabase
      .from('negocios_produtos')
      .select('id, quantidade, valor_unitario')
      .eq('negocio_id', negocioId)
      .eq('produto_id', produtoId)
      .maybeSingle();

    if (itemExistente) {
      const novaQtd = Number(itemExistente.quantidade) + quantidade;
      await supabase
        .from('negocios_produtos')
        .update({
          quantidade: novaQtd,
          valor_unitario: valorUnitario > 0 ? valorUnitario : itemExistente.valor_unitario,
        })
        .eq('id', itemExistente.id);
    } else {
      await supabase.from('negocios_produtos').insert({
        organizacao_id: ORG_PADRAO_ID,
        negocio_id: negocioId,
        produto_id: produtoId,
        quantidade: quantidade,
        valor_unitario: valorUnitario,
      });
    }

    // Recalcula total do negócio
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
      .update({ valor: novoValorTotal, atualizado_em: new Date().toISOString() })
      .eq('id', negocioId);
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

export async function atualizarProdutoNoNegocio(
  negocioId: string,
  produtoId: string,
  quantidade: number,
  valorUnitario: number
): Promise<boolean> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/negocios/produtos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          negocioId,
          produtoId,
          quantidade,
          valorUnitario,
        }),
      });
      return res.ok;
    } catch (err) {
      console.error('Erro de rede ao atualizar produto no negócio:', err);
      return false;
    }
  }

  try {
    const supabase = criarClienteServidorPrivilegiado() || (createClient() as any);
    await supabase
      .from('negocios_produtos')
      .update({ quantidade, valor_unitario: valorUnitario })
      .eq('negocio_id', negocioId)
      .eq('produto_id', produtoId);

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
      .update({ valor: novoValorTotal, atualizado_em: new Date().toISOString() })
      .eq('id', negocioId);

    return true;
  } catch (err) {
    console.error('Erro ao atualizar produto no negócio no Supabase:', err);
    return false;
  }
}

export async function excluirNegocioDoBanco(negocioId: string): Promise<boolean> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/negocios?id=${encodeURIComponent(negocioId)}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch (err) {
      console.error('Erro de rede ao excluir negócio:', err);
      return false;
    }
  }

  try {
    const supabase = criarClienteServidorPrivilegiado() || (createClient() as any);
    await supabase.from('negocios_produtos').delete().eq('negocio_id', negocioId);
    await supabase.from('atividades').delete().eq('negocio_id', negocioId);
    await supabase.from('historico_etapas').delete().eq('negocio_id', negocioId);
    const { error } = await supabase.from('negocios').delete().eq('id', negocioId);
    if (error) {
      console.error('Erro ao excluir negócio no banco:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Erro ao excluir negócio no banco:', err);
    return false;
  }
}

export async function removerProdutoDoNegocio(negocioId: string, produtoId: string): Promise<boolean> {
  // No navegador, usa a rota de API com privilégios de service role
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(
        `/api/negocios/produtos?negocioId=${encodeURIComponent(negocioId)}&produtoId=${encodeURIComponent(produtoId)}`,
        {
          method: 'DELETE',
        }
      );
      if (!res.ok) {
        const erroJson = await res.json().catch(() => ({}));
        console.warn('Aviso ao remover produto via API /api/negocios/produtos:', erroJson);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Erro de rede ao remover produto via API:', err);
      return false;
    }
  }

  // No servidor (SSR ou rotas internas)
  try {
    const supabase = criarClienteServidorPrivilegiado() || (createClient() as any);
    const { error } = await supabase
      .from('negocios_produtos')
      .delete()
      .eq('negocio_id', negocioId)
      .eq('produto_id', produtoId);

    if (error) {
      console.error('Erro ao remover produto no Supabase:', error);
      return false;
    }

    // Recalcula total do negócio
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
      .update({ valor: novoValorTotal, atualizado_em: new Date().toISOString() })
      .eq('id', negocioId);

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
    if (campos.empresa_id !== undefined) updateData.empresa_id = campos.empresa_id || null;
    if (campos.contato_id !== undefined) updateData.contato_id = campos.contato_id || null;
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

    // Se o negócio foi marcado como GANHO ou PERDIDO, interrompe imediatamente a régua programada conforme política das regras
    if (status === 'ganho' || status === 'perdido') {
      await interromperAutomacoesPorStatusNegocio(negocioId, status);
    }

    // Dispara automações de e-mail para mudança de etapa / ganho / perdido
    executarAutomacoesPorEvento({
      negocioId,
      etapaDestinoId: etapaId,
      statusNegocio: status,
      gatilhoPrincipal:
        status === 'ganho'
          ? 'negocio_ganho'
          : status === 'perdido'
            ? 'negocio_perdido'
            : 'mudanca_etapa',
    }).catch((e) => console.warn('Aviso ao disparar automação na movimentação:', e));
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

    executarAutomacoesPorEvento({
      negocioId: negocioLocal.id,
      negocioObjeto: negocioLocal,
      etapaDestinoId: negocioLocal.etapa_id,
      funilId: negocioLocal.funil_id,
      gatilhoPrincipal: 'novo_negocio',
    }).catch((e) => console.warn('Aviso ao disparar automação em novo negócio:', e));
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

    if (error) {
      console.warn('Erro ao buscar contatos no Supabase:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
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
    console.warn('Erro ao buscar contatos no Supabase:', err);
    return [];
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

    if (error) {
      console.warn('Erro ao buscar empresas no Supabase:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
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
    console.warn('Erro ao buscar empresas no Supabase:', err);
    return [];
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
      .order('ordem', { ascending: true });

    if (error || !data || data.length === 0) {
      const supabaseAnon = criarClienteAnonStateless();
      const resAnon = await supabaseAnon
        .from('categoria_produto')
        .select('*')
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
    console.warn('Erro ao buscar categorias de produto:', err);
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

    if (error) {
      console.warn('Erro ao buscar produtos no Supabase:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
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
    console.warn('Erro ao buscar produtos no Supabase:', err);
    return [];
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
): Promise<{ sucesso: boolean; erro?: string }> {
  const camposCustomLimpos = { ...(dados.campos_personalizados || {}) };
  delete camposCustomLimpos._imagem_url;
  delete camposCustomLimpos._unidade_medida;
  delete camposCustomLimpos.unidade_medida;

  const payloadDados: Partial<Produto> = {
    ...dados,
    campos_personalizados:
      dados.campos_personalizados !== undefined ? camposCustomLimpos : undefined,
  };

  if (dados.unidades_medidas !== undefined || dados.unidade_medida !== undefined) {
    const unidadeEncontrada = DADOS_UNIDADES_MEDIDAS.find(
      (u) => u.id === dados.unidades_medidas || u.nome === dados.unidade_medida
    );
    payloadDados.unidades_medidas =
      dados.unidades_medidas || unidadeEncontrada?.id || DADOS_UNIDADES_MEDIDAS[0].id;
  }

  if (dados.categoria_produto !== undefined || dados.categoria_nome !== undefined) {
    const categoriaEncontrada = DADOS_CATEGORIAS_PRODUTO.find(
      (c) => c.id === dados.categoria_produto || c.nome === dados.categoria_nome
    );
    payloadDados.categoria_produto =
      dados.categoria_produto || categoriaEncontrada?.id || DADOS_CATEGORIAS_PRODUTO[0].id;
  }

  try {
    const res = await fetch('/api/produtos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ produtoId, dados: payloadDados }),
    });

    if (res.ok) {
      return { sucesso: true };
    }

    const erroBody = await res.json().catch(() => null);
    return {
      sucesso: false,
      erro: erroBody?.erro || 'Não foi possível salvar as alterações do produto.',
    };
  } catch (err) {
    console.error('Erro ao atualizar produto:', err);
    return {
      sucesso: false,
      erro: 'Erro de comunicação ao salvar alterações do produto.',
    };
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

let memoriaMembros: Membro[] = [];

export async function buscarMembrosDoBanco(): Promise<Membro[]> {
  try {
    const supabase = createClient() as any;

    // 1. Busca os membros vinculados na organização com join na tabela de perfis
    const { data: membrosOrg, error: errJoin } = await supabase
      .from('membros_organizacao')
      .select('id, cargo, ativo, perfil_id, perfis(id, nome_completo, email, avatar_url, telefone)')
      .eq('organizacao_id', ORG_PADRAO_ID)
      .eq('ativo', true);

    if (!errJoin && membrosOrg && membrosOrg.length > 0) {
      const formatados: Membro[] = membrosOrg
        .filter((item: any) => item.perfis || item.perfil_id)
        .map((item: any) => ({
          id: item.perfis?.id || item.perfil_id,
          nome_completo: item.perfis?.nome_completo || 'Membro da Equipe',
          email: item.perfis?.email || '',
          cargo: (item.cargo as 'admin' | 'gestor' | 'vendedor') || 'vendedor',
          avatar_url:
            item.perfis?.avatar_url ||
            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
              item.perfis?.nome_completo || 'Membro'
            )}&backgroundColor=0284c7,0ea5e9,10b981,6366f1`,
        }));

      memoriaMembros = formatados;
      return formatados;
    }

    // Fallback: se o join PostgREST não trouxer dados, busca perfis que possuem vínculo ativo na organização
    const { data: vinculos } = await supabase
      .from('membros_organizacao')
      .select('perfil_id, cargo')
      .eq('organizacao_id', ORG_PADRAO_ID)
      .eq('ativo', true);

    if (vinculos && vinculos.length > 0) {
      const mapaCargos = new Map<string, 'admin' | 'gestor' | 'vendedor'>();
      vinculos.forEach((v: any) => {
        if (v.perfil_id && v.cargo) mapaCargos.set(v.perfil_id, v.cargo);
      });

      const perfilIds = Array.from(mapaCargos.keys());
      const { data: perfis } = await supabase
        .from('perfis')
        .select('id, nome_completo, email, avatar_url, telefone')
        .in('id', perfilIds);

      if (perfis && perfis.length > 0) {
        const formatados: Membro[] = perfis.map((p: any) => ({
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

        memoriaMembros = formatados;
        return formatados;
      }
    }

    return memoriaMembros;
  } catch (err) {
    console.warn('Erro ao consultar membros:', err);
    return memoriaMembros;
  }
}

export async function adicionarMembroNoBanco(dados: {
  nome_completo: string;
  email: string;
  cargo: 'admin' | 'gestor' | 'vendedor';
  telefone?: string;
  avatar_url?: string;
  senha_inicial?: string;
}): Promise<Membro> {
  const emailNormalizado = dados.email.trim().toLowerCase();
  const nomeLimpo = dados.nome_completo.trim();
  const avatarFinal =
    dados.avatar_url ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(nomeLimpo)}&backgroundColor=0284c7,0ea5e9,10b981,6366f1`;

  let idReal = crypto.randomUUID();

  // Chama /api/convite para criar/convidar em auth.users e gravar perfis + membros_organizacao
  const res = await fetch('/api/convite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: emailNormalizado,
      nome_completo: nomeLimpo,
      cargo: dados.cargo,
      telefone: dados.telefone,
      avatar_url: avatarFinal,
      senha_inicial: dados.senha_inicial,
    }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.erro || 'Não foi possível cadastrar o membro.');
  }

  if (json?.userId) {
    idReal = json.userId;
  }

  const novoMembro: Membro = {
    id: idReal,
    nome_completo: nomeLimpo,
    email: emailNormalizado,
    cargo: dados.cargo,
    avatar_url: avatarFinal,
  };

  memoriaMembros = [novoMembro, ...memoriaMembros.filter((m) => m.email !== emailNormalizado)];
  return novoMembro;
}

export async function dispararConviteEmail(dados: {
  email: string;
  nome_completo: string;
  cargo: string;
  senha_inicial?: string;
}): Promise<{ sucesso: boolean; emailEnviado: boolean; linkAtivacao: string; avisoSmtp?: string }> {
  const res = await fetch('/api/convite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.erro || 'Não foi possível processar o convite.');
  }
  return json;
}

export async function atualizarCargoMembroNoBanco(
  membroId: string,
  novoCargo: 'admin' | 'gestor' | 'vendedor',
  membroInfo?: { email?: string; nome_completo?: string }
): Promise<{ sucesso: boolean; erro?: string }> {
  try {
    const res = await fetch('/api/membros/cargo', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        membroId,
        novoCargo,
        email: membroInfo?.email,
        nome_completo: membroInfo?.nome_completo,
      }),
    });

    if (res.ok) {
      const json = await res.json().catch(() => null);
      const idFinal = json?.membroId || membroId;
      memoriaMembros = memoriaMembros.map((m) =>
        m.id === membroId ? { ...m, id: idFinal, cargo: novoCargo } : m
      );
      return { sucesso: true };
    }

    const erroBody = await res.json().catch(() => null);
    const mensagemErro = erroBody?.erro || 'Não foi possível alterar a permissão.';
    console.error('Erro ao atualizar permissão:', mensagemErro);
    return { sucesso: false, erro: mensagemErro };
  } catch (err) {
    console.error('Erro ao atualizar permissão:', err);
    return { sucesso: false, erro: 'Erro de comunicação ao atualizar permissão.' };
  }
}

export async function removerMembroDoBanco(
  membroId: string
): Promise<{ sucesso: boolean; erro?: string }> {
  try {
    const res = await fetch(`/api/membros?id=${encodeURIComponent(membroId)}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      memoriaMembros = memoriaMembros.filter((m) => m.id !== membroId);
      return { sucesso: true };
    }

    const json = await res.json().catch(() => null);
    const erroMsg = json?.erro || 'Não foi possível remover o membro da organização.';
    console.error('Erro ao remover membro via API:', erroMsg);
    return { sucesso: false, erro: erroMsg };
  } catch (err) {
    console.error('Erro ao chamar rota de remoção de membro:', err);
    return { sucesso: false, erro: 'Erro de comunicação ao remover membro.' };
  }
}

// ==============================================================================
// 7. INTEGRAÇÃO LANDING PAGE (https://brindes.brindaypersonalizados.com.br/)
// ==============================================================================

const STORAGE_CONFIG_LP_KEY = 'alldot_config_integracao_lp_v1';

export const CONFIG_INTEGRACAO_LP_PADRAO: ConfiguracaoIntegracaoLP = {
  url_landing_page: 'https://brindes.brindaypersonalizados.com.br/',
  origem_padrao: 'Landing Page Brinday',
  funil_id: FUNIL_PADRAO_ID,
  etapa_id: DADOS_ETAPAS[0].id,
  responsavel_id: DADOS_MEMBROS[0].id,
  regra_criacao_negocio: 'atualizar_aberto',
  atualizar_contato_existente: true,
  ativo: true,
};

export interface LeadLandingPagePayload {
  nome: string;
  email: string;
  empresa: string;
  celular: string;
  origem_lead?: string;
  url_conversao?: string;
  campanha?: string;
  midia?: string;
  conjunto_anuncios?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  data_hora_cadastro?: string;
  produto_interesse?: string;
  regra_criacao_negocio?: RegraCriacaoNegocioLP;
}

function normalizarTelefoneComparacao(telefone?: string): string {
  const digitos = (telefone || '').replace(/\D/g, '');
  if (!digitos) return '';
  if (digitos.startsWith('55') && digitos.length >= 12) {
    return digitos.slice(2);
  }
  return digitos;
}

export async function buscarConfiguracaoIntegracaoLP(): Promise<ConfiguracaoIntegracaoLP> {
  try {
    const supabaseAnon = criarClienteAnonStateless();
    const { data, error } = await supabaseAnon
      .from('configuracoes_integracao_lp')
      .select('*')
      .eq('organizacao_id', ORG_PADRAO_ID)
      .maybeSingle();

    if (!error && data) {
      return {
        url_landing_page:
          data.url_landing_page || CONFIG_INTEGRACAO_LP_PADRAO.url_landing_page,
        origem_padrao:
          data.origem_padrao || CONFIG_INTEGRACAO_LP_PADRAO.origem_padrao,
        funil_id: data.funil_id || CONFIG_INTEGRACAO_LP_PADRAO.funil_id,
        etapa_id: data.etapa_id || CONFIG_INTEGRACAO_LP_PADRAO.etapa_id,
        responsavel_id:
          data.responsavel_id || CONFIG_INTEGRACAO_LP_PADRAO.responsavel_id,
        regra_criacao_negocio:
          data.regra_criacao_negocio ||
          CONFIG_INTEGRACAO_LP_PADRAO.regra_criacao_negocio,
        atualizar_contato_existente: data.atualizar_contato_existente ?? true,
        ativo: data.ativo ?? true,
      };
    }

    // Fallback: verifica no campo campos_personalizados ou definicoes
    const { data: defRow } = await supabaseAnon
      .from('campos_definicoes')
      .select('opcoes_json')
      .eq('organizacao_id', ORG_PADRAO_ID)
      .eq('entidade', 'negocio')
      .eq('nome_chave', '_config_integracao_lp')
      .maybeSingle();

    if (defRow?.opcoes_json && typeof defRow.opcoes_json === 'object' && !Array.isArray(defRow.opcoes_json)) {
      return {
        ...CONFIG_INTEGRACAO_LP_PADRAO,
        ...(defRow.opcoes_json as Partial<ConfiguracaoIntegracaoLP>),
      };
    }
  } catch {
    // Fallback local
  }

  if (typeof window !== 'undefined') {
    try {
      const salvo = window.localStorage.getItem(STORAGE_CONFIG_LP_KEY);
      if (salvo) {
        return { ...CONFIG_INTEGRACAO_LP_PADRAO, ...JSON.parse(salvo) };
      }
    } catch {
      // ignore
    }
  }

  return CONFIG_INTEGRACAO_LP_PADRAO;
}

export async function salvarConfiguracaoIntegracaoLP(
  novaConfig: Partial<ConfiguracaoIntegracaoLP>
): Promise<ConfiguracaoIntegracaoLP> {
  const atual = await buscarConfiguracaoIntegracaoLP();
  const mesclada: ConfiguracaoIntegracaoLP = {
    ...atual,
    ...novaConfig,
  };

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_CONFIG_LP_KEY, JSON.stringify(mesclada));
    } catch {
      // ignore
    }
  }

  try {
    const supabaseAnon = criarClienteAnonStateless();
    const { error } = await supabaseAnon.from('configuracoes_integracao_lp').upsert(
      {
        organizacao_id: ORG_PADRAO_ID,
        url_landing_page: mesclada.url_landing_page,
        origem_padrao: mesclada.origem_padrao,
        funil_id: mesclada.funil_id || null,
        etapa_id: mesclada.etapa_id || null,
        responsavel_id: mesclada.responsavel_id || null,
        regra_criacao_negocio: mesclada.regra_criacao_negocio,
        atualizar_contato_existente: mesclada.atualizar_contato_existente,
        ativo: mesclada.ativo,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: 'organizacao_id' }
    );

    if (error) {
      // Fallback caso a migration 008 ainda não tenha sido executada no SQL Editor
      await supabaseAnon.from('campos_definicoes').upsert(
        {
          organizacao_id: ORG_PADRAO_ID,
          entidade: 'negocio',
          nome_chave: '_config_integracao_lp',
          label: 'Configuração Integração Landing Page',
          tipo: 'texto',
          opcoes_json: mesclada as any,
          obrigatorio: false,
          ordem: 998,
        },
        { onConflict: 'organizacao_id,entidade,nome_chave' }
      );
    }
  } catch (err) {
    console.warn('Erro ao persistir configuração LP no Supabase:', err);
  }

  return mesclada;
}

export async function processarLeadLandingPageNoBanco(
  input: LeadLandingPagePayload
): Promise<{
  acao: 'criado' | 'atualizado' | 'ignorado';
  negocio: Negocio;
  contatoExistenteAtualizado: boolean;
  contatoEncontradoId?: string;
}> {
  const supabaseAnon = criarClienteAnonStateless();
  const config = await buscarConfiguracaoIntegracaoLP();
  const regraAtiva: RegraCriacaoNegocioLP =
    input.regra_criacao_negocio || config.regra_criacao_negocio || 'atualizar_aberto';

  const nomeLimpo = (input.nome || '').trim();
  const emailLimpo = (input.email || '').trim().toLowerCase();
  const empresaInformada = (input.empresa || '').trim();
  const celularLimpo = (input.celular || '').trim();
  const telNormalizado = normalizarTelefoneComparacao(celularLimpo);
  const dataHoraCadastro = input.data_hora_cadastro || new Date().toISOString();
  const urlConversao =
    input.url_conversao ||
    config.url_landing_page ||
    'https://brindes.brindaypersonalizados.com.br/';
  const origemLead =
    input.origem_lead || config.origem_padrao || 'Landing Page Brinday';

  // 1. Localiza contatos existentes por E-mail e/ou Telefone (sem criar novo contato se não existir!)
  let contatoEncontrado: any = null;
  let contatoExistenteAtualizado = false;

  try {
    const { data: listaContatos } = await supabaseAnon
      .from('contatos')
      .select('*')
      .eq('organizacao_id', ORG_PADRAO_ID);

    if (listaContatos && listaContatos.length > 0) {
      contatoEncontrado = listaContatos.find((c: any) => {
        const emailContato = (c.email || '').trim().toLowerCase();
        const telContato = normalizarTelefoneComparacao(c.telefone_whatsapp);
        const bateEmail = emailLimpo && emailContato && emailContato === emailLimpo;
        const bateTel =
          telNormalizado &&
          telContato &&
          telNormalizado.length >= 8 &&
          telContato === telNormalizado;
        return bateEmail || bateTel;
      });
    }

    // Se encontrou um contato já existente na base, atualiza seus dados quando necessário
    if (contatoEncontrado && config.atualizar_contato_existente) {
      const dadosUpdateContato: any = {
        atualizado_em: new Date().toISOString(),
      };
      if (nomeLimpo && nomeLimpo !== contatoEncontrado.nome) {
        dadosUpdateContato.nome = nomeLimpo;
      }
      if (emailLimpo && emailLimpo !== (contatoEncontrado.email || '').toLowerCase()) {
        dadosUpdateContato.email = emailLimpo;
      }
      if (celularLimpo && celularLimpo !== contatoEncontrado.telefone_whatsapp) {
        dadosUpdateContato.telefone_whatsapp = celularLimpo;
      }

      await supabaseAnon
        .from('contatos')
        .update(dadosUpdateContato)
        .eq('id', contatoEncontrado.id);
      contatoExistenteAtualizado = true;
    }
  } catch (err) {
    console.warn('Aviso ao verificar contatos existentes:', err);
  }

  // 2. Define Funil, Etapa e Responsável
  let funilId = config.funil_id || FUNIL_PADRAO_ID;
  let etapaId = config.etapa_id || DADOS_ETAPAS[0].id;
  let responsavelId = config.responsavel_id || DADOS_MEMBROS[0].id;

  try {
    const { data: etapasBanco } = await supabaseAnon
      .from('etapas_funil')
      .select('id, funil_id, ordem')
      .order('ordem', { ascending: true });

    if (etapasBanco && etapasBanco.length > 0) {
      const etapaValida = etapasBanco.find((e: any) => e.id === etapaId);
      if (etapaValida) {
        funilId = etapaValida.funil_id;
      } else {
        etapaId = etapasBanco[0].id;
        funilId = etapasBanco[0].funil_id;
      }
    }
  } catch {
    // usa fallback padrão
  }

  // 3. Monta metadados completos do Lead + UTMs + Campanha + Produto de Interesse
  const metadadosLead = {
    capturado_via_lp: true,
    lead_nome: nomeLimpo,
    lead_email: emailLimpo,
    lead_empresa: empresaInformada,
    lead_celular: celularLimpo,
    origem_lead: origemLead,
    url_conversao: urlConversao,
    campanha: input.campanha || input.utm_campaign || '',
    midia: input.midia || input.utm_medium || '',
    conjunto_anuncios: input.conjunto_anuncios || input.utm_content || '',
    utm_source: input.utm_source || '',
    utm_medium: input.utm_medium || '',
    utm_campaign: input.utm_campaign || '',
    utm_content: input.utm_content || '',
    utm_term: input.utm_term || '',
    produto_interesse: input.produto_interesse || '',
    data_hora_cadastro: dataHoraCadastro,
  };

  // 4. Verifica se já existe negócio aberto para este lead (por e-mail, telefone ou contato_id)
  let negocioAbertoExistente: any = null;
  let maxCodigoSeq = 1000;

  try {
    const { data: todosNegocios } = await supabaseAnon
      .from('negocios')
      .select('*')
      .eq('organizacao_id', ORG_PADRAO_ID)
      .order('criado_em', { ascending: false });

    if (todosNegocios && todosNegocios.length > 0) {
      for (const neg of todosNegocios) {
        const cod = neg.codigo || neg.campos_personalizados?.codigo;
        if (typeof cod === 'string') {
          const num = parseInt(cod.replace(/\D/g, ''), 10);
          if (!isNaN(num) && num > maxCodigoSeq) maxCodigoSeq = num;
        }
      }

      negocioAbertoExistente = todosNegocios.find((neg: any) => {
        if (neg.status !== 'aberto') return false;
        const cp = neg.campos_personalizados || {};
        const emailNeg = (neg.lead_email || cp.lead_email || '').trim().toLowerCase();
        const telNeg = normalizarTelefoneComparacao(
          neg.lead_celular || cp.lead_celular || ''
        );

        const mesmoContato =
          contatoEncontrado && neg.contato_id === contatoEncontrado.id;
        const mesmoEmail = emailLimpo && emailNeg && emailNeg === emailLimpo;
        const mesmoTel =
          telNormalizado &&
          telNeg &&
          telNormalizado.length >= 8 &&
          telNeg === telNormalizado;

        return Boolean(mesmoContato || mesmoEmail || mesmoTel);
      });
    }
  } catch (err) {
    console.warn('Aviso ao verificar negócios abertos:', err);
  }

  const resumoConversaoTexto = [
    `Lead recebido via Landing Page (${urlConversao})`,
    `• Nome: ${nomeLimpo}`,
    `• Empresa informada: ${empresaInformada}`,
    `• E-mail: ${emailLimpo}`,
    `• Celular / WhatsApp: ${celularLimpo}`,
    metadadosLead.produto_interesse
      ? `• Produto/Categoria de Interesse: ${metadadosLead.produto_interesse}`
      : null,
    metadadosLead.utm_source || metadadosLead.utm_medium || metadadosLead.utm_campaign
      ? `• UTMs: source=${metadadosLead.utm_source || '-'} | medium=${metadadosLead.utm_medium || '-'} | campaign=${metadadosLead.utm_campaign || '-'} | content=${metadadosLead.utm_content || '-'} | term=${metadadosLead.utm_term || '-'}`
      : null,
    metadadosLead.campanha || metadadosLead.midia || metadadosLead.conjunto_anuncios
      ? `• Tráfego: Campanha=${metadadosLead.campanha || '-'} | Mídia=${metadadosLead.midia || '-'} | Conjunto=${metadadosLead.conjunto_anuncios || '-'}`
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  // 5. Aplica a Regra de Criação de Nova Negociação configurada
  if (negocioAbertoExistente && regraAtiva === 'bloquear_duplicado') {
    await criarAtividadeNoBanco({
      negocio_id: negocioAbertoExistente.id,
      tipo: 'nota',
      titulo: 'Nova conversão na Landing Page (Negociação mantida sem duplicar)',
      descricao: resumoConversaoTexto,
    });

    const cpExistente = negocioAbertoExistente.campos_personalizados || {};
    return {
      acao: 'ignorado',
      contatoExistenteAtualizado,
      contatoEncontradoId: contatoEncontrado?.id,
      negocio: {
        id: negocioAbertoExistente.id,
        codigo: cpExistente.codigo || '#1001',
        titulo: negocioAbertoExistente.titulo,
        valor: Number(negocioAbertoExistente.valor) || 0,
        moeda: 'BRL',
        funil_id: negocioAbertoExistente.funil_id,
        etapa_id: negocioAbertoExistente.etapa_id,
        contato_id: negocioAbertoExistente.contato_id || '',
        contato_nome: nomeLimpo,
        contato_email: emailLimpo,
        contato_whatsapp: celularLimpo,
        empresa_id: negocioAbertoExistente.empresa_id || '',
        empresa_nome: empresaInformada,
        ...metadadosLead,
        responsavel_id: negocioAbertoExistente.responsavel_id || responsavelId,
        status: 'aberto',
        ultima_atividade_em: new Date().toISOString(),
        campos_personalizados: cpExistente,
      },
    };
  }

  if (negocioAbertoExistente && regraAtiva === 'atualizar_aberto') {
    const cpAtualizado = {
      ...(negocioAbertoExistente.campos_personalizados || {}),
      ...metadadosLead,
    };

    const updateCompleto: any = {
      contato_id: contatoEncontrado?.id || negocioAbertoExistente.contato_id || null,
      empresa_id:
        contatoEncontrado?.empresa_id || negocioAbertoExistente.empresa_id || null,
      lead_nome: nomeLimpo,
      lead_email: emailLimpo,
      lead_empresa: empresaInformada,
      lead_celular: celularLimpo,
      origem_lead: origemLead,
      url_conversao: urlConversao,
      campanha: metadadosLead.campanha || null,
      midia: metadadosLead.midia || null,
      conjunto_anuncios: metadadosLead.conjunto_anuncios || null,
      utm_source: metadadosLead.utm_source || null,
      utm_medium: metadadosLead.utm_medium || null,
      utm_campaign: metadadosLead.utm_campaign || null,
      utm_content: metadadosLead.utm_content || null,
      utm_term: metadadosLead.utm_term || null,
      produto_interesse: metadadosLead.produto_interesse || null,
      data_hora_cadastro: dataHoraCadastro,
      ultima_atividade_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
      campos_personalizados: cpAtualizado,
    };

    const { error: errUpdate } = await supabaseAnon
      .from('negocios')
      .update(updateCompleto)
      .eq('id', negocioAbertoExistente.id);

    if (errUpdate) {
      await supabaseAnon
        .from('negocios')
        .update({
          contato_id:
            contatoEncontrado?.id || negocioAbertoExistente.contato_id || null,
          ultima_atividade_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
          campos_personalizados: cpAtualizado,
        })
        .eq('id', negocioAbertoExistente.id);
    }

    await criarAtividadeNoBanco({
      negocio_id: negocioAbertoExistente.id,
      tipo: 'nota',
      titulo: 'Reconversão na Landing Page — Dados do Card Atualizados',
      descricao: resumoConversaoTexto,
    });

    return {
      acao: 'atualizado',
      contatoExistenteAtualizado,
      contatoEncontradoId: contatoEncontrado?.id,
      negocio: {
        id: negocioAbertoExistente.id,
        codigo: cpAtualizado.codigo || '#1001',
        titulo: negocioAbertoExistente.titulo,
        valor: Number(negocioAbertoExistente.valor) || 0,
        moeda: 'BRL',
        funil_id: negocioAbertoExistente.funil_id,
        etapa_id: negocioAbertoExistente.etapa_id,
        contato_id: contatoEncontrado?.id || negocioAbertoExistente.contato_id || '',
        contato_nome: nomeLimpo,
        contato_email: emailLimpo,
        contato_whatsapp: celularLimpo,
        empresa_id:
          contatoEncontrado?.empresa_id || negocioAbertoExistente.empresa_id || '',
        empresa_nome: empresaInformada,
        ...metadadosLead,
        responsavel_id: negocioAbertoExistente.responsavel_id || responsavelId,
        status: 'aberto',
        ultima_atividade_em: new Date().toISOString(),
        campos_personalizados: cpAtualizado,
      },
    };
  }

  // 6. Cria um NOVO Card no Funil de Vendas SEM criar registro em empresas ou contatos
  const novoCodigo = `#${maxCodigoSeq + 1}`;
  const novoId = crypto.randomUUID();
  const tituloCard = metadadosLead.produto_interesse
    ? `[LP] ${empresaInformada} - ${metadadosLead.produto_interesse}`
    : `[LP] ${empresaInformada} - ${nomeLimpo}`;

  const camposPersonalizadosNovo = {
    codigo: novoCodigo,
    ...metadadosLead,
  };

  const payloadInsertCompleto: any = {
    id: novoId,
    organizacao_id: ORG_PADRAO_ID,
    titulo: tituloCard,
    valor: 0,
    moeda: 'BRL',
    funil_id: funilId,
    etapa_id: etapaId,
    // Não cria empresa nem contato novos! Apenas vincula se já existia contato na base
    empresa_id: contatoEncontrado?.empresa_id || null,
    contato_id: contatoEncontrado?.id || null,
    responsavel_id: responsavelId || null,
    status: 'aberto',
    lead_nome: nomeLimpo,
    lead_email: emailLimpo,
    lead_empresa: empresaInformada,
    lead_celular: celularLimpo,
    origem_lead: origemLead,
    url_conversao: urlConversao,
    campanha: metadadosLead.campanha || null,
    midia: metadadosLead.midia || null,
    conjunto_anuncios: metadadosLead.conjunto_anuncios || null,
    utm_source: metadadosLead.utm_source || null,
    utm_medium: metadadosLead.utm_medium || null,
    utm_campaign: metadadosLead.utm_campaign || null,
    utm_content: metadadosLead.utm_content || null,
    utm_term: metadadosLead.utm_term || null,
    produto_interesse: metadadosLead.produto_interesse || null,
    data_hora_cadastro: dataHoraCadastro,
    ultima_atividade_em: new Date().toISOString(),
    campos_personalizados: camposPersonalizadosNovo,
  };

  const payloadInsertCompativel: any = {
    id: novoId,
    organizacao_id: ORG_PADRAO_ID,
    titulo: tituloCard,
    valor: 0,
    moeda: 'BRL',
    funil_id: funilId,
    etapa_id: etapaId,
    empresa_id: contatoEncontrado?.empresa_id || null,
    contato_id: contatoEncontrado?.id || null,
    responsavel_id: responsavelId || null,
    status: 'aberto',
    ultima_atividade_em: new Date().toISOString(),
    campos_personalizados: camposPersonalizadosNovo,
  };

  const { error: errInsert } = await supabaseAnon
    .from('negocios')
    .insert(payloadInsertCompleto);

  if (errInsert) {
    await supabaseAnon.from('negocios').insert(payloadInsertCompativel);
  }

  // Registra nota automática na linha do tempo do card com os dados da Landing Page
  await criarAtividadeNoBanco({
    negocio_id: novoId,
    tipo: 'nota',
    titulo: 'Card criado automaticamente via Landing Page',
    descricao: resumoConversaoTexto,
  });

  const responsavelMembro =
    DADOS_MEMBROS.find((m) => m.id === responsavelId) || DADOS_MEMBROS[0];

  const negocioCriado: Negocio = {
    id: novoId,
    codigo: novoCodigo,
    titulo: tituloCard,
    valor: 0,
    moeda: 'BRL',
    funil_id: funilId,
    etapa_id: etapaId,
    contato_id: contatoEncontrado?.id || '',
    contato_nome: nomeLimpo,
    contato_email: emailLimpo,
    contato_whatsapp: celularLimpo,
    empresa_id: contatoEncontrado?.empresa_id || '',
    empresa_nome: empresaInformada,
    ...metadadosLead,
    responsavel_id: responsavelMembro.id,
    responsavel_nome: responsavelMembro.nome_completo,
    responsavel_avatar: responsavelMembro.avatar_url,
    status: 'aberto',
    ultima_atividade_em: new Date().toISOString(),
    campos_personalizados: camposPersonalizadosNovo,
    atividades: [],
    produtos: [],
  };

  executarAutomacoesPorEvento({
    negocioId: negocioCriado.id,
    negocioObjeto: negocioCriado,
    etapaDestinoId: negocioCriado.etapa_id,
    funilId: negocioCriado.funil_id,
    gatilhoPrincipal: 'novo_negocio',
  }).catch((e) => console.warn('Aviso ao disparar automação em lead LP:', e));

  return {
    acao: 'criado',
    contatoExistenteAtualizado,
    contatoEncontradoId: contatoEncontrado?.id,
    negocio: negocioCriado,
  };
}

// ==============================================================================
// 8. AUTOMAÇÕES DE E-MAIL, TEMPLATES (COM IMAGENS/ANEXOS) & SERVIDOR SMTP
// ==============================================================================

const STORAGE_CONFIG_EMAIL_KEY = 'alldot_config_servidor_email_v1';
const STORAGE_TEMPLATES_EMAIL_KEY = 'alldot_templates_email_v1';
const STORAGE_AUTOMACOES_EMAIL_KEY = 'alldot_automacoes_email_v1';
const STORAGE_LOGS_EMAIL_KEY = 'alldot_logs_envio_email_v1';

export async function buscarConfigServidorEmail(): Promise<ConfiguracaoServidorEmail> {
  try {
    const supabaseAnon = criarClienteAnonStateless();
    const { data, error } = await supabaseAnon
      .from('configuracoes_servidor_email')
      .select('*')
      .eq('organizacao_id', ORG_PADRAO_ID)
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        tipo_conta: data.tipo_conta || CONFIG_SERVIDOR_EMAIL_PADRAO.tipo_conta,
        provedor_nome: data.provedor_nome || CONFIG_SERVIDOR_EMAIL_PADRAO.provedor_nome,
        smtp_host: data.smtp_host || '',
        smtp_porta: Number(data.smtp_porta) || 587,
        seguranca: data.seguranca || 'tls',
        autenticacao_requerida: data.autenticacao_requerida ?? true,
        usuario_smtp: data.usuario_smtp || '',
        senha_smtp: data.senha_smtp || '',
        nome_remetente: data.nome_remetente || '',
        email_remetente: data.email_remetente || '',
        email_resposta: data.email_resposta || '',
        assinatura_html: data.assinatura_html || '',
        limite_diario: Number(data.limite_diario) || 500,
        ativo: data.ativo ?? true,
        ultimo_teste_em: data.ultimo_teste_em || undefined,
        status_conexao: data.status_conexao || 'nao_testado',
      };
    }

    // Fallback em campos_definicoes caso migration 009 não tenha sido rodada ainda
    const { data: defRow } = await supabaseAnon
      .from('campos_definicoes')
      .select('opcoes_json')
      .eq('organizacao_id', ORG_PADRAO_ID)
      .eq('nome_chave', '_config_servidor_email')
      .maybeSingle();

    if (defRow?.opcoes_json && typeof defRow.opcoes_json === 'object') {
      return {
        ...CONFIG_SERVIDOR_EMAIL_PADRAO,
        ...(defRow.opcoes_json as Partial<ConfiguracaoServidorEmail>),
      };
    }
  } catch {
    // Fallback localStorage
  }

  if (typeof window !== 'undefined') {
    try {
      const salvo = window.localStorage.getItem(STORAGE_CONFIG_EMAIL_KEY);
      if (salvo) {
        return { ...CONFIG_SERVIDOR_EMAIL_PADRAO, ...JSON.parse(salvo) };
      }
    } catch {
      // ignore
    }
  }

  return CONFIG_SERVIDOR_EMAIL_PADRAO;
}

export async function salvarConfigServidorEmail(
  novaConfig: Partial<ConfiguracaoServidorEmail>
): Promise<ConfiguracaoServidorEmail> {
  const atual = await buscarConfigServidorEmail();
  const mesclada: ConfiguracaoServidorEmail = {
    ...atual,
    ...novaConfig,
  };

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_CONFIG_EMAIL_KEY, JSON.stringify(mesclada));
    } catch {
      // ignore
    }
  }

  try {
    const supabaseAnon = criarClienteAnonStateless();
    const { error } = await supabaseAnon.from('configuracoes_servidor_email').upsert(
      {
        organizacao_id: ORG_PADRAO_ID,
        tipo_conta: mesclada.tipo_conta,
        provedor_nome: mesclada.provedor_nome,
        smtp_host: mesclada.smtp_host,
        smtp_porta: mesclada.smtp_porta,
        seguranca: mesclada.seguranca,
        autenticacao_requerida: mesclada.autenticacao_requerida,
        usuario_smtp: mesclada.usuario_smtp,
        senha_smtp: mesclada.senha_smtp,
        nome_remetente: mesclada.nome_remetente,
        email_remetente: mesclada.email_remetente,
        email_resposta: mesclada.email_resposta,
        assinatura_html: mesclada.assinatura_html,
        limite_diario: mesclada.limite_diario,
        ativo: mesclada.ativo,
        ultimo_teste_em: mesclada.ultimo_teste_em || null,
        status_conexao: mesclada.status_conexao,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: 'organizacao_id' }
    );

    if (error) {
      await supabaseAnon.from('campos_definicoes').upsert(
        {
          organizacao_id: ORG_PADRAO_ID,
          entidade: 'negocio',
          nome_chave: '_config_servidor_email',
          label: 'Configuração Servidor de E-mail SMTP',
          tipo: 'texto',
          opcoes_json: mesclada as any,
          obrigatorio: false,
          ordem: 997,
        },
        { onConflict: 'organizacao_id,entidade,nome_chave' }
      );
    }
  } catch (err) {
    console.warn('Erro ao salvar config servidor e-mail no Supabase:', err);
  }

  return mesclada;
}

export async function buscarTemplatesEmailDoBanco(): Promise<TemplateEmail[]> {
  try {
    const supabaseAnon = criarClienteAnonStateless();
    const { data, error } = await supabaseAnon
      .from('templates_email')
      .select('*')
      .eq('organizacao_id', ORG_PADRAO_ID)
      .order('criado_em', { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((t: any) => ({
        id: t.id,
        nome: t.nome,
        categoria: t.categoria || 'Comercial',
        assunto: t.assunto || '',
        corpo_html: t.corpo_html || '',
        imagens_corpo: Array.isArray(t.imagens_corpo) ? t.imagens_corpo : [],
        anexos: Array.isArray(t.anexos) ? t.anexos : [],
        ativo: t.ativo ?? true,
        criado_em: t.criado_em || new Date().toISOString(),
        atualizado_em: t.atualizado_em || new Date().toISOString(),
      }));
    }

    const { data: defRow } = await supabaseAnon
      .from('campos_definicoes')
      .select('opcoes_json')
      .eq('organizacao_id', ORG_PADRAO_ID)
      .eq('nome_chave', '_templates_email_lista')
      .maybeSingle();

    if (defRow?.opcoes_json && Array.isArray(defRow.opcoes_json) && defRow.opcoes_json.length > 0) {
      return defRow.opcoes_json as TemplateEmail[];
    }
  } catch {
    // Fallback local
  }

  if (typeof window !== 'undefined') {
    try {
      const salvo = window.localStorage.getItem(STORAGE_TEMPLATES_EMAIL_KEY);
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
  }

  return DADOS_TEMPLATES_EMAIL;
}

async function persistirTemplatesFallback(lista: TemplateEmail[]) {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_TEMPLATES_EMAIL_KEY, JSON.stringify(lista));
    } catch {
      // ignore
    }
  }
  try {
    const supabaseAnon = criarClienteAnonStateless();
    await supabaseAnon.from('campos_definicoes').upsert(
      {
        organizacao_id: ORG_PADRAO_ID,
        entidade: 'negocio',
        nome_chave: '_templates_email_lista',
        label: 'Templates de E-mail Cadastrados',
        tipo: 'texto',
        opcoes_json: lista as any,
        obrigatorio: false,
        ordem: 996,
      },
      { onConflict: 'organizacao_id,entidade,nome_chave' }
    );
  } catch {
    // ignore
  }
}

export async function salvarTemplateEmailNoBanco(
  template: Partial<TemplateEmail> & { nome: string; assunto: string; corpo_html: string }
): Promise<TemplateEmail> {
  const agora = new Date().toISOString();
  const listaAtual = await buscarTemplatesEmailDoBanco();
  const existenteIdx = template.id ? listaAtual.findIndex((t) => t.id === template.id) : -1;

  const itemSalvo: TemplateEmail = {
    id: template.id || crypto.randomUUID(),
    nome: template.nome.trim(),
    categoria: template.categoria || 'Comercial',
    assunto: template.assunto.trim(),
    corpo_html: template.corpo_html,
    imagens_corpo: template.imagens_corpo || [],
    anexos: template.anexos || [],
    ativo: template.ativo ?? true,
    criado_em: existenteIdx >= 0 ? listaAtual[existenteIdx].criado_em : agora,
    atualizado_em: agora,
  };

  const novaLista =
    existenteIdx >= 0
      ? listaAtual.map((t, i) => (i === existenteIdx ? itemSalvo : t))
      : [itemSalvo, ...listaAtual];

  await persistirTemplatesFallback(novaLista);

  try {
    const supabaseAnon = criarClienteAnonStateless();
    await supabaseAnon.from('templates_email').upsert({
      id: itemSalvo.id,
      organizacao_id: ORG_PADRAO_ID,
      nome: itemSalvo.nome,
      categoria: itemSalvo.categoria,
      assunto: itemSalvo.assunto,
      corpo_html: itemSalvo.corpo_html,
      imagens_corpo: itemSalvo.imagens_corpo,
      anexos: itemSalvo.anexos,
      ativo: itemSalvo.ativo,
      atualizado_em: agora,
    });
  } catch (err) {
    console.warn('Aviso ao salvar template de e-mail na tabela dedicada:', err);
  }

  return itemSalvo;
}

export async function removerTemplateEmailDoBanco(templateId: string): Promise<boolean> {
  const listaAtual = await buscarTemplatesEmailDoBanco();
  const novaLista = listaAtual.filter((t) => t.id !== templateId);
  await persistirTemplatesFallback(novaLista);

  try {
    const supabaseAnon = criarClienteAnonStateless();
    await supabaseAnon.from('templates_email').delete().eq('id', templateId);
  } catch {
    // ignore
  }
  return true;
}

export async function buscarAutomacoesEmailDoBanco(): Promise<RegraAutomacaoEmail[]> {
  try {
    const supabaseAnon = criarClienteAnonStateless();
    const { data, error } = await supabaseAnon
      .from('automacoes_email')
      .select('*')
      .eq('organizacao_id', ORG_PADRAO_ID)
      .order('criado_em', { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((r: any) => ({
        id: r.id,
        nome: r.nome,
        descricao: r.descricao || '',
        gatilho: r.gatilho || 'mudanca_etapa',
        funil_id: r.funil_id || '',
        etapa_origem_id: r.etapa_origem_id || undefined,
        etapa_destino_id: r.etapa_destino_id || undefined,
        dias_inatividade: Number(r.dias_inatividade) || 3,
        horas_atraso_envio: Number(r.horas_atraso_envio) || 0,
        destinatario_tipo: r.destinatario_tipo || 'contato_principal',
        email_personalizado: r.email_personalizado || undefined,
        copia_cc: r.copia_cc || undefined,
        template_id: r.template_id || '',
        apenas_horario_comercial: r.apenas_horario_comercial ?? false,
        permitir_redisparo_retorno_etapa: r.permitir_redisparo_retorno_etapa ?? false,
        interromper_se_ganho_perdido: r.interromper_se_ganho_perdido || 'ambos',
        exigir_consentimento: r.exigir_consentimento ?? true,
        respeitar_descadastramento: r.respeitar_descadastramento ?? true,
        pausado_por: r.pausado_por || undefined,
        pausado_em: r.pausado_em || undefined,
        ativo: r.ativo ?? true,
        total_disparos: Number(r.total_disparos) || 0,
        ultimo_disparo_em: r.ultimo_disparo_em || undefined,
        criado_em: r.criado_em || new Date().toISOString(),
      }));
    }

    const { data: defRow } = await supabaseAnon
      .from('campos_definicoes')
      .select('opcoes_json')
      .eq('organizacao_id', ORG_PADRAO_ID)
      .eq('nome_chave', '_automacoes_email_lista')
      .maybeSingle();

    if (defRow?.opcoes_json && Array.isArray(defRow.opcoes_json) && defRow.opcoes_json.length > 0) {
      return defRow.opcoes_json as RegraAutomacaoEmail[];
    }
  } catch {
    // Fallback local
  }

  if (typeof window !== 'undefined') {
    try {
      const salvo = window.localStorage.getItem(STORAGE_AUTOMACOES_EMAIL_KEY);
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
  }

  return DADOS_AUTOMACOES_EMAIL;
}

async function persistirAutomacoesFallback(lista: RegraAutomacaoEmail[]) {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_AUTOMACOES_EMAIL_KEY, JSON.stringify(lista));
    } catch {
      // ignore
    }
  }
  try {
    const supabaseAnon = criarClienteAnonStateless();
    await supabaseAnon.from('campos_definicoes').upsert(
      {
        organizacao_id: ORG_PADRAO_ID,
        entidade: 'negocio',
        nome_chave: '_automacoes_email_lista',
        label: 'Regras de Automação de E-mails',
        tipo: 'texto',
        opcoes_json: lista as any,
        obrigatorio: false,
        ordem: 995,
      },
      { onConflict: 'organizacao_id,entidade,nome_chave' }
    );
  } catch {
    // ignore
  }
}

export async function salvarAutomacaoEmailNoBanco(
  regra: Partial<RegraAutomacaoEmail> & { nome: string; gatilho: GatilhoAutomacaoEmail; template_id: string }
): Promise<RegraAutomacaoEmail> {
  const agora = new Date().toISOString();
  const listaAtual = await buscarAutomacoesEmailDoBanco();
  const existenteIdx = regra.id ? listaAtual.findIndex((r) => r.id === regra.id) : -1;

  const itemSalvo: RegraAutomacaoEmail = {
    id: regra.id || crypto.randomUUID(),
    nome: regra.nome.trim(),
    descricao: regra.descricao || '',
    gatilho: regra.gatilho,
    funil_id: regra.funil_id || '',
    etapa_origem_id: regra.etapa_origem_id || undefined,
    etapa_destino_id: regra.etapa_destino_id || undefined,
    dias_inatividade: Number(regra.dias_inatividade) || 3,
    horas_atraso_envio: Number(regra.horas_atraso_envio) || 0,
    destinatario_tipo: regra.destinatario_tipo || 'contato_principal',
    email_personalizado: regra.email_personalizado || undefined,
    copia_cc: regra.copia_cc || undefined,
    template_id: regra.template_id,
    apenas_horario_comercial: regra.apenas_horario_comercial ?? false,
    permitir_redisparo_retorno_etapa: regra.permitir_redisparo_retorno_etapa ?? false,
    interromper_se_ganho_perdido: regra.interromper_se_ganho_perdido || 'ambos',
    exigir_consentimento: regra.exigir_consentimento ?? true,
    respeitar_descadastramento: regra.respeitar_descadastramento ?? true,
    pausado_por: regra.pausado_por || undefined,
    pausado_em: regra.pausado_em || undefined,
    ativo: regra.ativo ?? true,
    total_disparos:
      existenteIdx >= 0
        ? (regra.total_disparos ?? listaAtual[existenteIdx].total_disparos)
        : 0,
    ultimo_disparo_em:
      existenteIdx >= 0
        ? (regra.ultimo_disparo_em ?? listaAtual[existenteIdx].ultimo_disparo_em)
        : undefined,
    criado_em: existenteIdx >= 0 ? listaAtual[existenteIdx].criado_em : agora,
  };

  const novaLista =
    existenteIdx >= 0
      ? listaAtual.map((r, i) => (i === existenteIdx ? itemSalvo : r))
      : [itemSalvo, ...listaAtual];

  await persistirAutomacoesFallback(novaLista);

  try {
    const supabaseAnon = criarClienteAnonStateless();
    await supabaseAnon.from('automacoes_email').upsert({
      id: itemSalvo.id,
      organizacao_id: ORG_PADRAO_ID,
      nome: itemSalvo.nome,
      descricao: itemSalvo.descricao,
      gatilho: itemSalvo.gatilho,
      funil_id: itemSalvo.funil_id || null,
      etapa_origem_id: itemSalvo.etapa_origem_id || null,
      etapa_destino_id: itemSalvo.etapa_destino_id || null,
      dias_inatividade: itemSalvo.dias_inatividade,
      horas_atraso_envio: itemSalvo.horas_atraso_envio,
      destinatario_tipo: itemSalvo.destinatario_tipo,
      email_personalizado: itemSalvo.email_personalizado || null,
      copia_cc: itemSalvo.copia_cc || null,
      template_id: itemSalvo.template_id || null,
      apenas_horario_comercial: itemSalvo.apenas_horario_comercial,
      permitir_redisparo_retorno_etapa: itemSalvo.permitir_redisparo_retorno_etapa ?? false,
      interromper_se_ganho_perdido: itemSalvo.interromper_se_ganho_perdido || 'ambos',
      exigir_consentimento: itemSalvo.exigir_consentimento ?? true,
      respeitar_descadastramento: itemSalvo.respeitar_descadastramento ?? true,
      pausado_por: itemSalvo.pausado_por || null,
      pausado_em: itemSalvo.pausado_em || null,
      ativo: itemSalvo.ativo,
      total_disparos: itemSalvo.total_disparos,
      ultimo_disparo_em: itemSalvo.ultimo_disparo_em || null,
      atualizado_em: agora,
    });
  } catch (err) {
    console.warn('Aviso ao salvar regra de automação na tabela dedicada:', err);
  }

  return itemSalvo;
}

export async function removerAutomacaoEmailDoBanco(automacaoId: string): Promise<boolean> {
  const listaAtual = await buscarAutomacoesEmailDoBanco();
  const novaLista = listaAtual.filter((r) => r.id !== automacaoId);
  await persistirAutomacoesFallback(novaLista);

  try {
    const supabaseAnon = criarClienteAnonStateless();
    await supabaseAnon.from('automacoes_email').delete().eq('id', automacaoId);
  } catch {
    // ignore
  }
  return true;
}

export async function buscarLogsEnvioEmailDoBanco(): Promise<LogEnvioEmail[]> {
  try {
    const supabaseAnon = criarClienteAnonStateless();
    const { data, error } = await supabaseAnon
      .from('logs_envio_email')
      .select('*')
      .eq('organizacao_id', ORG_PADRAO_ID)
      .order('enviado_em', { ascending: false })
      .limit(50);

    if (!error && data && data.length > 0) {
      return data.map((l: any) => ({
        id: l.id,
        automacao_id: l.automacao_id || undefined,
        automacao_nome: l.automacao_nome || 'Envio Manual / Teste',
        template_id: l.template_id || undefined,
        template_nome: l.template_nome || 'Template',
        negocio_id: l.negocio_id || undefined,
        negocio_titulo: l.negocio_titulo || undefined,
        etapa_id: l.etapa_id || undefined,
        etapa_nome: l.etapa_nome || undefined,
        destinatario_email: l.destinatario_email,
        destinatario_nome: l.destinatario_nome || '',
        assunto: l.assunto,
        gatilho: l.gatilho || 'mudanca_etapa',
        qtd_anexos: Number(l.qtd_anexos) || 0,
        status: l.status || 'enviado',
        mensagem_erro: l.mensagem_erro || undefined,
        motivo_bloqueio: l.motivo_bloqueio || undefined,
        enviado_em: l.enviado_em || new Date().toISOString(),
      }));
    }

    const { data: defRow } = await supabaseAnon
      .from('campos_definicoes')
      .select('opcoes_json')
      .eq('organizacao_id', ORG_PADRAO_ID)
      .eq('nome_chave', '_logs_envio_email_lista')
      .maybeSingle();

    if (defRow?.opcoes_json && Array.isArray(defRow.opcoes_json) && defRow.opcoes_json.length > 0) {
      return defRow.opcoes_json as LogEnvioEmail[];
    }
  } catch {
    // fallback
  }

  if (typeof window !== 'undefined') {
    try {
      const salvo = window.localStorage.getItem(STORAGE_LOGS_EMAIL_KEY);
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
  }

  return DADOS_LOGS_EMAIL;
}

export function interpolarVariaveisTemplateEmail(
  texto: string,
  variaveis: {
    nome_contato?: string;
    nome_empresa?: string;
    titulo_negocio?: string;
    valor_negocio?: string;
    etapa_funil?: string;
    nome_vendedor?: string;
    dias_inatividade?: string;
  }
): string {
  return (texto || '')
    .replace(/\{\{nome_contato\}\}/g, variaveis.nome_contato || 'Cliente')
    .replace(/\{\{nome_empresa\}\}/g, variaveis.nome_empresa || 'sua empresa')
    .replace(/\{\{titulo_negocio\}\}/g, variaveis.titulo_negocio || 'Oportunidade Comercial')
    .replace(/\{\{valor_negocio\}\}/g, variaveis.valor_negocio || 'R$ 0,00')
    .replace(/\{\{etapa_funil\}\}/g, variaveis.etapa_funil || 'Etapa Comercial')
    .replace(/\{\{nome_vendedor\}\}/g, variaveis.nome_vendedor || 'Carlos Silva')
    .replace(/\{\{dias_inatividade\}\}/g, variaveis.dias_inatividade || '3');
}

export async function registrarLogEnvioEmailNoBanco(
  novoLog: Omit<LogEnvioEmail, 'id' | 'enviado_em'>
): Promise<LogEnvioEmail> {
  const itemLog: LogEnvioEmail = {
    ...novoLog,
    id: crypto.randomUUID(),
    enviado_em: new Date().toISOString(),
  };

  const listaAtual = await buscarLogsEnvioEmailDoBanco();
  const novaLista = [itemLog, ...listaAtual].slice(0, 60);

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_LOGS_EMAIL_KEY, JSON.stringify(novaLista));
    } catch {
      // ignore
    }
  }

  try {
    const supabaseAnon = criarClienteAnonStateless();
    const { error } = await supabaseAnon.from('logs_envio_email').insert({
      id: itemLog.id,
      organizacao_id: ORG_PADRAO_ID,
      automacao_id: itemLog.automacao_id || null,
      automacao_nome: itemLog.automacao_nome,
      template_id: itemLog.template_id || null,
      template_nome: itemLog.template_nome,
      negocio_id: itemLog.negocio_id || null,
      negocio_titulo: itemLog.negocio_titulo || null,
      etapa_id: itemLog.etapa_id || null,
      etapa_nome: itemLog.etapa_nome || null,
      destinatario_email: itemLog.destinatario_email,
      destinatario_nome: itemLog.destinatario_nome,
      assunto: itemLog.assunto,
      gatilho: itemLog.gatilho,
      qtd_anexos: itemLog.qtd_anexos,
      status: itemLog.status,
      mensagem_erro: itemLog.mensagem_erro || null,
      motivo_bloqueio: itemLog.motivo_bloqueio || null,
      enviado_em: itemLog.enviado_em,
    });

    if (error) {
      await supabaseAnon.from('campos_definicoes').upsert(
        {
          organizacao_id: ORG_PADRAO_ID,
          entidade: 'negocio',
          nome_chave: '_logs_envio_email_lista',
          label: 'Histórico de Disparos de E-mail',
          tipo: 'texto',
          opcoes_json: novaLista as any,
          obrigatorio: false,
          ordem: 994,
        },
        { onConflict: 'organizacao_id,entidade,nome_chave' }
      );
    }
  } catch {
    // ignore
  }

  return itemLog;
}

const STORAGE_FILA_AUTOMACOES_KEY = 'alldot_fila_automacoes_email_v1';

async function persistirFilaProgramadaFallback(lista: AutomacaoProgramada[]) {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_FILA_AUTOMACOES_KEY, JSON.stringify(lista));
    } catch {
      // ignore
    }
  }
  try {
    const supabaseAnon = criarClienteAnonStateless();
    await supabaseAnon.from('campos_definicoes').upsert(
      {
        organizacao_id: ORG_PADRAO_ID,
        entidade: 'negocio',
        nome_chave: '_fila_automacoes_programadas',
        label: 'Fila de Automações Programadas',
        tipo: 'texto',
        opcoes_json: lista as any,
        obrigatorio: false,
        ordem: 993,
      },
      { onConflict: 'organizacao_id,entidade,nome_chave' }
    );
  } catch {
    // ignore
  }
}

export async function buscarAutomacoesProgramadasDoBanco(
  negocioId?: string
): Promise<AutomacaoProgramada[]> {
  let lista: AutomacaoProgramada[] = [];

  try {
    const supabaseAnon = criarClienteAnonStateless();
    let query = supabaseAnon
      .from('automacoes_fila_programada')
      .select('*')
      .eq('organizacao_id', ORG_PADRAO_ID)
      .order('agendado_para', { ascending: true });

    if (negocioId) {
      query = query.eq('negocio_id', negocioId);
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      lista = data.map((item: any) => ({
        id: item.id,
        automacao_id: item.automacao_id,
        automacao_nome: item.automacao_nome,
        template_id: item.template_id || undefined,
        template_nome: item.template_nome,
        negocio_id: item.negocio_id,
        negocio_titulo: item.negocio_titulo || 'Negociação',
        etapa_id: item.etapa_id || undefined,
        etapa_nome: item.etapa_nome || undefined,
        destinatario_email: item.destinatario_email,
        destinatario_nome: item.destinatario_nome || '',
        gatilho: item.gatilho || 'mudanca_etapa',
        agendado_para: item.agendado_para,
        status: item.status || 'agendada',
        motivo_cancelamento: item.motivo_cancelamento || undefined,
        criado_em: item.criado_em || new Date().toISOString(),
      }));
      return lista;
    }

    const { data: defRow } = await supabaseAnon
      .from('campos_definicoes')
      .select('opcoes_json')
      .eq('organizacao_id', ORG_PADRAO_ID)
      .eq('nome_chave', '_fila_automacoes_programadas')
      .maybeSingle();

    if (defRow?.opcoes_json && Array.isArray(defRow.opcoes_json)) {
      lista = defRow.opcoes_json as AutomacaoProgramada[];
      return negocioId ? lista.filter((i) => i.negocio_id === negocioId) : lista;
    }
  } catch {
    // fallback
  }

  if (typeof window !== 'undefined') {
    try {
      const salvo = window.localStorage.getItem(STORAGE_FILA_AUTOMACOES_KEY);
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed)) {
          return negocioId
            ? parsed.filter((i: AutomacaoProgramada) => i.negocio_id === negocioId)
            : parsed;
        }
      }
    } catch {
      // ignore
    }
  }

  return negocioId
    ? DADOS_AUTOMACOES_PROGRAMADAS.filter((i) => i.negocio_id === negocioId)
    : DADOS_AUTOMACOES_PROGRAMADAS;
}

export async function agendarAutomacaoProgramadaNoBanco(
  nova: Omit<AutomacaoProgramada, 'id' | 'criado_em'>
): Promise<AutomacaoProgramada> {
  const listaAtual = await buscarAutomacoesProgramadasDoBanco();
  // Evita duplicar agendamento idêntico já aberto na fila
  const jaAgendada = listaAtual.find(
    (item) =>
      item.negocio_id === nova.negocio_id &&
      item.automacao_id === nova.automacao_id &&
      item.status === 'agendada'
  );
  if (jaAgendada) return jaAgendada;

  const registro: AutomacaoProgramada = {
    ...nova,
    id: crypto.randomUUID(),
    criado_em: new Date().toISOString(),
  };

  const novaLista = [registro, ...listaAtual].slice(0, 100);
  await persistirFilaProgramadaFallback(novaLista);

  try {
    const supabaseAnon = criarClienteAnonStateless();
    await supabaseAnon.from('automacoes_fila_programada').upsert({
      id: registro.id,
      organizacao_id: ORG_PADRAO_ID,
      automacao_id: registro.automacao_id,
      automacao_nome: registro.automacao_nome,
      template_id: registro.template_id || null,
      template_nome: registro.template_nome,
      negocio_id: registro.negocio_id,
      negocio_titulo: registro.negocio_titulo,
      etapa_id: registro.etapa_id || null,
      etapa_nome: registro.etapa_nome || null,
      destinatario_email: registro.destinatario_email,
      destinatario_nome: registro.destinatario_nome || '',
      gatilho: registro.gatilho,
      agendado_para: registro.agendado_para,
      status: registro.status,
      motivo_cancelamento: registro.motivo_cancelamento || null,
      criado_em: registro.criado_em,
      atualizado_em: new Date().toISOString(),
    });
  } catch {
    // ignore
  }

  return registro;
}

export async function cancelarAutomacaoProgramadaNoBanco(
  programacaoId: string,
  motivo: string = 'Cancelado manualmente pelo vendedor'
): Promise<boolean> {
  const listaAtual = await buscarAutomacoesProgramadasDoBanco();
  const novaLista = listaAtual.map((item) =>
    item.id === programacaoId
      ? { ...item, status: 'cancelada' as const, motivo_cancelamento: motivo }
      : item
  );
  await persistirFilaProgramadaFallback(novaLista);

  try {
    const supabaseAnon = criarClienteAnonStateless();
    await supabaseAnon
      .from('automacoes_fila_programada')
      .update({
        status: 'cancelada',
        motivo_cancelamento: motivo,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', programacaoId);
  } catch {
    // ignore
  }
  return true;
}

export async function interromperAutomacoesPorStatusNegocio(
  negocioId: string,
  status: 'ganho' | 'perdido'
): Promise<number> {
  const [listaAtual, regras] = await Promise.all([
    buscarAutomacoesProgramadasDoBanco(),
    buscarAutomacoesEmailDoBanco(),
  ]);

  let interrompidas = 0;
  const motivo =
    status === 'ganho'
      ? 'Régua interrompida automaticamente: negócio marcado como GANHO.'
      : 'Régua interrompida automaticamente: negócio marcado como PERDIDO.';

  const novaLista = listaAtual.map((item) => {
    if (
      item.negocio_id === negocioId &&
      (item.status === 'agendada' || item.status === 'pausada')
    ) {
      const regra = regras.find((r) => r.id === item.automacao_id);
      const politica = regra?.interromper_se_ganho_perdido || 'ambos';
      const deveInterromper =
        politica === 'ambos' ||
        (politica === 'apenas_ganho' && status === 'ganho') ||
        (politica === 'apenas_perdido' && status === 'perdido');

      if (deveInterromper) {
        interrompidas += 1;
        return {
          ...item,
          status: 'cancelada' as const,
          motivo_cancelamento: motivo,
        };
      }
    }
    return item;
  });

  if (interrompidas > 0) {
    await persistirFilaProgramadaFallback(novaLista);
    try {
      const supabaseAnon = criarClienteAnonStateless();
      await supabaseAnon
        .from('automacoes_fila_programada')
        .update({
          status: 'cancelada',
          motivo_cancelamento: motivo,
          atualizado_em: new Date().toISOString(),
        })
        .eq('negocio_id', negocioId)
        .in('status', ['agendada', 'pausada']);
    } catch {
      // ignore
    }
  }

  return interrompidas;
}

export async function alternarPausaAutomacoesNegocio(
  negocioId: string,
  pausar: boolean,
  responsavelNome: string = 'Vendedor'
): Promise<boolean> {
  const agora = new Date().toISOString();
  try {
    const supabaseAnon = criarClienteAnonStateless();
    const { data: negRow } = await supabaseAnon
      .from('negocios')
      .select('campos_personalizados')
      .eq('id', negocioId)
      .maybeSingle();

    const cpAtual = negRow?.campos_personalizados || {};
    const novoCp = {
      ...cpAtual,
      automacoes_pausadas: pausar,
      automacoes_pausadas_por: pausar ? responsavelNome : null,
      automacoes_pausadas_em: pausar ? agora : null,
    };

    const { error } = await supabaseAnon
      .from('negocios')
      .update({
        automacoes_pausadas: pausar,
        automacoes_pausadas_por: pausar ? responsavelNome : null,
        automacoes_pausadas_em: pausar ? agora : null,
        campos_personalizados: novoCp,
        atualizado_em: agora,
      })
      .eq('id', negocioId);

    if (error) {
      await supabaseAnon
        .from('negocios')
        .update({ campos_personalizados: novoCp, atualizado_em: agora })
        .eq('id', negocioId);
    }

    // Atualiza também a fila programada do card
    const filaAtual = await buscarAutomacoesProgramadasDoBanco();
    const novaFila = filaAtual.map((item) => {
      if (item.negocio_id !== negocioId) return item;
      if (pausar && item.status === 'agendada') {
        return {
          ...item,
          status: 'pausada' as const,
          motivo_cancelamento: `Pausada manualmente por ${responsavelNome}`,
        };
      }
      if (!pausar && item.status === 'pausada') {
        return {
          ...item,
          status: 'agendada' as const,
          motivo_cancelamento: undefined,
        };
      }
      return item;
    });
    await persistirFilaProgramadaFallback(novaFila);
  } catch (err) {
    console.warn('Aviso ao alternar pausa de automação no negócio:', err);
  }
  return true;
}

export async function atualizarPreferenciasEmailNegocioOuContato(params: {
  negocioId: string;
  contatoId?: string;
  consentimentoEmail: boolean;
  descadastradoEmail: boolean;
  motivoDescadastramento?: string;
}): Promise<boolean> {
  const agora = new Date().toISOString();
  try {
    const supabaseAnon = criarClienteAnonStateless();
    const { data: negRow } = await supabaseAnon
      .from('negocios')
      .select('campos_personalizados')
      .eq('id', params.negocioId)
      .maybeSingle();

    const cpAtual = negRow?.campos_personalizados || {};
    const novoCp = {
      ...cpAtual,
      consentimento_email: params.consentimentoEmail,
      descadastrado_email: params.descadastradoEmail,
    };

    const { error } = await supabaseAnon
      .from('negocios')
      .update({
        consentimento_email: params.consentimentoEmail,
        descadastrado_email: params.descadastradoEmail,
        campos_personalizados: novoCp,
        atualizado_em: agora,
      })
      .eq('id', params.negocioId);

    if (error) {
      await supabaseAnon
        .from('negocios')
        .update({ campos_personalizados: novoCp, atualizado_em: agora })
        .eq('id', params.negocioId);
    }

    if (params.contatoId) {
      await supabaseAnon
        .from('contatos')
        .update({
          consentimento_email: params.consentimentoEmail,
          descadastrado_email: params.descadastradoEmail,
          descadastrado_em: params.descadastradoEmail ? agora : null,
          motivo_descadastramento: params.motivoDescadastramento || null,
          atualizado_em: agora,
        })
        .eq('id', params.contatoId);
    }
  } catch (err) {
    console.warn('Aviso ao atualizar consentimento/opt-out:', err);
  }
  return true;
}

async function validarConsentimentoERegrasContato(params: {
  regra: RegraAutomacaoEmail;
  negocio: Negocio;
  destinatarioEmail: string;
  contatosLista: Contato[];
}): Promise<{ permitido: boolean; motivoBloqueio?: string }> {
  const email = (params.destinatarioEmail || '').trim().toLowerCase();
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailValido) {
    return {
      permitido: false,
      motivoBloqueio: `E-mail de destino inválido ou ausente ("${params.destinatarioEmail || 'vazio'}").`,
    };
  }

  // Se o destinatário é o vendedor ou um e-mail interno personalizado, não aplica opt-out de lead externo
  if (params.regra.destinatario_tipo === 'responsavel') {
    return { permitido: true };
  }

  const cp = params.negocio.campos_personalizados || {};
  const contato = params.contatosLista.find(
    (c) =>
      c.id === params.negocio.contato_id ||
      (c.email && c.email.trim().toLowerCase() === email)
  ) as any;

  const descadastrado = Boolean(
    params.negocio.descadastrado_email ??
    cp.descadastrado_email ??
    contato?.descadastrado_email ??
    false
  );

  if (params.regra.respeitar_descadastramento !== false && descadastrado) {
    return {
      permitido: false,
      motivoBloqueio: `Contato ${email} está descadastrado (opt-out ativo). Envio bloqueado pela política de LGPD/contato.`,
    };
  }

  const consentimento =
    params.negocio.consentimento_email ??
    cp.consentimento_email ??
    contato?.consentimento_email ??
    true;

  if (params.regra.exigir_consentimento !== false && consentimento === false) {
    return {
      permitido: false,
      motivoBloqueio: `Contato ${email} não possui consentimento ativo para recebimento de e-mails automáticos.`,
    };
  }

  return { permitido: true };
}

export async function executarAutomacoesPorEvento(params: {
  negocioId: string;
  negocioObjeto?: Negocio;
  etapaDestinoId?: string;
  funilId?: string;
  statusNegocio?: 'aberto' | 'ganho' | 'perdido';
  gatilhoPrincipal: GatilhoAutomacaoEmail;
}): Promise<{ disparados: number; bloqueados: number; logs: LogEnvioEmail[] }> {
  const logsGerados: LogEnvioEmail[] = [];
  let bloqueados = 0;

  try {
    const [regras, templates, etapas, negocios, logsAnteriores, contatosLista] =
      await Promise.all([
        buscarAutomacoesEmailDoBanco(),
        buscarTemplatesEmailDoBanco(),
        buscarEtapasDoBanco(),
        params.negocioObjeto ? Promise.resolve([params.negocioObjeto]) : buscarNegociosDoBanco(),
        buscarLogsEnvioEmailDoBanco(),
        buscarContatosDoBanco(),
      ]);

    const negocio =
      params.negocioObjeto || negocios.find((n) => n.id === params.negocioId);
    if (!negocio) return { disparados: 0, bloqueados: 0, logs: [] };

    const statusEfetivo = params.statusNegocio || negocio.status;
    const etapaAlvoId = params.etapaDestinoId || negocio.etapa_id;
    const etapaObj = etapas.find((e) => e.id === etapaAlvoId);
    const funilAlvoId = params.funilId || etapaObj?.funil_id || negocio.funil_id;

    // Também agenda automaticamente regras de inatividade para o vendedor visualizar como próximas automações
    const regrasInatividadeCompat = regras.filter(
      (r) =>
        r.ativo &&
        r.gatilho === 'tempo_inatividade' &&
        statusEfetivo === 'aberto' &&
        (!r.funil_id || !funilAlvoId || r.funil_id === funilAlvoId) &&
        (!r.etapa_destino_id || !etapaAlvoId || r.etapa_destino_id === etapaAlvoId)
    );

    for (const regraInat of regrasInatividadeCompat) {
      const tpl = templates.find((t) => t.id === regraInat.template_id);
      const emailDest =
        negocio.contato_email || negocio.lead_email || 'cliente@empresa.com.br';
      const nomeDest =
        negocio.contato_nome || negocio.lead_nome || negocio.empresa_nome || 'Cliente';
      const dias = Math.max(1, Number(regraInat.dias_inatividade) || 3);
      await agendarAutomacaoProgramadaNoBanco({
        automacao_id: regraInat.id,
        automacao_nome: regraInat.nome,
        template_id: tpl?.id,
        template_nome: tpl?.nome || 'Modelo Padrão',
        negocio_id: negocio.id,
        negocio_titulo: negocio.titulo,
        etapa_id: etapaAlvoId,
        etapa_nome: etapaObj?.nome || 'Etapa do Funil',
        destinatario_email: emailDest,
        destinatario_nome: nomeDest,
        gatilho: 'tempo_inatividade',
        agendado_para: new Date(Date.now() + dias * 24 * 3600 * 1000).toISOString(),
        status: negocio.automacoes_pausadas ? 'pausada' : 'agendada',
      });
    }

    const regrasCompativeis = regras.filter((regra) => {
      if (!regra.ativo) return false;
      if (regra.gatilho !== params.gatilhoPrincipal) return false;
      if (regra.funil_id && funilAlvoId && regra.funil_id !== funilAlvoId) return false;
      if (
        (regra.gatilho === 'mudanca_etapa' || regra.gatilho === 'novo_negocio') &&
        regra.etapa_destino_id &&
        etapaAlvoId &&
        regra.etapa_destino_id !== etapaAlvoId
      ) {
        return false;
      }
      return true;
    });

    if (regrasCompativeis.length === 0) {
      return { disparados: 0, bloqueados: 0, logs: [] };
    }

    for (const regra of regrasCompativeis) {
      const template = templates.find((t) => t.id === regra.template_id);
      if (!template) continue;

      const responsavelMembro =
        DADOS_MEMBROS.find((m) => m.id === negocio.responsavel_id) || DADOS_MEMBROS[0];

      const destinatarioEmail =
        regra.destinatario_tipo === 'email_personalizado'
          ? regra.email_personalizado || 'comercial@brinday.com.br'
          : regra.destinatario_tipo === 'responsavel'
            ? responsavelMembro.email
            : negocio.contato_email ||
            negocio.lead_email ||
            responsavelMembro.email ||
            'cliente@empresa.com.br';

      const destinatarioNome =
        regra.destinatario_tipo === 'responsavel'
          ? responsavelMembro.nome_completo
          : negocio.contato_nome || negocio.lead_nome || negocio.empresa_nome || 'Cliente';

      const valorFormatado = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(negocio.valor || 0);

      const assuntoFinal = interpolarVariaveisTemplateEmail(template.assunto, {
        nome_contato: destinatarioNome,
        nome_empresa: negocio.empresa_nome || negocio.lead_empresa || 'Sua Empresa',
        titulo_negocio: negocio.titulo,
        valor_negocio: valorFormatado,
        etapa_funil: etapaObj?.nome || 'Funil Comercial',
        nome_vendedor: responsavelMembro.nome_completo,
        dias_inatividade: String(regra.dias_inatividade || 3),
      });

      // CONTROLE 1: Pausa manual no negócio pelo vendedor/administrador
      const pausadoNoNegocio = Boolean(
        negocio.automacoes_pausadas ?? negocio.campos_personalizados?.automacoes_pausadas
      );
      if (pausadoNoNegocio) {
        bloqueados += 1;
        const logPausa = await registrarLogEnvioEmailNoBanco({
          automacao_id: regra.id,
          automacao_nome: regra.nome,
          template_id: template.id,
          template_nome: template.nome,
          negocio_id: negocio.id,
          negocio_titulo: negocio.titulo,
          etapa_id: etapaAlvoId,
          etapa_nome: etapaObj?.nome,
          destinatario_email: destinatarioEmail,
          destinatario_nome: destinatarioNome,
          assunto: assuntoFinal,
          gatilho: regra.gatilho,
          qtd_anexos: (template.anexos || []).length,
          status: 'pausado',
          motivo_bloqueio: 'Automações pausadas manualmente neste negócio pelo vendedor/admin.',
        });
        logsGerados.push(logPausa);
        continue;
      }

      // CONTROLE 2: Interrupção por negócio Ganho ou Perdido
      if (
        (statusEfetivo === 'ganho' || statusEfetivo === 'perdido') &&
        regra.gatilho !== 'negocio_ganho' &&
        regra.gatilho !== 'negocio_perdido'
      ) {
        const politica = regra.interromper_se_ganho_perdido || 'ambos';
        const deveInterromper =
          politica === 'ambos' ||
          (politica === 'apenas_ganho' && statusEfetivo === 'ganho') ||
          (politica === 'apenas_perdido' && statusEfetivo === 'perdido');

        if (deveInterromper) {
          bloqueados += 1;
          const logInterrupcao = await registrarLogEnvioEmailNoBanco({
            automacao_id: regra.id,
            automacao_nome: regra.nome,
            template_id: template.id,
            template_nome: template.nome,
            negocio_id: negocio.id,
            negocio_titulo: negocio.titulo,
            etapa_id: etapaAlvoId,
            etapa_nome: etapaObj?.nome,
            destinatario_email: destinatarioEmail,
            destinatario_nome: destinatarioNome,
            assunto: assuntoFinal,
            gatilho: regra.gatilho,
            qtd_anexos: (template.anexos || []).length,
            status: 'interrompido_status',
            motivo_bloqueio: `Régua interrompida conforme política (${statusEfetivo}).`,
          });
          logsGerados.push(logInterrupcao);
          continue;
        }
      }

      // CONTROLE 3: Impedir disparos duplicados quando negociação retornar a etapa anterior (salvo configuração explícita)
      if (regra.gatilho === 'mudanca_etapa' && !regra.permitir_redisparo_retorno_etapa) {
        const jaEnviadoNestaEtapa = logsAnteriores.some(
          (l) =>
            l.status === 'enviado' &&
            l.negocio_id === negocio.id &&
            l.automacao_id === regra.id &&
            (!l.etapa_id || l.etapa_id === etapaAlvoId)
        );

        if (jaEnviadoNestaEtapa) {
          bloqueados += 1;
          const logDup = await registrarLogEnvioEmailNoBanco({
            automacao_id: regra.id,
            automacao_nome: regra.nome,
            template_id: template.id,
            template_nome: template.nome,
            negocio_id: negocio.id,
            negocio_titulo: negocio.titulo,
            etapa_id: etapaAlvoId,
            etapa_nome: etapaObj?.nome,
            destinatario_email: destinatarioEmail,
            destinatario_nome: destinatarioNome,
            assunto: assuntoFinal,
            gatilho: regra.gatilho,
            qtd_anexos: (template.anexos || []).length,
            status: 'bloqueado_duplicidade',
            motivo_bloqueio:
              'Disparo bloqueado para evitar duplicidade ao retornar a esta etapa (configuração padrão de proteção).',
          });
          logsGerados.push(logDup);
          continue;
        }
      }

      // CONTROLE 4: Verificar descadastramento, consentimento e regras de contato antes de cada envio
      const checkContato = await validarConsentimentoERegrasContato({
        regra,
        negocio,
        destinatarioEmail,
        contatosLista,
      });

      if (!checkContato.permitido) {
        bloqueados += 1;
        const logOptOut = await registrarLogEnvioEmailNoBanco({
          automacao_id: regra.id,
          automacao_nome: regra.nome,
          template_id: template.id,
          template_nome: template.nome,
          negocio_id: negocio.id,
          negocio_titulo: negocio.titulo,
          etapa_id: etapaAlvoId,
          etapa_nome: etapaObj?.nome,
          destinatario_email: destinatarioEmail,
          destinatario_nome: destinatarioNome,
          assunto: assuntoFinal,
          gatilho: regra.gatilho,
          qtd_anexos: (template.anexos || []).length,
          status: 'bloqueado_optout',
          motivo_bloqueio: checkContato.motivoBloqueio,
        });
        logsGerados.push(logOptOut);
        continue;
      }

      // CONTROLE 5: Se tiver atraso programado (> 0 horas), agenda na fila visível ao vendedor
      if ((regra.horas_atraso_envio || 0) > 0) {
        const agendadoPara = new Date(
          Date.now() + Number(regra.horas_atraso_envio) * 3600 * 1000
        ).toISOString();
        await agendarAutomacaoProgramadaNoBanco({
          automacao_id: regra.id,
          automacao_nome: regra.nome,
          template_id: template.id,
          template_nome: template.nome,
          negocio_id: negocio.id,
          negocio_titulo: negocio.titulo,
          etapa_id: etapaAlvoId,
          etapa_nome: etapaObj?.nome,
          destinatario_email: destinatarioEmail,
          destinatario_nome: destinatarioNome,
          gatilho: regra.gatilho,
          agendado_para: agendadoPara,
          status: 'agendada',
        });
        continue;
      }

      // Disparo imediato com registro completo (data, horário, destinatário, modelo, gatilho e status)
      const logCriado = await registrarLogEnvioEmailNoBanco({
        automacao_id: regra.id,
        automacao_nome: regra.nome,
        template_id: template.id,
        template_nome: template.nome,
        negocio_id: negocio.id,
        negocio_titulo: negocio.titulo,
        etapa_id: etapaAlvoId,
        etapa_nome: etapaObj?.nome,
        destinatario_email: destinatarioEmail,
        destinatario_nome: destinatarioNome,
        assunto: assuntoFinal,
        gatilho: regra.gatilho,
        qtd_anexos: (template.anexos || []).length,
        status: 'enviado',
      });

      logsGerados.push(logCriado);

      if (typeof window !== 'undefined') {
        try {
          fetch('/api/emails/enviar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              acao: 'disparar',
              automacao_id: regra.id,
              automacao_nome: regra.nome,
              template_id: template.id,
              template_nome: template.nome,
              negocio_id: negocio.id,
              negocio_titulo: negocio.titulo,
              destinatario_email: destinatarioEmail,
              destinatario_nome: destinatarioNome,
              assunto: assuntoFinal,
              gatilho: regra.gatilho,
              qtd_anexos: (template.anexos || []).length,
            }),
          }).catch((err) => console.warn('Erro ao disparar envio de e-mail via API:', err));
        } catch {
          // ignore
        }
      }

      await salvarAutomacaoEmailNoBanco({
        ...regra,
        total_disparos: (regra.total_disparos || 0) + 1,
        ultimo_disparo_em: new Date().toISOString(),
      });

      await criarAtividadeNoBanco({
        negocio_id: negocio.id,
        tipo: 'email',
        titulo: `E-mail Automático Enviado: ${assuntoFinal}`,
        descricao: `Regra acionada: "${regra.nome}"\nPara: ${destinatarioNome} <${destinatarioEmail}>\nModelo: ${template.nome} (${(template.imagens_corpo || []).length} imagem(ns), ${(template.anexos || []).length} anexo(s)).`,
        concluida_em: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn('Erro ao executar automações de e-mail:', err);
  }

  return {
    disparados: logsGerados.filter((l) => l.status === 'enviado').length,
    bloqueados,
    logs: logsGerados,
  };
}

export async function verificarEDispararInatividadeEmail(): Promise<{
  verificados: number;
  disparados: number;
  bloqueados: number;
  logs: LogEnvioEmail[];
}> {
  const [regras, templates, negocios, etapas, logsAnteriores, contatosLista] =
    await Promise.all([
      buscarAutomacoesEmailDoBanco(),
      buscarTemplatesEmailDoBanco(),
      buscarNegociosDoBanco(),
      buscarEtapasDoBanco(),
      buscarLogsEnvioEmailDoBanco(),
      buscarContatosDoBanco(),
    ]);

  const regrasInatividade = regras.filter(
    (r) => r.ativo && r.gatilho === 'tempo_inatividade'
  );
  const logsGerados: LogEnvioEmail[] = [];
  let bloqueados = 0;
  const negociosAbertos = negocios.filter((n) => n.status === 'aberto');

  for (const regra of regrasInatividade) {
    const template = templates.find((t) => t.id === regra.template_id);
    if (!template) continue;

    const limiteDias = Math.max(1, Number(regra.dias_inatividade) || 3);

    for (const neg of negociosAbertos) {
      const etapaNeg = etapas.find((e) => e.id === neg.etapa_id);
      const funilNeg = etapaNeg?.funil_id || neg.funil_id;

      if (regra.funil_id && funilNeg && regra.funil_id !== funilNeg) continue;
      if (regra.etapa_destino_id && neg.etapa_id !== regra.etapa_destino_id) continue;

      const ultimaAtivMs = neg.ultima_atividade_em
        ? new Date(neg.ultima_atividade_em).getTime()
        : Date.now();
      const diasParado = Math.floor(
        (Date.now() - ultimaAtivMs) / (1000 * 60 * 60 * 24)
      );

      if (diasParado >= limiteDias) {
        const responsavelMembro =
          DADOS_MEMBROS.find((m) => m.id === neg.responsavel_id) || DADOS_MEMBROS[0];
        const destinatarioEmail =
          neg.contato_email ||
          neg.lead_email ||
          responsavelMembro.email ||
          'cliente@empresa.com.br';
        const destinatarioNome =
          neg.contato_nome || neg.lead_nome || neg.empresa_nome || 'Cliente';

        const assuntoFinal = interpolarVariaveisTemplateEmail(template.assunto, {
          nome_contato: destinatarioNome,
          nome_empresa: neg.empresa_nome || neg.lead_empresa || 'Sua Empresa',
          titulo_negocio: neg.titulo,
          valor_negocio: new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(neg.valor || 0),
          etapa_funil: etapaNeg?.nome || 'Etapa Comercial',
          nome_vendedor: responsavelMembro.nome_completo,
          dias_inatividade: String(diasParado),
        });

        // Pausa manual no negócio
        if (neg.automacoes_pausadas || neg.campos_personalizados?.automacoes_pausadas) {
          bloqueados += 1;
          logsGerados.push(
            await registrarLogEnvioEmailNoBanco({
              automacao_id: regra.id,
              automacao_nome: regra.nome,
              template_id: template.id,
              template_nome: template.nome,
              negocio_id: neg.id,
              negocio_titulo: neg.titulo,
              etapa_id: neg.etapa_id,
              etapa_nome: etapaNeg?.nome,
              destinatario_email: destinatarioEmail,
              destinatario_nome: destinatarioNome,
              assunto: assuntoFinal,
              gatilho: 'tempo_inatividade',
              qtd_anexos: (template.anexos || []).length,
              status: 'pausado',
              motivo_bloqueio: 'Automações pausadas manualmente neste negócio.',
            })
          );
          continue;
        }

        // Evitar disparo repetido da mesma regra de inatividade na mesma etapa
        if (!regra.permitir_redisparo_retorno_etapa) {
          const jaEnviado = logsAnteriores.some(
            (l) =>
              l.status === 'enviado' &&
              l.negocio_id === neg.id &&
              l.automacao_id === regra.id
          );
          if (jaEnviado) continue;
        }

        // Verificar consentimento e opt-out
        const checkContato = await validarConsentimentoERegrasContato({
          regra,
          negocio: neg,
          destinatarioEmail,
          contatosLista,
        });
        if (!checkContato.permitido) {
          bloqueados += 1;
          logsGerados.push(
            await registrarLogEnvioEmailNoBanco({
              automacao_id: regra.id,
              automacao_nome: regra.nome,
              template_id: template.id,
              template_nome: template.nome,
              negocio_id: neg.id,
              negocio_titulo: neg.titulo,
              etapa_id: neg.etapa_id,
              etapa_nome: etapaNeg?.nome,
              destinatario_email: destinatarioEmail,
              destinatario_nome: destinatarioNome,
              assunto: assuntoFinal,
              gatilho: 'tempo_inatividade',
              qtd_anexos: (template.anexos || []).length,
              status: 'bloqueado_optout',
              motivo_bloqueio: checkContato.motivoBloqueio,
            })
          );
          continue;
        }

        const log = await registrarLogEnvioEmailNoBanco({
          automacao_id: regra.id,
          automacao_nome: regra.nome,
          template_id: template.id,
          template_nome: template.nome,
          negocio_id: neg.id,
          negocio_titulo: neg.titulo,
          etapa_id: neg.etapa_id,
          etapa_nome: etapaNeg?.nome,
          destinatario_email: destinatarioEmail,
          destinatario_nome: destinatarioNome,
          assunto: assuntoFinal,
          gatilho: 'tempo_inatividade',
          qtd_anexos: (template.anexos || []).length,
          status: 'enviado',
        });

        logsGerados.push(log);

        if (typeof window !== 'undefined') {
          try {
            fetch('/api/emails/enviar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                acao: 'disparar',
                automacao_id: regra.id,
                automacao_nome: regra.nome,
                template_id: template.id,
                template_nome: template.nome,
                negocio_id: neg.id,
                negocio_titulo: neg.titulo,
                destinatario_email: destinatarioEmail,
                destinatario_nome: destinatarioNome,
                assunto: assuntoFinal,
                gatilho: 'tempo_inatividade',
                qtd_anexos: (template.anexos || []).length,
              }),
            }).catch((err) => console.warn('Erro ao disparar envio inatividade via API:', err));
          } catch {
            // ignore
          }
        }

        await salvarAutomacaoEmailNoBanco({
          ...regra,
          total_disparos: (regra.total_disparos || 0) + 1,
          ultimo_disparo_em: new Date().toISOString(),
        });
      }
    }
  }

  return {
    verificados: negociosAbertos.length,
    disparados: logsGerados.filter((l) => l.status === 'enviado').length,
    bloqueados,
    logs: logsGerados,
  };
}

// ==============================================================================
// 9. CAMPANHAS DE E-MAIL MARKETING, LISTAS, SEGMENTAÇÕES & MÉTRICAS
// ==============================================================================

const FALLBACK_KEY_LISTAS_MKT = '_listas_marketing_v1';
const FALLBACK_KEY_CAMPANHAS_MKT = '_campanhas_marketing_v1';
const FALLBACK_KEY_CAMPANHAS_ENVIOS = '_campanhas_envios_v1';
const FALLBACK_KEY_CAMPANHAS_CLIQUES = '_campanhas_cliques_v1';

async function lerJsonFallbackMarketing<T>(chave: string, padrao: T): Promise<T> {
  try {
    const supabaseAnon = criarClienteAnonStateless();
    const { data, error } = await supabaseAnon
      .from('campos_definicoes')
      .select('opcoes_json')
      .eq('organizacao_id', ORG_PADRAO_ID)
      .eq('nome_chave', chave)
      .maybeSingle();

    if (!error && data?.opcoes_json) {
      return data.opcoes_json as T;
    }
  } catch {
    // fallback
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(`alldot_${chave}`);
      if (raw) return JSON.parse(raw) as T;
    } catch {
      // ignore
    }
  }
  return padrao;
}

async function salvarJsonFallbackMarketing<T>(chave: string, valor: T): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(`alldot_${chave}`, JSON.stringify(valor));
    } catch {
      // ignore
    }
  }

  try {
    const supabaseAnon = criarClienteAnonStateless();
    const { data: existente } = await supabaseAnon
      .from('campos_definicoes')
      .select('id')
      .eq('organizacao_id', ORG_PADRAO_ID)
      .eq('nome_chave', chave)
      .maybeSingle();

    if (existente?.id) {
      await supabaseAnon
        .from('campos_definicoes')
        .update({ opcoes_json: valor })
        .eq('id', existente.id);
    } else {
      await supabaseAnon.from('campos_definicoes').insert({
        organizacao_id: ORG_PADRAO_ID,
        entidade: 'negocio',
        nome_chave: chave,
        label: chave,
        tipo: 'texto',
        opcoes_json: valor,
        obrigatorio: false,
        ordem: 999,
      });
    }
  } catch {
    // ignore
  }
}

export async function listarListasMarketingNoBanco(): Promise<ListaMarketing[]> {
  try {
    const supabaseAnon = criarClienteAnonStateless();
    const { data, error } = await supabaseAnon
      .from('listas_marketing')
      .select('*, listas_marketing_contatos(contato_id, email, nome)')
      .eq('organizacao_id', ORG_PADRAO_ID)
      .order('criado_em', { ascending: true });

    if (!error && Array.isArray(data)) {
      if (data.length === 0) {
        return DADOS_LISTAS_MARKETING;
      }
      return data.map((row) => ({
        id: row.id,
        nome: row.nome,
        descricao: row.descricao || '',
        tipo: row.tipo === 'estatica' ? 'estatica' : 'dinamica',
        criterios: (row.criterios_json || {}) as CriteriosSegmentacaoLista,
        contatos_estaticos: Array.isArray(row.listas_marketing_contatos)
          ? row.listas_marketing_contatos.map((c: { contato_id?: string; email: string; nome?: string }) => ({
            contato_id: c.contato_id,
            email: c.email,
            nome: c.nome,
          }))
          : [],
        ativa: row.ativa ?? true,
        criado_em: row.criado_em,
        atualizado_em: row.atualizado_em,
      }));
    }
  } catch {
    // fallback below
  }

  return lerJsonFallbackMarketing<ListaMarketing[]>(
    FALLBACK_KEY_LISTAS_MKT,
    DADOS_LISTAS_MARKETING
  );
}

export async function salvarListaMarketingNoBanco(
  lista: Omit<ListaMarketing, 'id' | 'criado_em'> & { id?: string }
): Promise<ListaMarketing> {
  const id = lista.id || crypto.randomUUID();
  const agora = new Date().toISOString();
  const registro: ListaMarketing = {
    ...lista,
    id,
    criado_em: agora,
    atualizado_em: agora,
  };

  let salvouTabela = false;
  try {
    const supabaseAnon = criarClienteAnonStateless();
    const payload = {
      id,
      organizacao_id: ORG_PADRAO_ID,
      nome: lista.nome,
      descricao: lista.descricao,
      tipo: lista.tipo,
      criterios_json: lista.criterios || {},
      ativa: lista.ativa,
      atualizado_em: agora,
    };

    const { error } = await supabaseAnon.from('listas_marketing').upsert(payload);
    if (!error) {
      salvouTabela = true;
      if (lista.tipo === 'estatica') {
        await supabaseAnon.from('listas_marketing_contatos').delete().eq('lista_id', id);
        if (lista.contatos_estaticos && lista.contatos_estaticos.length > 0) {
          await supabaseAnon.from('listas_marketing_contatos').insert(
            lista.contatos_estaticos.map((c) => ({
              lista_id: id,
              contato_id: c.contato_id || null,
              email: c.email,
              nome: c.nome || null,
            }))
          );
        }
      }
    }
  } catch {
    // fallback
  }

  if (!salvouTabela) {
    const atuais = await listarListasMarketingNoBanco();
    const idx = atuais.findIndex((item) => item.id === id);
    const atualizados =
      idx >= 0 ? atuais.map((item) => (item.id === id ? { ...item, ...registro } : item)) : [...atuais, registro];
    await salvarJsonFallbackMarketing(FALLBACK_KEY_LISTAS_MKT, atualizados);
  }

  return registro;
}

export async function excluirListaMarketingNoBanco(id: string): Promise<void> {
  try {
    const supabaseAnon = criarClienteAnonStateless();
    const { error } = await supabaseAnon.from('listas_marketing').delete().eq('id', id);
    if (!error) return;
  } catch {
    // fallback
  }
  const atuais = await listarListasMarketingNoBanco();
  await salvarJsonFallbackMarketing(
    FALLBACK_KEY_LISTAS_MKT,
    atuais.filter((l) => l.id !== id)
  );
}

export interface DestinatarioResolvido {
  contato_id?: string;
  negocio_id?: string;
  email: string;
  nome: string;
  descadastrado: boolean;
  motivo_bloqueio?: string;
}

export async function resolverDestinatariosLista(
  lista: ListaMarketing
): Promise<{ elegiveis: DestinatarioResolvido[]; bloqueados: DestinatarioResolvido[] }> {
  const [contatos, negocios] = await Promise.all([
    buscarContatosDoBanco(),
    buscarNegociosDoBanco(),
  ]);

  const candidatos = new Map<string, DestinatarioResolvido>();

  if (lista.tipo === 'estatica' && lista.contatos_estaticos) {
    for (const c of lista.contatos_estaticos) {
      const emailNorm = (c.email || '').trim().toLowerCase();
      if (!emailNorm) continue;
      const contatoReal = contatos.find((ct) => ct.email?.toLowerCase() === emailNorm);
      const bloqueado = Boolean(
        contatoReal?.descadastrado_email || contatoReal?.consentimento_email === false
      );
      candidatos.set(emailNorm, {
        contato_id: contatoReal?.id || c.contato_id,
        email: emailNorm,
        nome: contatoReal?.nome || c.nome || emailNorm.split('@')[0],
        descadastrado: bloqueado,
        motivo_bloqueio: contatoReal?.descadastrado_email
          ? 'Contato descadastrado (opt-out)'
          : contatoReal?.consentimento_email === false
            ? 'Sem consentimento de e-mail'
            : undefined,
      });
    }
  } else {
    const crit = lista.criterios || {};

    if (crit.incluir_todos_contatos) {
      for (const c of contatos) {
        const emailNorm = (c.email || '').trim().toLowerCase();
        if (!emailNorm) continue;
        const bloqueado = Boolean(c.descadastrado_email || c.consentimento_email === false);
        candidatos.set(emailNorm, {
          contato_id: c.id,
          email: emailNorm,
          nome: c.nome || emailNorm.split('@')[0],
          descadastrado: bloqueado,
          motivo_bloqueio: c.descadastrado_email
            ? 'Contato descadastrado (opt-out)'
            : c.consentimento_email === false
              ? 'Sem consentimento de e-mail'
              : undefined,
        });
      }
    }

    for (const neg of negocios) {
      const contatoPrincipal = contatos.find((c) => c.id === neg.contato_id);
      const emailRaw =
        contatoPrincipal?.email ||
        neg.contato_email ||
        neg.lead_email ||
        String(neg.campos_personalizados?.lead_email || neg.campos_personalizados?.email || '');
      const emailNorm = emailRaw.trim().toLowerCase();
      if (!emailNorm || !emailNorm.includes('@')) continue;

      if (crit.status_negocio && crit.status_negocio !== 'todos' && neg.status !== crit.status_negocio) {
        continue;
      }

      if (crit.origem_contem) {
        const termo = crit.origem_contem.toLowerCase();
        const textoOrigem = `${neg.origem_lead || ''} ${neg.utm_source || ''} ${neg.campos_personalizados?.utm_source || ''}`.toLowerCase();
        if (!textoOrigem.includes(termo)) continue;
      }

      if (crit.utm_campaign_contem) {
        const termo = crit.utm_campaign_contem.toLowerCase();
        const textoUtm = `${neg.utm_campaign || ''} ${neg.campanha || ''} ${neg.campos_personalizados?.utm_campaign || ''} ${neg.titulo || ''}`.toLowerCase();
        if (!textoUtm.includes(termo)) continue;
      }

      if (crit.produto_ou_interesse_contem) {
        const termo = crit.produto_ou_interesse_contem.toLowerCase();
        const textoProd = `${neg.titulo || ''} ${neg.produto_interesse || ''} ${neg.campos_personalizados?.produto_interesse || ''} ${(neg.produtos || [])
          .map((p) => p.nome)
          .join(' ')}`.toLowerCase();
        if (!textoProd.includes(termo)) continue;
      }

      if (crit.dias_inatividade_min && crit.dias_inatividade_min > 0) {
        const refData = new Date(neg.ultima_atividade_em || neg.data_hora_cadastro || Date.now()).getTime();
        const dias = (Date.now() - refData) / (1000 * 60 * 60 * 24);
        if (dias < crit.dias_inatividade_min && neg.status !== 'perdido') continue;
      }

      const bloqueado = Boolean(
        contatoPrincipal?.descadastrado_email ||
        contatoPrincipal?.consentimento_email === false ||
        neg.descadastrado_email ||
        neg.consentimento_email === false
      );

      candidatos.set(emailNorm, {
        contato_id: contatoPrincipal?.id,
        negocio_id: neg.id,
        email: emailNorm,
        nome:
          contatoPrincipal?.nome ||
          String(neg.campos_personalizados?.lead_nome || neg.titulo || emailNorm.split('@')[0]),
        descadastrado: bloqueado,
        motivo_bloqueio: bloqueado ? 'Opt-out ou sem consentimento de e-mail' : undefined,
      });
    }
  }

  const elegiveis: DestinatarioResolvido[] = [];
  const bloqueados: DestinatarioResolvido[] = [];
  for (const dest of candidatos.values()) {
    if (dest.descadastrado) bloqueados.push(dest);
    else elegiveis.push(dest);
  }
  return { elegiveis, bloqueados };
}

export async function listarCampanhasMarketingNoBanco(): Promise<CampanhaMarketing[]> {
  try {
    const supabaseAnon = criarClienteAnonStateless();
    const { data, error } = await supabaseAnon
      .from('campanhas_marketing')
      .select('*')
      .eq('organizacao_id', ORG_PADRAO_ID)
      .order('criado_em', { ascending: false });

    if (!error && Array.isArray(data)) {
      if (data.length === 0) {
        return DADOS_CAMPANHAS_MARKETING;
      }
      return data.map((row) => ({
        id: row.id,
        nome: row.nome,
        lista_id: row.lista_id || '',
        lista_nome: row.lista_nome || 'Segmento Personalizado',
        template_id: row.template_id || undefined,
        template_nome: row.template_nome || 'Modelo Personalizado',
        assunto: row.assunto,
        nome_remetente: row.nome_remetente,
        email_remetente: row.email_remetente,
        corpo_html: row.corpo_html || '',
        utm_campaign: row.utm_campaign || '',
        utm_source: row.utm_source || 'alldot_crm',
        utm_medium: row.utm_medium || 'email_marketing',
        status: row.status,
        agendado_para: row.agendado_para || undefined,
        iniciada_em: row.iniciada_em || undefined,
        concluida_em: row.concluida_em || undefined,
        total_destinatarios: Number(row.total_destinatarios || 0),
        total_enviados: Number(row.total_enviados || 0),
        total_entregues: Number(row.total_entregues || 0),
        total_aberturas: Number(row.total_aberturas || 0),
        total_cliques: Number(row.total_cliques || 0),
        total_bounces_temp: Number(row.total_bounces_temp || 0),
        total_bounces_perm: Number(row.total_bounces_perm || 0),
        total_descadastramentos: Number(row.total_descadastramentos || 0),
        total_conversoes: Number(row.total_conversoes || 0),
        receita_convertida: Number(row.receita_convertida || 0),
        criado_em: row.criado_em,
        atualizado_em: row.atualizado_em,
      }));
    }
  } catch {
    // fallback
  }

  return lerJsonFallbackMarketing<CampanhaMarketing[]>(
    FALLBACK_KEY_CAMPANHAS_MKT,
    DADOS_CAMPANHAS_MARKETING
  );
}

export async function salvarCampanhaMarketingNoBanco(
  campanha: Partial<CampanhaMarketing> & Pick<CampanhaMarketing, 'nome' | 'assunto' | 'nome_remetente' | 'email_remetente'>
): Promise<CampanhaMarketing> {
  const id = campanha.id || crypto.randomUUID();
  const agora = new Date().toISOString();

  const atuais = await listarCampanhasMarketingNoBanco();
  const existente = atuais.find((c) => c.id === id);

  const registro: CampanhaMarketing = {
    id,
    nome: campanha.nome,
    lista_id: campanha.lista_id ?? existente?.lista_id ?? '',
    lista_nome: campanha.lista_nome ?? existente?.lista_nome ?? 'Segmento Personalizado',
    template_id: campanha.template_id ?? existente?.template_id,
    template_nome: campanha.template_nome ?? existente?.template_nome ?? 'Modelo de Campanha',
    assunto: campanha.assunto,
    nome_remetente: campanha.nome_remetente,
    email_remetente: campanha.email_remetente,
    corpo_html: campanha.corpo_html ?? existente?.corpo_html ?? '',
    utm_campaign: campanha.utm_campaign ?? existente?.utm_campaign ?? id.slice(0, 8),
    utm_source: campanha.utm_source ?? existente?.utm_source ?? 'alldot_crm',
    utm_medium: campanha.utm_medium ?? existente?.utm_medium ?? 'email_marketing',
    status: campanha.status ?? existente?.status ?? 'rascunho',
    agendado_para: campanha.agendado_para ?? existente?.agendado_para,
    iniciada_em: campanha.iniciada_em ?? existente?.iniciada_em,
    concluida_em: campanha.concluida_em ?? existente?.concluida_em,
    total_destinatarios: campanha.total_destinatarios ?? existente?.total_destinatarios ?? 0,
    total_enviados: campanha.total_enviados ?? existente?.total_enviados ?? 0,
    total_entregues: campanha.total_entregues ?? existente?.total_entregues ?? 0,
    total_aberturas: campanha.total_aberturas ?? existente?.total_aberturas ?? 0,
    total_cliques: campanha.total_cliques ?? existente?.total_cliques ?? 0,
    total_bounces_temp: campanha.total_bounces_temp ?? existente?.total_bounces_temp ?? 0,
    total_bounces_perm: campanha.total_bounces_perm ?? existente?.total_bounces_perm ?? 0,
    total_descadastramentos: campanha.total_descadastramentos ?? existente?.total_descadastramentos ?? 0,
    total_conversoes: campanha.total_conversoes ?? existente?.total_conversoes ?? 0,
    receita_convertida: campanha.receita_convertida ?? existente?.receita_convertida ?? 0,
    criado_em: existente?.criado_em || agora,
    atualizado_em: agora,
  };

  let salvouTabela = false;
  try {
    const supabaseAnon = criarClienteAnonStateless();
    const { error } = await supabaseAnon.from('campanhas_marketing').upsert({
      id: registro.id,
      organizacao_id: ORG_PADRAO_ID,
      nome: registro.nome,
      lista_id: registro.lista_id || null,
      lista_nome: registro.lista_nome,
      template_id: registro.template_id || null,
      template_nome: registro.template_nome,
      assunto: registro.assunto,
      nome_remetente: registro.nome_remetente,
      email_remetente: registro.email_remetente,
      corpo_html: registro.corpo_html,
      utm_campaign: registro.utm_campaign,
      utm_source: registro.utm_source,
      utm_medium: registro.utm_medium,
      status: registro.status,
      agendado_para: registro.agendado_para || null,
      iniciada_em: registro.iniciada_em || null,
      concluida_em: registro.concluida_em || null,
      total_destinatarios: registro.total_destinatarios,
      total_enviados: registro.total_enviados,
      total_entregues: registro.total_entregues,
      total_aberturas: registro.total_aberturas,
      total_cliques: registro.total_cliques,
      total_bounces_temp: registro.total_bounces_temp,
      total_bounces_perm: registro.total_bounces_perm,
      total_descadastramentos: registro.total_descadastramentos,
      total_conversoes: registro.total_conversoes,
      receita_convertida: registro.receita_convertida,
      atualizado_em: agora,
    });
    if (!error) salvouTabela = true;
  } catch {
    // fallback
  }

  if (!salvouTabela) {
    const listaAtualizada = existente
      ? atuais.map((c) => (c.id === id ? registro : c))
      : [registro, ...atuais];
    await salvarJsonFallbackMarketing(FALLBACK_KEY_CAMPANHAS_MKT, listaAtualizada);
  }

  return registro;
}

export async function excluirCampanhaMarketingNoBanco(id: string): Promise<void> {
  try {
    const supabaseAnon = criarClienteAnonStateless();
    const { error } = await supabaseAnon.from('campanhas_marketing').delete().eq('id', id);
    if (!error) return;
  } catch {
    // fallback
  }
  const atuais = await listarCampanhasMarketingNoBanco();
  await salvarJsonFallbackMarketing(
    FALLBACK_KEY_CAMPANHAS_MKT,
    atuais.filter((c) => c.id !== id)
  );
}

export async function listarEnviosCampanhaNoBanco(campanhaId: string): Promise<CampanhaEnvio[]> {
  try {
    const supabaseAnon = criarClienteAnonStateless();
    const { data, error } = await supabaseAnon
      .from('campanhas_envios')
      .select('*')
      .eq('campanha_id', campanhaId)
      .order('criado_em', { ascending: false });

    if (!error && Array.isArray(data)) {
      if (data.length === 0) {
        return DADOS_CAMPANHAS_ENVIOS.filter((e) => e.campanha_id === campanhaId);
      }
      return data as CampanhaEnvio[];
    }
  } catch {
    // fallback
  }

  const todos = await lerJsonFallbackMarketing<CampanhaEnvio[]>(
    FALLBACK_KEY_CAMPANHAS_ENVIOS,
    DADOS_CAMPANHAS_ENVIOS
  );
  return todos.filter((e) => e.campanha_id === campanhaId);
}

export async function salvarEnvioCampanhaNoBanco(envio: CampanhaEnvio): Promise<void> {
  let salvouTabela = false;
  try {
    const supabaseAnon = criarClienteAnonStateless();
    const { error } = await supabaseAnon.from('campanhas_envios').upsert({
      id: envio.id,
      organizacao_id: ORG_PADRAO_ID,
      campanha_id: envio.campanha_id,
      contato_id: envio.contato_id || null,
      negocio_id: envio.negocio_id || null,
      destinatario_email: envio.destinatario_email,
      destinatario_nome: envio.destinatario_nome || null,
      tracking_token: envio.tracking_token,
      status: envio.status,
      smtp_codigo: envio.smtp_codigo || null,
      smtp_resposta: envio.smtp_resposta || null,
      motivo_erro: envio.motivo_erro || null,
      enviado_em: envio.enviado_em || null,
      entregue_em: envio.entregue_em || null,
      aberto: envio.aberto,
      aberturas_qtd: envio.aberturas_qtd,
      primeira_abertura_em: envio.primeira_abertura_em || null,
      ultima_abertura_em: envio.ultima_abertura_em || null,
      clicou: envio.clicou,
      cliques_qtd: envio.cliques_qtd,
      primeiro_clique_em: envio.primeiro_clique_em || null,
      descadastrado: envio.descadastrado,
      descadastrado_em: envio.descadastrado_em || null,
      converteu: envio.converteu,
      convertido_em: envio.convertido_em || null,
      valor_conversao: envio.valor_conversao,
    });
    if (!error) salvouTabela = true;
  } catch {
    // fallback
  }

  if (!salvouTabela) {
    const todos = await lerJsonFallbackMarketing<CampanhaEnvio[]>(
      FALLBACK_KEY_CAMPANHAS_ENVIOS,
      DADOS_CAMPANHAS_ENVIOS
    );
    const idx = todos.findIndex((e) => e.id === envio.id);
    const atualizados =
      idx >= 0 ? todos.map((e) => (e.id === envio.id ? envio : e)) : [envio, ...todos];
    await salvarJsonFallbackMarketing(FALLBACK_KEY_CAMPANHAS_ENVIOS, atualizados);
  }
}

export async function listarCliquesCampanhaNoBanco(campanhaId: string): Promise<CampanhaClique[]> {
  try {
    const supabaseAnon = criarClienteAnonStateless();
    const { data, error } = await supabaseAnon
      .from('campanhas_cliques')
      .select('*')
      .eq('campanha_id', campanhaId)
      .order('clicado_em', { ascending: false });

    if (!error && Array.isArray(data)) {
      if (data.length === 0) {
        return DADOS_CAMPANHAS_CLIQUES.filter((c) => c.campanha_id === campanhaId);
      }
      return data as CampanhaClique[];
    }
  } catch {
    // fallback
  }

  const todos = await lerJsonFallbackMarketing<CampanhaClique[]>(
    FALLBACK_KEY_CAMPANHAS_CLIQUES,
    DADOS_CAMPANHAS_CLIQUES
  );
  return todos.filter((c) => c.campanha_id === campanhaId);
}

export async function recalcularMetricasCampanhaNoBanco(campanhaId: string): Promise<void> {
  const [campanhas, envios] = await Promise.all([
    listarCampanhasMarketingNoBanco(),
    listarEnviosCampanhaNoBanco(campanhaId),
  ]);
  const campanha = campanhas.find((c) => c.id === campanhaId);
  if (!campanha || envios.length === 0) return;

  const total_enviados = envios.filter((e) => e.status !== 'pendente' && e.status !== 'bloqueado_optout').length;
  const total_entregues = envios.filter((e) => e.status === 'entregue').length;
  const total_aberturas = envios.filter((e) => e.aberto).length;
  const total_cliques = envios.filter((e) => e.clicou).length;
  const total_bounces_temp = envios.filter((e) => e.status === 'bounce_temporario').length;
  const total_bounces_perm = envios.filter((e) => e.status === 'bounce_permanente').length;
  const total_descadastramentos = envios.filter((e) => e.descadastrado).length;
  const total_conversoes = envios.filter((e) => e.converteu).length;
  const receita_convertida = envios.reduce((acc, e) => acc + (Number(e.valor_conversao) || 0), 0);

  await salvarCampanhaMarketingNoBanco({
    ...campanha,
    total_enviados,
    total_entregues,
    total_aberturas,
    total_cliques,
    total_bounces_temp,
    total_bounces_perm,
    total_descadastramentos,
    total_conversoes,
    receita_convertida,
  });
}

async function buscarEnvioPorToken(token: string): Promise<CampanhaEnvio | null> {
  try {
    const supabaseAnon = criarClienteAnonStateless();
    const { data, error } = await supabaseAnon
      .from('campanhas_envios')
      .select('*')
      .eq('tracking_token', token)
      .maybeSingle();
    if (!error && data) return data as CampanhaEnvio;
  } catch {
    // fallback
  }
  const todos = await lerJsonFallbackMarketing<CampanhaEnvio[]>(
    FALLBACK_KEY_CAMPANHAS_ENVIOS,
    DADOS_CAMPANHAS_ENVIOS
  );
  return todos.find((e) => e.tracking_token === token) || null;
}

export async function registrarAberturaPorToken(token: string): Promise<void> {
  const envio = await buscarEnvioPorToken(token);
  if (!envio) return;
  const agora = new Date().toISOString();
  await salvarEnvioCampanhaNoBanco({
    ...envio,
    aberto: true,
    aberturas_qtd: (envio.aberturas_qtd || 0) + 1,
    primeira_abertura_em: envio.primeira_abertura_em || agora,
    ultima_abertura_em: agora,
  });
  await recalcularMetricasCampanhaNoBanco(envio.campanha_id);
}

export async function registrarCliquePorToken(
  token: string,
  urlDestino: string,
  userAgent?: string,
  ip?: string
): Promise<void> {
  const envio = await buscarEnvioPorToken(token);
  if (!envio) return;
  const agora = new Date().toISOString();

  await salvarEnvioCampanhaNoBanco({
    ...envio,
    aberto: true,
    primeira_abertura_em: envio.primeira_abertura_em || agora,
    ultima_abertura_em: agora,
    clicou: true,
    cliques_qtd: (envio.cliques_qtd || 0) + 1,
    primeiro_clique_em: envio.primeiro_clique_em || agora,
  });

  const clique: CampanhaClique = {
    id: crypto.randomUUID(),
    campanha_id: envio.campanha_id,
    envio_id: envio.id,
    contato_id: envio.contato_id,
    destinatario_email: envio.destinatario_email,
    destinatario_nome: envio.destinatario_nome,
    url_destino: urlDestino,
    clicado_em: agora,
  };

  let salvouClique = false;
  try {
    const supabaseAnon = criarClienteAnonStateless();
    const { error } = await supabaseAnon.from('campanhas_cliques').insert({
      id: clique.id,
      organizacao_id: ORG_PADRAO_ID,
      campanha_id: clique.campanha_id,
      envio_id: clique.envio_id,
      contato_id: clique.contato_id || null,
      destinatario_email: clique.destinatario_email,
      destinatario_nome: clique.destinatario_nome || null,
      url_destino: clique.url_destino,
      clicado_em: clique.clicado_em,
      user_agent: userAgent || null,
      ip: ip || null,
    });
    if (!error) salvouClique = true;
  } catch {
    // fallback
  }

  if (!salvouClique) {
    const todos = await lerJsonFallbackMarketing<CampanhaClique[]>(
      FALLBACK_KEY_CAMPANHAS_CLIQUES,
      DADOS_CAMPANHAS_CLIQUES
    );
    await salvarJsonFallbackMarketing(FALLBACK_KEY_CAMPANHAS_CLIQUES, [clique, ...todos]);
  }

  await recalcularMetricasCampanhaNoBanco(envio.campanha_id);
}

export async function registrarDescadastroPorToken(
  token: string,
  motivo = 'Descadastro solicitado via link de campanha'
): Promise<{ email?: string; sucesso: boolean }> {
  const envio = await buscarEnvioPorToken(token);
  if (!envio) return { sucesso: false };
  const agora = new Date().toISOString();

  await salvarEnvioCampanhaNoBanco({
    ...envio,
    descadastrado: true,
    descadastrado_em: agora,
  });

  try {
    const supabaseAnon = criarClienteAnonStateless();
    if (envio.contato_id) {
      await supabaseAnon
        .from('contatos')
        .update({
          descadastrado_email: true,
          consentimento_email: false,
          descadastrado_em: agora,
          motivo_descadastramento: motivo,
        })
        .eq('id', envio.contato_id);
    } else if (envio.destinatario_email) {
      await supabaseAnon
        .from('contatos')
        .update({
          descadastrado_email: true,
          consentimento_email: false,
          descadastrado_em: agora,
          motivo_descadastramento: motivo,
        })
        .ilike('email', envio.destinatario_email);
    }
  } catch {
    // ignore if column missing
  }

  await recalcularMetricasCampanhaNoBanco(envio.campanha_id);
  return { email: envio.destinatario_email, sucesso: true };
}




