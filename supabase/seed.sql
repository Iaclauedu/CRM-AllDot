-- ==============================================================================
-- SEED DEMO: CRM B2B MODERNO (DADOS DE TESTE REALISTAS)
-- Organização: "Acme Cloud Tech" (SaaS B2B)
-- Perfis: Carlos Admin, Mariana Gestora, Lucas Vendedor
-- Catálogo de Produtos: Licenças Mensais (MRR) + Setup e Consultoria (À Vista)
-- Negócios em múltiplas etapas, atividades (atrasadas, hoje, futuras) e rotting > 7 dias
-- ==============================================================================

-- 1. Criação de IDs Determinísticos para o Seed
DO $$
DECLARE
    -- IDs de Usuários / Perfis
    v_user_admin_id UUID := '11111111-1111-4111-a111-111111111111'::uuid;
    v_user_gestor_id UUID := '22222222-2222-4222-a222-222222222222'::uuid;
    v_user_vendedor_id UUID := '33333333-3333-4333-a333-333333333333'::uuid;

    -- Organização Demo
    v_org_id UUID := 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::uuid;

    -- Funil e Etapas
    v_funil_id UUID := 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'::uuid;
    v_etapa_prospeccao UUID := 'e1111111-1111-4111-b111-111111111111'::uuid;
    v_etapa_qualificacao UUID := 'e2222222-2222-4222-b222-222222222222'::uuid;
    v_etapa_proposta UUID := 'e3333333-3333-4333-b333-333333333333'::uuid;
    v_etapa_negociacao UUID := 'e4444444-4444-4444-b444-444444444444'::uuid;

    -- Produtos (UUIDs 100% hexadecimais: 0-9, a-f)
    v_prod_plano_pro UUID := 'a1111111-1111-4111-c111-111111111111'::uuid;
    v_prod_plano_ent UUID := 'a2222222-2222-4222-c222-222222222222'::uuid;
    v_prod_onboarding UUID := 'a3333333-3333-4333-c333-333333333333'::uuid;
    v_prod_consultoria UUID := 'a4444444-4444-4444-c444-444444444444'::uuid;

    -- Empresas
    v_emp_fintech UUID := 'c1111111-1111-4111-d111-111111111111'::uuid;
    v_emp_varejo UUID := 'c2222222-2222-4222-d222-222222222222'::uuid;
    v_emp_logistica UUID := 'c3333333-3333-4333-d333-333333333333'::uuid;
    v_emp_saude UUID := 'c4444444-4444-4444-d444-444444444444'::uuid;

    -- Contatos (UUIDs 100% hexadecimais: 0-9, a-f)
    v_cont_rodrigo UUID := 'd1111111-1111-4111-e111-111111111111'::uuid;
    v_cont_beatriz UUID := 'd2222222-2222-4222-e222-222222222222'::uuid;
    v_cont_felipe UUID := 'd3333333-3333-4333-e333-333333333333'::uuid;
    v_cont_camila UUID := 'd4444444-4444-4444-e444-444444444444'::uuid;

    -- Negócios (UUIDs 100% hexadecimais: 0-9, a-f)
    v_neg_1 UUID := 'f1111111-1111-4111-f111-111111111111'::uuid;
    v_neg_2 UUID := 'f2222222-2222-4222-f222-222222222222'::uuid;
    v_neg_3 UUID := 'f3333333-3333-4333-f333-333333333333'::uuid;
    v_neg_4 UUID := 'f4444444-4444-4444-f444-444444444444'::uuid;
    v_neg_5 UUID := 'f5555555-5555-4555-f555-555555555555'::uuid;
BEGIN
    -- 2. USUÁRIOS DE AUTENTICAÇÃO (auth.users)
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES
        (v_user_admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'carlos.admin@acme.com', crypt('senha123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nome_completo":"Carlos Silva (Admin)"}', now(), now()),
        (v_user_gestor_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mariana.gestora@acme.com', crypt('senha123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nome_completo":"Mariana Souza (Gestora)"}', now(), now()),
        (v_user_vendedor_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'lucas.vendedor@acme.com', crypt('senha123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nome_completo":"Lucas Vendas (Closer)"}', now(), now())
    ON CONFLICT (id) DO NOTHING;

    -- 3. ORGANIZAÇÃO DEMO
    INSERT INTO public.organizacoes (id, nome, slug, cnpj, segmento, plano, ativa)
    VALUES (
        v_org_id,
        'Acme Cloud Tech',
        'acme-cloud-tech',
        '12.345.678/0001-90',
        'Software B2B & Cloud',
        'enterprise',
        true
    ) ON CONFLICT (id) DO NOTHING;

    -- 4. PERFIS DE USUÁRIOS
    INSERT INTO public.perfis (id, nome_completo, email, avatar_url, telefone)
    VALUES
        (v_user_admin_id, 'Carlos Silva (Admin)', 'carlos.admin@acme.com', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', '+5511999990001'),
        (v_user_gestor_id, 'Mariana Souza (Gestora)', 'mariana.gestora@acme.com', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', '+5511999990002'),
        (v_user_vendedor_id, 'Lucas Vendas (Closer)', 'lucas.vendedor@acme.com', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', '+5511999990003')
    ON CONFLICT (id) DO UPDATE SET 
        nome_completo = EXCLUDED.nome_completo,
        avatar_url = EXCLUDED.avatar_url,
        telefone = EXCLUDED.telefone;

    -- 4. MEMBROS DA ORGANIZAÇÃO
    INSERT INTO public.membros_organizacao (organizacao_id, perfil_id, cargo, ativo)
    VALUES
        (v_org_id, v_user_admin_id, 'admin', true),
        (v_org_id, v_user_gestor_id, 'gestor', true),
        (v_org_id, v_user_vendedor_id, 'vendedor', true)
    ON CONFLICT (organizacao_id, perfil_id) DO NOTHING;

    -- 5. CAMPOS PERSONALIZADOS
    INSERT INTO public.campos_definicoes (organizacao_id, entidade, nome_chave, label, tipo, opcoes_json, obrigatorio, ordem)
    VALUES
        (v_org_id, 'negocio', 'origem_lead', 'Origem do Lead', 'selecao', '["Outbound SDR", "Inbound Ads", "Indicação", "LinkedIn Direct"]'::jsonb, true, 1),
        (v_org_id, 'negocio', 'motivo_fechamento', 'Diferencial Competitivo', 'texto', '[]'::jsonb, false, 2),
        (v_org_id, 'empresa', 'tamanho_empresa', 'Porte da Empresa', 'selecao', '["1-20 funcionários", "21-100 funcionários", "101-500 funcionários", "500+ funcionários"]'::jsonb, false, 1),
        (v_org_id, 'contato', 'linkedin_url', 'LinkedIn do Contato', 'texto', '[]'::jsonb, false, 1)
    ON CONFLICT (organizacao_id, entidade, nome_chave) DO NOTHING;

    -- 6. CATÁLOGO DE PRODUTOS
    INSERT INTO public.produtos (id, organizacao_id, nome, descricao, codigo_sku, valor, tipo_cobranca, ativo)
    VALUES
        (v_prod_plano_pro, v_org_id, 'Plano Professional (MRR)', 'Assinatura mensal para até 15 usuários com integrações premium', 'SKU-PRO-01', 1490.00, 'mensal', true),
        (v_prod_plano_ent, v_org_id, 'Plano Enterprise (MRR)', 'Assinatura mensal para usuários ilimitados, SLA dedicado e SSO', 'SKU-ENT-01', 4900.00, 'mensal', true),
        (v_prod_onboarding, v_org_id, 'Setup & Onboarding VIP', 'Implantação técnica, migração de dados e treinamento da equipe comercial', 'SKU-SETUP-01', 3500.00, 'a_vista', true),
        (v_prod_consultoria, v_org_id, 'Consultoria Comercial 10h', 'Pacote avulso de 10 horas de mentoria de playbook de vendas', 'SKU-CONS-10H', 6000.00, 'a_vista', true)
    ON CONFLICT (id) DO NOTHING;

    -- 7. FUNIL DE VENDAS E ETAPAS
    INSERT INTO public.funis (id, organizacao_id, nome, descricao, padrao)
    VALUES (v_funil_id, v_org_id, 'Funil de Vendas B2B', 'Pipeline principal de prospecção e fechamento de clientes', true)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.etapas_funil (id, organizacao_id, funil_id, nome, ordem, probabilidade_fechamento, dias_estagnacao)
    VALUES
        (v_etapa_prospeccao, v_org_id, v_funil_id, 'Prospecção & Lead', 1, 10, 5),
        (v_etapa_qualificacao, v_org_id, v_funil_id, 'Qualificação & Demo', 2, 35, 7),
        (v_etapa_proposta, v_org_id, v_funil_id, 'Proposta Comercial', 3, 65, 5),
        (v_etapa_negociacao, v_org_id, v_funil_id, 'Negociação Final', 4, 85, 4)
    ON CONFLICT (id) DO NOTHING;

    -- 8. EMPRESAS (PROSPECTS)
    INSERT INTO public.empresas (id, organizacao_id, nome, cnpj, dominio, segmento, responsavel_id, campos_personalizados)
    VALUES
        (v_emp_fintech, v_org_id, 'NexPay Soluções Financeiras S/A', '33.456.789/0001-12', 'nexpay.com.br', 'Fintech', v_user_vendedor_id, '{"tamanho_empresa": "101-500 funcionários"}'::jsonb),
        (v_emp_varejo, v_org_id, 'OmniVarejo Brasil Ltda', '44.567.890/0001-23', 'omnivarejo.com.br', 'E-commerce & Varejo', v_user_vendedor_id, '{"tamanho_empresa": "500+ funcionários"}'::jsonb),
        (v_emp_logistica, v_org_id, 'RotaExpress Cargas e Logística', '55.678.901/0001-34', 'rotaexpress.com.br', 'Logística & Transporte', v_user_gestor_id, '{"tamanho_empresa": "21-100 funcionários"}'::jsonb),
        (v_emp_saude, v_org_id, 'VidaPlus Telemedicina', '66.789.012/0001-45', 'vidaplus.med.br', 'Saúde & Healthtech', v_user_admin_id, '{"tamanho_empresa": "21-100 funcionários"}'::jsonb)
    ON CONFLICT (id) DO NOTHING;

    -- 9. CONTATOS PRINCIPAIS
    INSERT INTO public.contatos (id, organizacao_id, empresa_id, nome, email, telefone_whatsapp, cargo, responsavel_id, campos_personalizados)
    VALUES
        (v_cont_rodrigo, v_org_id, v_emp_fintech, 'Rodrigo Prado', 'rodrigo.prado@nexpay.com.br', '+5511988881234', 'Head de Vendas', v_user_vendedor_id, '{"linkedin_url": "linkedin.com/in/rodrigoprado"}'::jsonb),
        (v_cont_beatriz, v_org_id, v_emp_varejo, 'Beatriz Mendes', 'beatriz@omnivarejo.com.br', '+5511977772345', 'Diretora de Operações', v_user_vendedor_id, '{"linkedin_url": "linkedin.com/in/beatrizmendes"}'::jsonb),
        (v_cont_felipe, v_org_id, v_emp_logistica, 'Felipe Castro', 'felipe.castro@rotaexpress.com.br', '+5519966663456', 'Gerente Comercial', v_user_gestor_id, '{"linkedin_url": "linkedin.com/in/felipecastro"}'::jsonb),
        (v_cont_camila, v_org_id, v_emp_saude, 'Dra. Camila Duarte', 'camila@vidaplus.med.br', '+5521955554567', 'COO & Co-fundadora', v_user_admin_id, '{"linkedin_url": "linkedin.com/in/camiladuarte"}'::jsonb)
    ON CONFLICT (id) DO NOTHING;

    -- 10. NEGÓCIOS (KANBAN DEALS COM DIFERENTES CENÁRIOS)
    -- Negócio 1: Proposta Enviada, valor com produtos, última atividade recente
    INSERT INTO public.negocios (id, organizacao_id, titulo, valor, moeda, funil_id, etapa_id, contato_id, empresa_id, responsavel_id, status, data_fechamento_esperada, ultima_atividade_em, campos_personalizados)
    VALUES (
        v_neg_1,
        v_org_id,
        'Implantação Enterprise - NexPay',
        8400.00,
        'BRL',
        v_funil_id,
        v_etapa_proposta,
        v_cont_rodrigo,
        v_emp_fintech,
        v_user_vendedor_id,
        'aberto',
        CURRENT_DATE + INTERVAL '10 days',
        now() - INTERVAL '2 hours',
        '{"origem_lead": "Outbound SDR"}'::jsonb
    ) ON CONFLICT (id) DO NOTHING;

    -- Negócio 2: Negociação Final, valor alto, atividade agendada para HOJE
    INSERT INTO public.negocios (id, organizacao_id, titulo, valor, moeda, funil_id, etapa_id, contato_id, empresa_id, responsavel_id, status, data_fechamento_esperada, ultima_atividade_em, campos_personalizados)
    VALUES (
        v_neg_2,
        v_org_id,
        'Expansão Nacional OmniVarejo',
        14400.00,
        'BRL',
        v_funil_id,
        v_etapa_negociacao,
        v_cont_beatriz,
        v_emp_varejo,
        v_user_vendedor_id,
        'aberto',
        CURRENT_DATE + INTERVAL '5 days',
        now() - INTERVAL '1 day',
        '{"origem_lead": "LinkedIn Direct"}'::jsonb
    ) ON CONFLICT (id) DO NOTHING;

    -- Negócio 3: Qualificação, ESTAGNADO (Deal Rotting > 7 dias sem atividade)
    INSERT INTO public.negocios (id, organizacao_id, titulo, valor, moeda, funil_id, etapa_id, contato_id, empresa_id, responsavel_id, status, data_fechamento_esperada, ultima_atividade_em, campos_personalizados)
    VALUES (
        v_neg_3,
        v_org_id,
        'Modernização de CRM - RotaExpress',
        4990.00,
        'BRL',
        v_funil_id,
        v_etapa_qualificacao,
        v_cont_felipe,
        v_emp_logistica,
        v_user_gestor_id,
        'aberto',
        CURRENT_DATE + INTERVAL '20 days',
        now() - INTERVAL '11 days', -- Estagnado (> 7 dias)
        '{"origem_lead": "Inbound Ads"}'::jsonb
    ) ON CONFLICT (id) DO NOTHING;

    -- Negócio 4: Prospecção & Lead, com tarefa ATRASADA (Vermelha)
    INSERT INTO public.negocios (id, organizacao_id, titulo, valor, moeda, funil_id, etapa_id, contato_id, empresa_id, responsavel_id, status, data_fechamento_esperada, ultima_atividade_em, campos_personalizados)
    VALUES (
        v_neg_4,
        v_org_id,
        'Licenciamento Pro VidaPlus',
        1490.00,
        'BRL',
        v_funil_id,
        v_etapa_prospeccao,
        v_cont_camila,
        v_emp_saude,
        v_user_admin_id,
        'aberto',
        CURRENT_DATE + INTERVAL '15 days',
        now() - INTERVAL '3 days',
        '{"origem_lead": "Indicação"}'::jsonb
    ) ON CONFLICT (id) DO NOTHING;

    -- Negócio 5: Ganho recentemente
    INSERT INTO public.negocios (id, organizacao_id, titulo, valor, moeda, funil_id, etapa_id, contato_id, empresa_id, responsavel_id, status, data_fechamento_esperada, ultima_atividade_em, campos_personalizados)
    VALUES (
        v_neg_5,
        v_org_id,
        'Consultoria & Setup - NexPay Fase 1',
        9500.00,
        'BRL',
        v_funil_id,
        v_etapa_negociacao,
        v_cont_rodrigo,
        v_emp_fintech,
        v_user_vendedor_id,
        'ganho',
        CURRENT_DATE - INTERVAL '2 days',
        now() - INTERVAL '2 days',
        '{"origem_lead": "Outbound SDR"}'::jsonb
    ) ON CONFLICT (id) DO NOTHING;

    -- 11. PRODUTOS VINCULADOS AOS NEGÓCIOS (negocios_produtos)
    INSERT INTO public.negocios_produtos (organizacao_id, negocio_id, produto_id, quantidade, valor_unitario)
    VALUES
        (v_org_id, v_neg_1, v_prod_plano_ent, 1, 4900.00),
        (v_org_id, v_neg_1, v_prod_onboarding, 1, 3500.00),
        (v_org_id, v_neg_2, v_prod_plano_ent, 2, 4200.00),
        (v_org_id, v_neg_2, v_prod_consultoria, 1, 6000.00),
        (v_org_id, v_neg_4, v_prod_plano_pro, 1, 1490.00)
    ON CONFLICT DO NOTHING;

    -- 12. ATIVIDADES DO PIPELINE (Tipos e Vencimentos Variados)
    INSERT INTO public.atividades (organizacao_id, negocio_id, contato_id, empresa_id, tipo, titulo, descricao, data_vencimento, concluida_em, criado_por)
    VALUES
        -- Tarefa Atrasada no Negócio 4 (Ícone Vermelho)
        (v_org_id, v_neg_4, v_cont_camila, v_emp_saude, 'tarefa', 'Enviar material institucional e caso de uso', 'Enviar apresentação comercial detalhada com cases do setor de saúde.', now() - INTERVAL '2 days', NULL, v_user_admin_id),
        
        -- Tarefa para HOJE no Negócio 2 (Ícone Amarelo)
        (v_org_id, v_neg_2, v_cont_beatriz, v_emp_varejo, 'reuniao', 'Reunião de alinhamento de contrato com Diretoria', 'Alinhamento das cláusulas de SLA e cronograma de rollout nacional.', now() + INTERVAL '3 hours', NULL, v_user_vendedor_id),
        
        -- Tarefa Futura no Negócio 1 (Ícone Verde)
        (v_org_id, v_neg_1, v_cont_rodrigo, v_emp_fintech, 'ligacao', 'Follow-up sobre aprovação da proposta jurídica', 'Verificar se o departamento de compliance aprovou a minuta contratual.', now() + INTERVAL '2 days', NULL, v_user_vendedor_id),
        
        -- Atividades Concluídas para Timeline 360º
        (v_org_id, v_neg_1, v_cont_rodrigo, v_emp_fintech, 'whatsapp', 'Conversa de apresentação via WhatsApp', 'Apresentação inicial e envio do link de agendamento de call.', now() - INTERVAL '3 days', now() - INTERVAL '3 days', v_user_vendedor_id),
        (v_org_id, v_neg_1, v_cont_rodrigo, v_emp_fintech, 'nota', 'Cliente pediu desconto de 5% no setup à vista. Avaliando com o gestor.', 'Condição comercial especial solicitada pelo decisor técnico.', now() - INTERVAL '1 day', now() - INTERVAL '1 day', v_user_vendedor_id);

    -- 13. HISTÓRICO DE MUDANÇA DE ETAPAS
    INSERT INTO public.historico_etapas (organizacao_id, negocio_id, etapa_anterior_id, etapa_nova_id, alterado_por, alterado_em, duracao_segundos)
    VALUES
        (v_org_id, v_neg_1, v_etapa_prospeccao, v_etapa_qualificacao, v_user_vendedor_id, now() - INTERVAL '5 days', 172800),
        (v_org_id, v_neg_1, v_etapa_qualificacao, v_etapa_proposta, v_user_vendedor_id, now() - INTERVAL '2 days', 259200),
        (v_org_id, v_neg_2, v_etapa_proposta, v_etapa_negociacao, v_user_vendedor_id, now() - INTERVAL '1 day', 86400);

END $$;
