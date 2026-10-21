-- ==============================================================================
-- MIGRAÇÃO 002: POLÍTICAS DE ACESSO HÍBRIDO / DESENVOLVIMENTO (ANON)
-- Permite leitura e escrita para o cliente anônimo em ambiente de desenvolvimento
-- ==============================================================================

-- 1. Organizações e Membros
DROP POLICY IF EXISTS "Anon acesso organizacoes" ON public.organizacoes;
CREATE POLICY "Anon acesso organizacoes" ON public.organizacoes FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon acesso membros" ON public.membros_organizacao;
CREATE POLICY "Anon acesso membros" ON public.membros_organizacao FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon acesso perfis" ON public.perfis;
CREATE POLICY "Anon acesso perfis" ON public.perfis FOR ALL TO anon USING (true) WITH CHECK (true);

-- 2. Pipeline, Funis e Etapas
DROP POLICY IF EXISTS "Anon acesso funis" ON public.funis;
CREATE POLICY "Anon acesso funis" ON public.funis FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon acesso etapas" ON public.etapas_funil;
CREATE POLICY "Anon acesso etapas" ON public.etapas_funil FOR ALL TO anon USING (true) WITH CHECK (true);

-- 3. Catálogo de Produtos
DROP POLICY IF EXISTS "Anon acesso produtos" ON public.produtos;
CREATE POLICY "Anon acesso produtos" ON public.produtos FOR ALL TO anon USING (true) WITH CHECK (true);

-- 4. Empresas e Contatos
DROP POLICY IF EXISTS "Anon acesso empresas" ON public.empresas;
CREATE POLICY "Anon acesso empresas" ON public.empresas FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon acesso contatos" ON public.contatos;
CREATE POLICY "Anon acesso contatos" ON public.contatos FOR ALL TO anon USING (true) WITH CHECK (true);

-- 5. Negócios, Itens e Atividades
DROP POLICY IF EXISTS "Anon acesso negocios" ON public.negocios;
CREATE POLICY "Anon acesso negocios" ON public.negocios FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon acesso negocios_produtos" ON public.negocios_produtos;
CREATE POLICY "Anon acesso negocios_produtos" ON public.negocios_produtos FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon acesso atividades" ON public.atividades;
CREATE POLICY "Anon acesso atividades" ON public.atividades FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon acesso historico_etapas" ON public.historico_etapas;
CREATE POLICY "Anon acesso historico_etapas" ON public.historico_etapas FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon acesso campos_definicoes" ON public.campos_definicoes;
CREATE POLICY "Anon acesso campos_definicoes" ON public.campos_definicoes FOR ALL TO anon USING (true) WITH CHECK (true);
