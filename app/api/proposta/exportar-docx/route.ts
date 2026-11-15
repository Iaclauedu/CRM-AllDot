import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

export async function POST(request: NextRequest) {
  try {
    const dados = await request.json();

    const numeroCard = dados.numeroCard || '#1001';
    const dataAtual = dados.data || new Date().toLocaleDateString('pt-BR');
    const vendedor = dados.vendedor || 'Equipe Comercial';
    const empresaNome = dados.empresaNome || 'Cliente BrinDay';
    const empresaDoc = dados.empresaDoc || 'Não informado';
    const empresaEndereco = dados.empresaEndereco || 'Não informado';
    const contatoNome = dados.contatoNome || 'Não informado';
    const contatoTelefone = dados.contatoTelefone || 'Não informado';
    const contatoEmail = dados.contatoEmail || 'Não informado';
    const subtotal = dados.subtotal || 'R$ 0,00';
    const frete = dados.frete || 'A Combinar';
    const total = dados.total || subtotal;
    const pagamento = dados.pagamento || '50% de entrada no pedido e 50% no faturamento';
    const validade = dados.validade || '7 dias úteis';
    const prazoEntrega = dados.prazoEntrega || '7 a 10 dias úteis após aprovação do layout virtual';
    const observacoes = dados.observacoes || 'Personalização conforme layout virtual aprovado.';

    // Caminho do arquivo template base idêntico ao modelo oficial BrinDay
    const templatePath = path.join(process.cwd(), 'public', 'proposta-template', 'template-brinday.docx');
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { erro: 'Arquivo de modelo da proposta BrinDay não foi encontrado no servidor.' },
        { status: 500 }
      );
    }

    const templateBuffer = fs.readFileSync(templatePath);
    const zip = await JSZip.loadAsync(templateBuffer);

    let docXml = await zip.file('word/document.xml')?.async('string');
    if (!docXml) {
      return NextResponse.json(
        { erro: 'Estrutura do documento da proposta inválida.' },
        { status: 500 }
      );
    }

    // 1. Substituir Orçamento e Data
    docXml = docXml.replace('{numero do card}', numeroCard);
    docXml = docXml.replace('{Data}', dataAtual);

    // 2. Vendedor(a)
    docXml = docXml.replace(
      '<w:t>Vendedor(a):</w:t>',
      `<w:t xml:space="preserve">Vendedor(a): ${vendedor}</w:t>`
    );

    // 3. Dados do Cliente e Contato nos parágrafos correspondentes
    const p49Target =
      '<w:p w14:paraId="746A90BC" w14:textId="77777777" w:rsidR="00861481" w:rsidRDefault="00861481"><w:pPr><w:pStyle w:val="Corpodetexto"/><w:rPr><w:rFonts w:ascii="Gill Sans MT"/><w:b/><w:sz w:val="36"/></w:rPr></w:pPr></w:p>';
    const p49Replace = `<w:p w14:paraId="746A90BC" w14:textId="77777777" w:rsidR="00861481" w:rsidRDefault="00861481"><w:pPr><w:tabs><w:tab w:val="left" w:pos="5875"/></w:tabs><w:ind w:left="257"/><w:rPr><w:rFonts w:ascii="Gill Sans MT"/><w:sz w:val="20"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Gill Sans MT"/><w:b/><w:color w:val="034550"/><w:sz w:val="20"/></w:rPr><w:t>${empresaNome}</w:t></w:r><w:r><w:tab/><w:rPr><w:rFonts w:ascii="Gill Sans MT"/><w:b/><w:color w:val="034550"/><w:sz w:val="20"/></w:rPr><w:t>${contatoNome}</w:t></w:r></w:p>`;

    const p50Target =
      '<w:p w14:paraId="373F77DB" w14:textId="77777777" w:rsidR="00861481" w:rsidRDefault="00861481"><w:pPr><w:pStyle w:val="Corpodetexto"/><w:rPr><w:rFonts w:ascii="Gill Sans MT"/><w:b/><w:sz w:val="36"/></w:rPr></w:pPr></w:p>';
    const p50Replace = `<w:p w14:paraId="373F77DB" w14:textId="77777777" w:rsidR="00861481" w:rsidRDefault="00861481"><w:pPr><w:tabs><w:tab w:val="left" w:pos="5875"/></w:tabs><w:ind w:left="257"/><w:rPr><w:rFonts w:ascii="Gill Sans MT"/><w:sz w:val="18"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Gill Sans MT"/><w:color w:val="666666"/><w:sz w:val="18"/></w:rPr><w:t>CNPJ/CPF: ${empresaDoc}</w:t></w:r><w:r><w:tab/><w:rPr><w:rFonts w:ascii="Gill Sans MT"/><w:color w:val="666666"/><w:sz w:val="18"/></w:rPr><w:t>WhatsApp: ${contatoTelefone}</w:t></w:r></w:p>`;

    const p51Target =
      '<w:p w14:paraId="18E5D445" w14:textId="77777777" w:rsidR="00861481" w:rsidRDefault="00861481"><w:pPr><w:pStyle w:val="Corpodetexto"/><w:rPr><w:rFonts w:ascii="Gill Sans MT"/><w:b/><w:sz w:val="36"/></w:rPr></w:pPr></w:p>';
    const p51Replace = `<w:p w14:paraId="18E5D445" w14:textId="77777777" w:rsidR="00861481" w:rsidRDefault="00861481"><w:pPr><w:tabs><w:tab w:val="left" w:pos="5875"/></w:tabs><w:ind w:left="257"/><w:rPr><w:rFonts w:ascii="Gill Sans MT"/><w:sz w:val="18"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Gill Sans MT"/><w:color w:val="666666"/><w:sz w:val="18"/></w:rPr><w:t>Endereço: ${empresaEndereco}</w:t></w:r><w:r><w:tab/><w:rPr><w:rFonts w:ascii="Gill Sans MT"/><w:color w:val="666666"/><w:sz w:val="18"/></w:rPr><w:t>E-mail: ${contatoEmail}</w:t></w:r></w:p>`;

    if (docXml.includes(p49Target)) docXml = docXml.replace(p49Target, p49Replace);
    if (docXml.includes(p50Target)) docXml = docXml.replace(p50Target, p50Replace);
    if (docXml.includes(p51Target)) docXml = docXml.replace(p51Target, p51Replace);

    // 4. Se produtos foram enviados, atualizar itens na grade
    if (Array.isArray(dados.produtos) && dados.produtos.length > 0) {
      const p1 = dados.produtos[0];
      if (p1) {
        if (p1.codigo) docXml = docXml.replace('>18501<', `>${p1.codigo}<`);
        if (p1.nome) docXml = docXml.replace('>Nécessaire de Nylon<', `>${p1.nome}<`);
        if (p1.precoUnitario) docXml = docXml.replace('>R$ 18,90<', `>${p1.precoUnitario}<`);
      }
      const p2 = dados.produtos[1];
      if (p2) {
        if (p2.codigo) docXml = docXml.replace('>03007B<', `>${p2.codigo}<`);
        if (p2.nome) docXml = docXml.replace('>Mouse Pad Ergonômico<', `>${p2.nome}<`);
        if (p2.precoUnitario) docXml = docXml.replace('>R$ 19,90<', `>${p2.precoUnitario}<`);
      }
      const p3 = dados.produtos[2];
      if (p3) {
        if (p3.codigo) docXml = docXml.replace('>14092N<', `>${p3.codigo}<`);
        if (p3.nome) docXml = docXml.replace('>Caderneta Emborrachada<', `>${p3.nome}<`);
        if (p3.precoUnitario) docXml = docXml.replace('>R$ 24,90<', `>${p3.precoUnitario}<`);
      }
      const p4 = dados.produtos[3];
      if (p4) {
        if (p4.codigo) docXml = docXml.replace('>14949<', `>${p4.codigo}<`);
        if (p4.nome) docXml = docXml.replace('>Caneta Metal Touch<', `>${p4.nome}<`);
        if (p4.precoUnitario) docXml = docXml.replace('>R$ 3,90<', `>${p4.precoUnitario}<`);
      }
    }

    // 5. Atualizar Totais
    docXml = docXml.replace(
      '<w:t>SUBTOTAL:</w:t>',
      `<w:t xml:space="preserve">SUBTOTAL: ${subtotal}</w:t>`
    );
    docXml = docXml.replace(
      '<w:t>FRETE:</w:t>',
      `<w:t xml:space="preserve">FRETE: ${frete}</w:t>`
    );
    docXml = docXml.replace(
      '<w:t>TOTAL:</w:t>',
      `<w:t xml:space="preserve">TOTAL: ${total}</w:t>`
    );

    // 6. Atualizar Condições Comerciais
    docXml = docXml.replace(
      '<w:t>Pagamento:</w:t>',
      `<w:t xml:space="preserve">Pagamento: ${pagamento}</w:t>`
    );
    docXml = docXml.replace(
      '<w:t>Validade</w:t>',
      `<w:t xml:space="preserve">Validade: ${validade}</w:t>`
    );
    docXml = docXml.replace(
      '<w:t>Outras observações à considerar:</w:t>',
      `<w:t xml:space="preserve">Outras observações: ${observacoes} | Prazo: ${prazoEntrega}</w:t>`
    );

    zip.file('word/document.xml', docXml);

    const docxBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const nomeArquivo = `Proposta_BrinDay_${numeroCard.replace(/[^a-zA-Z0-9_-]/g, '') || 'Orcamento'}.docx`;

    return new Response(new Uint8Array(docxBuffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: unknown) {
    console.error('Erro ao exportar proposta Word:', err);
    return NextResponse.json(
      {
        erro:
          err instanceof Error
            ? err.message
            : 'Ocorreu um erro ao gerar o arquivo Word da proposta.',
      },
      { status: 500 }
    );
  }
}
