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
import { Badge } from '@/components/ui/badge';
import {
  UserPlus,
  Shield,
  Briefcase,
  UserCheck,
  Check,
  Loader2,
  Mail,
  User,
  Phone,
  AlertCircle,
  Info,
} from 'lucide-react';
import { type Membro } from '@/lib/mock-data';
import { adicionarMembroNoBanco } from '@/lib/supabase/service';

interface ModalConvidarMembroProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMembroAdicionado: (membro: Membro) => void;
  membrosExistentes?: Membro[];
}

type NivelPermissao = 'admin' | 'gestor' | 'vendedor';

interface OpcaoPermissao {
  id: NivelPermissao;
  titulo: string;
  badge: string;
  variant: 'info' | 'secondary' | 'success';
  icone: React.ComponentType<{ className?: string }>;
  descricao: string;
  recursos: string[];
}

const NIVEIS_PERMISSAO: OpcaoPermissao[] = [
  {
    id: 'admin',
    titulo: 'Administrador',
    badge: 'Admin',
    variant: 'info',
    icone: Shield,
    descricao: 'Controle total da organização, membros, pipelines e integrações.',
    recursos: ['Gerenciar membros e convites', 'Acesso às configurações gerais', 'Exclusão de registros críticos'],
  },
  {
    id: 'gestor',
    titulo: 'Gestor Comercial',
    badge: 'Gestor',
    variant: 'success',
    icone: Briefcase,
    descricao: 'Supervisão do funil de vendas, metas da equipe e relatórios globais.',
    recursos: ['Visualizar todos os negócios', 'Redistribuir leads na equipe', 'Exportar dados analíticos'],
  },
  {
    id: 'vendedor',
    titulo: 'Vendedor / Closer',
    badge: 'Vendedor',
    variant: 'secondary',
    icone: UserCheck,
    descricao: 'Gestão direta da sua carteira de clientes e oportunidades atribuídas.',
    recursos: ['Negociações e contatos atribuídos', 'Criação de propostas e tarefas', 'Histórico e follow-up'],
  },
];

export function ModalConvidarMembro({
  open,
  onOpenChange,
  onMembroAdicionado,
  membrosExistentes = [],
}: ModalConvidarMembroProps) {
  const [nome, setNome] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [telefone, setTelefone] = React.useState('');
  const [cargo, setCargo] = React.useState<NivelPermissao>('vendedor');
  const [enviarEmail, setEnviarEmail] = React.useState(true);
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [sucesso, setSucesso] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setNome('');
      setEmail('');
      setTelefone('');
      setCargo('vendedor');
      setEnviarEmail(true);
      setErro(null);
      setSucesso(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    const nomeTrim = nome.trim();
    const emailTrim = email.trim().toLowerCase();

    if (!nomeTrim) {
      setErro('Informe o nome completo do membro.');
      return;
    }

    if (!emailTrim || !emailTrim.includes('@') || !emailTrim.includes('.')) {
      setErro('Informe um endereço de e-mail corporativo válido.');
      return;
    }

    // Verifica se já existe membro com este e-mail
    const emailJaExiste = membrosExistentes.some(
      (m) => m.email.toLowerCase() === emailTrim
    );
    if (emailJaExiste) {
      setErro('Já existe um membro ativo cadastrado com este e-mail.');
      return;
    }

    setSalvando(true);

    try {
      const novoMembro = await adicionarMembroNoBanco({
        nome_completo: nomeTrim,
        email: emailTrim,
        cargo,
        telefone: telefone.trim() || undefined,
      });

      setSucesso(true);
      setTimeout(() => {
        onMembroAdicionado(novoMembro);
        onOpenChange(false);
      }, 700);
    } catch (err: any) {
      setErro(err?.message || 'Ocorreu um erro ao convidar o membro. Tente novamente.');
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <UserPlus className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle>Convidar Membro para a Equipe</DialogTitle>
              <DialogDescription>
                Adicione um novo colaborador e defina o nível de acesso e permissões no CRM.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {erro && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {sucesso && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-400">
            <Check className="h-4 w-4 shrink-0" />
            <span>Convite gerado com sucesso! Adicionando à equipe...</span>
          </div>
        )}

        <div className="space-y-3.5">
          {/* Nome Completo */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              Nome Completo <span className="text-rose-500">*</span>
            </label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Carlos Eduardo de Oliveira"
              className="text-xs"
              autoFocus
              required
              disabled={salvando || sucesso}
            />
          </div>

          {/* E-mail Corporativo */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              E-mail Corporativo <span className="text-rose-500">*</span>
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemplo@suaempresa.com.br"
              className="text-xs"
              required
              disabled={salvando || sucesso}
            />
          </div>

          {/* Telefone / WhatsApp */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              Telefone / WhatsApp <span className="text-[10px] text-muted-foreground">(Opcional)</span>
            </label>
            <Input
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(11) 98765-4321"
              className="text-xs"
              disabled={salvando || sucesso}
            />
          </div>

          {/* Nível de Permissão (Cargo) */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-sky-400" />
                Nível de Permissão & Acesso <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-muted-foreground">Pode ser alterado depois</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {NIVEIS_PERMISSAO.map((nivel) => {
                const Icone = nivel.icone;
                const selecionado = cargo === nivel.id;
                return (
                  <button
                    key={nivel.id}
                    type="button"
                    onClick={() => setCargo(nivel.id)}
                    disabled={salvando || sucesso}
                    className={`flex flex-col text-left p-2.5 rounded-lg border transition-all text-xs relative ${
                      selecionado
                        ? 'border-emerald-500 bg-emerald-500/10 shadow-sm ring-1 ring-emerald-500/40'
                        : 'border-border/70 bg-card hover:bg-muted/40 hover:border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <div className="flex items-center gap-1.5">
                        <Icone
                          className={`h-3.5 w-3.5 ${
                            selecionado ? 'text-emerald-400' : 'text-muted-foreground'
                          }`}
                        />
                        <span className={`font-semibold ${selecionado ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {nivel.titulo}
                        </span>
                      </div>
                      {selecionado ? (
                        <div className="h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                          <Check className="h-2.5 w-2.5" />
                        </div>
                      ) : null}
                    </div>

                    <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">
                      {nivel.descricao}
                    </p>

                    <div className="mt-2 pt-1.5 border-t border-border/40 w-full">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/80">
                        Permissão: <strong className="text-foreground">{nivel.badge}</strong>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Enviar e-mail de ativação */}
          <div className="flex items-start gap-2.5 rounded-lg border border-border/50 bg-muted/20 p-2.5">
            <input
              type="checkbox"
              id="enviar-email"
              checked={enviarEmail}
              onChange={(e) => setEnviarEmail(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 rounded border-border accent-emerald-500"
              disabled={salvando || sucesso}
            />
            <label htmlFor="enviar-email" className="text-[11px] text-muted-foreground cursor-pointer select-none">
              <span className="font-medium text-foreground block">
                Enviar e-mail com credenciais e link de primeiro acesso
              </span>
              O usuário receberá uma notificação para definir sua senha e entrar no CRM.
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={salvando || sucesso}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            size="sm"
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
            disabled={salvando || sucesso}
          >
            {salvando ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Adicionando Membro...</span>
              </>
            ) : sucesso ? (
              <>
                <Check className="h-3.5 w-3.5 text-white" />
                <span>Membro Adicionado!</span>
              </>
            ) : (
              <>
                <UserPlus className="h-3.5 w-3.5" />
                <span>Convidar e Criar Usuário</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
