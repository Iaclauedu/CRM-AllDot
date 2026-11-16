import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import sharp from 'sharp';

// Imagem 1x1 branca/transparente válida para ocultar fotos de itens inexistentes sem alterar a estrutura XML
const VALID_1X1_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);
let cachedWhiteJpeg: Buffer | null = null;
async function getWhite1x1Jpeg(): Promise<Buffer> {
  if (!cachedWhiteJpeg) {
    cachedWhiteJpeg = await sharp({
      create: { width: 1, height: 1, channels: 3, background: { r: 255, g: 255, b: 255 } },
    })
      .jpeg({ quality: 100 })
      .toBuffer();
  }
  return cachedWhiteJpeg;
}

function findBalancedParagraph(
  xml: string,
  paraId: string
): { start: number; end: number; content: string } | null {
  const marker = `w14:paraId="${paraId}"`;
  const markerIdx = xml.indexOf(marker);
  if (markerIdx === -1) return null;

  const start = xml.lastIndexOf('<w:p ', markerIdx);
  const startAlt = xml.lastIndexOf('<w:p>', markerIdx);
  const pStart = Math.max(start, startAlt);
  if (pStart === -1) return null;

  let depth = 0;
  let i = pStart;
  while (i < xml.length) {
    const nextOpen = xml.indexOf('<w:p', i);
    const nextClose = xml.indexOf('</w:p>', i);
    if (nextClose === -1) return null;

    if (nextOpen !== -1 && nextOpen < nextClose) {
      const charAfter = xml[nextOpen + 4];
      if (charAfter === ' ' || charAfter === '>' || charAfter === '/') {
        const tagEnd = xml.indexOf('>', nextOpen);
        if (tagEnd !== -1 && xml[tagEnd - 1] !== '/') {
          depth++;
        } else if (depth === 0 && tagEnd !== -1 && xml[tagEnd - 1] === '/') {
          return { start: pStart, end: tagEnd + 1, content: xml.slice(pStart, tagEnd + 1) };
        }
      }
      i = nextOpen + 4;
    } else {
      depth--;
      if (depth <= 0) {
        const end = nextClose + 6;
        return { start: pStart, end, content: xml.slice(pStart, end) };
      }
      i = nextClose + 6;
    }
  }
  return null;
}

function clearParagraphText(xml: string, paraId: string): string {
  const found = findBalancedParagraph(xml, paraId);
  if (!found) return xml;
  let result = '';
  let pos = 0;
  const pContent = found.content;
  while (pos < pContent.length) {
    const mcStart = pContent.indexOf('<mc:AlternateContent', pos);
    const drStart = pContent.indexOf('<w:drawing', pos);
    let nextPreserve = -1;
    let endTag = '';
    if (mcStart !== -1 && (drStart === -1 || mcStart < drStart)) {
      nextPreserve = mcStart;
      endTag = '</mc:AlternateContent>';
    } else if (drStart !== -1) {
      nextPreserve = drStart;
      endTag = '</w:drawing>';
    }

    if (nextPreserve === -1) {
      result += pContent.slice(pos).replace(/<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>/g, '<w:t></w:t>');
      break;
    } else {
      result += pContent.slice(pos, nextPreserve).replace(/<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>/g, '<w:t></w:t>');
      const preserveEnd = pContent.indexOf(endTag, nextPreserve);
      if (preserveEnd === -1) {
        result += pContent.slice(nextPreserve);
        break;
      }
      result += pContent.slice(nextPreserve, preserveEnd + endTag.length);
      pos = preserveEnd + endTag.length;
    }
  }
  return xml.slice(0, found.start) + result + xml.slice(found.end);
}

function replaceParagraphPreservingDrawings(
  xml: string,
  paraId: string,
  newParagraphXml: string
): string {
  const found = findBalancedParagraph(xml, paraId);
  if (!found) return xml;
  const preservedRuns: string[] = [];
  let pos = 0;
  const pContent = found.content;
  while (pos < pContent.length) {
    const mcStart = pContent.indexOf('<mc:AlternateContent', pos);
    if (mcStart === -1) break;
    const mcEnd = pContent.indexOf('</mc:AlternateContent>', mcStart);
    if (mcEnd === -1) break;
    preservedRuns.push(
      `<w:r>${pContent.slice(mcStart, mcEnd + '</mc:AlternateContent>'.length)}</w:r>`
    );
    pos = mcEnd + '</mc:AlternateContent>'.length;
  }
  if (preservedRuns.length > 0) {
    const injected = newParagraphXml.replace(/<\/w:p>$/, `${preservedRuns.join('')}</w:p>`);
    return xml.slice(0, found.start) + injected + xml.slice(found.end);
  }
  return xml.slice(0, found.start) + newParagraphXml + xml.slice(found.end);
}

function removeDrawingByRelId(xml: string, relId: string): string {
  let result = xml;
  let searchPos = 0;
  while (true) {
    const idx = result.indexOf(`"${relId}"`, searchPos);
    if (idx === -1) break;
    const mcStart = result.lastIndexOf('<mc:AlternateContent', idx);
    const drStart = result.lastIndexOf('<w:drawing', idx);
    let blockStart = -1;
    let endTag = '';
    if (mcStart !== -1 && (drStart === -1 || mcStart > drStart)) {
      const mcEnd = result.indexOf('</mc:AlternateContent>', idx);
      if (mcEnd !== -1 && mcEnd - mcStart < 15000) {
        blockStart = mcStart;
        endTag = '</mc:AlternateContent>';
      }
    }
    if (blockStart === -1 && drStart !== -1) {
      const drEnd = result.indexOf('</w:drawing>', idx);
      if (drEnd !== -1 && drEnd - drStart < 15000) {
        blockStart = drStart;
        endTag = '</w:drawing>';
      }
    }
    if (blockStart !== -1) {
      const blockEnd = result.indexOf(endTag, idx) + endTag.length;
      result = result.slice(0, blockStart) + result.slice(blockEnd);
      searchPos = blockStart;
    } else {
      searchPos = idx + relId.length;
    }
  }
  return result;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function processarImagemParaWord(
  imagemUrl?: string,
  nomeProduto?: string,
  formato: 'jpeg' | 'png' = 'jpeg'
): Promise<Buffer> {
  try {
    if (imagemUrl) {
      // 1. Data URL Base64 (ex: data:image/webp;base64,... ou png/jpeg)
      if (imagemUrl.startsWith('data:image/')) {
        const matches = imagemUrl.match(/^data:image\/[a-zA-Z0-9+.-]+;base64,(.+)$/);
        const base64Data = matches ? matches[1] : imagemUrl.split(',')[1];
        if (base64Data) {
          const inputBuffer = Buffer.from(base64Data, 'base64');
          if (formato === 'png') {
            return await sharp(inputBuffer)
              .resize(400, 400, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 },
              })
              .png({ quality: 90 })
              .toBuffer();
          } else {
            return await sharp(inputBuffer)
              .resize(400, 400, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 },
              })
              .jpeg({ quality: 90 })
              .toBuffer();
          }
        }
      }

      // 2. Caminho local (/proposta-template/... ou public/...)
      if (imagemUrl.startsWith('/')) {
        const localPath = path.join(process.cwd(), 'public', imagemUrl.replace(/^\//, ''));
        if (fs.existsSync(localPath)) {
          const inputBuffer = fs.readFileSync(localPath);
          if (formato === 'png') {
            return await sharp(inputBuffer)
              .resize(400, 400, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 },
              })
              .png({ quality: 90 })
              .toBuffer();
          } else {
            return await sharp(inputBuffer)
              .resize(400, 400, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 },
              })
              .jpeg({ quality: 90 })
              .toBuffer();
          }
        }
      }

      // 3. URL externa HTTP / HTTPS
      if (imagemUrl.startsWith('http://') || imagemUrl.startsWith('https://')) {
        const res = await fetch(imagemUrl);
        if (res.ok) {
          const ab = await res.arrayBuffer();
          const inputBuffer = Buffer.from(ab);
          if (formato === 'png') {
            return await sharp(inputBuffer)
              .resize(400, 400, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 },
              })
              .png({ quality: 90 })
              .toBuffer();
          } else {
            return await sharp(inputBuffer)
              .resize(400, 400, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 },
              })
              .jpeg({ quality: 90 })
              .toBuffer();
          }
        }
      }
    }
  } catch (err) {
    console.warn('Erro ao converter imagem do produto para o Word:', err);
  }

  // Fallback: Gerador de imagem elegante e profissional com identidade BrinDay
  const titulo = escapeXml(nomeProduto ? nomeProduto.slice(0, 32) : 'Item Comercial');
  const svgPlaceholder = `
    <svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="400" rx="20" fill="#f8fafc"/>
      <rect x="15" y="15" width="370" height="370" rx="16" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
      <circle cx="200" cy="155" r="50" fill="#e0f2fe"/>
      <path d="M175 175 L175 140 L200 120 L225 140 L225 175 Z" fill="#034550"/>
      <path d="M185 140 L200 130 L215 140 L200 150 Z" fill="#d4ef2e"/>
      <text x="200" y="240" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="bold" fill="#034550" text-anchor="middle">${titulo}</text>
      <text x="200" y="265" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#64748b" text-anchor="middle">BrinDay Personalizados</text>
    </svg>
  `;

  if (formato === 'png') {
    return await sharp(Buffer.from(svgPlaceholder)).png().toBuffer();
  } else {
    return await sharp(Buffer.from(svgPlaceholder)).jpeg({ quality: 90 }).toBuffer();
  }
}

export async function POST(request: NextRequest) {
  try {
    const dados = await request.json();

    const numeroCard = dados.numeroCard || '#1001';
    const dataAtual = dados.data || new Date().toLocaleDateString('pt-BR');
    const vendedor = dados.vendedor || 'Carlos Eduardo Moreira';
    const empresaNome = dados.empresaNome || 'Cliente BrinDay';
    const empresaDoc = dados.empresaDoc || 'Não informado';
    const empresaEndereco = dados.empresaEndereco || 'São Paulo - SP';
    const contatoNome = dados.contatoNome || 'A/C Departamento de Compras';
    const contatoTelefone = dados.contatoTelefone || 'Não informado';
    const contatoEmail = dados.contatoEmail || 'Não informado';
    const subtotal = dados.subtotal || 'R$ 0,00';
    const frete = dados.frete || 'FOB - Por conta do cliente';
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

    const rawXml = await zip.file('word/document.xml')?.async('string');
    if (!rawXml) {
      return NextResponse.json(
        { erro: 'Estrutura do documento da proposta inválida.' },
        { status: 500 }
      );
    }
    let docXml: string = rawXml;

    // 1. Substituir Orçamento e Data
    docXml = docXml.replace('{numero do card}', escapeXml(numeroCard));
    docXml = docXml.replace('{Data}', escapeXml(dataAtual));

    // 2. Vendedor(a)
    docXml = docXml.replace(
      '<w:t>Vendedor(a):</w:t>',
      `<w:t xml:space="preserve">Vendedor(a): ${escapeXml(vendedor)}</w:t>`
    );

    // 3. Dados do Cliente e Contato nos parágrafos correspondentes (P49, P50, P51)
    const p49Target =
      '<w:p w14:paraId="746A90BC" w14:textId="77777777" w:rsidR="00861481" w:rsidRDefault="00861481"><w:pPr><w:pStyle w:val="Corpodetexto"/><w:rPr><w:rFonts w:ascii="Gill Sans MT"/><w:b/><w:sz w:val="36"/></w:rPr></w:pPr></w:p>';
    const p49Replace = `<w:p w14:paraId="746A90BC" w14:textId="77777777" w:rsidR="00861481" w:rsidRDefault="00861481"><w:pPr><w:tabs><w:tab w:val="left" w:pos="5875"/></w:tabs><w:ind w:left="257"/><w:rPr><w:rFonts w:ascii="Gill Sans MT"/><w:sz w:val="20"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Gill Sans MT"/><w:b/><w:color w:val="034550"/><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(empresaNome)}</w:t></w:r><w:r><w:tab/><w:rPr><w:rFonts w:ascii="Gill Sans MT"/><w:b/><w:color w:val="034550"/><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(contatoNome)}</w:t></w:r></w:p>`;

    const p50Target =
      '<w:p w14:paraId="373F77DB" w14:textId="77777777" w:rsidR="00861481" w:rsidRDefault="00861481"><w:pPr><w:pStyle w:val="Corpodetexto"/><w:rPr><w:rFonts w:ascii="Gill Sans MT"/><w:b/><w:sz w:val="36"/></w:rPr></w:pPr></w:p>';
    const p50Replace = `<w:p w14:paraId="373F77DB" w14:textId="77777777" w:rsidR="00861481" w:rsidRDefault="00861481"><w:pPr><w:tabs><w:tab w:val="left" w:pos="5875"/></w:tabs><w:ind w:left="257"/><w:rPr><w:rFonts w:ascii="Gill Sans MT"/><w:sz w:val="18"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Gill Sans MT"/><w:color w:val="666666"/><w:sz w:val="18"/></w:rPr><w:t>CNPJ/CPF: ${escapeXml(empresaDoc)}</w:t></w:r><w:r><w:tab/><w:rPr><w:rFonts w:ascii="Gill Sans MT"/><w:color w:val="666666"/><w:sz w:val="18"/></w:rPr><w:t>WhatsApp: ${escapeXml(contatoTelefone)}</w:t></w:r></w:p>`;

    const p51Target =
      '<w:p w14:paraId="18E5D445" w14:textId="77777777" w:rsidR="00861481" w:rsidRDefault="00861481"><w:pPr><w:pStyle w:val="Corpodetexto"/><w:rPr><w:rFonts w:ascii="Gill Sans MT"/><w:b/><w:sz w:val="36"/></w:rPr></w:pPr></w:p>';
    const p51Replace = `<w:p w14:paraId="18E5D445" w14:textId="77777777" w:rsidR="00861481" w:rsidRDefault="00861481"><w:pPr><w:tabs><w:tab w:val="left" w:pos="5875"/></w:tabs><w:ind w:left="257"/><w:rPr><w:rFonts w:ascii="Gill Sans MT"/><w:sz w:val="18"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Gill Sans MT"/><w:color w:val="666666"/><w:sz w:val="18"/></w:rPr><w:t>Endereço: ${escapeXml(empresaEndereco)}</w:t></w:r><w:r><w:tab/><w:rPr><w:rFonts w:ascii="Gill Sans MT"/><w:color w:val="666666"/><w:sz w:val="18"/></w:rPr><w:t>E-mail: ${escapeXml(contatoEmail)}</w:t></w:r></w:p>`;

    if (docXml.includes(p49Target)) docXml = docXml.replace(p49Target, p49Replace);
    if (docXml.includes(p50Target)) docXml = docXml.replace(p50Target, p50Replace);
    if (docXml.includes(p51Target)) docXml = docXml.replace(p51Target, p51Replace);

    // 4. ATUALIZAR ITENS DA GRADE DE PRODUTOS (usando parser balanceado para preservar desenhos/cabeçalhos)
    const produtos = Array.isArray(dados.produtos) ? dados.produtos : [];

    // --- PRODUTO 1 ---
    const p1 = produtos[0];
    if (p1) {
      docXml = replaceParagraphPreservingDrawings(
        docXml,
        '06DCA2B4',
        `<w:p w14:paraId="06DCA2B4" w14:textId="77777777" w:rsidR="00861481" w:rsidRDefault="00000000"><w:pPr><w:spacing w:before="59"/><w:ind w:left="3690" w:right="1"/><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Arial"/><w:b/><w:sz w:val="24"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial"/><w:b/><w:sz w:val="24"/></w:rPr><w:t>${escapeXml(p1.codigo || 'ITEM-001')}</w:t></w:r></w:p>`
      );
      docXml = replaceParagraphPreservingDrawings(
        docXml,
        '595A8045',
        `<w:p w14:paraId="595A8045" w14:textId="77777777" w:rsidR="00861481" w:rsidRDefault="00000000"><w:pPr><w:pStyle w:val="Corpodetexto"/><w:spacing w:before="69"/><w:ind w:left="3690"/><w:jc w:val="center"/><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>${escapeXml(p1.nome)}</w:t></w:r></w:p>`
      );
      const qtd1 = String(p1.quantidade || 1).padStart(2, '0');
      const desc1 = (p1.descricao || 'Produto / serviço personalizado conforme negociação comercial.').replace(/^Descrição:\s*/i, '');
      docXml = replaceParagraphPreservingDrawings(
        docXml,
        '7FF7CFB3',
        `<w:p w14:paraId="7FF7CFB3" w14:textId="77777777" w:rsidR="00861481" w:rsidRDefault="00000000"><w:pPr><w:pStyle w:val="Corpodetexto"/><w:tabs><w:tab w:val="left" w:pos="3973"/></w:tabs><w:spacing w:before="86" w:line="194" w:lineRule="auto"/><w:ind w:left="3689" w:hanging="3216"/></w:pPr><w:r><w:rPr><w:spacing w:val="-6"/><w:w w:val="105"/><w:position w:val="-12"/><w:sz w:val="37"/></w:rPr><w:t>${qtd1}</w:t></w:r><w:r><w:rPr><w:position w:val="-12"/><w:sz w:val="37"/></w:rPr><w:tab/></w:r><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:w w:val="105"/></w:rPr><w:t xml:space="preserve">Descrição: </w:t></w:r><w:r><w:rPr><w:w w:val="105"/></w:rPr><w:t>${escapeXml(desc1)}</w:t></w:r></w:p>`
      );
      docXml = clearParagraphText(docXml, '60E7F0CC');
      const valor1 = typeof p1.valorUnitario === 'string' ? p1.valorUnitario : `R$ ${p1.valorUnitario}`;
      docXml = replaceParagraphPreservingDrawings(
        docXml,
        '253942A7',
        `<w:p w14:paraId="253942A7" w14:textId="77777777" w:rsidR="00861481" w:rsidRDefault="00000000"><w:pPr><w:ind w:left="342"/><w:rPr><w:rFonts w:ascii="Arial"/><w:b/><w:sz w:val="28"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial"/><w:b/><w:color w:val="0C1D38"/><w:sz w:val="28"/></w:rPr><w:t>${escapeXml(valor1)}</w:t></w:r></w:p>`
      );

      const img1Buf = await processarImagemParaWord(p1.imagemUrl, p1.nome, 'jpeg');
      zip.file('word/media/image35.jpeg', img1Buf);
      zip.file('word/media/image39.jpeg', img1Buf);
    } else {
      for (const pid of ['06DCA2B4', '595A8045', '7FF7CFB3', '60E7F0CC', '253942A7']) {
        docXml = clearParagraphText(docXml, pid);
      }
      const whiteJpg = await getWhite1x1Jpeg();
      zip.file('word/media/image35.jpeg', whiteJpg);
      zip.file('word/media/image39.jpeg', whiteJpg);
    }

    // --- PRODUTO 2 ---
    const p2 = produtos[1];
    if (p2) {
      docXml = replaceParagraphPreservingDrawings(
        docXml,
        '123E36C2',
        `<w:p w14:paraId="123E36C2" w14:textId="77777777" w:rsidR="00861481" w:rsidRDefault="00000000"><w:pPr><w:pStyle w:val="Corpodetexto"/><w:spacing w:before="35"/><w:ind w:left="5496"/><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(p2.codigo || 'ITEM-002')}</w:t></w:r></w:p>`
      );
      docXml = replaceParagraphPreservingDrawings(
        docXml,
        '77C76B24',
        `<w:p w14:paraId="77C76B24" w14:textId="77777777" w:rsidR="00861481" w:rsidRDefault="00000000"><w:pPr><w:pStyle w:val="Corpodetexto"/><w:spacing w:before="69" w:line="271" w:lineRule="auto"/><w:ind w:left="3812" w:firstLine="798"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">${escapeXml(p2.nome)} </w:t></w:r></w:p>`
      );
      const qtd2 = String(p2.quantidade || 1).padStart(2, '0');
      const desc2 = (p2.descricao || 'Produto / serviço personalizado conforme negociação comercial.').replace(/^Descrição:\s*/i, '');
      docXml = replaceParagraphPreservingDrawings(
        docXml,
        '38664CE6',
        `<w:p w14:paraId="38664CE6" w14:textId="77777777" w:rsidR="00861481" w:rsidRDefault="00000000"><w:pPr><w:pStyle w:val="Corpodetexto"/><w:tabs><w:tab w:val="left" w:pos="3575"/></w:tabs><w:spacing w:line="292" w:lineRule="exact"/><w:ind w:left="421"/></w:pPr><w:r><w:rPr><w:spacing w:val="-5"/><w:position w:val="5"/><w:sz w:val="37"/></w:rPr><w:t>${qtd2}</w:t></w:r><w:r><w:rPr><w:position w:val="5"/><w:sz w:val="37"/></w:rPr><w:tab/></w:r><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">Descrição: </w:t></w:r><w:r><w:t>${escapeXml(desc2)}</w:t></w:r></w:p>`
      );
      docXml = clearParagraphText(docXml, '47A0E11B');
      const valor2 = typeof p2.valorUnitario === 'string' ? p2.valorUnitario : `R$ ${p2.valorUnitario}`;
      docXml = replaceParagraphPreservingDrawings(
        docXml,
        '3F246552',
        `<w:p w14:paraId="3F246552" w14:textId="77777777" w:rsidR="00861481" w:rsidRDefault="00000000"><w:pPr><w:ind w:left="421"/><w:rPr><w:rFonts w:ascii="Arial"/><w:b/><w:sz w:val="28"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial"/><w:b/><w:color w:val="0C1D38"/><w:sz w:val="28"/></w:rPr><w:t>${escapeXml(valor2)}</w:t></w:r></w:p>`
      );

      const img2Buf = await processarImagemParaWord(p2.imagemUrl, p2.nome, 'jpeg');
      zip.file('word/media/image36.jpeg', img2Buf);
      zip.file('word/media/image40.jpeg', img2Buf);
    } else {
      for (const pid of ['123E36C2', '77C76B24', '38664CE6', '47A0E11B', '3F246552']) {
        docXml = clearParagraphText(docXml, pid);
      }
      const whiteJpg = await getWhite1x1Jpeg();
      zip.file('word/media/image36.jpeg', whiteJpg);
      zip.file('word/media/image40.jpeg', whiteJpg);
    }

    // --- PRODUTO 3 ---
    const p3 = produtos[2];
    if (p3) {
      docXml = replaceParagraphPreservingDrawings(
        docXml,
        '2CDE1A3F',
        `<w:p w14:paraId="2CDE1A3F" w14:textId="77777777" w:rsidR="00861481" w:rsidRDefault="00000000"><w:pPr><w:spacing w:before="59"/><w:ind w:left="3130" w:right="1"/><w:jc w:val="center"/><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(p3.codigo || 'ITEM-003')}</w:t></w:r></w:p>`
      );
      docXml = replaceParagraphPreservingDrawings(
        docXml,
        '5FA1B395',
        `<w:p w14:paraId="5FA1B395" w14:textId="77777777" w:rsidR="00861481" w:rsidRDefault="00000000"><w:pPr><w:pStyle w:val="Corpodetexto"/><w:spacing w:before="69"/><w:ind w:left="3130" w:right="2"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>${escapeXml(p3.nome)}</w:t></w:r></w:p>`
      );
      const qtd3 = String(p3.quantidade || 1).padStart(2, '0');
      const desc3 = (p3.descricao || 'Produto / serviço personalizado conforme negociação comercial.').replace(/^Descrição:\s*/i, '');
      docXml = replaceParagraphPreservingDrawings(
        docXml,
        '59734D05',
        `<w:p w14:paraId="59734D05" w14:textId="77777777" w:rsidR="00861481" w:rsidRDefault="00000000"><w:pPr><w:pStyle w:val="Corpodetexto"/><w:spacing w:before="86"/><w:ind w:left="3130"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">Descrição: </w:t></w:r><w:r><w:t>${escapeXml(desc3)}</w:t></w:r></w:p>`
      );
      docXml = replaceParagraphPreservingDrawings(
        docXml,
        '375E9641',
        `<w:p w14:paraId="375E9641" w14:textId="77777777" w:rsidR="00861481" w:rsidRDefault="00000000"><w:pPr><w:pStyle w:val="Corpodetexto"/><w:tabs><w:tab w:val="left" w:pos="3130"/></w:tabs><w:spacing w:line="292" w:lineRule="exact"/><w:ind w:left="421"/></w:pPr><w:r><w:rPr><w:spacing w:val="-5"/><w:position w:val="5"/><w:sz w:val="37"/></w:rPr><w:t>${qtd3}</w:t></w:r></w:p>`
      );
      for (const pid of ['42B7027F', '01E79589', '2C60629E', '08B40392', '7CF9BD0B', '13D65A5E']) {
        docXml = clearParagraphText(docXml, pid);
      }
      const valor3 = typeof p3.valorUnitario === 'string' ? p3.valorUnitario : `R$ ${p3.valorUnitario}`;
      docXml = replaceParagraphPreservingDrawings(
        docXml,
        '215575EF',
        `<w:p w14:paraId="215575EF" w14:textId="77777777" w:rsidR="00861481" w:rsidRDefault="00000000"><w:pPr><w:ind w:left="421"/><w:rPr><w:rFonts w:ascii="Arial"/><w:b/><w:sz w:val="28"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial"/><w:b/><w:color w:val="0C1D38"/><w:sz w:val="28"/></w:rPr><w:t>${escapeXml(valor3)}</w:t></w:r></w:p>`
      );

      const img3Buf = await processarImagemParaWord(p3.imagemUrl, p3.nome, 'jpeg');
      zip.file('word/media/image37.jpeg', img3Buf);
      zip.file('word/media/image41.jpeg', img3Buf);
    } else {
      for (const pid of ['2CDE1A3F', '5FA1B395', '59734D05', '375E9641', '42B7027F', '01E79589', '2C60629E', '08B40392', '7CF9BD0B', '13D65A5E', '215575EF']) {
        docXml = clearParagraphText(docXml, pid);
      }
      const whiteJpg = await getWhite1x1Jpeg();
      zip.file('word/media/image37.jpeg', whiteJpg);
      zip.file('word/media/image41.jpeg', whiteJpg);
    }

    // --- PRODUTO 4 ---
    const p4 = produtos[3];
    if (p4) {
      docXml = replaceParagraphPreservingDrawings(
        docXml,
        '3DB04DCF',
        `<w:p w14:paraId="3DB04DCF" w14:textId="77777777" w:rsidR="00861481" w:rsidRDefault="00000000"><w:pPr><w:spacing w:before="12"/><w:ind w:left="3076" w:right="1"/><w:jc w:val="center"/><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(p4.codigo || 'ITEM-004')}</w:t></w:r></w:p>`
      );
      docXml = replaceParagraphPreservingDrawings(
        docXml,
        '2FA5D651',
        `<w:p w14:paraId="2FA5D651" w14:textId="77777777" w:rsidR="00861481" w:rsidRDefault="00000000"><w:pPr><w:spacing w:before="73"/><w:ind w:left="3076" w:right="1"/><w:jc w:val="center"/><w:rPr><w:sz w:val="26"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>${escapeXml(p4.nome)}</w:t></w:r></w:p>`
      );
      const qtd4 = String(p4.quantidade || 1).padStart(2, '0');
      const desc4 = (p4.descricao || 'Produto / serviço personalizado conforme negociação comercial.').replace(/^Descrição:\s*/i, '');
      docXml = replaceParagraphPreservingDrawings(
        docXml,
        '081BAC48',
        `<w:p w14:paraId="081BAC48" w14:textId="77777777" w:rsidR="00861481" w:rsidRDefault="00000000"><w:pPr><w:spacing w:before="41" w:line="271" w:lineRule="auto"/><w:ind w:left="3076" w:right="1"/><w:jc w:val="center"/><w:rPr><w:sz w:val="26"/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">Descrição: </w:t></w:r><w:r><w:t>${escapeXml(desc4)}</w:t></w:r></w:p>`
      );
      docXml = replaceParagraphPreservingDrawings(
        docXml,
        '1E725B61',
        `<w:p w14:paraId="1E725B61" w14:textId="77777777" w:rsidR="00861481" w:rsidRDefault="00000000"><w:pPr><w:pStyle w:val="Corpodetexto"/><w:tabs><w:tab w:val="left" w:pos="3076"/></w:tabs><w:spacing w:line="292" w:lineRule="exact"/><w:ind w:left="421"/></w:pPr><w:r><w:rPr><w:spacing w:val="-5"/><w:position w:val="5"/><w:sz w:val="37"/></w:rPr><w:t>${qtd4}</w:t></w:r></w:p>`
      );
      for (const pid of ['28AD0B3E', '11950F23', '24284B6B', '38E1FDAC', '50CD72FE', '74C16D5C', '3B8D62A0']) {
        docXml = clearParagraphText(docXml, pid);
      }
      const valor4 = typeof p4.valorUnitario === 'string' ? p4.valorUnitario : `R$ ${p4.valorUnitario}`;
      docXml = replaceParagraphPreservingDrawings(
        docXml,
        '3A0D65DF',
        `<w:p w14:paraId="3A0D65DF" w14:textId="77777777" w:rsidR="00861481" w:rsidRDefault="00000000"><w:pPr><w:ind w:left="343"/><w:rPr><w:rFonts w:ascii="Arial"/><w:b/><w:sz w:val="28"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial"/><w:b/><w:color w:val="0C1D38"/><w:sz w:val="28"/></w:rPr><w:t>${escapeXml(valor4)}</w:t></w:r></w:p>`
      );

      const img4Buf = await processarImagemParaWord(p4.imagemUrl, p4.nome, 'png');
      zip.file('word/media/image44.png', img4Buf);
      zip.file('word/media/image45.png', img4Buf);
    } else {
      for (const pid of ['3DB04DCF', '2FA5D651', '081BAC48', '28AD0B3E', '11950F23', '1E725B61', '24284B6B', '38E1FDAC', '50CD72FE', '74C16D5C', '3B8D62A0', '3A0D65DF']) {
        docXml = clearParagraphText(docXml, pid);
      }
      zip.file('word/media/image44.png', VALID_1X1_PNG);
      zip.file('word/media/image45.png', VALID_1X1_PNG);
    }

    // 5. ATUALIZAR TOTAIS
    docXml = replaceParagraphPreservingDrawings(
      docXml,
      '21DC8EFA',
      `<w:p w14:paraId="21DC8EFA" w14:textId="77777777" w:rsidR="00861481" w:rsidRDefault="00000000"><w:pPr><w:ind w:right="2301"/><w:jc w:val="right"/><w:rPr><w:rFonts w:ascii="Arial"/><w:b/><w:sz w:val="24"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial"/><w:b/><w:color w:val="333333"/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">SUBTOTAL: </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Arial"/><w:b/><w:color w:val="034550"/><w:sz w:val="24"/></w:rPr><w:t>${escapeXml(subtotal)}</w:t></w:r></w:p>`
    );

    docXml = replaceParagraphPreservingDrawings(
      docXml,
      '2565DAE6',
      `<w:p w14:paraId="2565DAE6" w14:textId="77777777" w:rsidR="00861481" w:rsidRDefault="00000000"><w:pPr><w:spacing w:before="78"/><w:ind w:right="2231"/><w:jc w:val="right"/><w:rPr><w:rFonts w:ascii="Arial"/><w:b/><w:sz w:val="24"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial"/><w:b/><w:color w:val="333333"/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">FRETE: </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Arial"/><w:color w:val="666666"/><w:sz w:val="24"/></w:rPr><w:t>${escapeXml(frete)}</w:t></w:r></w:p>`
    );

    docXml = replaceParagraphPreservingDrawings(
      docXml,
      '32097BBB',
      `<w:p w14:paraId="32097BBB" w14:textId="77777777" w:rsidR="00861481" w:rsidRDefault="00000000"><w:pPr><w:ind w:right="2231"/><w:jc w:val="right"/><w:rPr><w:rFonts w:ascii="Gill Sans MT"/><w:b/><w:sz w:val="28"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Gill Sans MT"/><w:b/><w:color w:val="034550"/><w:sz w:val="28"/></w:rPr><w:t xml:space="preserve">TOTAL: </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Gill Sans MT"/><w:b/><w:color w:val="034550"/><w:sz w:val="28"/></w:rPr><w:t>${escapeXml(total)}</w:t></w:r></w:p>`
    );

    // 6. ATUALIZAR CONDIÇÕES COMERCIAIS
    docXml = docXml.replace(
      '<w:t>Pagamento:</w:t>',
      `<w:t xml:space="preserve">Pagamento: ${escapeXml(pagamento)}</w:t>`
    );
    docXml = docXml.replace(
      '<w:t>Validade</w:t>',
      `<w:t xml:space="preserve">Validade: ${escapeXml(validade)}</w:t>`
    );
    docXml = docXml.replace(
      '<w:t>Disponibilidade: Frete:</w:t>',
      `<w:t xml:space="preserve">Disponibilidade: ${escapeXml(prazoEntrega)} | Frete: ${escapeXml(frete)}</w:t>`
    );
    docXml = docXml.replace(
      '<w:t>Outras observações à considerar:</w:t>',
      `<w:t xml:space="preserve">Outras observações: ${escapeXml(observacoes)}</w:t>`
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
