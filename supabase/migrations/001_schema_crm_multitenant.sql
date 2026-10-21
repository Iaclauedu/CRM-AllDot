-- ==============================================================================
-- MIGRAÇÃO 001: CRM B2B MODERNO (MULTI-TENANT SAAS)
-- Nomenclatura 100% em português (snake_case, sem acentos)
-- Compatível com Supabase PostgreSQL, RLS, Triggers e Realtime
-- ==============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABELAS DE IDENTIDADE E WORKSPACE / TENANT
-- ==============================================================================

-- Tabela de Perfis (sincronizada com auth.users)
CREATE TABLE IF NOT EXISTS public.perfis (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome_completo TEXT NOT NULL,
    email TEXT NOT NULL,
    avatar_url TEXT,
    telefone TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Organizações (Workspaces dos clientes SaaS)
CREATE TABLE IF NOT EXISTS public.organizacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    cnpj TEXT,
    segmento TEXT,
    plano TEXT NOT NULL DEFAULT 'starter' CHECK (plano IN ('starter', 'pro', 'enterprise')),
    ativa BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Membros da Organização (Associação N:N Usuário x Organização com Papel)
CREATE TABLE IF NOT EXISTS public.membros_organizacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
    perfil_id UUID NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
    cargo TEXT NOT NULL DEFAULT 'vendedor' CHECK (cargo IN ('admin', 'gestor', 'vendedor')),
    ativo BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_membro_organizacao UNIQUE (organizacao_id, perfil_id)
);

-- ==============================================================================
-- 3. METADADOS DINÂMICOS E CATÁLOGO DE PRODUTOS
-- ==============================================================================

-- Definição de Campos Personalizados por Organização
CREATE TABLE IF NOT EXISTS public.campos_definicoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
    entidade TEXT NOT NULL CHECK (entidade IN ('negocio', 'empresa', 'contato', 'produto')),
    nome_chave TEXT NOT NULL,
    label TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('texto', 'numero', 'moeda', 'data', 'selecao', 'booleano')),
    opcoes_json JSONB DEFAULT '[]'::jsonb,
    obrigatorio BOOLEAN NOT NULL DEFAULT false,
    ordem INT NOT NULL DEFAULT 0,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_campo_definicao UNIQUE (organizacao_id, entidade, nome_chave)
);

-- Catálogo de Produtos e Serviços da Empresa
CREATE TABLE IF NOT EXISTS public.produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    descricao TEXT,
    codigo_sku TEXT,
    valor NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    tipo_cobranca TEXT NOT NULL DEFAULT 'mensal' CHECK (tipo_cobranca IN ('mensal', 'a_vista', 'anual')),
    ativo BOOLEAN NOT NULL DEFAULT true,
    campos_personalizados JSONB NOT NULL DEFAULT '{}'::jsonb,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 4. PIPELINE / FUNIL DE VENDAS
-- ==============================================================================

-- Funis de Vendas
CREATE TABLE IF NOT EXISTS public.funis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    descricao TEXT,
    padrao BOOLEAN NOT NULL DEFAULT false,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Etapas do Funil
CREATE TABLE IF NOT EXISTS public.etapas_funil (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
    funil_id UUID NOT NULL REFERENCES public.funis(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    ordem INT NOT NULL,
    probabilidade_fechamento INT NOT NULL DEFAULT 50 CHECK (probabilidade_fechamento BETWEEN 0 AND 100),
    dias_estagnacao INT NOT NULL DEFAULT 7,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 5. EMPRESAS E CONTATOS (CLIENTES / LEADS)
-- ==============================================================================

-- Empresas Clientes / Prospects
CREATE TABLE IF NOT EXISTS public.empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    cnpj TEXT,
    dominio TEXT,
    segmento TEXT,
    responsavel_id UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
    campos_personalizados JSONB NOT NULL DEFAULT '{}'::jsonb,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contatos (Pessoas vinculadas a Empresas ou Avulsas)
CREATE TABLE IF NOT EXISTS public.contatos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
    nome TEXT NOT NULL,
    email TEXT,
    telefone_whatsapp TEXT,
    cargo TEXT,
    responsavel_id UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
    campos_personalizados JSONB NOT NULL DEFAULT '{}'::jsonb,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 6. NEGÓCIOS, ITENS/PRODUTOS E ATIVIDADES
-- ==============================================================================

-- Negócios (Deals no Kanban)
CREATE TABLE IF NOT EXISTS public.negocios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    valor NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    moeda TEXT NOT NULL DEFAULT 'BRL',
    funil_id UUID NOT NULL REFERENCES public.funis(id) ON DELETE RESTRICT,
    etapa_id UUID NOT NULL REFERENCES public.etapas_funil(id) ON DELETE RESTRICT,
    contato_id UUID REFERENCES public.contatos(id) ON DELETE SET NULL,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
    responsavel_id UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'ganho', 'perdido')),
    motivo_perda TEXT,
    data_fechamento_esperada DATE,
    ultima_atividade_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    campos_personalizados JSONB NOT NULL DEFAULT '{}'::jsonb,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Produtos Vinculados ao Negócio (N:N Negócios x Produtos)
CREATE TABLE IF NOT EXISTS public.negocios_produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
    negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE RESTRICT,
    quantidade NUMERIC(10,2) NOT NULL DEFAULT 1.00 CHECK (quantidade > 0),
    valor_unitario NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    subtotal NUMERIC(15,2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Atividades e Tarefas do Negócio (Visão 360º & Alertas)
CREATE TABLE IF NOT EXISTS public.atividades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
    negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
    contato_id UUID REFERENCES public.contatos(id) ON DELETE SET NULL,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('ligacao', 'reuniao', 'whatsapp', 'email', 'nota', 'tarefa')),
    titulo TEXT NOT NULL,
    descricao TEXT,
    data_vencimento TIMESTAMPTZ,
    concluida_em TIMESTAMPTZ,
    criado_por UUID NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Histórico de Mudança de Etapas (Trilha de Auditoria & Lead Time)
CREATE TABLE IF NOT EXISTS public.historico_etapas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
    negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
    etapa_anterior_id UUID REFERENCES public.etapas_funil(id) ON DELETE SET NULL,
    etapa_nova_id UUID NOT NULL REFERENCES public.etapas_funil(id) ON DELETE RESTRICT,
    alterado_por UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
    alterado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    duracao_segundos BIGINT NOT NULL DEFAULT 0
);

-- ==============================================================================
-- 7. ÍNDICES DE PERFORMANCE E BUSCA
-- ==============================================================================

-- Índices GIN para busca flexível em campos personalizados (JSONB)
CREATE INDEX IF NOT EXISTS idx_empresas_campos_personalizados ON public.empresas USING GIN (campos_personalizados);
CREATE INDEX IF NOT EXISTS idx_contatos_campos_personalizados ON public.contatos USING GIN (campos_personalizados);
CREATE INDEX IF NOT EXISTS idx_negocios_campos_personalizados ON public.negocios USING GIN (campos_personalizados);
CREATE INDEX IF NOT EXISTS idx_produtos_campos_personalizados ON public.produtos USING GIN (campos_personalizados);

-- Índices B-tree para isolamento multi-tenant veloz
CREATE INDEX IF NOT EXISTS idx_membros_org ON public.membros_organizacao(organizacao_id, perfil_id);
CREATE INDEX IF NOT EXISTS idx_funis_org ON public.funis(organizacao_id);
CREATE INDEX IF NOT EXISTS idx_etapas_funil_funil ON public.etapas_funil(funil_id, ordem);
CREATE INDEX IF NOT EXISTS idx_empresas_org ON public.empresas(organizacao_id, responsavel_id);
CREATE INDEX IF NOT EXISTS idx_contatos_org ON public.contatos(organizacao_id, empresa_id);
CREATE INDEX IF NOT EXISTS idx_negocios_kanban ON public.negocios(organizacao_id, funil_id, etapa_id, status);
CREATE INDEX IF NOT EXISTS idx_negocios_rotting ON public.negocios(organizacao_id, status, ultima_atividade_em);
CREATE INDEX IF NOT EXISTS idx_negocios_produtos ON public.negocios_produtos(negocio_id, produto_id);
CREATE INDEX IF NOT EXISTS idx_atividades_negocio ON public.atividades(negocio_id, concluida_em, data_vencimento);
CREATE INDEX IF NOT EXISTS idx_historico_etapas_negocio ON public.historico_etapas(negocio_id, alterado_em);

-- ==============================================================================
-- 8. FUNÇÕES AUXILIARES DE RLS (SEGURANÇA MULTI-TENANT)
-- ==============================================================================

-- Função rápida para verificar se o usuário autenticado pertence à organização
CREATE OR REPLACE FUNCTION public.fn_usuario_pertence_organizacao(p_organizacao_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.membros_organizacao
        WHERE organizacao_id = p_organizacao_id
          AND perfil_id = auth.uid()
          AND ativo = true
    );
$$;

-- Função para recuperar o papel do usuário na organização
CREATE OR REPLACE FUNCTION public.fn_usuario_cargo_organizacao(p_organizacao_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT cargo
    FROM public.membros_organizacao
    WHERE organizacao_id = p_organizacao_id
      AND perfil_id = auth.uid()
      AND ativo = true
    LIMIT 1;
$$;

-- ==============================================================================
-- 9. TRIGGERS AUTOMÁTICOS EM PL/pgSQL
-- ==============================================================================

-- A. Criação automática de perfil em auth.users
CREATE OR REPLACE FUNCTION public.fn_trg_criar_perfil_usuario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.perfis (id, nome_completo, email, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE
    SET nome_completo = EXCLUDED.nome_completo,
        email = EXCLUDED.email,
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.perfis.avatar_url),
        atualizado_em = now();

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auth_users_cria_perfil ON auth.users;
CREATE TRIGGER trg_auth_users_cria_perfil
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_trg_criar_perfil_usuario();

-- B. Atualização de ultima_atividade_em do negócio
CREATE OR REPLACE FUNCTION public.fn_trg_atualizar_ultima_atividade_negocio()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.negocios
    SET ultima_atividade_em = now(),
        atualizado_em = now()
    WHERE id = NEW.negocio_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_atividades_atualiza_negocio ON public.atividades;
CREATE TRIGGER trg_atividades_atualiza_negocio
    AFTER INSERT OR UPDATE ON public.atividades
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_trg_atualizar_ultima_atividade_negocio();

-- C. Registro automático de histórico de etapas e cálculo de duração
CREATE OR REPLACE FUNCTION public.fn_trg_registrar_historico_etapa_negocio()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ultimo_momento TIMESTAMPTZ;
    v_duracao BIGINT := 0;
BEGIN
    -- Só executa quando a etapa realmente for alterada
    IF OLD.etapa_id IS DISTINCT FROM NEW.etapa_id THEN
        -- Busca o último momento em que esteve na etapa anterior
        SELECT alterado_em INTO v_ultimo_momento
        FROM public.historico_etapas
        WHERE negocio_id = NEW.id
        ORDER BY alterado_em DESC
        LIMIT 1;

        IF v_ultimo_momento IS NULL THEN
            v_ultimo_momento := OLD.criado_em;
        END IF;

        v_duracao := GREATEST(0, EXTRACT(EPOCH FROM (now() - v_ultimo_momento))::BIGINT);

        INSERT INTO public.historico_etapas (
            organizacao_id,
            negocio_id,
            etapa_anterior_id,
            etapa_nova_id,
            alterado_por,
            alterado_em,
            duracao_segundos
        ) VALUES (
            NEW.organizacao_id,
            NEW.id,
            OLD.etapa_id,
            NEW.etapa_id,
            auth.uid(),
            now(),
            v_duracao
        );

        NEW.atualizado_em := now();
        NEW.ultima_atividade_em := now();
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_negocios_historico_etapa ON public.negocios;
CREATE TRIGGER trg_negocios_historico_etapa
    BEFORE UPDATE OF etapa_id ON public.negocios
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_trg_registrar_historico_etapa_negocio();

-- D. Recálculo automático do valor do negócio baseado nos produtos vinculados
CREATE OR REPLACE FUNCTION public.fn_trg_recalcular_valor_negocio_produtos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_negocio_id UUID;
    v_total NUMERIC(15,2);
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_negocio_id := OLD.negocio_id;
    ELSE
        v_negocio_id := NEW.negocio_id;
    END IF;

    -- Soma os subtotais dos produtos vinculados
    SELECT COALESCE(SUM(subtotal), 0.00) INTO v_total
    FROM public.negocios_produtos
    WHERE negocio_id = v_negocio_id;

    -- Atualiza o valor do negócio se houver itens
    IF v_total > 0 THEN
        UPDATE public.negocios
        SET valor = v_total,
            atualizado_em = now()
        WHERE id = v_negocio_id;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_negocios_produtos_valor ON public.negocios_produtos;
CREATE TRIGGER trg_negocios_produtos_valor
    AFTER INSERT OR UPDATE OR DELETE ON public.negocios_produtos
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_trg_recalcular_valor_negocio_produtos();

-- ==============================================================================
-- 10. RPC: ONBOARDING INTERATIVO DE ORGANIZAÇÃO (OPÇÃO B)
-- ==============================================================================

-- Cria organização, associa criador como admin e gera Funil padrão com 4 etapas
CREATE OR REPLACE FUNCTION public.fn_criar_organizacao_com_funil_padrao(
    p_nome TEXT,
    p_cnpj TEXT DEFAULT NULL,
    p_segmento TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_funil_id UUID;
    v_slug TEXT;
    v_base_slug TEXT;
    v_counter INT := 0;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado.';
    END IF;

    -- Gera slug limpo
    v_base_slug := lower(regexp_replace(p_nome, '[^a-zA-Z0-9]+', '-', 'g'));
    v_base_slug := trim(both '-' from v_base_slug);
    v_slug := v_base_slug;

    -- Garante unicidade do slug
    WHILE EXISTS (SELECT 1 FROM public.organizacoes WHERE slug = v_slug) LOOP
        v_counter := v_counter + 1;
        v_slug := v_base_slug || '-' || v_counter;
    END LOOP;

    -- 1. Insere organização
    INSERT INTO public.organizacoes (nome, slug, cnpj, segmento)
    VALUES (p_nome, v_slug, p_cnpj, p_segmento)
    RETURNING id INTO v_org_id;

    -- 2. Vincula usuário como admin
    INSERT INTO public.membros_organizacao (organizacao_id, perfil_id, cargo)
    VALUES (v_org_id, auth.uid(), 'admin');

    -- 3. Cria Funil de Vendas Padrão
    INSERT INTO public.funis (organizacao_id, nome, descricao, padrao)
    VALUES (v_org_id, 'Pipeline Padrão', 'Funil padrão de vendas B2B', true)
    RETURNING id INTO v_funil_id;

    -- 4. Cria 4 Etapas Padrão do Funil
    INSERT INTO public.etapas_funil (organizacao_id, funil_id, nome, ordem, probabilidade_fechamento, dias_estagnacao)
    VALUES 
        (v_org_id, v_funil_id, 'Prospecção', 1, 10, 5),
        (v_org_id, v_funil_id, 'Qualificação', 2, 30, 7),
        (v_org_id, v_funil_id, 'Proposta Enviada', 3, 60, 5),
        (v_org_id, v_funil_id, 'Negociação', 4, 80, 4);

    -- 5. Cria Campos Personalizados de Exemplo
    INSERT INTO public.campos_definicoes (organizacao_id, entidade, nome_chave, label, tipo, opcoes_json, ordem)
    VALUES 
        (v_org_id, 'negocio', 'origem_lead', 'Origem do Lead', 'selecao', '["Outbound", "Inbound", "Indicação", "Evento"]'::jsonb, 1),
        (v_org_id, 'empresa', 'tamanho_empresa', 'Porte da Empresa', 'selecao', '["1-10", "11-50", "51-200", "200+"]'::jsonb, 1);

    RETURN jsonb_build_object(
        'sucesso', true,
        'organizacao_id', v_org_id,
        'slug', v_slug,
        'funil_id', v_funil_id
    );
END;
$$;

-- ==============================================================================
-- 11. VIEWS DE MÉTRICAS (KANBAN & DASHBOARD)
-- ==============================================================================

-- View para Cabeçalho das Colunas do Kanban:
-- Total de cards, soma dos valores, valor ponderado (forecast) e alertas
CREATE OR REPLACE VIEW public.vw_metricas_funil AS
SELECT 
    ef.id AS etapa_id,
    ef.funil_id,
    ef.organizacao_id,
    ef.nome AS etapa_nome,
    ef.ordem AS etapa_ordem,
    ef.probabilidade_fechamento,
    ef.dias_estagnacao,
    COUNT(n.id) AS total_negocios,
    COALESCE(SUM(n.valor), 0.00) AS valor_total,
    ROUND(COALESCE(SUM(n.valor * (ef.probabilidade_fechamento::numeric / 100.0)), 0.00), 2) AS valor_ponderado_forecast,
    COUNT(CASE 
        WHEN n.ultima_atividade_em < (now() - (ef.dias_estagnacao || ' days')::interval) 
        THEN 1 
    END) AS total_estagnados
FROM public.etapas_funil ef
LEFT JOIN public.negocios n 
    ON n.etapa_id = ef.id 
   AND n.status = 'aberto'
GROUP BY 
    ef.id, ef.funil_id, ef.organizacao_id, ef.nome, ef.ordem, ef.probabilidade_fechamento, ef.dias_estagnacao;

-- View para Dashboard Analítico Geral
CREATE OR REPLACE VIEW public.vw_metricas_dashboard AS
SELECT 
    n.organizacao_id,
    COUNT(n.id) FILTER (WHERE n.status = 'aberto') AS total_abertos,
    COUNT(n.id) FILTER (WHERE n.status = 'ganho') AS total_ganhos,
    COUNT(n.id) FILTER (WHERE n.status = 'perdido') AS total_perdidos,
    COALESCE(SUM(n.valor) FILTER (WHERE n.status = 'ganho'), 0.00) AS receita_ganha_total,
    COALESCE(SUM(n.valor) FILTER (WHERE n.status = 'aberto'), 0.00) AS receita_em_aberto_pipeline,
    CASE 
        WHEN COUNT(n.id) FILTER (WHERE n.status IN ('ganho', 'perdido')) > 0 
        THEN ROUND(
            (COUNT(n.id) FILTER (WHERE n.status = 'ganho')::numeric / 
             COUNT(n.id) FILTER (WHERE n.status IN ('ganho', 'perdido'))::numeric) * 100, 
            2
        )
        ELSE 0.00 
    END AS taxa_conversao_percentual
FROM public.negocios n
GROUP BY n.organizacao_id;

-- ==============================================================================
-- 12. ROW LEVEL SECURITY (RLS) - POLÍTICAS COMPLETAS
-- ==============================================================================

-- Habilita RLS em todas as tabelas públicas
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membros_organizacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campos_definicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etapas_funil ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negocios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negocios_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_etapas ENABLE ROW LEVEL SECURITY;

-- Políticas para PERFIS
CREATE POLICY "Perfis visíveis para usuários autenticados"
    ON public.perfis FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Usuário edita seu próprio perfil"
    ON public.perfis FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Políticas para ORGANIZAÇÕES
CREATE POLICY "Membros visualizam suas organizações"
    ON public.organizacoes FOR SELECT
    TO authenticated
    USING (public.fn_usuario_pertence_organizacao(id));

CREATE POLICY "Admins editam suas organizações"
    ON public.organizacoes FOR UPDATE
    TO authenticated
    USING (public.fn_usuario_cargo_organizacao(id) = 'admin')
    WITH CHECK (public.fn_usuario_cargo_organizacao(id) = 'admin');

-- Políticas para MEMBROS_ORGANIZACAO
CREATE POLICY "Membros visualizam colegas da mesma organização"
    ON public.membros_organizacao FOR SELECT
    TO authenticated
    USING (public.fn_usuario_pertence_organizacao(organizacao_id));

CREATE POLICY "Admins e gestores gerenciam membros da organização"
    ON public.membros_organizacao FOR ALL
    TO authenticated
    USING (public.fn_usuario_cargo_organizacao(organizacao_id) IN ('admin', 'gestor'))
    WITH CHECK (public.fn_usuario_cargo_organizacao(organizacao_id) IN ('admin', 'gestor'));

-- Políticas para CAMPOS_DEFINICOES
CREATE POLICY "Membros visualizam definições de campos"
    ON public.campos_definicoes FOR SELECT
    TO authenticated
    USING (public.fn_usuario_pertence_organizacao(organizacao_id));

CREATE POLICY "Admins e gestores configuram campos"
    ON public.campos_definicoes FOR ALL
    TO authenticated
    USING (public.fn_usuario_cargo_organizacao(organizacao_id) IN ('admin', 'gestor'))
    WITH CHECK (public.fn_usuario_cargo_organizacao(organizacao_id) IN ('admin', 'gestor'));

-- Políticas para PRODUTOS
CREATE POLICY "Membros visualizam catálogo de produtos"
    ON public.produtos FOR SELECT
    TO authenticated
    USING (public.fn_usuario_pertence_organizacao(organizacao_id));

CREATE POLICY "Admins e gestores gerenciam produtos"
    ON public.produtos FOR ALL
    TO authenticated
    USING (public.fn_usuario_cargo_organizacao(organizacao_id) IN ('admin', 'gestor'))
    WITH CHECK (public.fn_usuario_cargo_organizacao(organizacao_id) IN ('admin', 'gestor'));

-- Políticas para FUNIS e ETAPAS
CREATE POLICY "Membros visualizam funis da organização"
    ON public.funis FOR SELECT
    TO authenticated
    USING (public.fn_usuario_pertence_organizacao(organizacao_id));

CREATE POLICY "Admins e gestores gerenciam funis"
    ON public.funis FOR ALL
    TO authenticated
    USING (public.fn_usuario_cargo_organizacao(organizacao_id) IN ('admin', 'gestor'))
    WITH CHECK (public.fn_usuario_cargo_organizacao(organizacao_id) IN ('admin', 'gestor'));

CREATE POLICY "Membros visualizam etapas do funil"
    ON public.etapas_funil FOR SELECT
    TO authenticated
    USING (public.fn_usuario_pertence_organizacao(organizacao_id));

CREATE POLICY "Admins e gestores gerenciam etapas do funil"
    ON public.etapas_funil FOR ALL
    TO authenticated
    USING (public.fn_usuario_cargo_organizacao(organizacao_id) IN ('admin', 'gestor'))
    WITH CHECK (public.fn_usuario_cargo_organizacao(organizacao_id) IN ('admin', 'gestor'));

-- Políticas para EMPRESAS
CREATE POLICY "Membros visualizam empresas da organização"
    ON public.empresas FOR SELECT
    TO authenticated
    USING (public.fn_usuario_pertence_organizacao(organizacao_id));

CREATE POLICY "Membros criam empresas na sua organização"
    ON public.empresas FOR INSERT
    TO authenticated
    WITH CHECK (public.fn_usuario_pertence_organizacao(organizacao_id));

CREATE POLICY "Edição de empresas (Gestores/Admins tudo, Vendedores as suas)"
    ON public.empresas FOR UPDATE
    TO authenticated
    USING (
        public.fn_usuario_cargo_organizacao(organizacao_id) IN ('admin', 'gestor')
        OR responsavel_id = auth.uid()
    )
    WITH CHECK (
        public.fn_usuario_cargo_organizacao(organizacao_id) IN ('admin', 'gestor')
        OR responsavel_id = auth.uid()
    );

CREATE POLICY "Admins e gestores excluem empresas"
    ON public.empresas FOR DELETE
    TO authenticated
    USING (public.fn_usuario_cargo_organizacao(organizacao_id) IN ('admin', 'gestor'));

-- Políticas para CONTATOS
CREATE POLICY "Membros visualizam contatos da organização"
    ON public.contatos FOR SELECT
    TO authenticated
    USING (public.fn_usuario_pertence_organizacao(organizacao_id));

CREATE POLICY "Membros inserem contatos na organização"
    ON public.contatos FOR INSERT
    TO authenticated
    WITH CHECK (public.fn_usuario_pertence_organizacao(organizacao_id));

CREATE POLICY "Edição de contatos"
    ON public.contatos FOR UPDATE
    TO authenticated
    USING (
        public.fn_usuario_cargo_organizacao(organizacao_id) IN ('admin', 'gestor')
        OR responsavel_id = auth.uid()
    )
    WITH CHECK (
        public.fn_usuario_cargo_organizacao(organizacao_id) IN ('admin', 'gestor')
        OR responsavel_id = auth.uid()
    );

CREATE POLICY "Admins e gestores excluem contatos"
    ON public.contatos FOR DELETE
    TO authenticated
    USING (public.fn_usuario_cargo_organizacao(organizacao_id) IN ('admin', 'gestor'));

-- Políticas para NEGÓCIOS
CREATE POLICY "Membros visualizam negócios da organização"
    ON public.negocios FOR SELECT
    TO authenticated
    USING (public.fn_usuario_pertence_organizacao(organizacao_id));

CREATE POLICY "Membros criam negócios na organização"
    ON public.negocios FOR INSERT
    TO authenticated
    WITH CHECK (public.fn_usuario_pertence_organizacao(organizacao_id));

CREATE POLICY "Edição de negócios (Gestores/Admins tudo, Vendedores os seus)"
    ON public.negocios FOR UPDATE
    TO authenticated
    USING (
        public.fn_usuario_cargo_organizacao(organizacao_id) IN ('admin', 'gestor')
        OR responsavel_id = auth.uid()
    )
    WITH CHECK (
        public.fn_usuario_cargo_organizacao(organizacao_id) IN ('admin', 'gestor')
        OR responsavel_id = auth.uid()
    );

CREATE POLICY "Admins e gestores excluem negócios"
    ON public.negocios FOR DELETE
    TO authenticated
    USING (public.fn_usuario_cargo_organizacao(organizacao_id) IN ('admin', 'gestor'));

-- Políticas para NEGOCIOS_PRODUTOS
CREATE POLICY "Membros visualizam produtos do negócio"
    ON public.negocios_produtos FOR SELECT
    TO authenticated
    USING (public.fn_usuario_pertence_organizacao(organizacao_id));

CREATE POLICY "Membros vinculam produtos ao negócio"
    ON public.negocios_produtos FOR INSERT
    TO authenticated
    WITH CHECK (public.fn_usuario_pertence_organizacao(organizacao_id));

CREATE POLICY "Edição e remoção de produtos do negócio"
    ON public.negocios_produtos FOR ALL
    TO authenticated
    USING (
        public.fn_usuario_cargo_organizacao(organizacao_id) IN ('admin', 'gestor')
        OR EXISTS (
            SELECT 1 FROM public.negocios n 
            WHERE n.id = negocios_produtos.negocio_id 
              AND n.responsavel_id = auth.uid()
        )
    );

-- Políticas para ATIVIDADES
CREATE POLICY "Membros visualizam atividades da organização"
    ON public.atividades FOR SELECT
    TO authenticated
    USING (public.fn_usuario_pertence_organizacao(organizacao_id));

CREATE POLICY "Membros criam atividades na organização"
    ON public.atividades FOR INSERT
    TO authenticated
    WITH CHECK (public.fn_usuario_pertence_organizacao(organizacao_id));

CREATE POLICY "Edição de atividades (Autor, Responsável pelo negócio ou Gestor)"
    ON public.atividades FOR UPDATE
    TO authenticated
    USING (
        public.fn_usuario_cargo_organizacao(organizacao_id) IN ('admin', 'gestor')
        OR criado_por = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.negocios n 
            WHERE n.id = atividades.negocio_id 
              AND n.responsavel_id = auth.uid()
        )
    );

CREATE POLICY "Exclusão de atividades"
    ON public.atividades FOR DELETE
    TO authenticated
    USING (
        public.fn_usuario_cargo_organizacao(organizacao_id) IN ('admin', 'gestor')
        OR criado_por = auth.uid()
    );

-- Políticas para HISTORICO_ETAPAS (Somente leitura para membros)
CREATE POLICY "Membros visualizam histórico de etapas"
    ON public.historico_etapas FOR SELECT
    TO authenticated
    USING (public.fn_usuario_pertence_organizacao(organizacao_id));

-- ==============================================================================
-- 13. REALTIME REPLICATION CONFIGURATION
-- ==============================================================================
-- Adiciona tabelas na publicação padrão do Supabase Realtime para subscrição WebSocket
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'negocios'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.negocios;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'atividades'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.atividades;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'historico_etapas'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.historico_etapas;
    END IF;
END $$;
