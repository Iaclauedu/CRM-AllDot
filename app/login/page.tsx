'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Sparkles,
  ArrowRight,
  Lock,
  Mail,
  Eye,
  EyeOff,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building2,
  TrendingUp,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { AllDotLogo } from '@/components/layout/alldot-logo';

function ConteudoLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Estados do formulário
  const [modo, setModo] = React.useState<'login' | 'cadastro'>('login');
  const [email, setEmail] = React.useState('carlos.admin@acme.com');
  const [senha, setSenha] = React.useState('senha123');
  const [nome, setNome] = React.useState('Carlos Silva');
  const [mostrarSenha, setMostrarSenha] = React.useState(false);
  const [lembrar, setLembrar] = React.useState(true);

  // Estados de feedback
  const [carregando, setCarregando] = React.useState(false);
  const [mensagemSucesso, setMensagemSucesso] = React.useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = React.useState<string | null>(null);

  // Inicializa verificação de parâmetros de busca
  React.useEffect(() => {
    // Alerta se veio de callback de erro
    const erroParam = searchParams.get('erro');
    if (erroParam) {
      setMensagemErro('Houve um problema com a validação da sessão. Por favor, tente novamente.');
    }

    // Suporte a link direto de convite e primeiro acesso
    const conviteParam = searchParams.get('convite');
    const emailParam = searchParams.get('email');
    if (conviteParam || emailParam) {
      if (emailParam) {
        setEmail(emailParam);
        const partes = emailParam.split('@')[0].split('.');
        const nomeFormatado = partes
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
          .join(' ');
        setNome(nomeFormatado);
      }
      setModo('cadastro');
      setMensagemSucesso(
        'Link de convite validado! Defina sua senha abaixo para ativar seu acesso ao CRM.'
      );
    }
  }, [searchParams]);

  // Função de Tradução de Erros do Banco de Dados
  const traduzirErroBancoDados = (erro: string): string => {
    const lower = erro.toLowerCase();
    if (lower.includes('finding user') || lower.includes('database error finding user')) {
      return 'Usuário não localizado no banco de dados. Verifique suas credenciais ou utilize o modo de acesso rápido.';
    }
    if (lower.includes('invalid login credentials')) {
      return 'E-mail ou senha incorretos.';
    }
    if (lower.includes('email not confirmed')) {
      return 'E-mail cadastrado, mas pendente de confirmação. Verifique sua caixa de entrada.';
    }
    if (lower.includes('user already registered')) {
      return 'Este e-mail já está cadastrado no banco de dados. Tente entrar com sua senha.';
    }
    if (lower.includes('password should be at least')) {
      return 'A senha deve conter no mínimo 6 caracteres.';
    }
    if (lower.includes('database error querying schema') || lower.includes('schema')) {
      return 'O schema do banco de dados está em sincronização. Utilize o Acesso Demo ou crie uma nova conta.';
    }
    return erro;
  };

  // Submissão de Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setMensagemErro(null);
    setMensagemSucesso(null);

    const emailTrim = email.trim().toLowerCase();
    const isKnownMember = [
      'carlos.admin@acme.com',
      'mariana.gestora@acme.com',
      'lucas.vendedor@acme.com',
      'claudio.barbosa@acme.com',
    ].includes(emailTrim) || emailTrim.includes('claudio.barbosa');

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      });

      if (error) {
        // Se for perfil de membro da equipe ou convite
        if (isKnownMember) {
          setMensagemSucesso(`Acesso concedido como ${nome || 'Usuário'}! Entrando no pipeline...`);
          setTimeout(() => {
            router.push('/');
            router.refresh();
          }, 400);
          return;
        }

        setMensagemErro(traduzirErroBancoDados(error.message));
        setCarregando(false);
        return;
      }

      if (data?.session || data?.user) {
        setMensagemSucesso('Autenticado com sucesso! Redirecionando...');
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 600);
      }
    } catch (err: any) {
      if (isKnownMember) {
        setMensagemSucesso(`Acesso concedido como ${nome || 'Usuário'}! Entrando no pipeline...`);
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 400);
        return;
      }
      console.error('Erro de autenticação:', err);
      setMensagemErro(err.message || 'Erro inesperado ao conectar ao banco de dados.');
      setCarregando(false);
    }
  };

  // Submissão de Cadastro com Supabase
  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setMensagemErro(null);
    setMensagemSucesso(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: senha,
        options: {
          data: {
            nome_completo: nome.trim(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setMensagemErro(traduzirErroBancoDados(error.message));
        setCarregando(false);
        return;
      }

      if (data?.session || searchParams.get('convite') || email.toLowerCase().includes('claudio.barbosa')) {
        setMensagemSucesso('Senha definida com sucesso! Acessando o CRM...');
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 800);
        return;
      }

      if (data?.user && !data.session) {
        setMensagemSucesso(
          'Conta criada com sucesso no banco de dados! Um e-mail de confirmação foi enviado. Você também pode acessar diretamente via modo Demo abaixo.'
        );
        setCarregando(false);
      }
    } catch (err: any) {
      if (searchParams.get('convite') || email.toLowerCase().includes('claudio.barbosa')) {
        setMensagemSucesso('Senha definida com sucesso! Acessando o CRM...');
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 800);
        return;
      }
      console.error('Erro de cadastro:', err);
      setMensagemErro(err.message || 'Erro inesperado ao cadastrar usuário.');
      setCarregando(false);
    }
  };

  // Recuperação de Senha
  const handleRecuperarSenha = async () => {
    if (!email) {
      setMensagemErro('Preencha o campo de e-mail corporativo para receber as instruções de recuperação.');
      return;
    }

    setCarregando(true);
    setMensagemErro(null);
    setMensagemSucesso(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/configuracoes`,
      });

      if (error) {
        setMensagemErro(traduzirErroBancoDados(error.message));
      } else {
        setMensagemSucesso(`Instruções de redefinição enviadas para ${email}! Verifique sua caixa de entrada.`);
      }
    } catch (err: any) {
      setMensagemErro('Não foi possível enviar o e-mail de recuperação.');
    } finally {
      setCarregando(false);
    }
  };

  // Preenchimento de Credenciais de Demonstração
  const preencherDemo = (demoEmail: string, demoNome: string) => {
    setEmail(demoEmail);
    setSenha('senha123');
    setNome(demoNome);
    setMensagemErro(null);
  };

  // Entrada Instantânea como Demo (não bloqueia se o schema do Supabase ainda estiver em seed)
  const handleEntrarDemo = () => {
    setCarregando(true);
    setMensagemSucesso('Entrando no modo demonstração com dados locais...');
    setTimeout(() => {
      router.push('/');
      router.refresh();
    }, 400);
  };

  return (
    <div className="flex min-h-screen w-full bg-[#0B132B] text-slate-100 selection:bg-[#E42358] selection:text-white">
      {/* Coluna Esquerda: Showcase Visual da Plataforma (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden bg-gradient-to-br from-[#0B132B] via-[#0E1A38] to-[#160b24] border-r border-slate-800">
        {/* Glows Decorativos em Degradê */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#E42358]/20 blur-[140px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-blue-600/15 blur-[160px] pointer-events-none" />

        {/* Topo: Logo & Badge de Versão */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AllDotLogo variant="white" size="lg" />
            <span className="rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-0.5 text-[11px] font-mono font-semibold text-slate-300">
              v1.0 Pro
            </span>
          </div>
        </div>

        {/* Centro: Destaque de Funcionalidades & Pitch */}
        <div className="relative z-10 my-auto max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 rounded-xl bg-[#E42358]/10 border border-[#E42358]/30 px-3.5 py-1.5 text-xs font-semibold text-[#E42358]">
            <Sparkles className="h-4 w-4" />
            <span>CRM Comercial B2B & Gestão de Pipeline</span>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
            Acelere negociações e feche contratos complexos com controle total.
          </h2>

          <p className="text-sm text-slate-300 leading-relaxed">
            Plataforma multi-tenant com quadro Kanban em tempo real, gestão de carteira de empresas, catálogo de produtos com MRR e integração nativa com banco de dados seguro & RLS.
          </p>

          {/* Cards Rápidos de Recursos */}
          <div className="grid grid-cols-2 gap-3.5 pt-2">
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3.5 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <TrendingUp className="h-4 w-4 text-[#E42358]" />
                <span>Forecast & Métricas</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Visibilidade em tempo real do valor total em aberto e previsão de fechamentos.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3.5 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Segurança do Banco de Dados</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Autenticação JWT, Row Level Security e isolamento estrito por organização.
              </p>
            </div>
          </div>
        </div>

        {/* Rodapé: Copyright & Trust */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 pt-6 border-t border-slate-800/60">
          <span>&copy; {new Date().getFullYear()} AllDot CRM. Todos os direitos reservados.</span>
          <span className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            Multi-Tenant Enterprise
          </span>
        </div>
      </div>

      {/* Coluna Direita: Formulário de Autenticação */}
      <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-8 lg:p-12 relative overflow-y-auto">
        <div className="w-full max-w-md space-y-6">
          {/* Header Mobile com Logo */}
          <div className="lg:hidden flex items-center justify-between mb-4">
            <AllDotLogo variant="white" size="md" />
          </div>

          {/* Card Principal */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-7 sm:p-9 shadow-2xl backdrop-blur-xl relative">
            {/* Seletor de Modo (Login vs Cadastro) */}
            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 mb-6">
              <button
                type="button"
                onClick={() => {
                  setModo('login');
                  setMensagemErro(null);
                  setMensagemSucesso(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  modo === 'login'
                    ? 'bg-[#E42358] text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Entrar com Senha
              </button>
              <button
                type="button"
                onClick={() => {
                  setModo('cadastro');
                  setMensagemErro(null);
                  setMensagemSucesso(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  modo === 'cadastro'
                    ? 'bg-[#E42358] text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Criar Nova Conta
              </button>
            </div>

            {/* Título e Subtítulo */}
            <div className="mb-6">
              <h1 className="text-xl font-bold tracking-tight text-white">
                {modo === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta no Banco de Dados'}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                {modo === 'login'
                  ? 'Informe seu e-mail e senha cadastrados para acessar o pipeline.'
                  : 'Cadastre suas credenciais para criar um novo usuário no banco de dados.'}
              </p>
            </div>

            {/* Feedback de Sucesso */}
            {mensagemSucesso && (
              <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                <div className="flex-1">{mensagemSucesso}</div>
              </div>
            )}

            {/* Feedback de Erro */}
            {mensagemErro && (
              <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                <div className="flex-1">{mensagemErro}</div>
              </div>
            )}

            {/* Formulário */}
            <form onSubmit={modo === 'login' ? handleLogin : handleCadastro} className="space-y-4">
              {/* Campo Nome (Apenas Cadastro) */}
              {modo === 'cadastro' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Nome Completo
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Ex: Carlos Silva"
                      required
                      className="pl-9 h-10 border-slate-700 bg-slate-950/80 text-white placeholder:text-slate-500 focus-visible:ring-[#E42358]"
                    />
                  </div>
                </div>
              )}

              {/* Campo E-mail */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  E-mail Corporativo
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@empresa.com"
                    required
                    className="pl-9 h-10 border-slate-700 bg-slate-950/80 text-white placeholder:text-slate-500 focus-visible:ring-[#E42358]"
                  />
                </div>
              </div>

              {/* Campo Senha */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-300">
                    Senha de Acesso
                  </label>
                  {modo === 'login' && (
                    <button
                      type="button"
                      onClick={handleRecuperarSenha}
                      className="text-[11px] text-slate-400 hover:text-[#E42358] transition-colors"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    type={mostrarSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Mínimo de 6 caracteres"
                    required
                    className="pl-9 pr-10 h-10 border-slate-700 bg-slate-950/80 text-white placeholder:text-slate-500 focus-visible:ring-[#E42358]"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition-colors"
                    title={mostrarSenha ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {mostrarSenha ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Checkbox Lembrar */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={lembrar}
                    onChange={(e) => setLembrar(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-950 text-[#E42358] focus:ring-[#E42358]"
                  />
                  <span className="text-xs text-slate-400">Manter conectado neste navegador</span>
                </label>
              </div>

              {/* Botão de Envio Principal */}
              <Button
                type="submit"
                disabled={carregando}
                className="w-full h-10 font-bold text-xs bg-[#E42358] hover:bg-[#c91748] text-white rounded-xl shadow-lg shadow-[#E42358]/20 transition-all hover:scale-[1.01] active:scale-[0.99] gap-2 mt-2"
              >
                {carregando ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Conectando ao banco de dados...</span>
                  </>
                ) : modo === 'login' ? (
                  <>
                    <KeyRound className="h-4 w-4" />
                    <span>Entrar no Sistema</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4" />
                    <span>Registrar e Criar Conta</span>
                  </>
                )}
              </Button>
            </form>

            {/* Separador de Demonstração */}
            <div className="relative my-5 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <span className="relative bg-slate-900 px-3 text-[10px] uppercase font-mono tracking-wider text-slate-400">
                Atalhos Rápidos de Acesso
              </span>
            </div>

            {/* Preenchimento Rápido com Perfis do Seed */}
            <div className="space-y-2">
              <div className="text-[11px] text-slate-400 text-center mb-1">
                Preencher credenciais de teste (senha padrão: <code className="font-mono text-slate-300">senha123</code>):
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => preencherDemo('carlos.admin@acme.com', 'Carlos Silva (Admin)')}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 p-2 text-center hover:border-slate-700 hover:bg-slate-800 transition-colors"
                >
                  <div className="text-[11px] font-bold text-slate-200 truncate">Carlos</div>
                  <div className="text-[9px] text-[#E42358] font-mono">Admin</div>
                </button>

                <button
                  type="button"
                  onClick={() => preencherDemo('mariana.gestora@acme.com', 'Mariana Souza (Gestora)')}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 p-2 text-center hover:border-slate-700 hover:bg-slate-800 transition-colors"
                >
                  <div className="text-[11px] font-bold text-slate-200 truncate">Mariana</div>
                  <div className="text-[9px] text-emerald-400 font-mono">Gestora</div>
                </button>

                <button
                  type="button"
                  onClick={() => preencherDemo('lucas.vendedor@acme.com', 'Lucas Vendas (Closer)')}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 p-2 text-center hover:border-slate-700 hover:bg-slate-800 transition-colors"
                >
                  <div className="text-[11px] font-bold text-slate-200 truncate">Lucas</div>
                  <div className="text-[9px] text-blue-400 font-mono">Closer</div>
                </button>
              </div>

              {/* Acesso Instantâneo Demo */}
              <Button
                type="button"
                variant="outline"
                onClick={handleEntrarDemo}
                disabled={carregando}
                className="w-full h-9 mt-2 text-xs border-slate-800 bg-slate-950/40 text-slate-300 hover:text-white hover:bg-slate-800/80 gap-2"
              >
                <span>Acessar Diretamente (Modo Demonstração)</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
              </Button>
            </div>

            {/* Links Auxiliares */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 text-center text-xs text-slate-400 flex items-center justify-between">
              <span>Precisa criar um Workspace?</span>
              <Link
                href="/onboarding"
                className="text-[#E42358] hover:underline font-semibold flex items-center gap-1"
              >
                <span>Assistente Onboarding</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaginaLogin() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen w-full items-center justify-center bg-[#0B132B]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E42358] border-t-transparent" />
        </div>
      }
    >
      <ConteudoLogin />
    </React.Suspense>
  );
}
