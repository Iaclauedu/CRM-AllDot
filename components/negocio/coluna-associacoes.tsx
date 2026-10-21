'use client';

import * as React from 'react';
import {
  Users,
  Building2,
  Mail,
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
  Phone,
  Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DADOS_EMPRESAS,
  DADOS_CONTATOS,
  type Negocio,
} from '@/lib/mock-data';
import { formatarTelefoneWhatsApp } from '@/lib/utils';

interface ColunaAssociacoesProps {
  negocio: Negocio;
}

export function ColunaAssociacoes({ negocio }: ColunaAssociacoesProps) {
  const [copiado, setCopiado] = React.useState(false);

  // Busca contato e empresa associados
  const contato =
    DADOS_CONTATOS.find((c) => c.id === negocio.contato_id) || {
      nome: negocio.contato_nome || 'Rodrigo Prado',
      email: negocio.contato_email || 'contato@empresa.com.br',
      telefone_whatsapp: negocio.contato_whatsapp || '+5511988881234',
      cargo: 'Decisor Comercial',
    };

  const empresa =
    DADOS_EMPRESAS.find((e) => e.id === negocio.empresa_id) || {
      nome: negocio.empresa_nome || 'Empresa Parceira S/A',
      cnpj: '12.345.678/0001-90',
      dominio: 'empresa.com.br',
      segmento: 'Tecnologia B2B',
    };

  const copiarEmail = () => {
    navigator.clipboard.writeText(contato.email);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const whatsappLimpo = contato.telefone_whatsapp.replace(/\D/g, '');

  return (
    <div className="space-y-4 text-xs text-foreground p-1 select-none">
      {/* Card do Contato Principal */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-sky-400" />
            Contato Principal
          </span>
          <Badge variant="info" className="text-[9px]">
            Decisor
          </Badge>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-300 border border-zinc-700 shrink-0">
            {contato.nome.charAt(0)}
          </div>
          <div className="truncate">
            <h4 className="font-semibold text-foreground text-xs truncate">{contato.nome}</h4>
            <p className="text-[11px] text-muted-foreground truncate">{contato.cargo}</p>
          </div>
        </div>

        {/* E-mail com cópia rápida */}
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-2.5 py-1.5">
          <div className="flex items-center gap-2 truncate">
            <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-[11px] text-foreground truncate">{contato.email}</span>
          </div>
          <button
            onClick={copiarEmail}
            className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
            title="Copiar e-mail"
          >
            {copiado ? (
              <Check className="h-3 w-3 text-emerald-400" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
        </div>

        {/* Botão de 1-Clique para WhatsApp Web */}
        {contato.telefone_whatsapp && (
          <a
            href={`https://wa.me/${whatsappLimpo}`}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-800 bg-emerald-950/40 py-2 px-3 text-xs font-semibold text-emerald-300 hover:bg-emerald-950/70 transition-colors shadow-sm"
          >
            <MessageCircle className="h-4 w-4 text-emerald-400" />
            <span>Chamar no WhatsApp Web</span>
          </a>
        )}
      </div>

      {/* Card da Empresa Associada */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-amber-400" />
            Empresa Vinculada
          </span>
          <Badge variant="secondary" className="text-[9px]">
            Conta
          </Badge>
        </div>

        <div>
          <h4 className="font-semibold text-foreground text-xs truncate">{empresa.nome}</h4>
          <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{empresa.cnpj}</p>
        </div>

        {/* Domínio da Empresa */}
        {empresa.dominio && (
          <div className="flex items-center justify-between text-[11px] rounded-lg border border-border/60 bg-muted/20 px-2.5 py-1.5">
            <span className="text-muted-foreground">Website:</span>
            <a
              href={`https://${empresa.dominio}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sky-400 hover:underline"
            >
              <span>{empresa.dominio}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {/* Segmento */}
        <div className="flex items-center justify-between text-[11px] pt-1">
          <span className="text-muted-foreground">Segmento:</span>
          <span className="font-medium text-foreground">{empresa.segmento}</span>
        </div>
      </div>
    </div>
  );
}
