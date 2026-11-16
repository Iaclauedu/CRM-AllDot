import { NextResponse } from 'next/server';
import {
  processarLeadLandingPageNoBanco,
  buscarConfiguracaoIntegracaoLP,
  type LeadLandingPagePayload,
} from '@/lib/supabase/service';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function GET() {
  const config = await buscarConfiguracaoIntegracaoLP();
  return NextResponse.json(
    {
      status: 'online',
      integracao: 'AllDot CRM - Webhook Landing Page',
      landing_page_alvo: config.url_landing_page,
      regra_criacao_negocio: config.regra_criacao_negocio,
      campos_obrigatorios: ['nome', 'email', 'empresa', 'celular'],
      campos_provisionados: [
        'origem_lead',
        'url_conversao',
        'campanha',
        'midia',
        'conjunto_anuncios',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_content',
        'utm_term',
        'data_hora_cadastro',
        'produto_interesse',
      ],
    },
    { status: 200, headers: CORS_HEADERS }
  );
}

async function extrairCorpoRequisicao(request: Request): Promise<Record<string, any>> {
  const contentType = (request.headers.get('content-type') || '').toLowerCase();

  if (contentType.includes('application/json')) {
    return (await request.json()) || {};
  }

  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    const formData = await request.formData();
    const obj: Record<string, any> = {};
    formData.forEach((value, key) => {
      obj[key] = typeof value === 'string' ? value : value.name;
    });
    return obj;
  }

  try {
    const texto = await request.text();
    if (!texto) return {};
    try {
      return JSON.parse(texto);
    } catch {
      const params = new URLSearchParams(texto);
      const obj: Record<string, any> = {};
      params.forEach((v, k) => {
        obj[k] = v;
      });
      return obj;
    }
  } catch {
    return {};
  }
}

function extrairValorTexto(v: any): string {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
    return String(v).trim();
  }
  if (typeof v === 'object') {
    // Suporte nativo ao Elementor Pro Webhook: { id, title, type, value }
    if (v.value !== undefined && v.value !== null) {
      return String(v.value).trim();
    }
    if (v.raw_value !== undefined && v.raw_value !== null) {
      return String(v.raw_value).trim();
    }
  }
  return '';
}

function normalizarCamposElementor(raw: Record<string, any>): Record<string, any> {
  const normalizado: Record<string, any> = { ...raw };
  const camposAgrupados: Record<string, any> = {};

  for (const [k, v] of Object.entries(raw)) {
    // fields[field_id][prop]
    const matchFields = k.match(/^fields\[([^\]]+)\]\[([^\]]+)\]$/i);
    if (matchFields) {
      const fieldId = matchFields[1];
      const prop = matchFields[2];
      if (!camposAgrupados[fieldId]) camposAgrupados[fieldId] = {};
      camposAgrupados[fieldId][prop] = v;
      continue;
    }

    // fields[field_id] simples
    const matchSimples = k.match(/^fields\[([^\]]+)\]$/i);
    if (matchSimples) {
      normalizado[matchSimples[1]] = v;
      continue;
    }

    // form_fields[field_id]
    const matchFormFields = k.match(/^form_fields\[([^\]]+)\]$/i);
    if (matchFormFields) {
      normalizado[matchFormFields[1]] = v;
      continue;
    }
  }

  for (const [id, dados] of Object.entries(camposAgrupados)) {
    normalizado[id] = dados;
  }

  if (raw.fields && typeof raw.fields === 'object' && !Array.isArray(raw.fields)) {
    Object.assign(normalizado, raw.fields);
  }

  return normalizado;
}

function obterCampo(
  raw: Record<string, any>,
  chavesPossiveis: string[]
): string {
  const chavesLower = chavesPossiveis.map((c) => c.toLowerCase());

  // 1. Busca direta por chave
  for (const chave of chavesPossiveis) {
    if (raw[chave] !== undefined && raw[chave] !== null) {
      const val = extrairValorTexto(raw[chave]);
      if (val) return val;
    }
  }

  // 2. Busca iterativa por chave, ID de campo ou Title/Label (compatibilidade total com Elementor Pro, CF7, WPForms)
  const entradas = Object.entries(raw);
  for (const [k, v] of entradas) {
    const kLower = k.toLowerCase().trim();
    const matchChave = chavesLower.some(
      (alvo) =>
        kLower === alvo ||
        kLower.includes(`[${alvo}]`) ||
        kLower.endsWith(`_${alvo}`) ||
        kLower.startsWith(`${alvo}_`)
    );

    if (matchChave) {
      const val = extrairValorTexto(v);
      if (val) return val;
    }

    // Se for objeto do Elementor ou outros plugins: { id, title, label, value }
    if (v && typeof v === 'object') {
      const idLower = String(v.id || '').toLowerCase().trim();
      const titleLower = String(v.title || v.label || '').toLowerCase().trim();
      const matchSub = chavesLower.some(
        (alvo) =>
          idLower === alvo ||
          idLower.includes(alvo) ||
          titleLower === alvo ||
          titleLower.includes(alvo)
      );
      if (matchSub) {
        const val = extrairValorTexto(v);
        if (val) return val;
      }
    }
  }

  return '';
}

export async function POST(request: Request) {
  try {
    const rawBody = await extrairCorpoRequisicao(request);
    const baseSource = normalizarCamposElementor(rawBody);

    const nome =
      obterCampo(baseSource, ['nome', 'name', 'nome_completo', 'full_name']) ||
      'Lead Landing Page';
    const email = obterCampo(baseSource, ['email', 'e-mail', 'mail', 'e_mail']);
    let empresa = obterCampo(baseSource, [
      'empresa',
      'company',
      'nome_empresa',
      'organizacao',
    ]);
    const celular = obterCampo(baseSource, [
      'celular',
      'telefone',
      'whatsapp',
      'phone',
      'tel',
      'mobile',
    ]);

    // Fallback inteligente para empresa caso não venha no formulário
    if (!empresa) {
      empresa = nome !== 'Lead Landing Page' ? `${nome} (Empresa)` : 'Empresa não informada';
    }

    // Validação mínima: precisa ter nome e ao menos email ou telefone
    if (!email && !celular && nome === 'Lead Landing Page') {
      // Retorna 200 com mensagem amigável para o Elementor não quebrar a página
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Preencha ao menos Nome, E-mail ou Celular/WhatsApp para prosseguir.',
        },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    const refererHeader = request.headers.get('referer') || '';

    const payloadNormalizado: LeadLandingPagePayload = {
      nome,
      email: email || `${Date.now()}@lead-sem-email.com`,
      empresa,
      celular: celular || 'Não informado',
      origem_lead:
        obterCampo(baseSource, ['origem_lead', 'origem', 'lead_source']) ||
        'Landing Page Brinday',
      url_conversao:
        obterCampo(baseSource, [
          'url_conversao',
          'conversion_url',
          'page_url',
          'url',
        ]) ||
        refererHeader ||
        'https://brindes.brindaypersonalizados.com.br/',
      campanha: obterCampo(baseSource, ['campanha', 'campaign', 'utm_campaign']),
      midia: obterCampo(baseSource, ['midia', 'media', 'utm_medium']),
      conjunto_anuncios: obterCampo(baseSource, [
        'conjunto_anuncios',
        'adset',
        'ad_set',
        'adgroup',
        'utm_content',
      ]),
      utm_source: obterCampo(baseSource, ['utm_source']),
      utm_medium: obterCampo(baseSource, ['utm_medium']),
      utm_campaign: obterCampo(baseSource, ['utm_campaign']),
      utm_content: obterCampo(baseSource, ['utm_content']),
      utm_term: obterCampo(baseSource, ['utm_term']),
      produto_interesse: obterCampo(baseSource, [
        'produto_interesse',
        'categoria_interesse',
        'produto',
        'interesse',
      ]),
      data_hora_cadastro:
        obterCampo(baseSource, ['data_hora_cadastro', 'created_at', 'timestamp']) ||
        new Date().toISOString(),
      regra_criacao_negocio: (obterCampo(baseSource, ['regra_criacao_negocio']) ||
        undefined) as any,
    };

    const resultado = await processarLeadLandingPageNoBanco(payloadNormalizado);

    // IMPORTANTE: Elementor Pro exige estritamente HTTP 200 (se retornar 201 ou outro código, ele exibe "Webhook Error")
    return NextResponse.json(
      {
        sucesso: true,
        acao: resultado.acao,
        mensagem:
          resultado.acao === 'criado'
            ? `Card ${resultado.negocio.codigo} criado automaticamente no funil de vendas (sem criar empresa/contato).`
            : resultado.acao === 'atualizado'
              ? `Card aberto ${resultado.negocio.codigo} localizado e atualizado com os novos dados de conversão.`
              : `Card aberto ${resultado.negocio.codigo} já existente mantido conforme regra configurada.`,
        contato_existente_localizado: Boolean(resultado.contatoEncontradoId),
        contato_existente_atualizado: resultado.contatoExistenteAtualizado,
        negocio: {
          id: resultado.negocio.id,
          codigo: resultado.negocio.codigo,
          titulo: resultado.negocio.titulo,
          funil_id: resultado.negocio.funil_id,
          etapa_id: resultado.negocio.etapa_id,
          lead_nome: resultado.negocio.lead_nome,
          lead_email: resultado.negocio.lead_email,
          lead_empresa: resultado.negocio.lead_empresa,
          lead_celular: resultado.negocio.lead_celular,
          url_conversao: resultado.negocio.url_conversao,
          data_hora_cadastro: resultado.negocio.data_hora_cadastro,
        },
      },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    console.error('Erro no webhook da Landing Page:', err);
    // Retorna status 200 para não estourar banner de erro genérico no Elementor
    return NextResponse.json(
      {
        sucesso: false,
        erro: err?.message || 'Erro interno ao processar lead da Landing Page.',
      },
      { status: 200, headers: CORS_HEADERS }
    );
  }
}

