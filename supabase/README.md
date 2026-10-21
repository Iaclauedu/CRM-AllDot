# Instruções do Banco de Dados Supabase (Etapa 1)

Este diretório contém a estrutura de banco de dados completa para o **CRM B2B Moderno** com arquitetura SaaS Multi-Tenant.

## Arquivos Gerados

1. **`migrations/001_schema_crm_multitenant.sql`**:
   - Extensões UUID e PGCrypto
   - Tabelas: `perfis`, `organizacoes`, `membros_organizacao`, `campos_definicoes`, `produtos`, `funis`, `etapas_funil`, `empresas`, `contatos`, `negocios`, `negocios_produtos`, `atividades`, `historico_etapas`
   - Índices GIN em `campos_personalizados` e B-Tree nos filtros do Kanban
   - Triggers: criação de perfil, atualização de `ultima_atividade_em`, trilha de histórico de etapas com duração e recálculo de valor do negócio via produtos
   - RPC seguro de Onboarding: `fn_criar_organizacao_com_funil_padrao` (Opção B)
   - Views de Métricas: `vw_metricas_funil` (cabeçalho de colunas) e `vw_metricas_dashboard`
   - RLS (Row Level Security) completo com isolamento por organização
   - Configuração de Realtime para `negocios`, `atividades` e `historico_etapas`

2. **`seed.sql`**:
   - Dados de teste prontos da organização "Acme Cloud Tech"
   - Perfis de Admin, Gestor e Vendedor
   - Catálogo de produtos com assinaturas mensais (MRR) e serviços à vista
   - Empresas e Contatos com telefones WhatsApp brasileiros formatados
   - Negócios simulando casos reais: tarefa atrasada (alerta vermelho), tarefa para hoje (alerta amarelo), tarefa futura (verde) e estagnação/rotting (> 7 dias sem atividade)
   - Produtos vinculados e histórico de movimentação de etapas

## Como Aplicar no Supabase

### Opção 1: Via Supabase Dashboard (Web SQL Editor)
1. Acesse o painel do seu projeto no Supabase.
2. Abra o menu **SQL Editor**.
3. Crie uma nova query, cole o conteúdo de `migrations/001_schema_crm_multitenant.sql` e clique em **Run**.
4. Em seguida, crie outra query com o conteúdo de `seed.sql` e execute para carregar os dados de demonstração.

### Opção 2: Via Supabase CLI (Local)
```bash
supabase db reset
# ou
supabase migration up
supabase db seed
```
