-- ==============================================================================
-- MIGRAÇÃO 010: CONTROLES OBRIGATÓRIOS DE AUTOMAÇÃO DE E-MAILS & FILA PROGRAMADA
-- ==============================================================================

-- 1. Controles de segurança, duplicidade, interrupção e pausa nas regras
ALTER TABLE public.automacoes_email
    ADD COLUMN IF NOT EXISTS permitir_redisparo_retorno_etapa BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS interromper_se_ganho_perdido TEXT NOT NULL DEFAULT 'ambos' CHECK (
        interromper_se_ganho_perdido IN ('ambos', 'apenas_ganho', 'apenas_perdido', 'nunca')
    ),
    ADD COLUMN IF NOT EXISTS exigir_consentimento BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS respeitar_descadastramento BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS pausado_por TEXT,
    ADD COLUMN IF NOT EXISTS pausado_em TIMESTAMPTZ;

-- 2. Consentimento e descadastramento (opt-out) em Contatos
ALTER TABLE public.contatos
    ADD COLUMN IF NOT EXISTS consentimento_email BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS descadastrado_email BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS descadastrado_em TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS motivo_descadastramento TEXT;

-- 3. Pausa manual por negócio e flags de consentimento/opt-out no card
ALTER TABLE public.negocios
    ADD COLUMN IF NOT EXISTS automacoes_pausadas BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS automacoes_pausadas_por TEXT,
    ADD COLUMN IF NOT EXISTS automacoes_pausadas_em TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS consentimento_email BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS descadastrado_email BOOLEAN NOT NULL DEFAULT false;

-- 4. Expandir logs_envio_email para registrar etapa e motivos de bloqueio/interrupção
ALTER TABLE public.logs_envio_email
    ADD COLUMN IF NOT EXISTS etapa_id UUID REFERENCES public.etapas_funil(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS etapa_nome TEXT,
    ADD COLUMN IF NOT EXISTS motivo_bloqueio TEXT;

ALTER TABLE public.logs_envio_email DROP CONSTRAINT IF EXISTS logs_envio_email_status_check;
ALTER TABLE public.logs_envio_email
    ADD CONSTRAINT logs_envio_email_status_check CHECK (
        status IN (
            'enviado',
            'simulado',
            'erro',
            'bloqueado_duplicidade',
            'bloqueado_optout',
            'interrompido_status',
            'pausado'
        )
    );

-- 5. Tabela de Próximas Automações Programadas (Fila visível ao vendedor)
CREATE TABLE IF NOT EXISTS public.automacoes_fila_programada (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
    automacao_id UUID REFERENCES public.automacoes_email(id) ON DELETE CASCADE,
    automacao_nome TEXT NOT NULL,
    template_id UUID REFERENCES public.templates_email(id) ON DELETE SET NULL,
    template_nome TEXT NOT NULL,
    negocio_id UUID REFERENCES public.negocios(id) ON DELETE CASCADE,
    negocio_titulo TEXT,
    etapa_id UUID REFERENCES public.etapas_funil(id) ON DELETE SET NULL,
    etapa_nome TEXT,
    destinatario_email TEXT NOT NULL,
    destinatario_nome TEXT,
    gatilho TEXT NOT NULL,
    agendado_para TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'agendada' CHECK (
        status IN ('agendada', 'pausada', 'executada', 'cancelada', 'bloqueada')
    ),
    motivo_cancelamento TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fila_programada_negocio ON public.automacoes_fila_programada (negocio_id, status);
CREATE INDEX IF NOT EXISTS idx_fila_programada_agendado ON public.automacoes_fila_programada (agendado_para, status);

ALTER TABLE public.automacoes_fila_programada ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon acesso automacoes_fila_programada" ON public.automacoes_fila_programada;
CREATE POLICY "Anon acesso automacoes_fila_programada" ON public.automacoes_fila_programada FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Auth acesso automacoes_fila_programada" ON public.automacoes_fila_programada;
CREATE POLICY "Auth acesso automacoes_fila_programada" ON public.automacoes_fila_programada FOR ALL TO authenticated USING (true) WITH CHECK (true);
