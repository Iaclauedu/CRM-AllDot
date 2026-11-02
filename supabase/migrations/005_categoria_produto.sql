-- ==============================================================================
-- MIGRAÇÃO 005: TABELA CATEGORIA_PRODUTO E VÍNCULO EM PRODUTOS
-- ==============================================================================

-- 1. Cria a tabela de domínio Categoria_Produto
CREATE TABLE IF NOT EXISTS public.categoria_produto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    ordem INTEGER NOT NULL DEFAULT 1,
    ativo BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Insere as categorias solicitadas
INSERT INTO public.categoria_produto (id, nome, ordem, ativo)
VALUES
    ('22222222-0001-4000-a000-000000000001', 'Crachás', 1, true),
    ('22222222-0002-4000-a000-000000000002', 'Cordões', 2, true),
    ('22222222-0003-4000-a000-000000000003', 'Insumos de Impressora', 3, true),
    ('22222222-0004-4000-a000-000000000004', 'Papelaria', 4, true),
    ('22222222-0005-4000-a000-000000000005', 'Comunicação Visual', 5, true)
ON CONFLICT (nome) DO UPDATE
SET ordem = EXCLUDED.ordem,
    ativo = EXCLUDED.ativo;

-- 3. Adiciona o campo categoria_produto na tabela produtos vinculado à tabela categoria_produto
ALTER TABLE public.produtos
ADD COLUMN IF NOT EXISTS categoria_produto UUID REFERENCES public.categoria_produto(id) ON DELETE SET NULL DEFAULT '22222222-0001-4000-a000-000000000001';

-- 4. Vincula os produtos já existentes à categoria padrão caso estejam nulos
UPDATE public.produtos
SET categoria_produto = COALESCE(categoria_produto, '22222222-0001-4000-a000-000000000001');

-- 5. Índice para performance no relacionamento (Foreign Key)
CREATE INDEX IF NOT EXISTS idx_produtos_categoria_produto ON public.produtos (categoria_produto);

-- 6. Habilita RLS e Políticas de leitura/escrita para authenticated e anon
ALTER TABLE public.categoria_produto ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura de categoria_produto para todos" ON public.categoria_produto;
CREATE POLICY "Permitir leitura de categoria_produto para todos"
    ON public.categoria_produto
    FOR SELECT
    TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Permitir gestao de categoria_produto em dev" ON public.categoria_produto;
CREATE POLICY "Permitir gestao de categoria_produto em dev"
    ON public.categoria_produto
    FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);

