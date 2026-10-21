'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Building2, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function PaginaOnboarding() {
  const router = useRouter();
  const [nomeOrg, setNomeOrg] = React.useState('');
  const [cnpj, setCnpj] = React.useState('');
  const [segmento, setSegmento] = React.useState('Tecnologia & SaaS');
  const [carregando, setCarregando] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeOrg.trim()) return;

    setCarregando(true);
    // Simula chamada à RPC fn_criar_organizacao_com_funil_padrao
    setTimeout(() => {
      setCarregando(false);
      router.push('/');
    }, 1200);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card/80 p-8 backdrop-blur-xl shadow-2xl">
        {/* Header com Logo */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-zinc-800 to-zinc-950 border border-zinc-700 shadow-inner mb-3">
            <Sparkles className="h-6 w-6 text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Configure seu Workspace
          </h1>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Vamos preparar seu CRM B2B, criar seu funil de vendas padrão e configurar sua operação.
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              Nome da sua Empresa ou Workspace *
            </label>
            <Input
              required
              value={nomeOrg}
              onChange={(e) => setNomeOrg(e.target.value)}
              placeholder="Ex: AllDot Vendas"
              className="h-9"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              CNPJ (Opcional)
            </label>
            <Input
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="00.000.000/0001-00"
              className="h-9 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              Segmento Principal
            </label>
            <select
              value={segmento}
              onChange={(e) => setSegmento(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background/50 px-3 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="Tecnologia & SaaS" className="bg-card">Tecnologia & SaaS</option>
              <option value="Consultoria & Serviços" className="bg-card">Consultoria & Serviços</option>
              <option value="Indústria & Manufatura" className="bg-card">Indústria & Manufatura</option>
              <option value="Varejo & E-commerce" className="bg-card">Varejo & E-commerce</option>
              <option value="Saúde & Healthtech" className="bg-card">Saúde & Healthtech</option>
            </select>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2 mt-2">
            <p className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              O que será configurado automaticamente:
            </p>
            <ul className="text-[10px] text-muted-foreground space-y-1 list-disc list-inside">
              <li>Funil Padrão B2B com 4 etapas configuradas</li>
              <li>Cálculos automáticos de forecast e estagnação (deal rotting)</li>
              <li>Acesso administrativo total ao seu usuário</li>
            </ul>
          </div>

          <Button
            type="submit"
            disabled={carregando}
            className="w-full h-9 gap-2 mt-4 bg-primary text-primary-foreground font-semibold"
          >
            {carregando ? (
              <span>Criando Ambiente...</span>
            ) : (
              <>
                <span>Acessar CRM</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
