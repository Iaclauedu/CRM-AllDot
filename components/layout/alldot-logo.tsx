'use client';

import * as React from 'react';
import { useCustomBranding } from '@/lib/branding-context';

interface AllDotLogoProps {
  className?: string;
  variant?: 'white' | 'colored' | 'icon-only';
  size?: 'sm' | 'md' | 'lg';
  ignorarCustomizacao?: boolean;
}

export function AllDotLogo({
  className = '',
  variant = 'colored',
  size = 'md',
  ignorarCustomizacao = false,
}: AllDotLogoProps) {
  const { branding } = useCustomBranding();

  const isWhite = variant === 'white';
  const isIcon = variant === 'icon-only';

  const nomeEmpresa = (!ignorarCustomizacao && branding.empresaNome) ? branding.empresaNome : 'Alldot';
  const corPrimaria = (!ignorarCustomizacao && branding.corPrimaria) ? branding.corPrimaria : '#E42358';
  const logoUrl = !ignorarCustomizacao ? branding.logoUrl : null;
  const mostrarNome = !ignorarCustomizacao ? branding.mostrarNomeJuntoAoLogo : true;

  const dotColor = isWhite ? '#FFFFFF' : corPrimaria;
  const textColor = isWhite ? '#FFFFFF' : '#0F172A';

  const dimensaoIcone = size === 'sm' ? '28px' : size === 'lg' ? '40px' : '34px';
  const tamanhoFonteIcone = size === 'sm' ? '13px' : size === 'lg' ? '18px' : '15px';
  const tamanhoFonteTexto = size === 'sm' ? '18px' : size === 'lg' ? '26px' : '22px';
  const tamanhoDot = size === 'sm' ? '5px' : size === 'lg' ? '7px' : '6px';

  // Obter iniciais elegantes (máximo 2 caracteres, ex: "AD" ou "A.")
  const primeiraLetra = nomeEmpresa.trim().charAt(0).toUpperCase() || 'A';
  const inicialIcone = `${primeiraLetra}.`;

  // Se tiver logotipo personalizado em imagem
  if (logoUrl) {
    if (isIcon) {
      return (
        <div
          className={`flex items-center justify-center rounded-xl overflow-hidden bg-white/10 p-1 shadow-sm ring-1 ring-white/15 ${className}`}
          style={{ width: dimensaoIcone, height: dimensaoIcone }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt={nomeEmpresa}
            className="w-full h-full object-contain"
          />
        </div>
      );
    }

    return (
      <div className={`flex items-center gap-2.5 select-none ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt={nomeEmpresa}
          className="object-contain"
          style={{
            maxHeight: size === 'sm' ? '24px' : size === 'lg' ? '36px' : '28px',
            maxWidth: '140px',
          }}
        />
        {mostrarNome && (
          <span
            style={{
              fontSize: tamanhoFonteTexto,
              fontFamily: 'Inter, system-ui, sans-serif',
              color: textColor,
              letterSpacing: '-0.04em',
              fontWeight: 800,
            }}
          >
            {nomeEmpresa}
          </span>
        )}
      </div>
    );
  }

  // Ícone minimalista (usado na sidebar colapsada ou avatares)
  if (isIcon) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl text-white font-black shadow-sm transition-all duration-300 ${className}`}
        style={{
          width: dimensaoIcone,
          height: dimensaoIcone,
          fontSize: tamanhoFonteIcone,
          backgroundColor: corPrimaria,
          backgroundImage: `linear-gradient(135deg, ${corPrimaria}, rgba(0,0,0,0.25))`,
          boxShadow: `0 4px 14px ${corPrimaria}40`,
        }}
      >
        <span className="font-mono tracking-tighter">{inicialIcone}</span>
      </div>
    );
  }

  // Logotipo textual completo padrão
  return (
    <div className={`flex items-center gap-1.5 select-none font-bold tracking-tight ${className}`}>
      <span
        style={{
          fontSize: tamanhoFonteTexto,
          fontFamily: 'Inter, system-ui, sans-serif',
          color: textColor,
          letterSpacing: '-0.04em',
          fontWeight: 800,
        }}
      >
        {nomeEmpresa}
      </span>
      <span
        style={{
          width: tamanhoDot,
          height: tamanhoDot,
          borderRadius: '50%',
          backgroundColor: dotColor,
          display: 'inline-block',
          marginLeft: '-2px',
          marginBottom: '2px',
          boxShadow: `0 0 6px ${dotColor}80`,
          transition: 'background-color 0.3s ease',
        }}
      />
    </div>
  );
}
