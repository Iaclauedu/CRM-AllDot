'use client';

import * as React from 'react';
import { Mail, Zap } from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { CommandPalette } from '@/components/layout/command-palette';
import { CentralAutomacoesEmail } from '@/components/automacoes/central-automacoes-email';

export default function PaginaAutomacoesEmail() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <CommandPalette />

        <div className="flex-1 overflow-y-auto p-8 max-w-6xl space-y-6">
          <div className="border-b border-border/80 pb-4">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-indigo-500" />
              <h1 className="text-lg font-bold text-foreground">
                Automação de E-mails, Templates & Servidor SMTP
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                <Zap className="h-3 w-3" />
                Motor Automático
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Crie regras de disparo por mudança de fase do funil ou tempo de inatividade, monte e-mails com imagens e anexos e configure sua conta de envio SMTP.
            </p>
          </div>

          <CentralAutomacoesEmail />
        </div>
      </div>
    </div>
  );
}
