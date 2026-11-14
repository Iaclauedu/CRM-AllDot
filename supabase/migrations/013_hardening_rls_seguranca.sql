-- ==============================================================================
-- MIGRAÇÃO 013: HARDENING DE SEGURANÇA RLS PARA PRODUÇÃO
-- ATENÇÃO: Execute este script SOMENTE quando todos os usuários estiverem
-- acessando o CRM autenticados via Supabase Auth (/login), pois ele remove
-- o acesso anônimo ('anon') das tabelas internas e protege a senha SMTP.
-- ==============================================================================

-- 1. Remover políticas anônimas das tabelas de E-mail, Automação e Marketing
DROP POLICY IF EXISTS "Anon acesso configuracoes_servidor_email" ON public.configuracoes_servidor_email;
DROP POLICY IF EXISTS "Anon acesso templates_email" ON public.templates_email;
DROP POLICY IF EXISTS "Anon acesso automacoes_email" ON public.automacoes_email;
DROP POLICY IF EXISTS "Anon acesso logs_envio_email" ON public.logs_envio_email;
DROP POLICY IF EXISTS "Anon acesso automacoes_fila_programada" ON public.automacoes_fila_programada;
DROP POLICY IF EXISTS "Anon acesso listas_marketing" ON public.listas_marketing;
DROP POLICY IF EXISTS "Anon acesso listas_marketing_contatos" ON public.listas_marketing_contatos;
DROP POLICY IF EXISTS "Anon acesso campanhas_marketing" ON public.campanhas_marketing;
DROP POLICY IF EXISTS "Anon acesso campanhas_envios" ON public.campanhas_envios;
DROP POLICY IF EXISTS "Anon acesso campanhas_cliques" ON public.campanhas_cliques;

-- 2. Garantir que configuracoes_servidor_email (contém senha_smtp) não seja lida por anon
-- Apenas usuários autenticados da organização (ou service_role no backend) acessam.
DROP POLICY IF EXISTS "Auth acesso configuracoes_servidor_email" ON public.configuracoes_servidor_email;
CREATE POLICY "Auth acesso configuracoes_servidor_email"
  ON public.configuracoes_servidor_email
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
