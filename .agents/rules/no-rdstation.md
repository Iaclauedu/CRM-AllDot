# Regra de Integrações: Proibição de RD Station CRM

Este projeto (**tennis-school-app**) **NÃO** deve utilizar sob nenhuma circunstância:
- O servidor MCP `rdstation-crm` ou qualquer uma de suas ferramentas (`deals_*`, `contacts_*`, `tasks_*`, `funnels_*`, etc.).
- Qualquer API, webhook, credencial ou sincronização relacionada ao RD Station CRM.
- Qualquer dependência ou lógica de negócio acoplada ao RD Station CRM.

Todas as operações de gestão de clientes, agendamentos, contatos ou dados devem ser tratadas internamente pelo backend/banco de dados do projeto (Supabase/PostgreSQL) ou outros serviços aprovados expressamente pelo usuário.
