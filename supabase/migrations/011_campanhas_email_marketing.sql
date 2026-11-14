-- ==============================================================================
-- MIGRAÇÃO 011: MÓDULO DE CAMPANHAS DE E-MAIL MARKETING, LISTAS & MÉTRICAS
-- ==============================================================================

-- 1. Listas e Segmentações de Marketing
CREATE TABLE IF NOT EXISTS public.listas_marketing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    descricao TEXT,
    tipo TEXT NOT NULL DEFAULT 'dinamica' CHECK (tipo IN ('dinamica', 'estatica')),
    criterios_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    ativa BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.listas_marketing_contatos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lista_id UUID NOT NULL REFERENCES public.listas_marketing(id) ON DELETE CASCADE,
    contato_id UUID REFERENCES public.contatos(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    nome TEXT,
    adicionado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listas_mkt_contatos_lista ON public.listas_marketing_contatos (lista_id);

-- 2. Campanhas de E-mail Marketing
CREATE TABLE IF NOT EXISTS public.campanhas_marketing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    lista_id UUID REFERENCES public.listas_marketing(id) ON DELETE SET NULL,
    lista_nome TEXT,
    template_id UUID REFERENCES public.templates_email(id) ON DELETE SET NULL,
    template_nome TEXT,
    assunto TEXT NOT NULL,
    nome_remetente TEXT NOT NULL,
    email_remetente TEXT NOT NULL,
    corpo_html TEXT NOT NULL DEFAULT '',
    utm_campaign TEXT,
    utm_source TEXT DEFAULT 'alldot_crm',
    utm_medium TEXT DEFAULT 'email_marketing',
    status TEXT NOT NULL DEFAULT 'rascunho' CHECK (
        status IN ('rascunho', 'agendada', 'enviando', 'concluida', 'pausada', 'cancelada')
    ),
    agendado_para TIMESTAMPTZ,
    iniciada_em TIMESTAMPTZ,
    concluida_em TIMESTAMPTZ,
    total_destinatarios INTEGER NOT NULL DEFAULT 0,
    total_enviados INTEGER NOT NULL DEFAULT 0,
    total_entregues INTEGER NOT NULL DEFAULT 0,
    total_aberturas INTEGER NOT NULL DEFAULT 0,
    total_cliques INTEGER NOT NULL DEFAULT 0,
    total_bounces_temp INTEGER NOT NULL DEFAULT 0,
    total_bounces_perm INTEGER NOT NULL DEFAULT 0,
    total_descadastramentos INTEGER NOT NULL DEFAULT 0,
    total_conversoes INTEGER NOT NULL DEFAULT 0,
    receita_convertida NUMERIC(14,2) NOT NULL DEFAULT 0,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Envios individuais por destinatário (rastreamento de entrega, bounce, abertura, clique, opt-out e conversão)
CREATE TABLE IF NOT EXISTS public.campanhas_envios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
    campanha_id UUID NOT NULL REFERENCES public.campanhas_marketing(id) ON DELETE CASCADE,
    contato_id UUID REFERENCES public.contatos(id) ON DELETE SET NULL,
    negocio_id UUID REFERENCES public.negocios(id) ON DELETE SET NULL,
    destinatario_email TEXT NOT NULL,
    destinatario_nome TEXT,
    tracking_token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (
        status IN (
            'pendente',
            'enviado',
            'entregue',
            'bounce_temporario',
            'bounce_permanente',
            'erro',
            'bloqueado_optout'
        )
    ),
    smtp_codigo TEXT,
    smtp_resposta TEXT,
    motivo_erro TEXT,
    enviado_em TIMESTAMPTZ,
    entregue_em TIMESTAMPTZ,
    aberto BOOLEAN NOT NULL DEFAULT false,
    aberturas_qtd INTEGER NOT NULL DEFAULT 0,
    primeira_abertura_em TIMESTAMPTZ,
    ultima_abertura_em TIMESTAMPTZ,
    clicou BOOLEAN NOT NULL DEFAULT false,
    cliques_qtd INTEGER NOT NULL DEFAULT 0,
    primeiro_clique_em TIMESTAMPTZ,
    descadastrado BOOLEAN NOT NULL DEFAULT false,
    descadastrado_em TIMESTAMPTZ,
    converteu BOOLEAN NOT NULL DEFAULT false,
    convertido_em TIMESTAMPTZ,
    valor_conversao NUMERIC(14,2) NOT NULL DEFAULT 0,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campanhas_envios_campanha ON public.campanhas_envios (campanha_id, status);
CREATE INDEX IF NOT EXISTS idx_campanhas_envios_token ON public.campanhas_envios (tracking_token);

-- 4. Log detalhado de cliques por contato e URL
CREATE TABLE IF NOT EXISTS public.campanhas_cliques (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
    campanha_id UUID NOT NULL REFERENCES public.campanhas_marketing(id) ON DELETE CASCADE,
    envio_id UUID NOT NULL REFERENCES public.campanhas_envios(id) ON DELETE CASCADE,
    contato_id UUID REFERENCES public.contatos(id) ON DELETE SET NULL,
    destinatario_email TEXT NOT NULL,
    destinatario_nome TEXT,
    url_destino TEXT NOT NULL,
    clicado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_agent TEXT,
    ip TEXT
);

CREATE INDEX IF NOT EXISTS idx_campanhas_cliques_campanha ON public.campanhas_cliques (campanha_id, clicado_em DESC);

-- RLS Policies
ALTER TABLE public.listas_marketing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listas_marketing_contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campanhas_marketing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campanhas_envios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campanhas_cliques ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon acesso listas_marketing" ON public.listas_marketing;
CREATE POLICY "Anon acesso listas_marketing" ON public.listas_marketing FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Auth acesso listas_marketing" ON public.listas_marketing;
CREATE POLICY "Auth acesso listas_marketing" ON public.listas_marketing FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon acesso listas_marketing_contatos" ON public.listas_marketing_contatos;
CREATE POLICY "Anon acesso listas_marketing_contatos" ON public.listas_marketing_contatos FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Auth acesso listas_marketing_contatos" ON public.listas_marketing_contatos;
CREATE POLICY "Auth acesso listas_marketing_contatos" ON public.listas_marketing_contatos FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon acesso campanhas_marketing" ON public.campanhas_marketing;
CREATE POLICY "Anon acesso campanhas_marketing" ON public.campanhas_marketing FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Auth acesso campanhas_marketing" ON public.campanhas_marketing;
CREATE POLICY "Auth acesso campanhas_marketing" ON public.campanhas_marketing FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon acesso campanhas_envios" ON public.campanhas_envios;
CREATE POLICY "Anon acesso campanhas_envios" ON public.campanhas_envios FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Auth acesso campanhas_envios" ON public.campanhas_envios;
CREATE POLICY "Auth acesso campanhas_envios" ON public.campanhas_envios FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon acesso campanhas_cliques" ON public.campanhas_cliques;
CREATE POLICY "Anon acesso campanhas_cliques" ON public.campanhas_cliques FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Auth acesso campanhas_cliques" ON public.campanhas_cliques;
CREATE POLICY "Auth acesso campanhas_cliques" ON public.campanhas_cliques FOR ALL TO authenticated USING (true) WITH CHECK (true);
