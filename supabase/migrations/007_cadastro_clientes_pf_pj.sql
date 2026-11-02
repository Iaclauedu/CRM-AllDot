-- ==============================================================================
-- Migration 007: Cadastro de Clientes (Pessoa Física / Pessoa Jurídica) em Empresas
-- ==============================================================================

-- 1. Adiciona os novos campos na tabela public.empresas
ALTER TABLE public.empresas
    ADD COLUMN IF NOT EXISTS tipo_cliente TEXT NOT NULL DEFAULT 'PJ' CHECK (tipo_cliente IN ('PF', 'PJ')),
    ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT,
    ADD COLUMN IF NOT EXISTS razao_social TEXT,
    ADD COLUMN IF NOT EXISTS nome_fantasia TEXT,
    ADD COLUMN IF NOT EXISTS endereco TEXT,
    ADD COLUMN IF NOT EXISTS contato_principal TEXT,
    ADD COLUMN IF NOT EXISTS whatsapp_principal TEXT,
    ADD COLUMN IF NOT EXISTS email_principal TEXT,
    ADD COLUMN IF NOT EXISTS origem_lead TEXT;

-- 2. Sincroniza dados já existentes nas colunas novas
UPDATE public.empresas
SET
    cpf_cnpj = regexp_replace(COALESCE(cpf_cnpj, cnpj, ''), '\D', '', 'g'),
    razao_social = COALESCE(razao_social, nome)
WHERE cpf_cnpj IS NULL OR razao_social IS NULL;

-- 3. Cria índice único (Chave Única) por organização para CPF/CNPJ numérico não vazio
CREATE UNIQUE INDEX IF NOT EXISTS uq_empresas_org_cpf_cnpj
    ON public.empresas (organizacao_id, (regexp_replace(COALESCE(cpf_cnpj, cnpj, ''), '\D', '', 'g')))
    WHERE regexp_replace(COALESCE(cpf_cnpj, cnpj, ''), '\D', '', 'g') <> '';

CREATE INDEX IF NOT EXISTS idx_empresas_origem_lead ON public.empresas(origem_lead);
CREATE INDEX IF NOT EXISTS idx_empresas_tipo_cliente ON public.empresas(tipo_cliente);

