-- ==============================================================================
-- MIGRAÇÃO 009: AUTOMAÇÃO DE E-MAILS, TEMPLATES (IMAGENS/ANEXOS) & SERVIDOR SMTP
-- Execute este script no SQL Editor do Supabase para criar as 4 tabelas dedicadas
-- ==============================================================================

-- 1. Tabela de Configuração da Conta e Servidor de E-mail (SMTP / Relay)
CREATE TABLE IF NOT EXISTS public.configuracoes_servidor_email (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
    tipo_conta TEXT NOT NULL DEFAULT 'gmail_workspace' CHECK (
        tipo_conta IN (
            'gmail_workspace',
            'office365_outlook',
            'microsoft_365',
            'cpanel_titan',
            'ses_sendgrid_relay',
            'smtp_relay',
            'smtp_personalizado'
        )
    ),
    provedor_nome TEXT DEFAULT 'Google Workspace (Gmail Corporativo)',
    nome_remetente TEXT NOT NULL DEFAULT 'Equipe Comercial',
    email_remetente TEXT NOT NULL DEFAULT '',
    email_resposta TEXT DEFAULT '',
    smtp_host TEXT NOT NULL DEFAULT '',
    smtp_porta INTEGER NOT NULL DEFAULT 587,
    seguranca TEXT NOT NULL DEFAULT 'tls' CHECK (seguranca IN ('tls', 'ssl', 'nenhuma')),
    autenticacao_requerida BOOLEAN NOT NULL DEFAULT true,
    usuario_smtp TEXT NOT NULL DEFAULT '',
    senha_smtp TEXT NOT NULL DEFAULT '',
    assinatura_html TEXT DEFAULT '',
    limite_diario INTEGER NOT NULL DEFAULT 500,
    ativo BOOLEAN NOT NULL DEFAULT true,
    ultimo_teste_em TIMESTAMPTZ,
    status_conexao TEXT DEFAULT 'conectado',
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organizacao_id)
);

-- 2. Tabela de Modelos de E-mail (Templates com Imagens Inline e Anexos)
CREATE TABLE IF NOT EXISTS public.templates_email (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    categoria TEXT DEFAULT 'Comercial',
    assunto TEXT NOT NULL,
    corpo_html TEXT NOT NULL,
    imagens_corpo JSONB NOT NULL DEFAULT '[]'::jsonb,
    anexos JSONB NOT NULL DEFAULT '[]'::jsonb,
    ativo BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabela de Regras de Automação de Envio de E-mail
CREATE TABLE IF NOT EXISTS public.automacoes_email (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    descricao TEXT DEFAULT '',
    gatilho TEXT NOT NULL CHECK (
        gatilho IN ('mudanca_etapa', 'tempo_inatividade', 'novo_negocio', 'negocio_ganho', 'negocio_perdido')
    ),
    funil_id UUID REFERENCES public.funis(id) ON DELETE SET NULL,
    etapa_origem_id UUID REFERENCES public.etapas_funil(id) ON DELETE SET NULL,
    etapa_destino_id UUID REFERENCES public.etapas_funil(id) ON DELETE SET NULL,
    dias_inatividade INTEGER DEFAULT 3,
    horas_atraso_envio INTEGER NOT NULL DEFAULT 0,
    template_id UUID REFERENCES public.templates_email(id) ON DELETE SET NULL,
    destinatario_tipo TEXT NOT NULL DEFAULT 'contato_principal' CHECK (
        destinatario_tipo IN ('contato_principal', 'responsavel', 'ambos', 'email_personalizado')
    ),
    email_personalizado TEXT DEFAULT '',
    copia_cc TEXT DEFAULT '',
    apenas_horario_comercial BOOLEAN NOT NULL DEFAULT true,
    ativo BOOLEAN NOT NULL DEFAULT true,
    total_disparos INTEGER NOT NULL DEFAULT 0,
    ultimo_disparo_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Tabela de Histórico / Logs de Disparo de E-mails
CREATE TABLE IF NOT EXISTS public.logs_envio_email (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
    automacao_id UUID REFERENCES public.automacoes_email(id) ON DELETE SET NULL,
    automacao_nome TEXT,
    template_id UUID REFERENCES public.templates_email(id) ON DELETE SET NULL,
    template_nome TEXT,
    negocio_id UUID REFERENCES public.negocios(id) ON DELETE SET NULL,
    negocio_titulo TEXT,
    destinatario_email TEXT NOT NULL,
    destinatario_nome TEXT,
    assunto TEXT NOT NULL,
    gatilho TEXT,
    qtd_anexos INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'enviado' CHECK (status IN ('enviado', 'simulado', 'erro')),
    mensagem_erro TEXT,
    enviado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Habilitar RLS e Políticas de Acesso (Anon + Authenticated)
ALTER TABLE public.configuracoes_servidor_email ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates_email ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automacoes_email ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_envio_email ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon acesso configuracoes_servidor_email" ON public.configuracoes_servidor_email;
CREATE POLICY "Anon acesso configuracoes_servidor_email" ON public.configuracoes_servidor_email FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Auth acesso configuracoes_servidor_email" ON public.configuracoes_servidor_email;
CREATE POLICY "Auth acesso configuracoes_servidor_email" ON public.configuracoes_servidor_email FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon acesso templates_email" ON public.templates_email;
CREATE POLICY "Anon acesso templates_email" ON public.templates_email FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Auth acesso templates_email" ON public.templates_email;
CREATE POLICY "Auth acesso templates_email" ON public.templates_email FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon acesso automacoes_email" ON public.automacoes_email;
CREATE POLICY "Anon acesso automacoes_email" ON public.automacoes_email FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Auth acesso automacoes_email" ON public.automacoes_email;
CREATE POLICY "Auth acesso automacoes_email" ON public.automacoes_email FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon acesso logs_envio_email" ON public.logs_envio_email;
CREATE POLICY "Anon acesso logs_envio_email" ON public.logs_envio_email FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Auth acesso logs_envio_email" ON public.logs_envio_email;
CREATE POLICY "Auth acesso logs_envio_email" ON public.logs_envio_email FOR ALL TO authenticated USING (true) WITH CHECK (true);
