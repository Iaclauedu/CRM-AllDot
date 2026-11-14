-- ==============================================================================
-- Migration 008: Integração Landing Page (https://brindes.brindaypersonalizados.com.br/)
-- Provisiona os campos do lead, UTMs, mídia, campanha e configuração de regras no Supabase
-- ==============================================================================

-- 1. Provisiona colunas de captura de lead e rastreamento (UTMs / Mídia / Conversão) em public.negocios
ALTER TABLE public.negocios
    ADD COLUMN IF NOT EXISTS lead_nome TEXT,
    ADD COLUMN IF NOT EXISTS lead_email TEXT,
    ADD COLUMN IF NOT EXISTS lead_empresa TEXT,
    ADD COLUMN IF NOT EXISTS lead_celular TEXT,
    ADD COLUMN IF NOT EXISTS origem_lead TEXT DEFAULT 'Landing Page',
    ADD COLUMN IF NOT EXISTS url_conversao TEXT,
    ADD COLUMN IF NOT EXISTS campanha TEXT,
    ADD COLUMN IF NOT EXISTS midia TEXT,
    ADD COLUMN IF NOT EXISTS conjunto_anuncios TEXT,
    ADD COLUMN IF NOT EXISTS utm_source TEXT,
    ADD COLUMN IF NOT EXISTS utm_medium TEXT,
    ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
    ADD COLUMN IF NOT EXISTS utm_content TEXT,
    ADD COLUMN IF NOT EXISTS utm_term TEXT,
    ADD COLUMN IF NOT EXISTS produto_interesse TEXT,
    ADD COLUMN IF NOT EXISTS data_hora_cadastro TIMESTAMPTZ DEFAULT now();

-- 2. Índices para busca rápida de contatos e negócios por e-mail e telefone (deduplicação)
CREATE INDEX IF NOT EXISTS idx_contatos_email_lower ON public.contatos (lower(email));
CREATE INDEX IF NOT EXISTS idx_contatos_telefone_digitos ON public.contatos ((regexp_replace(COALESCE(telefone_whatsapp, ''), '\D', '', 'g')));
CREATE INDEX IF NOT EXISTS idx_negocios_lead_email_lower ON public.negocios (lower(lead_email));
CREATE INDEX IF NOT EXISTS idx_negocios_lead_celular_digitos ON public.negocios ((regexp_replace(COALESCE(lead_celular, ''), '\D', '', 'g')));

-- 3. Tabela de configuração da integração da Landing Page e regra de criação de negociação
CREATE TABLE IF NOT EXISTS public.configuracoes_integracao_lp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE UNIQUE,
    url_landing_page TEXT NOT NULL DEFAULT 'https://brindes.brindaypersonalizados.com.br/',
    origem_padrao TEXT NOT NULL DEFAULT 'Landing Page Brinday',
    funil_id UUID REFERENCES public.funis(id) ON DELETE SET NULL,
    etapa_id UUID REFERENCES public.etapas_funil(id) ON DELETE SET NULL,
    responsavel_id UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
    regra_criacao_negocio TEXT NOT NULL DEFAULT 'atualizar_aberto'
        CHECK (regra_criacao_negocio IN ('sempre_criar', 'atualizar_aberto', 'bloquear_duplicado')),
    atualizar_contato_existente BOOLEAN NOT NULL DEFAULT true,
    ativo BOOLEAN NOT NULL DEFAULT true,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.configuracoes_integracao_lp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso publico configuracoes_integracao_lp" ON public.configuracoes_integracao_lp;
CREATE POLICY "Acesso publico configuracoes_integracao_lp"
    ON public.configuracoes_integracao_lp
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 4. Insere configuração padrão para a organização principal
INSERT INTO public.configuracoes_integracao_lp (
    organizacao_id,
    url_landing_page,
    origem_padrao,
    regra_criacao_negocio,
    atualizar_contato_existente,
    ativo
)
VALUES (
    'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
    'https://brindes.brindaypersonalizados.com.br/',
    'Landing Page Brinday',
    'atualizar_aberto',
    true,
    true
)
ON CONFLICT (organizacao_id) DO NOTHING;

