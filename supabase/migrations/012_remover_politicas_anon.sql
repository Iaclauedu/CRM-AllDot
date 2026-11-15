-- ==============================================================================
-- MIGRAÇÃO 012: REMOÇÃO DE POLÍTICAS ANON PERMISSIVAS (PRODUÇÃO SEGURA)
-- Remove acessos públicos via anon key; rotas de webhook/tracking operam
-- exclusivamente no servidor usando SUPABASE_SERVICE_ROLE_KEY.
-- ==============================================================================

-- 1. Core CRM (Migração 002)
DROP POLICY IF EXISTS "Anon acesso organizacoes" ON public.organizacoes;
DROP POLICY IF EXISTS "Anon acesso membros" ON public.membros_organizacao;
DROP POLICY IF EXISTS "Anon acesso perfis" ON public.perfis;
DROP POLICY IF EXISTS "Anon acesso funis" ON public.funis;
DROP POLICY IF EXISTS "Anon acesso etapas" ON public.etapas_funil;
DROP POLICY IF EXISTS "Anon acesso produtos" ON public.produtos;
DROP POLICY IF EXISTS "Anon acesso empresas" ON public.empresas;
DROP POLICY IF EXISTS "Anon acesso contatos" ON public.contatos;
DROP POLICY IF EXISTS "Anon acesso negocios" ON public.negocios;
DROP POLICY IF EXISTS "Anon acesso negocios_produtos" ON public.negocios_produtos;
DROP POLICY IF EXISTS "Anon acesso atividades" ON public.atividades;
DROP POLICY IF EXISTS "Anon acesso historico_etapas" ON public.historico_etapas;
DROP POLICY IF EXISTS "Anon acesso campos_definicoes" ON public.campos_definicoes;

-- 2. Automações e E-mail (Migrações 009 e 010)
DROP POLICY IF EXISTS "Anon acesso configuracoes_servidor_email" ON public.configuracoes_servidor_email;
DROP POLICY IF EXISTS "Anon acesso templates_email" ON public.templates_email;
DROP POLICY IF EXISTS "Anon acesso automacoes_email" ON public.automacoes_email;
DROP POLICY IF EXISTS "Anon acesso logs_envio_email" ON public.logs_envio_email;
DROP POLICY IF EXISTS "Anon acesso automacoes_fila_programada" ON public.automacoes_fila_programada;

-- 3. Campanhas de E-mail Marketing (Migração 011)
DROP POLICY IF EXISTS "Anon acesso listas_marketing" ON public.listas_marketing;
DROP POLICY IF EXISTS "Anon acesso listas_marketing_contatos" ON public.listas_marketing_contatos;
DROP POLICY IF EXISTS "Anon acesso campanhas_marketing" ON public.campanhas_marketing;
DROP POLICY IF EXISTS "Anon acesso campanhas_envios" ON public.campanhas_envios;
DROP POLICY IF EXISTS "Anon acesso campanhas_cliques" ON public.campanhas_cliques;
