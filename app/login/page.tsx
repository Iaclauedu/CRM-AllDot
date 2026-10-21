'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, Lock, Mail, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function PaginaLogin() {
  const router = useRouter();
  const [email, setEmail] = React.useState('carlos.admin@acme.com');
  const [senha, setSenha] = React.useState('••••••••••••');
  const [carregando, setCarregando] = React.useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setTimeout(() => {
      setCarregando(false);
      router.push('/');
    }, 800);
  };

  const handleEntrarDemo = () => {
    setCarregando(true);
    setTimeout(() => {
      setCarregando(false);
      router.push('/');
    }, 600);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Glow de fundo */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-80 rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card/70 p-8 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-zinc-800 to-zinc-950 border border-zinc-700 shadow-inner mb-3">
            <Sparkles className="h-5 w-5 text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Acessar AllDot CRM
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Entre na sua conta para gerenciar seu pipeline e equipe.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-3.5">
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              E-mail corporativo
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@empresa.com"
              className="h-9"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-foreground">
                Senha
              </label>
              <a href="#" className="text-[11px] text-muted-foreground hover:text-foreground">
                Esqueceu a senha?
              </a>
            </div>
            <Input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              className="h-9"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={carregando}
            className="w-full h-9 mt-2 font-medium"
          >
            {carregando ? 'Autenticando...' : 'Entrar no Sistema'}
          </Button>

          <div className="relative my-4 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <span className="relative bg-card px-2 text-[10px] uppercase font-mono text-muted-foreground">
              Acesso Rápido
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleEntrarDemo}
            disabled={carregando}
            className="w-full h-9 gap-2 border-emerald-900/60 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/40"
          >
            <span>Entrar como Carlos (Admin Demo)</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Primeira vez aqui?{' '}
          <Link href="/onboarding" className="text-primary underline hover:text-foreground">
            Criar novo Workspace
          </Link>
        </p>
      </div>
    </div>
  );
}
