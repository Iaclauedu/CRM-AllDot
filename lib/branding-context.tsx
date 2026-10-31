'use client';

import * as React from 'react';

export interface BrandingConfig {
  empresaNome: string;
  slogan: string;
  logoUrl: string | null;
  corPrimaria: string;
  corSidebar: string;
  corTopbar: string;
  estiloBorda: 'padrao' | 'arredondado' | 'quadrado';
  mostrarNomeJuntoAoLogo: boolean;
}

export interface PaletaPredefinida {
  id: string;
  nome: string;
  descricao: string;
  corPrimaria: string;
  corSidebar: string;
  corTopbar: string;
  preview: string;
}

export const PALETAS_PREDEFINIDAS: PaletaPredefinida[] = [
  {
    id: 'alldot-original',
    nome: 'AllDot Ruby (Oficial)',
    descricao: 'A clássica identidade AllDot com magenta vibrante e navy profundo.',
    corPrimaria: '#E42358',
    corSidebar: '#0B132B',
    corTopbar: '#0B132B',
    preview: 'bg-[#E42358]',
  },
  {
    id: 'ocean-blue',
    nome: 'Ocean Sapphire',
    descricao: 'Azul corporativo moderno, confiável e profissional.',
    corPrimaria: '#2563EB',
    corSidebar: '#0F172A',
    corTopbar: '#0F172A',
    preview: 'bg-[#2563EB]',
  },
  {
    id: 'emerald-growth',
    nome: 'Emerald FinTech',
    descricao: 'Verde esmeralda focado em finanças, vendas e alta conversão.',
    corPrimaria: '#059669',
    corSidebar: '#062016',
    corTopbar: '#062016',
    preview: 'bg-[#059669]',
  },
  {
    id: 'royal-purple',
    nome: 'Royal Indigo',
    descricao: 'Roxo sofisticado e tecnológico para startups e SaaS modernos.',
    corPrimaria: '#7C3AED',
    corSidebar: '#130924',
    corTopbar: '#130924',
    preview: 'bg-[#7C3AED]',
  },
  {
    id: 'amber-sunset',
    nome: 'Sunset Amber',
    descricao: 'Laranja dinâmico e enérgico, perfeito para equipes comerciais ágeis.',
    corPrimaria: '#EA580C',
    corSidebar: '#18181B',
    corTopbar: '#18181B',
    preview: 'bg-[#EA580C]',
  },
  {
    id: 'tech-cyan',
    nome: 'Electric Cyan',
    descricao: 'Ciano elétrico futurista com contrastes escuros intensos.',
    corPrimaria: '#06B6D4',
    corSidebar: '#081C26',
    corTopbar: '#081C26',
    preview: 'bg-[#06B6D4]',
  },
  {
    id: 'carbon-monochrome',
    nome: 'Carbon Slate',
    descricao: 'Minimalista executivo, tons escuros de carbono e grafite.',
    corPrimaria: '#475569',
    corSidebar: '#090D16',
    corTopbar: '#090D16',
    preview: 'bg-[#475569]',
  },
];

export const BRANDING_DEFAULT: BrandingConfig = {
  empresaNome: 'Alldot',
  slogan: 'CRM B2B',
  logoUrl: null,
  corPrimaria: '#E42358',
  corSidebar: '#0B132B',
  corTopbar: '#0B132B',
  estiloBorda: 'padrao',
  mostrarNomeJuntoAoLogo: true,
};

const STORAGE_KEY = 'alldot_custom_branding_v1';

interface BrandingContextType {
  branding: BrandingConfig;
  atualizarBranding: (novosDados: Partial<BrandingConfig>) => void;
  aplicarPaleta: (paleta: PaletaPredefinida) => void;
  redefinirPadrao: () => void;
  exportarConfiguracao: () => string;
  importarConfiguracao: (jsonStr: string) => boolean;
}

const BrandingContext = React.createContext<BrandingContextType | undefined>(undefined);

// Função para calcular cor mais escura ou mais clara para hover/gradientes
function ajustarLuminosidadeHex(hex: string, porcentagem: number): string {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  const num = parseInt(cleanHex, 16);
  let r = (num >> 16) + Math.round((255 * porcentagem) / 100);
  let g = ((num >> 8) & 0x00ff) + Math.round((255 * porcentagem) / 100);
  let b = (num & 0x0000ff) + Math.round((255 * porcentagem) / 100);

  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// Converte HEX para HSL aproximado para suportar Tailwind CSS hsl(var(--primary)) se necessário
function hexParaHsl(hex: string): string {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function CustomBrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = React.useState<BrandingConfig>(BRANDING_DEFAULT);
  const [carregado, setCarregado] = React.useState(false);

  // Carrega do LocalStorage na montagem
  React.useEffect(() => {
    try {
      const salvo = localStorage.getItem(STORAGE_KEY);
      if (salvo) {
        const parsed = JSON.parse(salvo);
        setBranding({ ...BRANDING_DEFAULT, ...parsed });
      }
    } catch (e) {
      console.warn('Erro ao carregar branding customizado:', e);
    } finally {
      setCarregado(true);
    }
  }, []);

  // Aplica as variáveis CSS dinâmicas globalmente no documento
  React.useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const corPrimaria = branding.corPrimaria || BRANDING_DEFAULT.corPrimaria;
    const corSidebar = branding.corSidebar || BRANDING_DEFAULT.corSidebar;
    const corTopbar = branding.corTopbar || BRANDING_DEFAULT.corTopbar;

    const primDark = ajustarLuminosidadeHex(corPrimaria, -15);
    const primLight = ajustarLuminosidadeHex(corPrimaria, 40);

    // CSS Variables injetadas
    root.style.setProperty('--brand-primary', corPrimaria);
    root.style.setProperty('--brand-primary-hover', primDark);
    root.style.setProperty('--brand-primary-light', primLight);
    root.style.setProperty('--brand-sidebar-bg', corSidebar);
    root.style.setProperty('--brand-topbar-bg', corTopbar);
    root.style.setProperty('--primary', hexParaHsl(corPrimaria));
    root.style.setProperty('--ring', corPrimaria);

    // Salva no localStorage quando alterado pelo usuário
    if (carregado) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(branding));
      } catch (err) {
        console.warn('Não foi possível persistir branding no localStorage:', err);
      }
    }
  }, [branding, carregado]);

  const atualizarBranding = React.useCallback((novosDados: Partial<BrandingConfig>) => {
    setBranding((prev) => ({ ...prev, ...novosDados }));
  }, []);

  const aplicarPaleta = React.useCallback((paleta: PaletaPredefinida) => {
    setBranding((prev) => ({
      ...prev,
      corPrimaria: paleta.corPrimaria,
      corSidebar: paleta.corSidebar,
      corTopbar: paleta.corTopbar,
    }));
  }, []);

  const redefinirPadrao = React.useCallback(() => {
    setBranding(BRANDING_DEFAULT);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }, []);

  const exportarConfiguracao = React.useCallback(() => {
    return JSON.stringify(branding, null, 2);
  }, [branding]);

  const importarConfiguracao = React.useCallback((jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed && typeof parsed === 'object') {
        setBranding({ ...BRANDING_DEFAULT, ...parsed });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  return (
    <BrandingContext.Provider
      value={{
        branding,
        atualizarBranding,
        aplicarPaleta,
        redefinirPadrao,
        exportarConfiguracao,
        importarConfiguracao,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
}

export function useCustomBranding() {
  const context = React.useContext(BrandingContext);
  if (!context) {
    // Fallback gracioso se renderizado fora do provider
    return {
      branding: BRANDING_DEFAULT,
      atualizarBranding: () => {},
      aplicarPaleta: () => {},
      redefinirPadrao: () => {},
      exportarConfiguracao: () => JSON.stringify(BRANDING_DEFAULT),
      importarConfiguracao: () => false,
    };
  }
  return context;
}
