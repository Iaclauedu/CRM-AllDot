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
import { atualizarFunilNoBanco } from '@/lib/supabase/service';
import { type Funil } from '@/lib/mock-data';
import { Loader2, Edit3, Layers, Check } from 'lucide-react';

interface ModalEditarFunilProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funil: Funil | null;
  onFunilAtualizado: (funilAtualizado: Funil) => void;
}

export function ModalEditarFunil({
  open,
  onOpenChange,
  funil,
  onFunilAtualizado,
}: ModalEditarFunilProps) {
  const [nome, setNome] = React.useState('');
  const [descricao, setDescricao] = React.useState('');
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (funil) {
      setNome(funil.nome);
      setDescricao(funil.descricao || '');
      setErro(null);
    }
  }, [funil, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!funil) return;

    const nomeTrim = nome.trim();
    if (!nomeTrim) {
      setErro('Por favor, informe um nome válido para o funil.');
      return;
    }

    setSalvando(true);
    setErro(null);

    try {
      await atualizarFunilNoBanco(funil.id, {
        nome: nomeTrim,
        descricao: descricao.trim(),
      });

      const funilAtualizado: Funil = {
        ...funil,
        nome: nomeTrim,
        descricao: descricao.trim(),
      };

      onFunilAtualizado(funilAtualizado);
      onOpenChange(false);
    } catch (err) {
      console.error('Erro ao atualizar funil:', err);
      setErro('Ocorreu um erro ao atualizar o nome do funil.');
    } finally {
      setSalvando(false);
    }
  };

  if (!funil) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#E42358]/10 text-[#E42358] flex items-center justify-center font-bold">
              <Edit3 className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Alterar Nome do Funil
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Edite a identificação e os detalhes deste pipeline de vendas.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {erro && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700">
            {erro}
          </div>
        )}

        <div className="space-y-3.5 py-1">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              Nome do Funil *
            </label>
            <Input
              autoFocus
              placeholder="Ex: Funil Comercial Enterprise, Outbound Hunter, Expansão..."
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="text-xs h-9 font-medium"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              Descrição do Pipeline (Opcional)
            </label>
            <Input
              placeholder="Ex: Focado em clientes com faturamento acima de R$ 50M/ano"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="text-xs h-9"
            />
          </div>
        </div>

        <DialogFooter className="pt-2 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={salvando}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={salvando || !nome.trim()}
            className="text-xs bg-[#E42358] hover:bg-[#c91748] text-white font-bold gap-1.5 shadow-sm"
          >
            {salvando ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Salvar Alterações</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
