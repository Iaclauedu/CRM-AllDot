'use client';

import * as React from 'react';
import {
  Building2,
  User,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Search,
  MapPin,
  Phone,
  Mail,
  UserCheck,
  Compass,
} from 'lucide-react';
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
  OPCOES_ORIGEM_LEAD,
  type Empresa,
  type Membro,
  type TipoCliente,
  type OrigemLeadCliente,
} from '@/lib/mock-data';
import {
  buscarMembrosDoBanco,
  verificarDocumentoExistenteNoBanco,
} from '@/lib/supabase/service';

interface ModalCriarEmpresaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSalvar: (dadosCliente: Partial<Empresa>) => Promise<void> | void;
  empresasExistentes?: Empresa[];
  empresaEditando?: Empresa | null;
}

export function formatarCpfCnpj(valor: string, tipo: TipoCliente): string {
  const digitos = valor.replace(/\D/g, '');
  if (tipo === 'PF') {
    const d = digitos.slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
  } else {
    const d = digitos.slice(0, 14);
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
    if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
    if (d.length <= 12)
      return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
  }
}

export function formatarMascaraWhatsApp(valor: string): string {
  let digitos = valor.replace(/\D/g, '');
  if (!digitos) return '';

  // Remove o prefixo 55 caso o usuário digite para reaplicar a máscara +55 (XX) XXXXX-XXXX
  if (digitos.startsWith('55') && digitos.length > 2) {
    digitos = digitos.slice(2);
  }
  const d = digitos.slice(0, 11);

  if (d.length <= 2) return `+55 (${d}`;
  if (d.length <= 6) return `+55 (${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `+55 (${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `+55 (${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
}

export function ModalCriarEmpresa({
  open,
  onOpenChange,
  onSalvar,
  empresasExistentes = [],
  empresaEditando = null,
}: ModalCriarEmpresaProps) {
  const [membros, setMembros] = React.useState<Membro[]>(DADOS_MEMBROS);
  const [tipoCliente, setTipoCliente] = React.useState<TipoCliente>('PJ');
  const [cpfCnpj, setCpfCnpj] = React.useState('');
  const [razaoSocial, setRazaoSocial] = React.useState('');
  const [nomeFantasia, setNomeFantasia] = React.useState('');
  const [endereco, setEndereco] = React.useState('');
  const [contatoPrincipal, setContatoPrincipal] = React.useState('');
  const [whatsappPrincipal, setWhatsappPrincipal] = React.useState('');
  const [emailPrincipal, setEmailPrincipal] = React.useState('');
  const [origemLead, setOrigemLead] = React.useState<OrigemLeadCliente | string>(
    OPCOES_ORIGEM_LEAD[0]
  );
  const [responsavelId, setResponsavelId] = React.useState(DADOS_MEMBROS[0].id);

  // Estados de validação, consulta ReceitaWS e bloqueio de duplicidade
  const [consultandoCnpj, setConsultandoCnpj] = React.useState(false);
  const [statusReceita, setStatusReceita] = React.useState<string | null>(null);
  const [erroDuplicidade, setErroDuplicidade] = React.useState<string | null>(null);
  const [erroFormulario, setErroFormulario] = React.useState<string | null>(null);
  const [salvando, setSalvando] = React.useState(false);
  const ultimoCnpjConsultadoRef = React.useRef<string>('');

  React.useEffect(() => {
    if (!open) return;
    buscarMembrosDoBanco().then((lista) => {
      if (lista && lista.length > 0) {
        setMembros(lista);
        if (!empresaEditando) {
          setResponsavelId((prev) =>
            lista.some((m) => m.id === prev) ? prev : lista[0].id
          );
        }
      }
    });
  }, [open, empresaEditando]);

  React.useEffect(() => {
    if (!open) return;
    setErroDuplicidade(null);
    setErroFormulario(null);
    setStatusReceita(null);

    if (empresaEditando) {
      const digitos = (empresaEditando.cpf_cnpj || empresaEditando.cnpj || '').replace(
        /\D/g,
        ''
      );
      const tipo: TipoCliente =
        empresaEditando.tipo_cliente || (digitos.length === 11 ? 'PF' : 'PJ');
      setTipoCliente(tipo);
      setCpfCnpj(formatarCpfCnpj(digitos, tipo));
      setRazaoSocial(empresaEditando.razao_social || empresaEditando.nome || '');
      setNomeFantasia(empresaEditando.nome_fantasia || '');
      setEndereco(empresaEditando.endereco || '');
      setContatoPrincipal(empresaEditando.contato_principal || '');
      setWhatsappPrincipal(empresaEditando.whatsapp_principal || '');
      setEmailPrincipal(empresaEditando.email_principal || '');
      setOrigemLead(empresaEditando.origem_lead || OPCOES_ORIGEM_LEAD[0]);
      setResponsavelId(empresaEditando.responsavel_id || DADOS_MEMBROS[0].id);
      ultimoCnpjConsultadoRef.current = digitos;
    } else {
      setTipoCliente('PJ');
      setCpfCnpj('');
      setRazaoSocial('');
      setNomeFantasia('');
      setEndereco('');
      setContatoPrincipal('');
      setWhatsappPrincipal('');
      setEmailPrincipal('');
      setOrigemLead(OPCOES_ORIGEM_LEAD[0]);
      ultimoCnpjConsultadoRef.current = '';
    }
  }, [open, empresaEditando]);

  const handleTrocarTipoCliente = (novoTipo: TipoCliente) => {
    setTipoCliente(novoTipo);
    setCpfCnpj('');
    setErroDuplicidade(null);
    setStatusReceita(null);
    ultimoCnpjConsultadoRef.current = '';
    if (novoTipo === 'PF') {
      setNomeFantasia('');
    }
  };

  const verificarDuplicidadeDocumento = React.useCallback(
    async (digitos: string, tipo: TipoCliente): Promise<boolean> => {
      const tamanhoEsperado = tipo === 'PF' ? 11 : 14;
      if (digitos.length !== tamanhoEsperado) {
        setErroDuplicidade(null);
        return false;
      }

      // 1. Verifica na lista local já carregada
      const duplicadoLocal = empresasExistentes.find((emp) => {
        if (empresaEditando && emp.id === empresaEditando.id) return false;
        const docEmp = (emp.cpf_cnpj || emp.cnpj || '').replace(/\D/g, '');
        return docEmp === digitos;
      });

      if (duplicadoLocal) {
        const rotulo = tipo === 'PF' ? 'CPF' : 'CNPJ';
        setErroDuplicidade(
          `Bloqueado: Este ${rotulo} já está cadastrado na base para "${duplicadoLocal.razao_social || duplicadoLocal.nome}".`
        );
        return true;
      }

      // 2. Confirma diretamente no Supabase
      const duplicadoBanco = await verificarDocumentoExistenteNoBanco(
        digitos,
        empresaEditando?.id
      );
      if (duplicadoBanco) {
        const rotulo = tipo === 'PF' ? 'CPF' : 'CNPJ';
        setErroDuplicidade(
          `Bloqueado: Este ${rotulo} já está cadastrado na base para "${duplicadoBanco.razao_social || duplicadoBanco.nome}".`
        );
        return true;
      }

      setErroDuplicidade(null);
      return false;
    },
    [empresasExistentes, empresaEditando]
  );

  const consultarReceitaFederal = React.useCallback(
    async (digitosCnpj: string) => {
      if (digitosCnpj.length !== 14) return;

      setConsultandoCnpj(true);
      setStatusReceita(null);
      try {
        const duplicado = await verificarDuplicidadeDocumento(digitosCnpj, 'PJ');
        if (duplicado) {
          setConsultandoCnpj(false);
          return;
        }

        const res = await fetch(`/api/cnpj/${digitosCnpj}`);
        const data = await res.json();

        if (res.ok && data.razao_social) {
          setRazaoSocial(data.razao_social);
          setNomeFantasia(data.nome_fantasia || data.razao_social);
          if (data.endereco) {
            setEndereco(data.endereco);
          }
          setStatusReceita(
            `Dados preenchidos automaticamente via ${data.fonte || 'ReceitaWS'}!`
          );
        } else {
          setStatusReceita(
            data.erro || 'Não foi possível localizar os dados automáticos deste CNPJ.'
          );
        }
      } catch {
        setStatusReceita('Não foi possível consultar a ReceitaWS no momento.');
      } finally {
        setConsultandoCnpj(false);
      }
    },
    [verificarDuplicidadeDocumento]
  );

  const handleAlterarCpfCnpj = async (valorDigitado: string) => {
    const formatado = formatarCpfCnpj(valorDigitado, tipoCliente);
    setCpfCnpj(formatado);
    setErroFormulario(null);

    const digitos = formatado.replace(/\D/g, '');

    if (tipoCliente === 'PJ') {
      if (digitos.length === 14 && ultimoCnpjConsultadoRef.current !== digitos) {
        ultimoCnpjConsultadoRef.current = digitos;
        await consultarReceitaFederal(digitos);
      } else if (digitos.length < 14) {
        setErroDuplicidade(null);
        setStatusReceita(null);
        ultimoCnpjConsultadoRef.current = '';
      }
    } else {
      if (digitos.length === 11) {
        await verificarDuplicidadeDocumento(digitos, 'PF');
      } else {
        setErroDuplicidade(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroFormulario(null);

    const digitosDoc = cpfCnpj.replace(/\D/g, '');
    const tamanhoEsperado = tipoCliente === 'PF' ? 11 : 14;

    if (digitosDoc.length !== tamanhoEsperado) {
      setErroFormulario(
        tipoCliente === 'PF'
          ? 'Informe um CPF válido com 11 dígitos numéricos.'
          : 'Informe um CNPJ válido com 14 dígitos numéricos.'
      );
      return;
    }

    // Verifica duplicidade antes de salvar
    const duplicado = await verificarDuplicidadeDocumento(digitosDoc, tipoCliente);
    if (duplicado) return;

    if (!razaoSocial.trim()) {
      setErroFormulario(
        tipoCliente === 'PF'
          ? 'Informe o Nome Completo do cliente.'
          : 'Informe a Razão Social da empresa.'
      );
      return;
    }

    if (emailPrincipal.trim() && !emailPrincipal.includes('@')) {
      setErroFormulario('O E-mail Principal deve conter um formato válido com @.');
      return;
    }

    setSalvando(true);
    try {
      await onSalvar({
        tipo_cliente: tipoCliente,
        cpf_cnpj: digitosDoc,
        cnpj: formatarCpfCnpj(digitosDoc, tipoCliente),
        nome: razaoSocial.trim(),
        razao_social: razaoSocial.trim(),
        nome_fantasia:
          tipoCliente === 'PJ' ? nomeFantasia.trim() || razaoSocial.trim() : '',
        endereco: endereco.trim(),
        contato_principal: contatoPrincipal.trim(),
        whatsapp_principal: whatsappPrincipal.trim(),
        email_principal: emailPrincipal.trim(),
        origem_lead: origemLead,
        segmento: origemLead,
        responsavel_id: responsavelId,
      });

      onOpenChange(false);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>
            {empresaEditando
              ? 'Editar Cadastro de Cliente'
              : 'Novo Cadastro de Cliente (PJ / PF)'}
          </DialogTitle>
          <DialogDescription>
            Selecione o Tipo de Cliente. Para CNPJ, os dados cadastrais são preenchidos
            automaticamente via ReceitaWS com bloqueio de duplicidade.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-2 max-h-[72vh] overflow-y-auto pr-1">
          {/* Seletor Tipo de Cliente: Pessoa Jurídica / Pessoa Física */}
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">
              Tipo de Cliente *
            </label>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted/30 p-1">
              <button
                type="button"
                onClick={() => handleTrocarTipoCliente('PJ')}
                className={`flex items-center justify-center gap-2 rounded-lg py-2 px-3 text-xs font-semibold transition-all ${
                  tipoCliente === 'PJ'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>Pessoa Jurídica (CNPJ)</span>
              </button>
              <button
                type="button"
                onClick={() => handleTrocarTipoCliente('PF')}
                className={`flex items-center justify-center gap-2 rounded-lg py-2 px-3 text-xs font-semibold transition-all ${
                  tipoCliente === 'PF'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <User className="h-3.5 w-3.5" />
                <span>Pessoa Física (CPF)</span>
              </button>
            </div>
          </div>

          {/* CPF / CNPJ - Chave Única + Consulta Automática ReceitaWS */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-foreground">
                {tipoCliente === 'PJ'
                  ? 'CNPJ (Campo Numérico - Chave Única) *'
                  : 'CPF (Campo Numérico - Chave Única) *'}
              </label>
              {tipoCliente === 'PJ' && (
                <span className="text-[10px] text-muted-foreground">
                  Preenche Razão Social, Fantasia e Endereço ao digitar
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  required
                  inputMode="numeric"
                  value={cpfCnpj}
                  onChange={(e) => handleAlterarCpfCnpj(e.target.value)}
                  placeholder={
                    tipoCliente === 'PJ' ? '00.000.000/0001-00' : '000.000.000-00'
                  }
                  className={
                    erroDuplicidade
                      ? 'border-rose-500 focus-visible:ring-rose-500 font-mono'
                      : 'font-mono'
                  }
                />
                {consultandoCnpj && (
                  <Loader2 className="absolute right-2.5 top-2.5 h-3.5 w-3.5 animate-spin text-primary" />
                )}
              </div>

              {tipoCliente === 'PJ' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={
                    consultandoCnpj || cpfCnpj.replace(/\D/g, '').length !== 14
                  }
                  onClick={() =>
                    consultarReceitaFederal(cpfCnpj.replace(/\D/g, ''))
                  }
                  className="h-8 gap-1.5 text-xs shrink-0"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Consultar CNPJ</span>
                </Button>
              )}
            </div>

            {erroDuplicidade && (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="font-medium">{erroDuplicidade}</span>
              </div>
            )}

            {!erroDuplicidade && statusReceita && (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>{statusReceita}</span>
              </div>
            )}
          </div>

          {/* Razão Social / Nome Completo & Nome Fantasia (dinâmico) */}
          <div
            className={
              tipoCliente === 'PJ' ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-1'
            }
          >
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">
                {tipoCliente === 'PJ' ? 'Razão Social *' : 'Nome Completo *'}
              </label>
              <Input
                required
                value={razaoSocial}
                onChange={(e) => setRazaoSocial(e.target.value)}
                placeholder={
                  tipoCliente === 'PJ'
                    ? 'Ex: AllDot Identificação Corporativa Ltda'
                    : 'Ex: Maria Aparecida Oliveira'
                }
              />
            </div>

            {tipoCliente === 'PJ' && (
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">
                  Nome Fantasia
                </label>
                <Input
                  value={nomeFantasia}
                  onChange={(e) => setNomeFantasia(e.target.value)}
                  placeholder="Ex: AllDot Crachás & Cordões"
                />
              </div>
            )}
          </div>

          {/* Endereço (preenchido automaticamente pela ReceitaWS para CNPJ) */}
          <div>
            <label className="text-xs font-medium text-foreground mb-1 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Endereço Completo</span>
            </label>
            <Input
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Rua, Número, Bairro, Cidade/UF - CEP"
            />
          </div>

          {/* Nome do Contato Principal & WhatsApp Principal */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Nome do Contato Principal *</span>
              </label>
              <Input
                required
                value={contatoPrincipal}
                onChange={(e) => setContatoPrincipal(e.target.value)}
                placeholder="Ex: João Silva - Compras"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground mb-1 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-emerald-400" />
                <span>WhatsApp Principal *</span>
              </label>
              <Input
                required
                inputMode="numeric"
                value={whatsappPrincipal}
                onChange={(e) =>
                  setWhatsappPrincipal(formatarMascaraWhatsApp(e.target.value))
                }
                placeholder="+55 (11) 98888-7777"
                className="font-mono"
              />
            </div>
          </div>

          {/* E-mail Principal & Origem do Lead */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-sky-400" />
                <span>E-mail Principal *</span>
              </label>
              <Input
                required
                type="email"
                value={emailPrincipal}
                onChange={(e) => setEmailPrincipal(e.target.value)}
                placeholder="contato@empresa.com.br"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground mb-1 flex items-center gap-1.5">
                <Compass className="h-3.5 w-3.5 text-amber-400" />
                <span>Origem do Lead *</span>
              </label>
              <select
                value={origemLead}
                onChange={(e) => setOrigemLead(e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-background/50 px-2 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {OPCOES_ORIGEM_LEAD.map((origem) => (
                  <option
                    key={origem}
                    value={origem}
                    className="bg-card text-foreground"
                  >
                    {origem}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Responsável Comercial */}
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">
              Responsável Comercial
            </label>
            <select
              value={responsavelId}
              onChange={(e) => setResponsavelId(e.target.value)}
              className="flex h-8 w-full rounded-md border border-input bg-background/50 px-2 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {membros.map((m) => (
                <option key={m.id} value={m.id} className="bg-card text-foreground">
                  {m.nome_completo} ({m.cargo})
                </option>
              ))}
            </select>
          </div>

          {erroFormulario && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{erroFormulario}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={salvando || Boolean(erroDuplicidade) || consultandoCnpj}
          >
            {salvando
              ? 'Salvando no Supabase...'
              : empresaEditando
                ? 'Salvar Alterações'
                : tipoCliente === 'PJ'
                  ? 'Cadastrar Empresa (PJ)'
                  : 'Cadastrar Cliente (PF)'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
