'use client';

import * as React from 'react';
import {
  Palette,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  Check,
  Sparkles,
  Download,
  FileCode2,
  Trash2,
  Eye,
  Sliders,
  CheckCircle2,
  Building,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  useCustomBranding,
  PALETAS_PREDEFINIDAS,
  BRANDING_DEFAULT,
  type PaletaPredefinida,
} from '@/lib/branding-context';
import { AllDotLogo } from '@/components/layout/alldot-logo';

export function PersonalizacaoBranding() {
  const {
    branding,
    atualizarBranding,
    aplicarPaleta,
    redefinirPadrao,
    exportarConfiguracao,
    importarConfiguracao,
  } = useCustomBranding();

  // Estados locais para edição interativa
  const [nomeTemp, setNomeTemp] = React.useState(branding.empresaNome);
  const [corPrimariaTemp, setCorPrimariaTemp] = React.useState(branding.corPrimaria);
  const [corSidebarTemp, setCorSidebarTemp] = React.useState(branding.corSidebar);
  const [corTopbarTemp, setCorTopbarTemp] = React.useState(branding.corTopbar);
  const [logoUrlTemp, setLogoUrlTemp] = React.useState<string | null>(branding.logoUrl);
  const [mostrarNomeTemp, setMostrarNomeTemp] = React.useState(branding.mostrarNomeJuntoAoLogo);

  const [mensagemSucesso, setMensagemSucesso] = React.useState<string | null>(null);
  const [modalImportarAberto, setModalImportarAberto] = React.useState(false);
  const [jsonImport, setJsonImport] = React.useState('');
  const [erroImport, setErroImport] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Sincroniza se o contexto for alterado externamente
  React.useEffect(() => {
    setNomeTemp(branding.empresaNome);
    setCorPrimariaTemp(branding.corPrimaria);
    setCorSidebarTemp(branding.corSidebar);
    setCorTopbarTemp(branding.corTopbar);
    setLogoUrlTemp(branding.logoUrl);
    setMostrarNomeTemp(branding.mostrarNomeJuntoAoLogo);
  }, [branding]);

  // Manipulador de upload de arquivo local
  const handleUploadArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('O arquivo selecionado deve ter menos de 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setLogoUrlTemp(result);
      atualizarBranding({ logoUrl: result });
      dispararSucesso('Logotipo carregado com sucesso!');
    };
    reader.readAsDataURL(file);
  };

  const dispararSucesso = (msg: string) => {
    setMensagemSucesso(msg);
    setTimeout(() => setMensagemSucesso(null), 3500);
  };

  const handleAplicarPaleta = (p: PaletaPredefinida) => {
    setCorPrimariaTemp(p.corPrimaria);
    setCorSidebarTemp(p.corSidebar);
    setCorTopbarTemp(p.corTopbar);
    aplicarPaleta(p);
    dispararSucesso(`Paleta "${p.nome}" aplicada!`);
  };

  const handleSalvarTudo = () => {
    atualizarBranding({
      empresaNome: nomeTemp.trim() || 'Alldot',
      corPrimaria: corPrimariaTemp,
      corSidebar: corSidebarTemp,
      corTopbar: corTopbarTemp,
      logoUrl: logoUrlTemp,
      mostrarNomeJuntoAoLogo: mostrarNomeTemp,
    });
    dispararSucesso('Identidade visual e cores salvas com sucesso!');
  };

  const handleRemoverLogo = () => {
    setLogoUrlTemp(null);
    atualizarBranding({ logoUrl: null });
    if (fileInputRef.current) fileInputRef.current.value = '';
    dispararSucesso('Logotipo removido. Exibindo marca textual.');
  };

  const handleRestaurarPadrao = () => {
    if (window.confirm('Tem certeza de que deseja restaurar as cores e logo originais do AllDot?')) {
      redefinirPadrao();
      setNomeTemp(BRANDING_DEFAULT.empresaNome);
      setCorPrimariaTemp(BRANDING_DEFAULT.corPrimaria);
      setCorSidebarTemp(BRANDING_DEFAULT.corSidebar);
      setCorTopbarTemp(BRANDING_DEFAULT.corTopbar);
      setLogoUrlTemp(null);
      setMostrarNomeTemp(BRANDING_DEFAULT.mostrarNomeJuntoAoLogo);
      if (fileInputRef.current) fileInputRef.current.value = '';
      dispararSucesso('Tema padrão AllDot restaurado!');
    }
  };

  const handleExportarConfig = () => {
    const configStr = exportarConfiguracao();
    const blob = new Blob([configStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alldot-branding-${nomeTemp.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    dispararSucesso('Arquivo de configuração baixado!');
  };

  const handleProcessarImport = () => {
    if (!jsonImport.trim()) return;
    const ok = importarConfiguracao(jsonImport);
    if (ok) {
      setModalImportarAberto(false);
      setJsonImport('');
      setErroImport(null);
      dispararSucesso('Configuração importada e aplicada com sucesso!');
    } else {
      setErroImport('JSON inválido ou estrutura incompatível.');
    }
  };

  return (
    <div className="space-y-6">
      {mensagemSucesso && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-800 shadow-md animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{mensagemSucesso}</span>
        </div>
      )}

      {/* Cabeçalho da Seção */}
      <div className="rounded-xl border border-border bg-gradient-to-r from-card to-secondary/30 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-sm"
                style={{ backgroundColor: corPrimariaTemp }}
              >
                <Palette className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold text-foreground">
                Personalização de Marca & White-Label
              </h2>
              <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider">
                Exclusivo Enterprise
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Ajuste as cores da interface, adicione o logotipo oficial da sua organização e configure a identidade visual corporativa da sua equipe.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRestaurarPadrao}
              className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              title="Restaurar visual original AllDot"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Restaurar Padrão</span>
            </Button>
            <Button
              size="sm"
              onClick={handleSalvarTudo}
              style={{
                backgroundColor: corPrimariaTemp,
                boxShadow: `0 4px 12px ${corPrimariaTemp}40`,
              }}
              className="text-xs gap-1.5 text-white font-semibold hover:opacity-90"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Salvar Alterações</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Grid Principal: Configurações + Simulador ao Vivo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna Esquerda (7 cols): Controles de Personalização */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Logotipo da Empresa */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" style={{ color: corPrimariaTemp }} />
                Logotipo da Sua Empresa
              </h3>
              {logoUrlTemp && (
                <button
                  onClick={handleRemoverLogo}
                  className="flex items-center gap-1 text-[11px] text-destructive hover:underline"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Remover logo</span>
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Nome de Exibição da Empresa
                </label>
                <Input
                  value={nomeTemp}
                  onChange={(e) => {
                    setNomeTemp(e.target.value);
                    atualizarBranding({ empresaNome: e.target.value });
                  }}
                  placeholder="Ex: Acme Corporativa S/A"
                  className="text-xs"
                />
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  Substitui a marca &quot;Alldot&quot; nos títulos, breadcrumbs e cabeçalhos.
                </span>
              </div>

              {/* Área de Upload e Preview */}
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border border-dashed border-border bg-secondary/30">
                <div
                  className="flex h-20 w-32 items-center justify-center rounded-lg border border-border bg-card/80 p-2 shadow-sm overflow-hidden shrink-0"
                  style={{ backgroundColor: corSidebarTemp }}
                >
                  {logoUrlTemp ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoUrlTemp}
                      alt="Logo da empresa"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="text-center text-slate-400">
                      <ImageIcon className="h-6 w-6 mx-auto mb-1 opacity-50" />
                      <span className="text-[10px] font-mono">Sem logo</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 flex-1 w-full text-center sm:text-left">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleUploadArquivo}
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                    id="upload-logo-file"
                  />
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs gap-1.5 bg-card"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Fazer Upload do Arquivo</span>
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Recomendado: PNG ou SVG com fundo transparente. Altura ideal: 32px a 64px (Máx: 2MB).
                  </p>
                </div>
              </div>

              {/* Opção URL manual */}
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Ou informe o link direto de uma imagem (URL HTTPS):
                </label>
                <div className="flex gap-2">
                  <Input
                    value={logoUrlTemp && !logoUrlTemp.startsWith('data:') ? logoUrlTemp : ''}
                    onChange={(e) => {
                      const url = e.target.value.trim() || null;
                      setLogoUrlTemp(url);
                      atualizarBranding({ logoUrl: url });
                    }}
                    placeholder="https://suaempresa.com.br/logo.png"
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-mostrar-nome"
                  checked={mostrarNomeTemp}
                  onChange={(e) => {
                    setMostrarNomeTemp(e.target.checked);
                    atualizarBranding({ mostrarNomeJuntoAoLogo: e.target.checked });
                  }}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="chk-mostrar-nome" className="text-xs text-foreground select-none cursor-pointer">
                  Exibir nome da empresa ao lado do logotipo
                </label>
              </div>
            </div>
          </div>

          {/* Card 2: Paletas Predefinidas (1-Click) */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Temas Corporativos Prontos (1-Clique)
            </h3>
            <p className="text-xs text-muted-foreground">
              Escolha uma combinação cromática já testada para máxima harmonia visual e acessibilidade de contraste.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PALETAS_PREDEFINIDAS.map((paleta) => {
                const isAtiva =
                  corPrimariaTemp.toLowerCase() === paleta.corPrimaria.toLowerCase() &&
                  corSidebarTemp.toLowerCase() === paleta.corSidebar.toLowerCase();

                return (
                  <button
                    key={paleta.id}
                    onClick={() => handleAplicarPaleta(paleta)}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all hover:scale-[1.01] ${
                      isAtiva
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-sm'
                        : 'border-border hover:border-slate-400 bg-card'
                    }`}
                  >
                    <div className="flex flex-col gap-1 items-center shrink-0 pt-0.5">
                      <div
                        className="h-6 w-6 rounded-full shadow-sm border border-white/20"
                        style={{ backgroundColor: paleta.corPrimaria }}
                      />
                      <div
                        className="h-3 w-5 rounded-sm border border-white/10"
                        style={{ backgroundColor: paleta.corSidebar }}
                      />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-foreground truncate">
                          {paleta.nome}
                        </span>
                        {isAtiva && (
                          <span
                            className="rounded-full p-0.5 text-white shrink-0"
                            style={{ backgroundColor: paleta.corPrimaria }}
                          >
                            <Check className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        {paleta.descricao}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 3: Seletor de Cores Customizadas (Hex Color Pickers) */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Sliders className="h-4 w-4 text-emerald-500" />
              Ajuste Fino de Cores (Código HEX Personalizado)
            </h3>
            <p className="text-xs text-muted-foreground">
              Você pode especificar os códigos exatos do manual de marca da sua empresa.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Cor Primária */}
              <div className="space-y-2 p-3 rounded-xl border border-border/80 bg-secondary/20">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    Cor Primária
                  </label>
                  <div
                    className="h-4 w-4 rounded-full border border-black/10 shadow-xs"
                    style={{ backgroundColor: corPrimariaTemp }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={corPrimariaTemp}
                    onChange={(e) => {
                      setCorPrimariaTemp(e.target.value);
                      atualizarBranding({ corPrimaria: e.target.value });
                    }}
                    className="h-8 w-9 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
                  />
                  <Input
                    value={corPrimariaTemp}
                    onChange={(e) => {
                      setCorPrimariaTemp(e.target.value);
                      if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                        atualizarBranding({ corPrimaria: e.target.value });
                      }
                    }}
                    className="text-xs font-mono uppercase h-8"
                  />
                </div>
                <span className="text-[10px] text-muted-foreground block">
                  Botões, ícones ativos, badges e acentos visuais.
                </span>
              </div>

              {/* Cor da Barra Lateral */}
              <div className="space-y-2 p-3 rounded-xl border border-border/80 bg-secondary/20">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    Menu Lateral
                  </label>
                  <div
                    className="h-4 w-4 rounded-full border border-black/10 shadow-xs"
                    style={{ backgroundColor: corSidebarTemp }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={corSidebarTemp}
                    onChange={(e) => {
                      setCorSidebarTemp(e.target.value);
                      atualizarBranding({ corSidebar: e.target.value });
                    }}
                    className="h-8 w-9 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
                  />
                  <Input
                    value={corSidebarTemp}
                    onChange={(e) => {
                      setCorSidebarTemp(e.target.value);
                      if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                        atualizarBranding({ corSidebar: e.target.value });
                      }
                    }}
                    className="text-xs font-mono uppercase h-8"
                  />
                </div>
                <span className="text-[10px] text-muted-foreground block">
                  Fundo da barra vertical com atalhos de navegação.
                </span>
              </div>

              {/* Cor do Topbar */}
              <div className="space-y-2 p-3 rounded-xl border border-border/80 bg-secondary/20">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    Barra Superior
                  </label>
                  <div
                    className="h-4 w-4 rounded-full border border-black/10 shadow-xs"
                    style={{ backgroundColor: corTopbarTemp }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={corTopbarTemp}
                    onChange={(e) => {
                      setCorTopbarTemp(e.target.value);
                      atualizarBranding({ corTopbar: e.target.value });
                    }}
                    className="h-8 w-9 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
                  />
                  <Input
                    value={corTopbarTemp}
                    onChange={(e) => {
                      setCorTopbarTemp(e.target.value);
                      if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                        atualizarBranding({ corTopbar: e.target.value });
                      }
                    }}
                    className="text-xs font-mono uppercase h-8"
                  />
                </div>
                <span className="text-[10px] text-muted-foreground block">
                  Cabeçalho superior com busca e métricas.
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Importar / Exportar Configuração */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileCode2 className="h-4 w-4" />
              <span>Deseja salvar como template para outros workspaces ou equipes?</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportarConfig}
                className="text-xs gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Exportar JSON</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalImportarAberto(true)}
                className="text-xs gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Importar JSON</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Coluna Direita (5 cols): Simulador Visual Interativo em Tempo Real */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-6 rounded-2xl border border-border bg-card p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" style={{ color: corPrimariaTemp }} />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Pré-visualização em Tempo Real
                </h3>
              </div>
              <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                Ao Vivo
              </span>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Veja exatamente como a interface do CRM ficará para todos os usuários da sua equipe com as cores e logo configurados:
            </p>

            {/* Simulador Miniatura da Interface */}
            <div className="rounded-xl border border-slate-700/80 overflow-hidden shadow-2xl bg-slate-900 text-slate-100 font-sans text-xs select-none">
              {/* Barra Superior Simulada */}
              <div
                className="h-11 px-3 flex items-center justify-between border-b border-white/10 transition-colors"
                style={{ backgroundColor: corTopbarTemp }}
              >
                <div className="flex items-center gap-2">
                  {logoUrlTemp ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoUrlTemp}
                      alt={nomeTemp}
                      className="h-5 max-w-[80px] object-contain"
                    />
                  ) : (
                    <span className="font-extrabold text-xs tracking-tight text-white flex items-center">
                      {nomeTemp}
                      <span
                        className="text-sm font-black ml-0.5"
                        style={{ color: corPrimariaTemp }}
                      >
                        .
                      </span>
                    </span>
                  )}
                  <span
                    className="text-[8px] font-mono px-1 py-0.2 rounded font-bold"
                    style={{
                      backgroundColor: `${corPrimariaTemp}30`,
                      color: corPrimariaTemp,
                    }}
                  >
                    PRO
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className="h-6 px-2 rounded-md text-[10px] font-semibold text-white flex items-center gap-1 shadow-sm"
                    style={{ backgroundColor: corPrimariaTemp }}
                  >
                    <span>+ Nova Oportunidade</span>
                  </div>
                </div>
              </div>

              {/* Corpo Simulado: Barra lateral + Pipeline */}
              <div className="flex h-64 bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                {/* Mini Sidebar */}
                <div
                  className="w-12 py-3 flex flex-col items-center justify-between border-r border-white/10 shrink-0"
                  style={{ backgroundColor: corSidebarTemp }}
                >
                  <div className="flex flex-col items-center gap-3 w-full">
                    {/* Mini Icon Logo */}
                    <div
                      className="h-7 w-7 rounded-lg text-white font-black text-[10px] flex items-center justify-center shadow-md overflow-hidden"
                      style={{
                        backgroundColor: corPrimariaTemp,
                        boxShadow: `0 2px 8px ${corPrimariaTemp}60`,
                      }}
                    >
                      {logoUrlTemp ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={logoUrlTemp}
                          alt="logo"
                          className="w-full h-full object-contain p-0.5"
                        />
                      ) : (
                        <span>{nomeTemp.charAt(0).toUpperCase()}.</span>
                      )}
                    </div>

                    {/* Mini Itens Menu */}
                    <div
                      className="h-7 w-7 rounded-md flex items-center justify-center text-white"
                      style={{ backgroundColor: corPrimariaTemp }}
                    >
                      <div className="h-3 w-3 rounded-xs border border-white" />
                    </div>
                    <div className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:text-white">
                      <div className="h-3 w-3 rounded-full border border-slate-400" />
                    </div>
                    <div className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:text-white">
                      <div className="h-3 w-3 border border-slate-400" />
                    </div>
                  </div>
                </div>

                {/* Mini Área de Conteúdo Kanban */}
                <div className="flex-1 p-3 overflow-hidden bg-slate-50 dark:bg-slate-950 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200">
                      Pipeline Comercial
                    </span>
                    <span
                      className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${corPrimariaTemp}15`,
                        color: corPrimariaTemp,
                      }}
                    >
                      18 Oportunidades
                    </span>
                  </div>

                  {/* Colunas do Kanban Simuladas */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 space-y-1.5 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                          Qualificação
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">R$ 145k</span>
                      </div>
                      <div
                        className="rounded-md border p-1.5 bg-slate-50 dark:bg-slate-800/60 space-y-1"
                        style={{ borderLeft: `3px solid ${corPrimariaTemp}` }}
                      >
                        <p className="text-[9px] font-semibold truncate text-slate-900 dark:text-white">
                          Expansão Tech S/A
                        </p>
                        <p className="text-[8px] font-mono text-slate-500">R$ 48.000</p>
                      </div>
                    </div>

                    <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 space-y-1.5 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                          Proposta
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">R$ 320k</span>
                      </div>
                      <div
                        className="rounded-md border p-1.5 bg-slate-50 dark:bg-slate-800/60 space-y-1"
                        style={{ borderLeft: `3px solid ${corPrimariaTemp}` }}
                      >
                        <p className="text-[9px] font-semibold truncate text-slate-900 dark:text-white">
                          Contrato Corporativo 12m
                        </p>
                        <p className="text-[8px] font-mono text-slate-500">R$ 120.000</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSalvarTudo}
              style={{
                backgroundColor: corPrimariaTemp,
                boxShadow: `0 4px 14px ${corPrimariaTemp}40`,
              }}
              className="w-full text-xs text-white font-bold h-9 gap-2 hover:opacity-90 transition-opacity"
            >
              <Check className="h-4 w-4" />
              <span>Aplicar Esta Identidade ao CRM</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de Importação JSON */}
      {modalImportarAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              Importar Configuração de Tema
            </h3>
            <p className="text-xs text-muted-foreground">
              Cole o conteúdo JSON exportado anteriormente para restaurar ou clonar as cores e configurações da marca.
            </p>

            <textarea
              value={jsonImport}
              onChange={(e) => {
                setJsonImport(e.target.value);
                setErroImport(null);
              }}
              placeholder={`{\n  "empresaNome": "Sua Empresa",\n  "corPrimaria": "#059669"\n}`}
              className="w-full h-36 rounded-xl border border-border bg-secondary/30 p-3 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />

            {erroImport && (
              <p className="text-xs text-destructive font-semibold">{erroImport}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalImportarAberto(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleProcessarImport}
                className="text-xs bg-primary text-primary-foreground"
              >
                Importar e Aplicar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
