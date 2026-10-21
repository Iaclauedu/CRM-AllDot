-- ==============================================================================
-- MIGRAÇÃO 003: MELHORIAS ESTRUTURAIS EM FUNIS E ETAPAS
-- ==============================================================================

-- 1. Cria a função genérica para atualizar o timestamp caso não exista
CREATE OR REPLACE FUNCTION public.fn_atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Suporte a cores customizadas por fase e timestamp de atualização
ALTER TABLE public.etapas_funil 
ADD COLUMN IF NOT EXISTS cor TEXT DEFAULT '#64748b';

ALTER TABLE public.etapas_funil 
ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ DEFAULT now();

-- 3. Índices de performance para filtragem ágil por funil e ordenação das colunas
CREATE INDEX IF NOT EXISTS idx_etapas_funil_funil_id ON public.etapas_funil (funil_id);
CREATE INDEX IF NOT EXISTS idx_etapas_funil_funil_ordem ON public.etapas_funil (funil_id, ordem);
CREATE INDEX IF NOT EXISTS idx_negocios_funil_etapa ON public.negocios (funil_id, etapa_id);

-- 4. Trigger para manter atualizado_em sincronizado em etapas_funil
DROP TRIGGER IF EXISTS trg_etapas_funil_atualizado_em ON public.etapas_funil;
CREATE TRIGGER trg_etapas_funil_atualizado_em
    BEFORE UPDATE ON public.etapas_funil
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_atualizar_timestamp();
