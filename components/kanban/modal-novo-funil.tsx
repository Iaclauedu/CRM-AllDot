'use client';

import * as React from 'react';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { criarFunilNoBanco } from '@/lib/supabase/service';
import { type Funil, type EtapaFunil } from '@/lib/mock-data';
import { Loader2, Sparkles, Layers } from 'lucide-react';

interface ModalNovoFunilProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFunilCriado: (funil: Funil, etapas: EtapaFunil[]) => void;
}

export function ModalNovoFunil({
  open,
  onOpenChange,
  onFunilCriado,
}: ModalNovoFunilProps) {
  const [nome, setNome] = React.useState('');
  const [descricao, setDescricao] = React.useState('');
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setErro('Por favor, informe o nome do novo funil.');
      return;
    }

    setSalvando(true);
    setErro(null);

    try {
      const { funil, etapas } = await criarFunilNoBanco(nome.trim(), descricao.trim());
      onFunilCriado(funil, etapas);
      setNome('');
      setDescricao('');
      onOpenChange(false);
    } catch (err) {
      console.error('Erro ao criar funil:', err);
      setErro('Ocorreu um erro ao criar o funil. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[#E42358]/10 text-[#E42358] flex items-center justify-center font-bold">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Criar Novo Funil de Vendas
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Crie um pipeline dedicado para outro segmento, produto ou pós-venda.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {erro && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700">
            {erro}
          </div>
        )}

        <div className="space-y-3 py-1">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Nome do Funil *
            </label>
            <Input
              autoFocus
              placeholder="Ex: Pós-Venda & Onboarding, Parcerias, Outbound B2B..."
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="text-xs"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Descrição (Opcional)
            </label>
            <Input
              placeholder="Objetivo e fluxo deste funil..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-1.5 text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#E42358]" />
              Fases iniciais configuradas automaticamente:
            </span>
            <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400">
              <li>1. Contato Inicial (15%)</li>
              <li>2. Diagnóstico & Apresentação (40%)</li>
              <li>3. Proposta Comercial (70%)</li>
              <li>4. Fechamento / Contrato (90%)</li>
            </ul>
            <p className="text-[10px] text-slate-500 pt-1">
              Você poderá renomear, adicionar e remover qualquer fase logo após a criação.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/40">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={salvando}
            className="bg-[#E42358] hover:bg-[#c91848] text-white text-xs font-bold px-4"
          >
            {salvando ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Criando Funil...
              </>
            ) : (
              'Criar e Abrir Funil'
            )}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
