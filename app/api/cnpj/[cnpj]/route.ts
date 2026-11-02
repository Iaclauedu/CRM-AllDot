import { NextResponse } from 'next/server';

function formatarEndereco(partes: {
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
}): string {
  const ruaNumero = [partes.logradouro, partes.numero].filter(Boolean).join(', ');
  const comComplemento = [ruaNumero, partes.complemento].filter(Boolean).join(' - ');
  const comBairro = [comComplemento, partes.bairro].filter(Boolean).join(' - ');
  const cidadeUf = [partes.municipio, partes.uf].filter(Boolean).join('/');
  const enderecoBase = [comBairro, cidadeUf].filter(Boolean).join(', ');
  const cepFormatado = partes.cep ? `CEP ${partes.cep}` : '';
  return [enderecoBase, cepFormatado].filter(Boolean).join(' - ');
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ cnpj: string }> }
) {
  const { cnpj } = await context.params;
  const apenasDigitos = (cnpj || '').replace(/\D/g, '');

  if (apenasDigitos.length !== 14) {
    return NextResponse.json(
      { erro: 'CNPJ deve conter exatamente 14 dígitos numéricos.' },
      { status: 400 }
    );
  }

  // 1. Consulta prioritária: ReceitaWS (API gratuita)
  try {
    const resReceita = await fetch(
      `https://receitaws.com.br/v1/cnpj/${apenasDigitos}`,
      {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      }
    );

    if (resReceita.ok) {
      const data = await resReceita.json();
      if (data && data.status !== 'ERROR' && data.nome) {
        const endereco = formatarEndereco({
          logradouro: data.logradouro,
          numero: data.numero,
          complemento: data.complemento,
          bairro: data.bairro,
          municipio: data.municipio,
          uf: data.uf,
          cep: data.cep,
        });

        return NextResponse.json({
          fonte: 'ReceitaWS',
          cnpj: apenasDigitos,
          razao_social: data.nome || '',
          nome_fantasia: data.fantasia || data.nome || '',
          endereco,
          email: data.email || '',
          telefone: data.telefone || '',
        });
      }
    }
  } catch {
    // prossegue para fallback caso a ReceitaWS esteja em rate-limit (3 req/min)
  }

  // 2. Fallback automático: BrasilAPI
  try {
    const resBrasilApi = await fetch(
      `https://brasilapi.com.br/api/cnpj/v1/${apenasDigitos}`,
      {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      }
    );

    if (resBrasilApi.ok) {
      const data = await resBrasilApi.json();
      if (data && data.razao_social) {
        const endereco = formatarEndereco({
          logradouro: [data.descricao_tipo_de_logradouro, data.logradouro]
            .filter(Boolean)
            .join(' '),
          numero: data.numero,
          complemento: data.complemento,
          bairro: data.bairro,
          municipio: data.municipio,
          uf: data.uf,
          cep: data.cep,
        });

        return NextResponse.json({
          fonte: 'BrasilAPI',
          cnpj: apenasDigitos,
          razao_social: data.razao_social || '',
          nome_fantasia: data.nome_fantasia || data.razao_social || '',
          endereco,
          email: data.email || '',
          telefone: data.ddd_telefone_1 || '',
        });
      }
    }
  } catch {
    // prossegue para segundo fallback
  }

  // 3. Segundo fallback: Publica CNPJ.ws
  try {
    const resCnpjWs = await fetch(
      `https://publica.cnpj.ws/cnpj/${apenasDigitos}`,
      {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      }
    );

    if (resCnpjWs.ok) {
      const data = await resCnpjWs.json();
      const est = data?.estabelecimento || {};
      if (data?.razao_social) {
        const endereco = formatarEndereco({
          logradouro: [est.tipo_logradouro, est.logradouro].filter(Boolean).join(' '),
          numero: est.numero,
          complemento: est.complemento,
          bairro: est.bairro,
          municipio: est.cidade?.nome,
          uf: est.estado?.sigla,
          cep: est.cep,
        });

        return NextResponse.json({
          fonte: 'CNPJ.ws',
          cnpj: apenasDigitos,
          razao_social: data.razao_social || '',
          nome_fantasia: est.nome_fantasia || data.razao_social || '',
          endereco,
          email: est.email || '',
          telefone:
            est.ddd1 && est.telefone1 ? `${est.ddd1}${est.telefone1}` : '',
        });
      }
    }
  } catch {
    // ignorar
  }

  return NextResponse.json(
    { erro: 'CNPJ não encontrado nas bases da Receita Federal.' },
    { status: 404 }
  );
}

