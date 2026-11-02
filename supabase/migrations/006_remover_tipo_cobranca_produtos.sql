-- ============================================================
-- Migration 006: Remove a coluna tipo_cobranca da tabela produtos
-- ============================================================

ALTER TABLE public.produtos
    DROP COLUMN IF EXISTS tipo_cobranca;

