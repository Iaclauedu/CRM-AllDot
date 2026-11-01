import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const formatadorBRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const formatadorDataCurta = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const formatadorDataHoraCompleta = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatarMoeda(valor: number, moeda: string = 'BRL'): string {
  if (moeda === 'BRL') {
    return formatadorBRL.format(valor || 0);
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: moeda,
  }).format(valor || 0);
}

export function formatarData(dataStr: string | null | undefined): string {
  if (!dataStr) return '-';
  const data = new Date(dataStr);
  if (isNaN(data.getTime())) return '-';
  return formatadorDataCurta.format(data);
}

export function formatarDataHora(dataStr: string | null | undefined): string {
  if (!dataStr) return '-';
  const data = new Date(dataStr);
  if (isNaN(data.getTime())) return '-';
  return formatadorDataHoraCompleta.format(data);
}

export function obterCodigoNegocio(negocio: {
  id: string;
  codigo?: string;
  campos_personalizados?: Record<string, any>;
}): string {
  return (
    negocio.codigo ||
    negocio.campos_personalizados?.codigo ||
    `#${negocio.id.slice(0, 6).toUpperCase()}`
  );
}

export function formatarTelefoneWhatsApp(numero: string | null | undefined): string {
  if (!numero) return '';
  const limpo = numero.replace(/\D/g, '');
  if (limpo.length === 13) {
    // +55 (11) 98888-1234
    return `+${limpo.slice(0, 2)} (${limpo.slice(2, 4)}) ${limpo.slice(4, 9)}-${limpo.slice(9)}`;
  }
  if (limpo.length === 11) {
    // (11) 98888-1234
    return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 7)}-${limpo.slice(7)}`;
  }
  return numero;
}
