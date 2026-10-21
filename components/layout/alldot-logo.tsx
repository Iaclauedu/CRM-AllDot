'use client';

import * as React from 'react';

interface AllDotLogoProps {
  className?: string;
  variant?: 'white' | 'colored' | 'icon-only';
  size?: 'sm' | 'md' | 'lg';
}

export function AllDotLogo({
  className = '',
  variant = 'colored',
  size = 'md',
}: AllDotLogoProps) {
  const isWhite = variant === 'white';
  const isIcon = variant === 'icon-only';

  const dotColor = isWhite ? '#FFFFFF' : '#E42358';
  const textColor = isWhite ? '#FFFFFF' : '#0F172A';

  if (isIcon) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-[#E42358] to-[#C91748] text-white font-black shadow-sm ${className}`}
        style={{
          width: size === 'sm' ? '28px' : size === 'lg' ? '40px' : '34px',
          height: size === 'sm' ? '28px' : size === 'lg' ? '40px' : '34px',
          fontSize: size === 'sm' ? '14px' : size === 'lg' ? '20px' : '17px',
        }}
      >
        <span>A.</span>
      </div>
    );
  }

  const height = size === 'sm' ? '22px' : size === 'lg' ? '32px' : '26px';

  return (
    <div className={`flex items-center gap-1.5 select-none font-bold tracking-tight ${className}`}>
      <span
        style={{
          fontSize: size === 'sm' ? '18px' : size === 'lg' ? '26px' : '22px',
          fontFamily: 'Inter, system-ui, sans-serif',
          color: textColor,
          letterSpacing: '-0.04em',
          fontWeight: 800,
        }}
      >
        Alldot
      </span>
      <span
        style={{
          width: size === 'sm' ? '5px' : size === 'lg' ? '7px' : '6px',
          height: size === 'sm' ? '5px' : size === 'lg' ? '7px' : '6px',
          borderRadius: '50%',
          backgroundColor: '#E42358',
          display: 'inline-block',
          marginLeft: '-2px',
          marginBottom: '2px',
        }}
      />
    </div>
  );
}
