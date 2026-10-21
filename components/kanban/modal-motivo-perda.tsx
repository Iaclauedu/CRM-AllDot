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
import { XCircle, AlertTriangle } from 'lucide-react';
import type { Negocio } from '@/lib/mock-data';

interface ModalMotivoPerdaProps {
  negocio: Negocio | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmarPerda: (negocioId: string, motivo: string) => void;
}

const MOTIVOS_PADRAO = [
  'Preço / Orçamento insuficiente',
  'Optou por concorrente',
  'Perdeu o timing / Projeto cancelado',
  'Falta de fit técnico / Recursos necessários',
  'Sem retorno do decisor (Ghosting)',
  'Outro motivo',
];

export function ModalMotivoPerda({
  negocio,
  open,
  onOpenChange,
  onConfirmarPerda,
}: ModalMotivoPerdaProps) {
  const [motivoSelecionado, setMotivoSelecionado] = React.useState(MOTIVOS_PADRAO[0]);
  const [detalhes, setDetalhes] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!negocio) return;

    const motivoFinal =
      motivoSelecionado === 'Outro motivo' && detalhes.trim()
        ? `Outro: ${detalhes.trim()}`
        : detalhes.trim()
        ? `${motivoSelecionado} - ${detalhes.trim()}`
        : motivoSelecionado;

    onConfirmarPerda(negocio.id, motivoFinal);
    setDetalhes('');
    onOpenChange(false);
  };

  if (!negocio) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <div className="flex items-center gap-2 text-red-400 mb-1">
            <XCircle className="h-5 w-5" />
            <DialogTitle className="text-red-400">Marcar Negócio como Perdido</DialogTitle>
          </div>
          <DialogDescription>
            Registre o motivo da perda da oportunidade &quot;{negocio.titulo}&quot; para análise posterior no dashboard de inteligência de vendas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">
              Motivo Principal da Perda *
            </label>
            <div className="space-y-2">
              {MOTIVOS_PADRAO.map((motivo) => (
                <label
                  key={motivo}
                  className={`flex items-center gap-2.5 rounded-lg border p-2.5 text-xs cursor-pointer transition-colors ${
                    motivoSelecionado === motivo
                      ? 'border-red-600/80 bg-red-950/30 text-foreground font-medium'
                      : 'border-border/80 bg-background/50 text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                  }`}
                >
                  <input
                    type="radio"
                    name="motivo_perda"
                    value={motivo}
                    checked={motivoSelecionado === motivo}
                    onChange={() => setMotivoSelecionado(motivo)}
                    className="accent-red-500 h-3.5 w-3.5"
                  />
                  <span>{motivo}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">
              Observações adicionais (Opcional)
            </label>
            <textarea
              value={detalhes}
              onChange={(e) => setDetalhes(e.target.value)}
              placeholder="Explique o que aconteceu na negociação..."
              rows={3}
              className="w-full rounded-md border border-input bg-background/50 p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="submit" variant="destructive">
            Confirmar Perda
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
