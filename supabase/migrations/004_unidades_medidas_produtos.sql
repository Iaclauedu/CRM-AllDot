-- ==============================================================================
-- MIGRAÇÃO 004: TABELA DE UNIDADES DE MEDIDA E VÍNCULO EM PRODUTOS
-- ==============================================================================

-- 1. Cria a tabela de domínio de Unidades de Medida
CREATE TABLE IF NOT EXISTS public.unidades_medidas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    sigla TEXT NOT NULL,
    ordem INTEGER NOT NULL DEFAULT 1,
    ativo BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Insere as opções padrão solicitadas
INSERT INTO public.unidades_medidas (id, nome, sigla, ordem, ativo)
VALUES
    ('11111111-0001-4000-a000-000000000001', 'Unidade', 'UN', 1, true),
    ('11111111-0002-4000-a000-000000000002', 'Cento', 'CT', 2, true),
    ('11111111-0003-4000-a000-000000000003', 'Milheiro', 'MIL', 3, true),
    ('11111111-0004-4000-a000-000000000004', 'Metro Quadrado', 'M²', 4, true),
    ('11111111-0005-4000-a000-000000000005', 'Rolo', 'RL', 5, true)
ON CONFLICT (nome) DO UPDATE
SET sigla = EXCLUDED.sigla,
    ordem = EXCLUDED.ordem,
    ativo = EXCLUDED.ativo;

-- 3. Adiciona o campo unidades_medidas na tabela produtos vinculado à tabela unidades_medidas
ALTER TABLE public.produtos
ADD COLUMN IF NOT EXISTS unidades_medidas UUID REFERENCES public.unidades_medidas(id) ON DELETE SET NULL DEFAULT '11111111-0001-4000-a000-000000000001';

-- 4. Vincula os produtos já existentes à opção padrão 'Unidade' e remove chaves antigas de campos_personalizados
UPDATE public.produtos
SET unidades_medidas = COALESCE(unidades_medidas, '11111111-0001-4000-a000-000000000001'),
    campos_personalizados = (COALESCE(campos_personalizados, '{}'::jsonb) - 'unidade_medida' - '_unidade_medida');

-- 5. Índice para performance no relacionamento (Foreign Key)
CREATE INDEX IF NOT EXISTS idx_produtos_unidades_medidas ON public.produtos (unidades_medidas);

-- 6. Habilita RLS e Políticas de leitura/escrita para authenticated e anon
ALTER TABLE public.unidades_medidas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura de unidades_medidas para todos" ON public.unidades_medidas;
CREATE POLICY "Permitir leitura de unidades_medidas para todos"
    ON public.unidades_medidas
    FOR SELECT
    TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Permitir gestao de unidades_medidas em dev" ON public.unidades_medidas;
CREATE POLICY "Permitir gestao de unidades_medidas em dev"
    ON public.unidades_medidas
    FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);

