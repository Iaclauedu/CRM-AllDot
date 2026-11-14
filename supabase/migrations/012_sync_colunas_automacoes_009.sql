-- ==============================================================================
-- MIGRAÇÃO 012: SINCRONIZAR COLUNAS FALTANTES EM TEMPLATES, AUTOMAÇÕES E LOGS
-- ==============================================================================

ALTER TABLE public.templates_email
    ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'Comercial',
    ADD COLUMN IF NOT EXISTS imagens_corpo_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS anexos_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.automacoes_email
    ADD COLUMN IF NOT EXISTS descricao TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS funil_id UUID REFERENCES public.funis(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS etapa_origem_id UUID REFERENCES public.etapas_funil(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS etapa_destino_id UUID REFERENCES public.etapas_funil(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS dias_inatividade INTEGER DEFAULT 3,
    ADD COLUMN IF NOT EXISTS horas_atraso_envio INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.templates_email(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS assunto_sobrescrito TEXT,
    ADD COLUMN IF NOT EXISTS destinatario_tipo TEXT NOT NULL DEFAULT 'contato_principal',
    ADD COLUMN IF NOT EXISTS copia_cc TEXT,
    ADD COLUMN IF NOT EXISTS apenas_horario_comercial BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS total_disparos INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ultimo_disparo_em TIMESTAMPTZ;

ALTER TABLE public.logs_envio_email
    ADD COLUMN IF NOT EXISTS automacao_nome TEXT,
    ADD COLUMN IF NOT EXISTS template_nome TEXT,
    ADD COLUMN IF NOT EXISTS negocio_titulo TEXT,
    ADD COLUMN IF NOT EXISTS destinatario_nome TEXT,
    ADD COLUMN IF NOT EXISTS gatilho TEXT,
    ADD COLUMN IF NOT EXISTS qtd_anexos INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS detalhes TEXT,
    ADD COLUMN IF NOT EXISTS mensagem_erro TEXT;
