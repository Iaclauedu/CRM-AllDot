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
} from 'lucide-react';
import { type Negocio } from '@/lib/mock-data';

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
    negocio.empresa_nome || 'Cliente BrinDay'
  );
  const [empresaDoc, setEmpresaDoc] = React.useState(
    negocio.campos_personalizados?.cnpj ||
      negocio.campos_personalizados?.cpf ||
      'Não informado'
  );
  const [empresaEndereco, setEmpresaEndereco] = React.useState(
    negocio.campos_personalizados?.endereco || 'Barueri - SP'
  );
  const [contatoNome, setContatoNome] = React.useState(
    negocio.contato_nome || 'A/C Departamento de Compras'
  );
  const [contatoTelefone, setContatoTelefone] = React.useState(
    negocio.contato_whatsapp || negocio.campos_personalizados?.celular || ''
  );
  const [contatoEmail, setContatoEmail] = React.useState(
    negocio.contato_email || ''
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

  // Produtos: se o card tem produtos vinculados, usa os reais; caso contrário, inicializa com os modelos BrinDay
  const [produtos, setProdutos] = React.useState<ItemProdutoProposta[]>(() => {
    if (negocio.produtos_vinculados && negocio.produtos_vinculados.length > 0) {
      return negocio.produtos_vinculados.map((p: any, idx: number) => ({
        id: p.produto_id || String(idx),
        codigo: `BRIN-${String(idx + 1).padStart(3, '0')}`,
        nome: p.nome_produto || p.produto?.nome || 'Produto Personalizado BrinDay',
        descricao: 'Produto promocional personalizado com gravação a laser / silk.',
        quantidade: p.quantidade || 1,
        valorUnitario: p.valor_unitario || 0,
        imagemUrl: '/proposta-template/media/image35.jpeg',
      }));
    }

    return [
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
  });

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
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Registra evento na timeline do negócio
      if (onRegistrarAtividade) {
        onRegistrarAtividade({
          id: crypto.randomUUID(),
          negocio_id: negocio.id,
          tipo: 'nota',
          titulo: `📄 Proposta Comercial ${numeroOrcamento} exportada em Word (.docx) no valor de ${formatarMoeda(totalGeral)}`,
          concluida_em: new Date().toISOString(),
          criado_por: vendedor,
          criado_em: new Date().toISOString(),
        });
      }
    } catch (err: unknown) {
      alert(
        err instanceof Error
          ? err.message
          : 'Erro ao baixar o arquivo Word da proposta.'
      );
    } finally {
      setExportandoWord(false);
    }
  };

  // 2. Impressão / Salvar em PDF
  const handleImprimirPdf = () => {
    // Registra na timeline
    if (onRegistrarAtividade) {
      onRegistrarAtividade({
        id: crypto.randomUUID(),
        negocio_id: negocio.id,
        tipo: 'nota',
        titulo: `🖨️ Proposta Comercial ${numeroOrcamento} gerada/impressa em PDF no valor de ${formatarMoeda(totalGeral)}`,
        concluida_em: new Date().toISOString(),
        criado_por: vendedor,
        criado_em: new Date().toISOString(),
      });
    }
    window.print();
  };

  // 3. Compartilhar resumo no WhatsApp
  const handleCompartilharWhatsApp = () => {
    const textoMensagem = `*Proposta Comercial BrinDay Personalizados*\nOrçamento: ${numeroOrcamento}\nData: ${dataAtual}\nCliente: ${empresaNome}\nA/C: ${contatoNome}\n\n*Resumo da Proposta:*\n${produtos
      .map(
        (p) =>
          `• ${p.quantidade}x ${p.nome} (${p.codigo}) - ${formatarMoeda(
            p.valorUnitario
          )} un. = ${formatarMoeda(p.quantidade * p.valorUnitario)}`
      )
      .join('\n')}\n\n*Subtotal:* ${formatarMoeda(subtotal)}\n*Frete:* ${
      freteValor > 0 ? formatarMoeda(freteValor) : tipoFrete
    }\n*Total Geral:* ${formatarMoeda(totalGeral)}\n\n*Condições de Pagamento:* ${formaPagamento}\n*Prazo de Entrega:* ${prazoEntrega}\n*Validade:* ${validadeProposta}\n\n_Todos os dias são motivos para celebrar!_ 🎉\nBrinDay Personalizados`;

    const telefoneLimpo = contatoTelefone.replace(/\D/g, '');
    const urlWa = telefoneLimpo
      ? `https://wa.me/${telefoneLimpo.startsWith('55') ? telefoneLimpo : `55${telefoneLimpo}`}?text=${encodeURIComponent(textoMensagem)}`
      : `https://wa.me/?text=${encodeURIComponent(textoMensagem)}`;

    window.open(urlWa, '_blank');
    setCopiadoWhatsApp(true);
    setTimeout(() => setCopiadoWhatsApp(false), 3000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
        <div className="relative w-full max-w-5xl max-h-[96vh] flex flex-col rounded-xl bg-card border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header da Modal de Proposta */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-[#034550] text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#D4EF2E] text-[#034550] font-black text-sm shadow">
                B
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                  <span>Proposta Comercial BrinDay</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/10 text-[#D4EF2E] border border-white/20">
                    {numeroOrcamento}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-white/80">
                  {empresaNome} • Soluções personalizadas em brindes corporativos
                </DialogDescription>
              </div>
            </div>

            {/* Ações de Topo */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setModoEdicao(!modoEdicao)}
                className="text-xs gap-1.5 bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                {modoEdicao ? <Eye className="h-3.5 w-3.5" /> : <Edit3 className="h-3.5 w-3.5" />}
                <span>{modoEdicao ? 'Ver Prévia A4' : 'Editar Dados'}</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleBaixarWord}
                disabled={exportandoWord}
                className="text-xs gap-1.5 bg-[#D4EF2E] hover:bg-[#c3de28] text-[#034550] font-bold shadow-md"
              >
                {exportandoWord ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileDown className="h-3.5 w-3.5" />
                )}
                <span>Baixar Word (.docx)</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleImprimirPdf}
                className="text-xs gap-1.5 bg-sky-600 hover:bg-sky-500 text-white font-medium"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Imprimir / PDF</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleCompartilharWhatsApp}
                className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
              >
                {copiadoWhatsApp ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
                <span>WhatsApp</span>
              </Button>

              <button
                onClick={() => onOpenChange(false)}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors ml-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Painel de Edição Rápida (quando ativo) */}
          {modoEdicao && (
            <div className="p-4 bg-muted/40 border-b border-border space-y-3 overflow-y-auto max-h-60 text-xs">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Edit3 className="h-3.5 w-3.5 text-primary" />
                <span>Configurar Condições do Orçamento</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Valor do Frete (R$)</label>
                  <Input
                    type="number"
                    value={freteValor}
                    onChange={(e) => setFreteValor(parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Modalidade do Frete</label>
                  <Input
                    value={tipoFrete}
                    onChange={(e) => setTipoFrete(e.target.value)}
                    className="h-8 text-xs"
                    placeholder="Ex: FOB - Por conta do cliente"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Vendedor(a) Responsável</label>
                  <Input
                    value={vendedor}
                    onChange={(e) => setVendedor(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-medium text-muted-foreground">Forma de Pagamento</label>
                  <Input
                    value={formaPagamento}
                    onChange={(e) => setFormaPagamento(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Prazo de Produção/Entrega</label>
                  <Input
                    value={prazoEntrega}
                    onChange={(e) => setPrazoEntrega(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Validade da Proposta</label>
                  <Input
                    value={validadeProposta}
                    onChange={(e) => setValidadeProposta(e.target.value)}
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

          {/* Visualização da Proposta Formatada A4 (Fiel ao Modelo BrinDay) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-zinc-900/60 flex justify-center">
            <div
              id="area-impressao-proposta"
              className="w-full max-w-[800px] space-y-8 print:space-y-0 text-zinc-900"
            >
              {/* ========================================================
                  PÁGINA 1: CAPA OFICIAL BRINDAY
              ======================================================== */}
              <div className="relative w-full aspect-[1/1.414] bg-[#034550] rounded-lg shadow-xl overflow-hidden flex flex-col justify-between p-8 sm:p-12 text-white print:shadow-none print:rounded-none print:break-after-page">
                {/* Imagem de Fundo de Alta Resolução da Capa BrinDay */}
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-90"
                  style={{ backgroundImage: "url('/proposta-template/media/image1.jpeg')" }}
                />
                {/* Gradiente Escuro Suave para Legibilidade */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#034550]/95 via-transparent to-[#034550]/40" />

                {/* Topo da Capa */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black tracking-tight text-white flex items-center">
                      Brin<span className="text-[#D4EF2E]">Day</span>
                    </span>
                  </div>
                  <span className="text-xs uppercase tracking-widest text-[#D4EF2E] font-semibold border-b border-[#D4EF2E]/60 pb-0.5">
                    Orçamento Comercial
                  </span>
                </div>

                {/* Rodapé / Bloco de Título da Capa */}
                <div className="relative z-10 space-y-3 pb-6">
                  <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                    Proposta <br />
                    <span className="text-[#D4EF2E]">Comercial</span>
                  </h1>
                  <p className="text-sm sm:text-base text-white/90 font-light max-w-md">
                    Soluções personalizadas para sua empresa
                  </p>
                  <div className="pt-4 flex items-center gap-2 text-xs text-[#D4EF2E] font-medium">
                    <span>"Todos os dias são motivos para celebrar!"</span>
                  </div>
                </div>
              </div>

              {/* ========================================================
                  PÁGINA 2: APRESENTAÇÃO & CABEÇALHO DO ORÇAMENTO
              ======================================================== */}
              <div className="relative w-full aspect-[1/1.414] bg-white rounded-lg shadow-xl overflow-hidden p-8 sm:p-12 flex flex-col justify-between print:shadow-none print:rounded-none print:break-after-page">
                {/* Cabeçalho "Seu Orçamento chegou!!" */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between border-b border-zinc-200 pb-5">
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-[#034550] tracking-tight">
                        Seu Orçamento <br />
                        <span className="text-[#84a900]">chegou!!</span>
                      </h2>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black text-[#034550]">
                        Brin<span className="text-[#84a900]">Day</span>
                      </span>
                      <p className="text-[10px] text-zinc-500">Personalizados</p>
                    </div>
                  </div>

                  {/* Texto Institucional BrinDay */}
                  <p className="text-xs leading-relaxed text-zinc-600 font-normal">
                    Na <strong>BrinDay</strong>, somos parceiros da sua empresa. Mais do que entregar brindes,
                    criamos soluções personalizadas que comunicam o valor da sua marca, transformando cada
                    brinde em uma extensão da sua identidade e em uma lembrança marcante para seus clientes.
                  </p>

                  {/* 4 Pilares */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                    <div className="p-2.5 rounded-lg bg-[#034550]/5 border border-[#034550]/15 text-center">
                      <ShieldCheck className="h-4 w-4 mx-auto text-[#034550] mb-1" />
                      <span className="text-[10px] font-bold text-[#034550] block">Atendimento Personalizado</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#034550]/5 border border-[#034550]/15 text-center">
                      <Package className="h-4 w-4 mx-auto text-[#034550] mb-1" />
                      <span className="text-[10px] font-bold text-[#034550] block">Variedade de Produtos</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#034550]/5 border border-[#034550]/15 text-center">
                      <Check className="h-4 w-4 mx-auto text-[#034550] mb-1" />
                      <span className="text-[10px] font-bold text-[#034550] block">Qualidade nos Detalhes</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#034550]/5 border border-[#034550]/15 text-center">
                      <Clock className="h-4 w-4 mx-auto text-[#034550] mb-1" />
                      <span className="text-[10px] font-bold text-[#034550] block">Agilidade na Entrega</span>
                    </div>
                  </div>

                  {/* Dados Cadastrais BrinDay */}
                  <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 text-[10px] text-zinc-600 space-y-0.5">
                    <p className="font-bold text-[#034550]">
                      BRINDAY PERSONALIZADOS COMERCIO DE BRINDES E SERVIÇOS GRÁFICOS LTDA.
                    </p>
                    <p>CNPJ: 63.942.323/0001-14 • IE: 157.068.175.110</p>
                    <p>R. Damião Fernandes, 133 - Vila Srg. Jose de Paula, Barueri - SP, 06404-000</p>
                  </div>
                </div>

                {/* Box de Metadados: Orçamento, Data, Vendedor, Cliente e Contato */}
                <div className="border-t-2 border-[#D4EF2E] pt-4 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-3 border-b border-zinc-200 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-400 block">Orçamento:</span>
                      <strong className="text-sm font-extrabold text-[#034550]">{numeroOrcamento}</strong>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {/* Dados do Cliente */}
                    <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-[#034550] tracking-wider block">
                        Dados do Cliente:
                      </span>
                      <p className="font-bold text-zinc-900">{empresaNome}</p>
                      <p className="text-zinc-600 text-[11px]">Doc: {empresaDoc}</p>
                      <p className="text-zinc-600 text-[11px] truncate">Endereço: {empresaEndereco}</p>
                    </div>

                    {/* Contato */}
                    <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-[#034550] tracking-wider block">
                        Contato:
                      </span>
                      <p className="font-bold text-zinc-900">{contatoNome}</p>
                      <p className="text-zinc-600 text-[11px]">WhatsApp/Tel: {contatoTelefone || 'Não informado'}</p>
                      <p className="text-zinc-600 text-[11px] truncate">E-mail: {contatoEmail || 'Não informado'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ========================================================
                  PÁGINA 3: PRODUTOS & CONDIÇÕES COMERCIAIS
              ======================================================== */}
              <div className="relative w-full aspect-[1/1.414] bg-white rounded-lg shadow-xl overflow-hidden p-6 sm:p-10 flex flex-col justify-between print:shadow-none print:rounded-none print:break-after-page">
                <div className="space-y-4">
                  {/* Cabeçalho da Grade */}
                  <div className="flex items-center justify-between border-b-2 border-[#034550] pb-2">
                    <span className="text-base font-black tracking-wide text-[#034550]">PRODUTOS</span>
                    <span className="text-[10px] text-zinc-400 font-mono">Orçamento {numeroOrcamento}</span>
                  </div>

                  {/* Lista de Produtos */}
                  <div className="space-y-3">
                    {produtos.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 p-2.5 rounded-lg border border-zinc-200 bg-zinc-50/50 hover:bg-zinc-50 transition-colors text-xs"
                      >
                        {/* Imagem do Produto */}
                        <div className="h-16 w-16 rounded-md bg-white border border-zinc-200 overflow-hidden flex-shrink-0 flex items-center justify-center p-1">
                          {item.imagemUrl ? (
                            <img
                              src={item.imagemUrl}
                              alt={item.nome}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <Package className="h-6 w-6 text-zinc-300" />
                          )}
                        </div>

                        {/* Detalhes do Produto */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-zinc-900">{item.nome}</span>
                            <span className="font-mono text-[11px] text-[#034550] font-semibold bg-[#034550]/10 px-1.5 py-0.5 rounded">
                              SKU: {item.codigo}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-600 line-clamp-2 leading-relaxed">
                            {item.descricao}
                          </p>
                          {item.dimensoes && (
                            <p className="text-[10px] text-zinc-500 font-mono">{item.dimensoes}</p>
                          )}
                        </div>

                        {/* Quantidade e Preços */}
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

                  {/* Resumo Financeiro (Subtotal, Frete, Total) */}
                  <div className="flex justify-end pt-2">
                    <div className="w-full sm:w-64 space-y-1.5 p-3 rounded-lg bg-zinc-50 border border-zinc-200 text-xs">
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
                      <div className="flex justify-between text-sm font-extrabold text-[#034550] border-t border-zinc-300 pt-1.5">
                        <span>TOTAL:</span>
                        <span className="text-[#84a900]">{formatarMoeda(totalGeral)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Condições Comerciais & Informações Adicionais */}
                <div className="border-t border-zinc-200 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-zinc-600">
                  <div className="space-y-1 p-2.5 rounded bg-zinc-50 border border-zinc-200">
                    <strong className="text-[#034550] font-bold block text-xs">Formas de Pagamento & Frete</strong>
                    <p>• <strong>Pagamento:</strong> {formaPagamento}</p>
                    <p>• <strong>Prazo / Disponibilidade:</strong> {prazoEntrega}</p>
                    <p>• <strong>Meio de Envio:</strong> {tipoFrete}</p>
                  </div>
                  <div className="space-y-1 p-2.5 rounded bg-zinc-50 border border-zinc-200">
                    <strong className="text-[#034550] font-bold block text-xs">Informações Adicionais</strong>
                    <p>• <strong>Validade da Proposta:</strong> {validadeProposta}</p>
                    <p>• <strong>Faturamento:</strong> BrinDay Personalizados Ltda.</p>
                    <p>• <strong>Observações:</strong> {observacoes}</p>
                  </div>
                </div>
              </div>

              {/* ========================================================
                  PÁGINA 4: CONTRACAPA OFICIAL BRINDAY
              ======================================================== */}
              <div className="relative w-full aspect-[1/1.414] bg-[#034550] rounded-lg shadow-xl overflow-hidden flex flex-col justify-between p-8 sm:p-12 text-white print:shadow-none print:rounded-none">
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-40"
                  style={{ backgroundImage: "url('/proposta-template/media/image46.png')" }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#034550] via-[#034550]/80 to-transparent" />

                <div className="relative z-10 flex items-center justify-between">
                  <span className="text-2xl font-black tracking-tight text-white flex items-center">
                    Brin<span className="text-[#D4EF2E]">Day</span>
                  </span>
                  <span className="text-xs text-[#D4EF2E] font-mono">Personalizados</span>
                </div>

                <div className="relative z-10 text-center space-y-4 my-auto">
                  <h3 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-snug">
                    "Todos os dias são <br />
                    <span className="text-[#D4EF2E]">motivos para celebrar!</span>"
                  </h3>
                  <p className="text-xs sm:text-sm text-white/80 max-w-md mx-auto font-light">
                    Transforme momentos corporativos em experiências inesquecíveis para seus colaboradores e clientes.
                  </p>
                </div>

                <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-white/20 pt-4 text-xs text-white/80">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Mail className="h-3.5 w-3.5 text-[#D4EF2E]" />
                    vendas@brindaypersonalizados.com.br
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <span>Instagram:</span>
                    <strong className="text-[#D4EF2E]">@brinday_personalizados</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
