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
import { DADOS_MEMBROS, type Empresa } from '@/lib/mock-data';

interface ModalCriarEmpresaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSalvar: (novaEmpresa: Partial<Empresa>) => void;
}

export function ModalCriarEmpresa({
  open,
  onOpenChange,
  onSalvar,
}: ModalCriarEmpresaProps) {
  const [nome, setNome] = React.useState('');
  const [cnpj, setCnpj] = React.useState('');
  const [dominio, setDominio] = React.useState('');
  const [segmento, setSegmento] = React.useState('');
  const [responsavelId, setResponsavelId] = React.useState(DADOS_MEMBROS[0].id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    onSalvar({
      nome,
      cnpj,
      dominio,
      segmento,
      responsavel_id: responsavelId,
    });

    setNome('');
    setCnpj('');
    setDominio('');
    setSegmento('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Nova Empresa / Conta B2B</DialogTitle>
          <DialogDescription>
            Cadastre uma organização cliente ou prospect para gerenciar negócios e contatos vinculados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-2">
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">
              Razão Social / Nome Fantasia *
            </label>
            <Input
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Nubank Pagamentos S/A"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">
                CNPJ
              </label>
              <Input
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="00.000.000/0001-00"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">
                Domínio / Website
              </label>
              <Input
                value={dominio}
                onChange={(e) => setDominio(e.target.value)}
                placeholder="empresa.com.br"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">
                Segmento de Atuação
              </label>
              <Input
                value={segmento}
                onChange={(e) => setSegmento(e.target.value)}
                placeholder="Ex: SaaS, Varejo, Saúde"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">
                Responsável Comercial
              </label>
              <select
                value={responsavelId}
                onChange={(e) => setResponsavelId(e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-background/50 px-2 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {DADOS_MEMBROS.map((m) => (
                  <option key={m.id} value={m.id} className="bg-card text-foreground">
                    {m.nome_completo} ({m.cargo})
                  </option>
                ))}
              </select>
            </div>
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
          <Button type="submit">Cadastrar Empresa</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
