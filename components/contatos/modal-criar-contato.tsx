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
import {
  DADOS_MEMBROS,
  DADOS_EMPRESAS,
  type Contato,
} from '@/lib/mock-data';

interface ModalCriarContatoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSalvar: (novoContato: Partial<Contato>) => void;
}

export function ModalCriarContato({
  open,
  onOpenChange,
  onSalvar,
}: ModalCriarContatoProps) {
  const [nome, setNome] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [telefone, setTelefone] = React.useState('');
  const [cargo, setCargo] = React.useState('');
  const [empresaId, setEmpresaId] = React.useState(DADOS_EMPRESAS[0]?.id || '');
  const [responsavelId, setResponsavelId] = React.useState(DADOS_MEMBROS[0]?.id || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    const empresaSelecionada = DADOS_EMPRESAS.find((emp) => emp.id === empresaId);

    onSalvar({
      nome,
      email,
      telefone_whatsapp: telefone,
      cargo,
      empresa_id: empresaId,
      empresa_nome: empresaSelecionada?.nome || '',
      responsavel_id: responsavelId,
    });

    setNome('');
    setEmail('');
    setTelefone('');
    setCargo('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Novo Contato / Lead</DialogTitle>
          <DialogDescription>
            Adicione uma pessoa de contato chave vinculada a uma empresa ou conta comercial.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-2">
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">
              Nome Completo *
            </label>
            <Input
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Beatriz Mendes"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">
                E-mail Corporativo
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@empresa.com.br"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">
                WhatsApp / Telefone
              </label>
              <Input
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="+5511988881234"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">
                Cargo / Função
              </label>
              <Input
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                placeholder="Ex: Diretora de Operações"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">
                Empresa Vinculada
              </label>
              <select
                value={empresaId}
                onChange={(e) => setEmpresaId(e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-background/50 px-2 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {DADOS_EMPRESAS.map((emp) => (
                  <option key={emp.id} value={emp.id} className="bg-card text-foreground">
                    {emp.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">
              Vendedor Responsável
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

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="submit">Cadastrar Contato</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
