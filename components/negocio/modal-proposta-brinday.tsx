'use client';

import * as React from 'react';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FileDown,
  Printer,
  Share2,
  X,
  Check,
  Loader2,
  Edit3,
  Calendar,
  Building,
  User,
  Phone,
  Mail,
  DollarSign,
  Package,
  Clock,
  ShieldCheck,
  Send,
  Eye,
  Sparkles,
  Award,
  Zap,
} from 'lucide-react';
import { type Negocio, type Produto, DADOS_PRODUTOS } from '@/lib/mock-data';
import { buscarProdutosDoBanco } from '@/lib/supabase/service';

interface ModalPropostaBrindayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  negocio: Negocio;
  onRegistrarAtividade?: (atividade: {
    id: string;
    negocio_id: string;
    tipo: 'nota';
    titulo: string;
    concluida_em: string;
    criado_por: string;
    criado_em: string;
  }) => void;
}

interface ItemProdutoProposta {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  dimensoes?: string;
  quantidade: number;
  valorUnitario: number;
  imagemUrl?: string;
}

export function ModalPropostaBrinday({
  open,
  onOpenChange,
  negocio,
  onRegistrarAtividade,
}: ModalPropostaBrindayProps) {
  const [exportandoWord, setExportandoWord] = React.useState(false);
  const [copiadoWhatsApp, setCopiadoWhatsApp] = React.useState(false);
  const [modoEdicao, setModoEdicao] = React.useState(false);

  // Dados do Card e Proposta
  const numeroOrcamento =
    negocio.codigo ||
    negocio.campos_personalizados?.codigo ||
    `#${negocio.id ? negocio.id.slice(0, 6).toUpperCase() : '1001'}`;

  const dataAtual = new Date().toLocaleDateString('pt-BR');

  const [vendedor, setVendedor] = React.useState(
    negocio.responsavel_nome || 'Carlos Eduardo Moreira'
  );
  const [empresaNome, setEmpresaNome] = React.useState(
    negocio.empresa_nome || negocio.lead_empresa || 'Cliente BrinDay'
  );
  const [empresaDoc, setEmpresaDoc] = React.useState(
    (negocio.campos_personalizados?.cnpj as string) ||
    (negocio.campos_personalizados?.cpf as string) ||
    'Não informado'
  );
  const [empresaEndereco, setEmpresaEndereco] = React.useState(
    (negocio.campos_personalizados?.endereco as string) || 'São Paulo - SP'
  );
  const [contatoNome, setContatoNome] = React.useState(
    negocio.contato_nome || negocio.lead_nome || 'A/C Departamento de Compras'
  );
  const [contatoTelefone, setContatoTelefone] = React.useState(
    negocio.contato_whatsapp ||
    (negocio.campos_personalizados?.celular as string) ||
    negocio.lead_celular ||
    ''
  );
  const [contatoEmail, setContatoEmail] = React.useState(
    negocio.contato_email ||
    (negocio.campos_personalizados?.email as string) ||
    negocio.lead_email ||
    ''
  );

  // Condições Comerciais Editáveis
  const [freteValor, setFreteValor] = React.useState<number>(0);
  const [tipoFrete, setTipoFrete] = React.useState('FOB - Por conta do cliente');
  const [formaPagamento, setFormaPagamento] = React.useState(
    '50% de entrada no pedido e 50% no faturamento (ou à vista via Pix)'
  );
  const [prazoEntrega, setPrazoEntrega] = React.useState(
    '7 a 10 dias úteis após aprovação do layout virtual'
  );
  const [validadeProposta, setValidadeProposta] = React.useState('7 dias úteis');
  const [observacoes, setObservacoes] = React.useState(
    'Personalização conforme layout virtual aprovado. Amostra física sob consulta.'
  );

  // Lista padrão de fallback caso o card não tenha produtos vinculados
  const produtosPadraoBrinday: ItemProdutoProposta[] = [
    {
      id: '1',
      codigo: '18501',
      nome: 'Nécessaire de Nylon',
      descricao:
        'Nécessaire multiuso em nylon resistente à água, fechamento em zíper e alça lateral de mão.',
      quantidade: 100,
      valorUnitario: 18.9,
      imagemUrl: '/proposta-template/media/image35.jpeg',
    },
    {
      id: '2',
      codigo: '03007B',
      nome: 'Mouse Pad Ergonômico',
      descricao:
        'Mouse Pad ergonômico, de construção leve em Neoprene e com apoio almofadado em espuma para punho.',
      quantidade: 100,
      valorUnitario: 19.9,
      imagemUrl: '/proposta-template/media/image36.jpeg',
    },
    {
      id: '3',
      codigo: '14092N',
      nome: 'Caderneta Emborrachada',
      descricao:
        'Caderneta emborrachada com porta caneta elástico em nylon, marcador de página em cetim e fita elástica.',
      dimensoes: 'Altura: 21,2 cm | Largura: 14 cm',
      quantidade: 100,
      valorUnitario: 24.9,
      imagemUrl: '/proposta-template/media/image37.jpeg',
    },
    {
      id: '4',
      codigo: '14949',
      nome: 'Caneta Metal Touch',
      descricao:
        'Caneta metálica com touch screen com acabamento emborrachado, carga esferográfica azul 1.0mm e acionamento por clique.',
      quantidade: 200,
      valorUnitario: 3.9,
      imagemUrl: '/proposta-template/media/image44.png',
    },
  ];

  // Produtos carregados do card
  const [produtos, setProdutos] = React.useState<ItemProdutoProposta[]>(produtosPadraoBrinday);

  // Sincroniza em tempo real com os dados do Card sempre que o modal abre ou o negócio muda
  React.useEffect(() => {
    if (!open) return;

    setVendedor(negocio.responsavel_nome || 'Carlos Eduardo Moreira');
    setEmpresaNome(negocio.empresa_nome || negocio.lead_empresa || 'Cliente BrinDay');
    setEmpresaDoc(
      (negocio.campos_personalizados?.cnpj as string) ||
      (negocio.campos_personalizados?.cpf as string) ||
      'Não informado'
    );
    setEmpresaEndereco(
      (negocio.campos_personalizados?.endereco as string) || 'São Paulo - SP'
    );
    setContatoNome(
      negocio.contato_nome || negocio.lead_nome || 'A/C Departamento de Compras'
    );
    setContatoTelefone(
      negocio.contato_whatsapp ||
      (negocio.campos_personalizados?.celular as string) ||
      negocio.lead_celular ||
      ''
    );
    setContatoEmail(
      negocio.contato_email ||
      (negocio.campos_personalizados?.email as string) ||
      negocio.lead_email ||
      ''
    );

    // Carrega catálogo e sincroniza produtos reais do Card
    buscarProdutosDoBanco()
      .then((catalogo) => {
        const catalogoCompleto = catalogo && catalogo.length > 0 ? catalogo : DADOS_PRODUTOS;
        const prodsCard =
          negocio.produtos && negocio.produtos.length > 0
            ? negocio.produtos
            : (negocio as any).produtos_vinculados &&
              (negocio as any).produtos_vinculados.length > 0
              ? (negocio as any).produtos_vinculados
              : [];

        if (prodsCard.length > 0) {
          const mapeados = prodsCard.map((p: any, idx: number) => {
            const pId = p.produto_id || p.id;
            const itemCat =
              catalogoCompleto.find(
                (c) =>
                  c.id === pId ||
                  c.nome.toLowerCase().trim() === (p.nome || p.nome_produto || '').toLowerCase().trim()
              ) ||
              DADOS_PRODUTOS.find(
                (c) =>
                  c.id === pId ||
                  c.nome.toLowerCase().trim() === (p.nome || p.nome_produto || '').toLowerCase().trim()
              );

            const valorUn =
              typeof p.valor_unitario === 'number' && p.valor_unitario > 0
                ? p.valor_unitario
                : typeof p.valorUnitario === 'number' && p.valorUnitario > 0
                  ? p.valorUnitario
                  : itemCat?.valor ||
                  (p.subtotal && p.quantidade ? p.subtotal / p.quantidade : 0);

            return {
              id: pId || String(idx),
              codigo:
                itemCat?.codigo_sku ||
                p.codigo_sku ||
                (p as any).codigo ||
                `SKU-${String(idx + 1).padStart(3, '0')}`,
              nome: p.nome || p.nome_produto || itemCat?.nome || 'Item do Negócio',
              descricao:
                itemCat?.descricao ||
                p.descricao ||
                'Produto / serviço personalizado conforme negociação comercial.',
              dimensoes: (p as any).dimensoes || undefined,
              quantidade: Number(p.quantidade) || 1,
              valorUnitario: Number(valorUn) || 0,
              imagemUrl:
                p.imagemUrl ||
                p.imagem_url ||
                itemCat?.imagem_url ||
                undefined,
            };
          });
          setProdutos(mapeados);
        } else {
          setProdutos(produtosPadraoBrinday);
        }
      })
      .catch(() => {
        if (negocio.produtos && negocio.produtos.length > 0) {
          setProdutos(
            negocio.produtos.map((p, idx) => {
              const itemCat = DADOS_PRODUTOS.find(
                (c) =>
                  c.id === p.produto_id ||
                  c.nome.toLowerCase().trim() === p.nome.toLowerCase().trim()
              );
              return {
                id: p.produto_id || String(idx),
                codigo: itemCat?.codigo_sku || `SKU-${String(idx + 1).padStart(3, '0')}`,
                nome: p.nome,
                descricao: itemCat?.descricao || 'Produto / serviço personalizado conforme negociação comercial.',
                quantidade: Number(p.quantidade) || 1,
                valorUnitario: Number(p.valor_unitario) || 0,
                imagemUrl: itemCat?.imagem_url,
              };
            })
          );
        }
      });
  }, [open, negocio]);

  const subtotal = React.useMemo(() => {
    return produtos.reduce((acc, item) => acc + item.quantidade * item.valorUnitario, 0);
  }, [produtos]);

  const totalGeral = subtotal + freteValor;

  const formatarMoeda = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  // 1. Exportação direta para Word (.docx)
  const handleBaixarWord = async () => {
    setExportandoWord(true);
    try {
      const payload = {
        numeroCard: numeroOrcamento,
        data: dataAtual,
        vendedor,
        empresaNome,
        empresaDoc,
        empresaEndereco,
        contatoNome,
        contatoTelefone,
        contatoEmail,
        subtotal: formatarMoeda(subtotal),
        frete: freteValor > 0 ? `${formatarMoeda(freteValor)} (${tipoFrete})` : tipoFrete,
        total: formatarMoeda(totalGeral),
        pagamento: formaPagamento,
        prazoEntrega,
        validade: validadeProposta,
        observacoes,
        produtos: produtos.map((p) => ({
          codigo: p.codigo,
          nome: p.nome,
          descricao: p.descricao,
          quantidade: p.quantidade,
          valorUnitario: formatarMoeda(p.valorUnitario),
          subtotal: formatarMoeda(p.quantidade * p.valorUnitario),
          imagemUrl: p.imagemUrl,
        })),
      };

      const res = await fetch('/api/proposta/exportar-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Falha ao gerar o arquivo Word.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Proposta_BrinDay_${numeroOrcamento.replace(/\D/g, '') || 'Comercial'}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      if (onRegistrarAtividade) {
        onRegistrarAtividade({
          id: `ativ-prop-${Date.now()}`,
          negocio_id: negocio.id,
          tipo: 'nota',
          titulo: `📄 Proposta Comercial BrinDay baixada em Word (.docx) para ${empresaNome} (Total: ${formatarMoeda(totalGeral)})`,
          concluida_em: new Date().toISOString(),
          criado_por: vendedor,
          criado_em: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error(err);
      alert('Não foi possível gerar a proposta Word. Tente imprimir em PDF.');
    } finally {
      setExportandoWord(false);
    }
  };

  // 2. Impressão / Salvar em PDF nativo do navegador via iframe isolado
  const handleImprimirPDF = () => {
    try {
      const area = document.getElementById('area-impressao-proposta');
      if (!area) {
        window.print();
        return;
      }

      // Remove iframe residual se existir
      const existingIframe = document.getElementById('iframe-impressao-proposta');
      if (existingIframe) {
        existingIframe.remove();
      }

      // Cria iframe oculto desacoplado do modal dialog (largura exata do modal: 800px)
      const iframe = document.createElement('iframe');
      iframe.id = 'iframe-impressao-proposta';
      iframe.style.position = 'fixed';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      iframe.style.width = '800px';
      iframe.style.height = '1131px';
      iframe.style.border = 'none';
      iframe.style.zIndex = '-1';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        window.print();
        return;
      }

      // Extrai de forma síncrona todas as regras CSS já compiladas (Tailwind + globals)
      let compiledCss = '';
      const fallbackLinks: string[] = [];
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          const rules = Array.from(sheet.cssRules || []);
          compiledCss += rules.map((r) => r.cssText).join('\n') + '\n';
        } catch {
          if (sheet.href) {
            fallbackLinks.push(`<link rel="stylesheet" href="${sheet.href}" />`);
          }
        }
      }

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
          <head>
            <meta charset="utf-8" />
            <base href="${window.location.origin}/" />
            <title>Proposta Comercial BrinDay - ${numeroOrcamento}</title>
            ${fallbackLinks.join('\n')}
            <style>${compiledCss}</style>
            <style>
              @page {
                size: A4 portrait;
                margin: 0;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
                box-sizing: border-box;
              }
              html, body.iframe-impressao {
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                width: 800px !important;
                height: auto !important;
                overflow: visible !important;
              }
              @media print {
                html, body.iframe-impressao {
                  zoom: 0.992;
                }
              }
              body.iframe-impressao #area-impressao-proposta {
                display: block !important;
                width: 800px !important;
                max-width: 800px !important;
                margin: 0 !important;
                padding: 0 !important;
                space-y: 0 !important;
              }
              body.iframe-impressao .page-a4 {
                width: 800px !important;
                height: 1131px !important;
                min-height: 1131px !important;
                max-height: 1131px !important;
                aspect-ratio: auto !important;
                page-break-after: always !important;
                break-after: page !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                margin: 0 !important;
                box-shadow: none !important;
                border-radius: 0 !important;
                position: relative !important;
                overflow: hidden !important;
              }
              body.iframe-impressao .page-a4:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }
            </style>
          </head>
          <body class="iframe-impressao">
            <div id="area-impressao-proposta" class="w-[800px] mx-auto text-zinc-900">
              ${area.innerHTML}
            </div>
          </body>
        </html>
      `);
      doc.close();

      const dispararImpressao = async () => {
        try {
          const imgs = Array.from(doc.images || []);
          await Promise.all(
            imgs.map((img) =>
              img.complete
                ? Promise.resolve()
                : new Promise<void>((res) => {
                  img.onload = () => res();
                  img.onerror = () => res();
                  setTimeout(res, 1500);
                })
            )
          );
          if (doc.fonts?.ready) {
            await doc.fonts.ready;
          }
        } catch {
          // Segue mesmo se alguma fonte/imagem demorar
        }
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            iframe.remove();
          }, 5000);
        }, 300);
      };

      if (doc.readyState === 'complete') {
        dispararImpressao();
      } else {
        iframe.onload = dispararImpressao;
        setTimeout(dispararImpressao, 900);
      }

      if (onRegistrarAtividade) {
        onRegistrarAtividade({
          id: `ativ-pdf-${Date.now()}`,
          negocio_id: negocio.id,
          tipo: 'nota',
          titulo: `🖨️ Proposta Comercial BrinDay visualizada/impressa em PDF (${formatarMoeda(totalGeral)})`,
          concluida_em: new Date().toISOString(),
          criado_por: vendedor,
          criado_em: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.error('Erro na impressão por iframe, acionando fallback:', e);
      window.print();
    }
  };

  // 3. Compartilhar resumo da proposta via WhatsApp
  const handleCompartilharWhatsApp = () => {
    const textoMensagem = `*PROPOSTA COMERCIAL BRINDAY* 🎁\n` +
      `*Orçamento:* ${numeroOrcamento}\n` +
      `*Cliente:* ${empresaNome}\n` +
      `*A/C:* ${contatoNome}\n\n` +
      `*ITENS DO ORÇAMENTO:*\n` +
      produtos.map((p, i) => `${i + 1}. ${p.nome} (${p.quantidade} un) - ${formatarMoeda(p.quantidade * p.valorUnitario)}`).join('\n') +
      `\n\n*SUBTOTAL:* ${formatarMoeda(subtotal)}\n` +
      `*FRETE:* ${freteValor > 0 ? formatarMoeda(freteValor) : tipoFrete}\n` +
      `*TOTAL:* ${formatarMoeda(totalGeral)}\n\n` +
      `*Pagamento:* ${formaPagamento}\n` +
      `*Prazo de Entrega:* ${prazoEntrega}\n` +
      `*Validade:* ${validadeProposta}\n\n` +
      `_BrinDay Personalizados - Todos os dias são motivos para celebrar!_`;

    navigator.clipboard.writeText(textoMensagem);
    setCopiadoWhatsApp(true);
    setTimeout(() => setCopiadoWhatsApp(false), 3000);

    const foneLimpo = (contatoTelefone || '').replace(/\D/g, '');
    if (foneLimpo.length >= 10) {
      const urlWhats = `https://wa.me/55${foneLimpo}?text=${encodeURIComponent(textoMensagem)}`;
      window.open(urlWhats, '_blank');
    }
  };

  // Divisão dos produtos entre Página 3 (máximo 3 primeiros itens) e Página 4 (4º item em diante se houver)
  const produtosPagina3 = produtos.slice(0, 3);
  const produtosPagina4 = produtos.slice(3);
  const exibirPagina4Separada = produtosPagina4.length > 0;
  const totalPaginas = exibirPagina4Separada ? 5 : 4;

  const renderResumoEComerciais = (compacto = false) => (
    <div className={compacto ? 'space-y-3 pt-3 border-t border-zinc-200' : 'space-y-4'}>
      {/* Resumo Financeiro (Subtotal, Frete, Total) */}
      <div className="flex justify-end">
        <div
          className={`w-full sm:w-72 rounded-xl bg-zinc-50 border border-zinc-200 text-xs shadow-sm ${
            compacto ? 'space-y-1.5 p-3' : 'space-y-2 p-3.5'
          }`}
        >
          <div className="flex justify-between text-zinc-600">
            <span>SUBTOTAL:</span>
            <strong className="text-zinc-900">{formatarMoeda(subtotal)}</strong>
          </div>
          <div className="flex justify-between text-zinc-600">
            <span>FRETE:</span>
            <strong className="text-zinc-900">
              {freteValor > 0 ? formatarMoeda(freteValor) : tipoFrete}
            </strong>
          </div>
          <div
            className={`flex justify-between text-sm font-black text-[#034550] border-t-2 border-[#D4EF2E] ${
              compacto ? 'pt-1.5' : 'pt-2'
            }`}
          >
            <span>TOTAL GERAL:</span>
            <span className="text-[#84a900] text-base">{formatarMoeda(totalGeral)}</span>
          </div>
        </div>
      </div>

      {/* Condições Comerciais Detalhadas */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-zinc-600 ${
          compacto ? '' : 'pt-2'
        }`}
      >
        <div
          className={`p-3 rounded-xl bg-zinc-50 border border-zinc-200 ${
            compacto ? 'space-y-1' : 'space-y-1.5'
          }`}
        >
          <strong className="text-[#034550] font-bold block text-xs">
            Formas de Pagamento & Frete
          </strong>
          <p>• <strong>Pagamento:</strong> {formaPagamento}</p>
          <p>• <strong>Prazo de Entrega:</strong> {prazoEntrega}</p>
          <p>• <strong>Meio de Envio:</strong> {tipoFrete}</p>
        </div>
        <div
          className={`p-3 rounded-xl bg-zinc-50 border border-zinc-200 ${
            compacto ? 'space-y-1' : 'space-y-1.5'
          }`}
        >
          <strong className="text-[#034550] font-bold block text-xs">
            Informações Adicionais
          </strong>
          <p>• <strong>Validade da Proposta:</strong> {validadeProposta}</p>
          <p>• <strong>Faturamento:</strong> BrinDay Personalizados Ltda.</p>
          <p>• <strong>Observações:</strong> {observacoes}</p>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="modal-proposta-overlay fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-0">
        <div className="modal-proposta-container relative flex flex-col h-[94vh] w-full max-w-5xl rounded-2xl border border-zinc-700 bg-zinc-950 text-zinc-100 shadow-2xl overflow-hidden">
          {/* Header Superior com Ações de Exportação */}
          <div className="imprimir-ocultar flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-[#034550] px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-[#D4EF2E] flex items-center justify-center text-[#034550] font-black text-lg shadow-sm">
                B
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold tracking-tight text-white">
                    Proposta Comercial BrinDay
                  </h2>
                  <span className="rounded bg-[#D4EF2E] px-1.5 py-0.2 text-[10px] font-bold text-[#034550]">
                    {numeroOrcamento}
                  </span>
                </div>
                <p className="text-xs text-zinc-200 truncate max-w-[280px] sm:max-w-md">
                  {empresaNome} • {totalPaginas} Páginas Oficiais BrinDay
                </p>
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setModoEdicao(!modoEdicao)}
                className="h-8 text-xs bg-white/10 hover:bg-white/20 border-white/20 text-white"
              >
                <Edit3 className="h-3.5 w-3.5 mr-1" />
                {modoEdicao ? 'Ocultar Edição' : 'Editar Dados'}
              </Button>

              <Button
                size="sm"
                onClick={handleBaixarWord}
                disabled={exportandoWord}
                className="h-8 text-xs bg-[#D4EF2E] hover:bg-[#bfe01c] text-[#034550] font-bold shadow-md"
              >
                {exportandoWord ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    Gerando Word...
                  </>
                ) : (
                  <>
                    <FileDown className="h-3.5 w-3.5 mr-1" />
                    Baixar Word (.docx)
                  </>
                )}
              </Button>

              <Button
                size="sm"
                onClick={handleImprimirPDF}
                className="h-8 text-xs bg-[#0284c7] hover:bg-[#0369a1] text-white"
              >
                <Printer className="h-3.5 w-3.5 mr-1" />
                Imprimir / PDF
              </Button>

              <Button
                size="sm"
                onClick={handleCompartilharWhatsApp}
                className="h-8 text-xs bg-[#10b981] hover:bg-[#059669] text-white"
              >
                {copiadoWhatsApp ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Share2 className="h-3.5 w-3.5 mr-1" />
                    WhatsApp
                  </>
                )}
              </Button>

              <button
                onClick={() => onOpenChange(false)}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                title="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Drawer Superior de Edição Rápida (quando modoEdicao está ativo) */}
          {modoEdicao && (
            <div className="imprimir-ocultar border-b border-zinc-800 bg-zinc-900/95 p-4 text-xs space-y-3 animate-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Vendedor(a)</label>
                  <Input
                    value={vendedor}
                    onChange={(e) => setVendedor(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Nome da Empresa</label>
                  <Input
                    value={empresaNome}
                    onChange={(e) => setEmpresaNome(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">CNPJ/CPF</label>
                  <Input
                    value={empresaDoc}
                    onChange={(e) => setEmpresaDoc(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Contato / Destinatário</label>
                  <Input
                    value={contatoNome}
                    onChange={(e) => setContatoNome(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Telefone / WhatsApp</label>
                  <Input
                    value={contatoTelefone}
                    onChange={(e) => setContatoTelefone(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">E-mail</label>
                  <Input
                    value={contatoEmail}
                    onChange={(e) => setContatoEmail(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Forma de Pagamento</label>
                  <Input
                    value={formaPagamento}
                    onChange={(e) => setFormaPagamento(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Prazo de Entrega</label>
                  <Input
                    value={prazoEntrega}
                    onChange={(e) => setPrazoEntrega(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Tipo de Frete</label>
                  <Input
                    value={tipoFrete}
                    onChange={(e) => setTipoFrete(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Valor do Frete (R$)</label>
                  <Input
                    type="number"
                    value={freteValor}
                    onChange={(e) => setFreteValor(Number(e.target.value) || 0)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-medium text-muted-foreground">Observações Adicionais</label>
                  <Input
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Visualização da Proposta Formatada A4 (Fiel ao Modelo BrinDay em 5 Páginas) */}
          <div className="modal-proposta-scroll flex-1 overflow-y-auto p-4 sm:p-8 bg-zinc-900/60 flex justify-center">
            <div
              id="area-impressao-proposta"
              className="w-full max-w-[800px] space-y-8 print:space-y-0 text-zinc-900"
            >
              {/* ========================================================
                  PÁGINA 1: CAPA OFICIAL BRINDAY
              ======================================================== */}
              <div className="page-a4 relative w-full aspect-[1/1.414] bg-[#034550] rounded-lg shadow-xl overflow-hidden flex flex-col justify-between p-8 sm:p-12 text-white print:shadow-none print:rounded-none print:break-after-page">
                {/* Imagem de Fundo da Capa BrinDay */}
                <img
                  src="/proposta-template/media/image1.jpeg"
                  alt="Capa BrinDay"
                  className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Logo Oficial BrinDay no Topo Central */}
                <div className="relative z-10 flex justify-center pt-2">
                  <img
                    src="/proposta-template/media/image2.png"
                    alt="BrinDay Personalizados para sua empresa"
                    className="h-14 sm:h-16 object-contain"
                  />
                </div>

                {/* Bloco de Título da Capa (Esquerda, igual ao modelo Word) */}
                <div className="relative z-10 mt-6 mb-auto space-y-3">
                  <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.08]">
                    <span className="text-[#D4EF2E] block">Proposta</span>
                    <span className="text-white block">Comercial</span>
                  </h1>
                  <div className="w-56 sm:w-72 h-1 bg-[#D4EF2E] rounded-full" />
                </div>

                {/* Rodapé da Capa */}
                <div className="relative z-10 text-center pb-2">
                  <p className="text-base sm:text-lg font-medium text-[#D4EF2E]">
                    Soluções personalizadas para sua empresa
                  </p>
                </div>
              </div>

              {/* ========================================================
                  PÁGINA 2: APRESENTAÇÃO INSTITUCIONAL & PILARES
                  (100% IDÊNTICA À PÁGINA 2 DO ARQUIVO ENVIADO)
              ======================================================== */}
              <div className="page-a4 relative w-full aspect-[1/1.414] bg-white rounded-lg shadow-xl overflow-hidden flex flex-col justify-between print:shadow-none print:rounded-none print:break-after-page">
                {/* Curva verde-limão no canto superior direito */}
                <div className="pointer-events-none absolute -top-12 -right-8 w-44 h-44 rounded-b-full border-[26px] border-[#D4EF2E]" />

                {/* Marca d'água sutil "B" no fundo esquerdo */}
                <div className="pointer-events-none absolute left-[-40px] top-[24%] w-[65%] h-[62%] rounded-r-[90px] border-[44px] border-zinc-100/80" />

                {/* Conteúdo Principal da Página 2 */}
                <div className="relative z-10 flex-1 flex flex-col px-8 sm:px-12 pt-10 sm:pt-12">
                  {/* Título Principal */}
                  <div className="max-w-lg">
                    <h2 className="text-4xl sm:text-[42px] font-extrabold text-[#034550] tracking-tight leading-[1.1]">
                      Seu Orçamento
                    </h2>
                    <h2 className="text-4xl sm:text-[42px] font-extrabold text-[#D4EF2E] tracking-tight leading-[1.1]">
                      chegou!
                    </h2>
                  </div>

                  {/* Texto Institucional */}
                  <p className="mt-4 text-sm sm:text-[15px] leading-relaxed text-[#034550] max-w-xl font-normal">
                    Na BrinDay, somos parceiros da sua empresa. Mais do que entregar brindes, criamos soluções personalizadas que comunicam o valor da sua marca, transformando cada brinde em uma extensão da sua identidade e em uma lembrança marcante para seus clientes.
                  </p>

                  {/* Coluna Esquerda (4 Pilares Circulares) + Foto Direita */}
                  <div className="relative flex-1 mt-6 flex items-center">
                    {/* 4 Pilares em Coluna Vertical à Esquerda */}
                    <div className="relative z-20 space-y-5 w-[44%] pb-8">
                      <div className="flex items-center gap-3.5">
                        <div className="h-14 w-14 rounded-full bg-[#034550] border-[4px] border-[#D4EF2E] flex items-center justify-center text-white shrink-0 shadow-sm">
                          <ShieldCheck className="h-6 w-6 stroke-[1.75]" />
                        </div>
                        <span className="text-xs sm:text-[13px] font-medium text-[#034550] leading-tight">
                          Atendimento<br />Personalizado
                        </span>
                      </div>

                      <div className="flex items-center gap-3.5">
                        <div className="h-14 w-14 rounded-full bg-[#034550] border-[4px] border-[#D4EF2E] flex items-center justify-center text-white shrink-0 shadow-sm">
                          <Package className="h-6 w-6 stroke-[1.75]" />
                        </div>
                        <span className="text-xs sm:text-[13px] font-medium text-[#034550] leading-tight">
                          Variedade de<br />Produtos
                        </span>
                      </div>

                      <div className="flex items-center gap-3.5">
                        <div className="h-14 w-14 rounded-full bg-[#034550] border-[4px] border-[#D4EF2E] flex items-center justify-center text-white shrink-0 shadow-sm">
                          <Award className="h-6 w-6 stroke-[1.75]" />
                        </div>
                        <span className="text-xs sm:text-[13px] font-medium text-[#034550] leading-tight">
                          Qualidade nos<br />Detalhes
                        </span>
                      </div>

                      <div className="flex items-center gap-3.5">
                        <div className="h-14 w-14 rounded-full bg-[#034550] border-[4px] border-[#D4EF2E] flex items-center justify-center text-white shrink-0 shadow-sm">
                          <Clock className="h-6 w-6 stroke-[1.75]" />
                        </div>
                        <span className="text-xs sm:text-[13px] font-medium text-[#034550] leading-tight">
                          Agilidade na<br />Entrega
                        </span>
                      </div>
                    </div>

                    {/* Foto Oficial de Parceria BrinDay à Direita (com curva verde atrás) */}
                    <div className="absolute right-[-32px] sm:right-[-48px] bottom-0 w-[68%] h-[92%] z-10 pointer-events-none">
                      <div className="relative w-full h-full">
                        <img
                          src="/proposta-template/media/image6.png"
                          alt="Parceria BrinDay"
                          className="w-full h-full object-cover object-left-top rounded-tl-[72px]"
                        />
                        {/* Detalhe curva verde-limão sobreposta à direita */}
                        <div className="pointer-events-none absolute right-0 top-[42%] w-[62%] h-[42%] rounded-l-full border-[24px] border-r-0 border-[#D4EF2E]/85 mix-blend-multiply" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Barra Inferior Oficial BrinDay */}
                <div className="relative z-20 h-9 sm:h-11 bg-[#034550] w-full shrink-0" />
              </div>

              {/* ========================================================
                  PÁGINA 3: DADOS CADASTRAIS, CLIENTE & PRODUTOS (1 a 3)
              ======================================================== */}
              <div className="page-a4 relative w-full aspect-[1/1.414] bg-white rounded-lg shadow-xl overflow-hidden p-6 sm:p-10 flex flex-col justify-between print:shadow-none print:rounded-none print:break-after-page">
                <div className="space-y-4">
                  {/* Cabeçalho Institucional BrinDay */}
                  <div className="flex items-start justify-between border-b border-zinc-200 pb-3">
                    <div>
                      <h4 className="text-sm font-black text-[#034550]">BrinDay Personalizados</h4>
                      <p className="text-[10px] text-zinc-600">
                        BRINDAY PERSONALIZADOS COMERCIO DE BRINDES E SERVIÇOS GRÁFICOS LTDA.
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        CNPJ: 63.942.323/0001-14 • IE: 157.068.175.110
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        R. Damião Fernandes, 133 - Vila Srg. Jose de Paula, Barueri - SP, 06404-000
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-[#034550]">
                        Brin<span className="text-[#84a900]">Day</span>
                      </span>
                    </div>
                  </div>

                  {/* Barra de Metadados: Orçamento, Data e Vendedor */}
                  <div className="grid grid-cols-3 gap-2 bg-[#034550]/5 border border-[#034550]/15 p-2.5 rounded-lg text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-400 block">Orçamento:</span>
                      <strong className="text-sm font-black text-[#034550]">{numeroOrcamento}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-400 block">Data:</span>
                      <strong className="text-zinc-800">{dataAtual}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-400 block">Vendedor(a):</span>
                      <strong className="text-zinc-800">{vendedor}</strong>
                    </div>
                  </div>

                  {/* Colunas: Dados do Cliente vs Contato */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-[#034550] tracking-wider block">
                        Dados do Cliente:
                      </span>
                      <p className="font-bold text-zinc-900">{empresaNome}</p>
                      <p className="text-zinc-600 text-[11px]">Doc: {empresaDoc}</p>
                      <p className="text-zinc-600 text-[11px] truncate">Endereço: {empresaEndereco}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-[#034550] tracking-wider block">
                        Contato:
                      </span>
                      <p className="font-bold text-zinc-900">{contatoNome}</p>
                      <p className="text-zinc-600 text-[11px]">WhatsApp/Tel: {contatoTelefone || 'Não informado'}</p>
                      <p className="text-zinc-600 text-[11px] truncate">E-mail: {contatoEmail || 'Não informado'}</p>
                    </div>
                  </div>

                  {/* Seção PRODUTOS */}
                  <div className="border-t-2 border-[#034550] pt-2">
                    <span className="text-sm font-black tracking-wide text-[#034550] block mb-2">
                      PRODUTOS
                    </span>
                    <div className="space-y-2.5">
                      {produtosPagina3.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 p-2.5 rounded-lg border border-zinc-200 bg-zinc-50/50 text-xs"
                        >
                          <div className="h-14 w-14 rounded-md bg-white border border-zinc-200 overflow-hidden flex-shrink-0 flex items-center justify-center p-1">
                            {item.imagemUrl ? (
                              <img
                                src={item.imagemUrl}
                                alt={item.nome}
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <Package className="h-5 w-5 text-zinc-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-zinc-900">{item.nome}</span>
                              <span className="font-mono text-[10px] text-[#034550] font-semibold bg-[#034550]/10 px-1.5 py-0.2 rounded">
                                SKU: {item.codigo}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-600 line-clamp-2 leading-relaxed">
                              {item.descricao}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0 space-y-0.5 pl-2 border-l border-zinc-200">
                            <span className="text-[10px] text-zinc-500 block">Qtd: {item.quantidade}</span>
                            <span className="text-xs font-bold text-zinc-900 block">
                              {formatarMoeda(item.valorUnitario)}
                            </span>
                            <span className="text-[10px] text-[#84a900] font-semibold block">
                              Total: {formatarMoeda(item.quantidade * item.valorUnitario)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {!exibirPagina4Separada && renderResumoEComerciais(true)}
                </div>

                <div className="border-t border-zinc-200 pt-2 flex items-center justify-between text-[10px] text-zinc-400">
                  <span>Orçamento {numeroOrcamento} • {empresaNome}</span>
                  <span>Página 3 de {totalPaginas}</span>
                </div>
              </div>

              {/* ========================================================
                  PÁGINA 4: CONTINUAÇÃO PRODUTOS, TOTAIS & CONDIÇÕES
                  (Exibida apenas quando houver 4 ou mais produtos)
              ======================================================== */}
              {exibirPagina4Separada && (
                <div className="page-a4 relative w-full aspect-[1/1.414] bg-white rounded-lg shadow-xl overflow-hidden p-6 sm:p-10 flex flex-col justify-between print:shadow-none print:rounded-none print:break-after-page">
                  <div className="space-y-4">
                    <div className="space-y-2 pb-2 border-b border-zinc-200">
                      <span className="text-xs font-black tracking-wide text-[#034550] block">
                        ITENS ADICIONAIS
                      </span>
                      {produtosPagina4.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 p-2.5 rounded-lg border border-zinc-200 bg-zinc-50/50 text-xs"
                        >
                          <div className="h-14 w-14 rounded-md bg-white border border-zinc-200 overflow-hidden flex-shrink-0 flex items-center justify-center p-1">
                            {item.imagemUrl ? (
                              <img
                                src={item.imagemUrl}
                                alt={item.nome}
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <Package className="h-5 w-5 text-zinc-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-zinc-900">{item.nome}</span>
                              <span className="font-mono text-[10px] text-[#034550] font-semibold bg-[#034550]/10 px-1.5 py-0.2 rounded">
                                SKU: {item.codigo}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-600 line-clamp-2 leading-relaxed">
                              {item.descricao}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0 space-y-0.5 pl-2 border-l border-zinc-200">
                            <span className="text-[10px] text-zinc-500 block">Qtd: {item.quantidade}</span>
                            <span className="text-xs font-bold text-zinc-900 block">
                              {formatarMoeda(item.valorUnitario)}
                            </span>
                            <span className="text-[10px] text-[#84a900] font-semibold block">
                              Total: {formatarMoeda(item.quantidade * item.valorUnitario)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {renderResumoEComerciais(false)}
                  </div>

                  <div className="border-t border-zinc-200 pt-2 flex items-center justify-between text-[10px] text-zinc-400">
                    <span>Condições Comerciais BrinDay</span>
                    <span>Página 4 de {totalPaginas}</span>
                  </div>
                </div>
              )}

              {/* ========================================================
                  PÁGINA 5: CONTRACAPA OFICIAL BRINDAY
              ======================================================== */}
              <div className="page-a4 relative w-full aspect-[1/1.414] bg-[#034550] rounded-lg shadow-xl overflow-hidden flex flex-col justify-between text-white print:shadow-none print:rounded-none">
                {/* Faixa Superior Verde-Limão */}
                <div className="relative z-20 h-7 bg-[#D4EF2E] w-full shrink-0" />

                {/* Fundo Oficial BrinDay */}
                <img
                  src="/proposta-template/media/image46.png"
                  alt="Contracapa BrinDay"
                  className="absolute inset-0 w-full h-full object-cover opacity-55"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-[#034550]/90 via-[#034550]/75 to-[#3d6b28]/60" />

                {/* Conteúdo Centralizado */}
                <div className="relative z-10 flex-1 flex flex-col justify-between p-8 sm:p-12">
                  <div className="flex justify-center pt-4">
                    <img
                      src="/proposta-template/media/image2.png"
                      alt="BrinDay Personalizados para sua empresa"
                      className="h-14 sm:h-16 object-contain"
                    />
                  </div>

                  <div className="text-center space-y-3 my-auto">
                    <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-snug">
                      "Todos os dias são <br />
                      motivos para celebrar!"
                    </h3>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pb-4 text-xs sm:text-sm text-white/95">
                    <span className="flex items-center gap-2 font-medium">
                      <span className="h-7 w-7 rounded-full bg-[#D4EF2E] text-[#034550] flex items-center justify-center shrink-0">
                        <Mail className="h-3.5 w-3.5" />
                      </span>
                      vendas@brindaypersonalizados.com.br
                    </span>
                    <span className="flex items-center gap-2 font-medium">
                      <span className="h-7 w-7 rounded-full bg-[#D4EF2E] text-[#034550] flex items-center justify-center font-bold text-[11px] shrink-0">
                        IG
                      </span>
                      @brinday_personalizados
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
