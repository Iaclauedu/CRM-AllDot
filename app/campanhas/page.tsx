'use client';

import * as React from 'react';
import { Megaphone, Sparkles } from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { CommandPalette } from '@/components/layout/command-palette';
import { CentralCampanhasMarketing } from '@/components/campanhas/central-campanhas-marketing';

export default function PaginaCampanhasMarketing() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <CommandPalette />

        <div className="flex-1 overflow-y-auto p-8 max-w-6xl space-y-6">
          <div className="border-b border-border/80 pb-4">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-indigo-500" />
              <h1 className="text-lg font-bold text-foreground">
                Campanhas de E-mail Marketing & Segmentação
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                <Sparkles className="h-3 w-3" />
                Disparo em Massa SMTP
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Gerencie listas e segmentações, crie e agende campanhas com rastreamento de entrega, aberturas, cliques por contato, bounces, opt-out e conversões.
            </p>
          </div>

          <CentralCampanhasMarketing />
        </div>
      </div>
    </div>
  );
}
