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

function obterCampo(
  raw: Record<string, any>,
  chavesPossiveis: string[]
): string {
  for (const chave of chavesPossiveis) {
    if (raw[chave] !== undefined && raw[chave] !== null && String(raw[chave]).trim() !== '') {
      return String(raw[chave]).trim();
    }
  }

  // Busca case-insensitive e para formatos aninhados (ex: fields[nome] do Elementor/WP)
  const entradas = Object.entries(raw);
  for (const [k, v] of entradas) {
    const kLower = k.toLowerCase().trim();
    if (
      chavesPossiveis.some(
        (alvo) =>
          kLower === alvo.toLowerCase() ||
          kLower.endsWith(`[${alvo.toLowerCase()}]`)
      ) &&
      v !== undefined &&
      v !== null &&
      String(v).trim() !== ''
    ) {
      return String(v).trim();
    }
  }

  return '';
}

export async function POST(request: Request) {
  try {
    const body = await extrairCorpoRequisicao(request);
    const baseSource =
      body.fields && typeof body.fields === 'object' && !Array.isArray(body.fields)
        ? { ...body, ...body.fields }
        : body;

    const nome = obterCampo(baseSource, ['nome', 'name', 'nome_completo', 'full_name']);
    const email = obterCampo(baseSource, ['email', 'e-mail', 'mail', 'e_mail']);
    const empresa = obterCampo(baseSource, [
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

    // Validação dos 4 campos obrigatórios do formulário da Landing Page
    const camposFaltantes: string[] = [];
    if (!nome) camposFaltantes.push('Nome');
    if (!email) camposFaltantes.push('E-mail');
    if (!empresa) camposFaltantes.push('Empresa');
    if (!celular) camposFaltantes.push('Celular');

    if (camposFaltantes.length > 0) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: `Campos obrigatórios ausentes: ${camposFaltantes.join(', ')}.`,
          campos_obrigatorios: ['nome', 'email', 'empresa', 'celular'],
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const refererHeader = request.headers.get('referer') || '';

    const payloadNormalizado: LeadLandingPagePayload = {
      nome,
      email,
      empresa,
      celular,
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
      { status: resultado.acao === 'criado' ? 201 : 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    console.error('Erro no webhook da Landing Page:', err);
    return NextResponse.json(
      {
        sucesso: false,
        erro: err?.message || 'Erro interno ao processar lead da Landing Page.',
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

