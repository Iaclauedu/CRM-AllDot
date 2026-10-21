import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatarMoeda(valor: number, moeda: string = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: moeda,
  }).format(valor);
}

export function formatarData(dataStr: string | null | undefined): string {
  if (!dataStr) return '-';
  const data = new Date(dataStr);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(data);
}

export function formatarDataHora(dataStr: string | null | undefined): string {
  if (!dataStr) return '-';
  const data = new Date(dataStr);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(data);
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
