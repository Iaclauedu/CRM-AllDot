export interface Membro {
  id: string;
  nome_completo: string;
  email: string;
  cargo: 'admin' | 'gestor' | 'vendedor';
  avatar_url: string;
}

export interface Empresa {
  id: string;
  nome: string;
  cnpj: string;
  dominio: string;
  segmento: string;
  responsavel_id: string;
  total_negocios?: number;
  criado_em: string;
}

export interface Contato {
  id: string;
  empresa_id: string;
  empresa_nome?: string;
  nome: string;
  email: string;
  telefone_whatsapp: string;
  cargo: string;
  responsavel_id: string;
  criado_em: string;
}

export interface Produto {
  id: string;
  nome: string;
  descricao: string;
  codigo_sku: string;
  valor: number;
  tipo_cobranca: 'mensal' | 'a_vista' | 'anual';
  ativo: boolean;
}

export interface Atividade {
  id: string;
  negocio_id: string;
  tipo: 'ligacao' | 'reuniao' | 'whatsapp' | 'email' | 'nota' | 'tarefa';
  titulo: string;
  descricao?: string;
  data_vencimento?: string;
  concluida_em?: string;
  criado_por: string;
  criado_em: string;
}

export interface Negocio {
  id: string;
  titulo: string;
  valor: number;
  moeda: string;
  funil_id: string;
  etapa_id: string;
  contato_id: string;
  contato_nome?: string;
  contato_whatsapp?: string;
  contato_email?: string;
  empresa_id: string;
  empresa_nome?: string;
  responsavel_id: string;
  responsavel_nome?: string;
  responsavel_avatar?: string;
  status: 'aberto' | 'ganho' | 'perdido';
  motivo_perda?: string;
  data_fechamento_esperada?: string;
  ultima_atividade_em: string;
  atividades?: Atividade[];
  produtos?: {
    produto_id: string;
    nome: string;
    quantidade: number;
    valor_unitario: number;
    subtotal: number;
  }[];
}

export interface Funil {
  id: string;
  nome: string;
  descricao?: string;
  padrao?: boolean;
  criado_em?: string;
}

export interface EtapaFunil {
  id: string;
  funil_id?: string;
  nome: string;
  ordem: number;
  probabilidade_fechamento: number;
  dias_estagnacao: number;
  cor?: string;
}

export const DADOS_FUNIS: Funil[] = [
  {
    id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
    nome: 'Funil Comercial B2B',
    descricao: 'Processo padrão de prospecção, qualificação, proposta e fechamento.',
    padrao: true,
  },
];

export const DADOS_ORGANIZACAO = {
  id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
  nome: 'Acme Cloud Tech',
  slug: 'acme-cloud-tech',
  cnpj: '12.345.678/0001-90',
  segmento: 'Software B2B & Cloud',
  plano: 'enterprise',
};

export const DADOS_MEMBROS: Membro[] = [
  {
    id: '11111111-1111-4111-a111-111111111111',
    nome_completo: 'Carlos Silva',
    email: 'carlos.admin@acme.com',
    cargo: 'admin',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  },
  {
    id: '22222222-2222-4222-a222-222222222222',
    nome_completo: 'Mariana Souza',
    email: 'mariana.gestora@acme.com',
    cargo: 'gestor',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  },
  {
    id: '33333333-3333-4333-a333-333333333333',
    nome_completo: 'Lucas Vendas',
    email: 'lucas.vendedor@acme.com',
    cargo: 'vendedor',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  },
];

export const DADOS_ETAPAS: EtapaFunil[] = [
  {
    id: 'e1111111-1111-4111-b111-111111111111',
    nome: 'Prospecção & Lead',
    ordem: 1,
    probabilidade_fechamento: 10,
    dias_estagnacao: 5,
  },
  {
    id: 'e2222222-2222-4222-b222-222222222222',
    nome: 'Qualificação & Demo',
    ordem: 2,
    probabilidade_fechamento: 35,
    dias_estagnacao: 7,
  },
  {
    id: 'e3333333-3333-4333-b333-333333333333',
    nome: 'Proposta Comercial',
    ordem: 3,
    probabilidade_fechamento: 65,
    dias_estagnacao: 5,
  },
  {
    id: 'e4444444-4444-4444-b444-444444444444',
    nome: 'Negociação Final',
    ordem: 4,
    probabilidade_fechamento: 85,
    dias_estagnacao: 4,
  },
];

export const DADOS_EMPRESAS: Empresa[] = [
  {
    id: 'c1111111-1111-4111-d111-111111111111',
    nome: 'NexPay Soluções Financeiras S/A',
    cnpj: '33.456.789/0001-12',
    dominio: 'nexpay.com.br',
    segmento: 'Fintech & Meios de Pagamento',
    responsavel_id: '33333333-3333-4333-a333-333333333333',
    total_negocios: 2,
    criado_em: '2026-03-10T10:00:00Z',
  },
  {
    id: 'c2222222-2222-4222-d222-222222222222',
    nome: 'OmniVarejo Brasil Ltda',
    cnpj: '44.567.890/0001-23',
    dominio: 'omnivarejo.com.br',
    segmento: 'E-commerce & Varejo',
    responsavel_id: '33333333-3333-4333-a333-333333333333',
    total_negocios: 1,
    criado_em: '2026-03-15T14:30:00Z',
  },
  {
    id: 'c3333333-3333-4333-d333-333333333333',
    nome: 'RotaExpress Cargas e Logística',
    cnpj: '55.678.901/0001-34',
    dominio: 'rotaexpress.com.br',
    segmento: 'Logística & Transporte',
    responsavel_id: '22222222-2222-4222-a222-222222222222',
    total_negocios: 1,
    criado_em: '2026-03-01T09:15:00Z',
  },
  {
    id: 'c4444444-4444-4444-d444-444444444444',
    nome: 'VidaPlus Telemedicina',
    cnpj: '66.789.012/0001-45',
    dominio: 'vidaplus.med.br',
    segmento: 'Saúde & Healthtech',
    responsavel_id: '11111111-1111-4111-a111-111111111111',
    total_negocios: 1,
    criado_em: '2026-03-18T16:45:00Z',
  },
];

export const DADOS_CONTATOS: Contato[] = [
  {
    id: 'k1111111-1111-4111-e111-111111111111',
    empresa_id: 'c1111111-1111-4111-d111-111111111111',
    empresa_nome: 'NexPay Soluções Financeiras S/A',
    nome: 'Rodrigo Prado',
    email: 'rodrigo.prado@nexpay.com.br',
    telefone_whatsapp: '+5511988881234',
    cargo: 'Head de Vendas',
    responsavel_id: '33333333-3333-4333-a333-333333333333',
    criado_em: '2026-03-10T10:30:00Z',
  },
  {
    id: 'k2222222-2222-4222-e222-222222222222',
    empresa_id: 'c2222222-2222-4222-d222-222222222222',
    empresa_nome: 'OmniVarejo Brasil Ltda',
    nome: 'Beatriz Mendes',
    email: 'beatriz@omnivarejo.com.br',
    telefone_whatsapp: '+5511977772345',
    cargo: 'Diretora de Operações',
    responsavel_id: '33333333-3333-4333-a333-333333333333',
    criado_em: '2026-03-15T15:00:00Z',
  },
  {
    id: 'k3333333-3333-4333-e333-333333333333',
    empresa_id: 'c3333333-3333-4333-d333-333333333333',
    empresa_nome: 'RotaExpress Cargas e Logística',
    nome: 'Felipe Castro',
    email: 'felipe.castro@rotaexpress.com.br',
    telefone_whatsapp: '+5519966663456',
    cargo: 'Gerente Comercial',
    responsavel_id: '22222222-2222-4222-a222-222222222222',
    criado_em: '2026-03-01T09:40:00Z',
  },
  {
    id: 'k4444444-4444-4444-e444-444444444444',
    empresa_id: 'c4444444-4444-4444-d444-444444444444',
    empresa_nome: 'VidaPlus Telemedicina',
    nome: 'Dra. Camila Duarte',
    email: 'camila@vidaplus.med.br',
    telefone_whatsapp: '+5521955554567',
    cargo: 'COO & Co-fundadora',
    responsavel_id: '11111111-1111-4111-a111-111111111111',
    criado_em: '2026-03-18T17:00:00Z',
  },
];

export const DADOS_PRODUTOS: Produto[] = [
  {
    id: 'p1111111-1111-4111-c111-111111111111',
    nome: 'Plano Professional (MRR)',
    descricao: 'Assinatura mensal para até 15 usuários com integrações premium',
    codigo_sku: 'SKU-PRO-01',
    valor: 1490.0,
    tipo_cobranca: 'mensal',
    ativo: true,
  },
  {
    id: 'p2222222-2222-4222-c222-222222222222',
    nome: 'Plano Enterprise (MRR)',
    descricao: 'Assinatura mensal para usuários ilimitados, SLA dedicado e SSO',
    codigo_sku: 'SKU-ENT-01',
    valor: 4900.0,
    tipo_cobranca: 'mensal',
    ativo: true,
  },
  {
    id: 'p3333333-3333-4333-c333-333333333333',
    nome: 'Setup & Onboarding VIP',
    descricao: 'Implantação técnica, migração de dados e treinamento da equipe comercial',
    codigo_sku: 'SKU-SETUP-01',
    valor: 3500.0,
    tipo_cobranca: 'a_vista',
    ativo: true,
  },
  {
    id: 'p4444444-4444-4444-c444-444444444444',
    nome: 'Consultoria Comercial 10h',
    descricao: 'Pacote avulso de 10 horas de mentoria de playbook de vendas',
    codigo_sku: 'SKU-CONS-10H',
    valor: 6000.0,
    tipo_cobranca: 'a_vista',
    ativo: true,
  },
];

export const DADOS_NEGOCIOS: Negocio[] = [
  {
    id: 'n1111111-1111-4111-f111-111111111111',
    titulo: 'Implantação Enterprise - NexPay',
    valor: 8400.0,
    moeda: 'BRL',
    funil_id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
    etapa_id: 'e3333333-3333-4333-b333-333333333333', // Proposta
    contato_id: 'k1111111-1111-4111-e111-111111111111',
    contato_nome: 'Rodrigo Prado',
    contato_whatsapp: '+5511988881234',
    contato_email: 'rodrigo.prado@nexpay.com.br',
    empresa_id: 'c1111111-1111-4111-d111-111111111111',
    empresa_nome: 'NexPay Soluções Financeiras S/A',
    responsavel_id: '33333333-3333-4333-a333-333333333333',
    responsavel_nome: 'Lucas Vendas',
    responsavel_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    status: 'aberto',
    data_fechamento_esperada: '2026-03-30',
    ultima_atividade_em: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), // 2 horas atrás
    atividades: [
      {
        id: 'a1',
        negocio_id: 'n1111111-1111-4111-f111-111111111111',
        tipo: 'ligacao',
        titulo: 'Follow-up sobre aprovação da proposta jurídica',
        data_vencimento: new Date(Date.now() + 2 * 86400 * 1000).toISOString(), // Futura (Verde)
        criado_por: 'Lucas Vendas',
        criado_em: new Date(Date.now() - 86400 * 1000).toISOString(),
      },
      {
        id: 'a2',
        negocio_id: 'n1111111-1111-4111-f111-111111111111',
        tipo: 'nota',
        titulo: 'Cliente pediu desconto de 5% no setup à vista. Avaliando com o gestor.',
        concluida_em: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        criado_por: 'Lucas Vendas',
        criado_em: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      },
    ],
    produtos: [
      {
        produto_id: 'p2222222-2222-4222-c222-222222222222',
        nome: 'Plano Enterprise (MRR)',
        quantidade: 1,
        valor_unitario: 4900.0,
        subtotal: 4900.0,
      },
      {
        produto_id: 'p3333333-3333-4333-c333-333333333333',
        nome: 'Setup & Onboarding VIP',
        quantidade: 1,
        valor_unitario: 3500.0,
        subtotal: 3500.0,
      },
    ],
  },
  {
    id: 'n2222222-2222-4222-f222-222222222222',
    titulo: 'Expansão Nacional OmniVarejo',
    valor: 14400.0,
    moeda: 'BRL',
    funil_id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
    etapa_id: 'e4444444-4444-4444-b444-444444444444', // Negociação
    contato_id: 'k2222222-2222-4222-e222-222222222222',
    contato_nome: 'Beatriz Mendes',
    contato_whatsapp: '+5511977772345',
    contato_email: 'beatriz@omnivarejo.com.br',
    empresa_id: 'c2222222-2222-4222-d222-222222222222',
    empresa_nome: 'OmniVarejo Brasil Ltda',
    responsavel_id: '33333333-3333-4333-a333-333333333333',
    responsavel_nome: 'Lucas Vendas',
    responsavel_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    status: 'aberto',
    data_fechamento_esperada: '2026-03-25',
    ultima_atividade_em: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    atividades: [
      {
        id: 'a3',
        negocio_id: 'n2222222-2222-4222-f222-222222222222',
        tipo: 'reuniao',
        titulo: 'Reunião de alinhamento de contrato com Diretoria',
        data_vencimento: new Date(Date.now() + 3 * 3600 * 1000).toISOString(), // HOJE (Amarelo)
        criado_por: 'Lucas Vendas',
        criado_em: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 'n3333333-3333-4333-f333-333333333333',
    titulo: 'Modernização de CRM - RotaExpress',
    valor: 4990.0,
    moeda: 'BRL',
    funil_id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
    etapa_id: 'e2222222-2222-4222-b222-222222222222', // Qualificação
    contato_id: 'k3333333-3333-4333-e333-333333333333',
    contato_nome: 'Felipe Castro',
    contato_whatsapp: '+5519966663456',
    contato_email: 'felipe.castro@rotaexpress.com.br',
    empresa_id: 'c3333333-3333-4333-d333-333333333333',
    empresa_nome: 'RotaExpress Cargas e Logística',
    responsavel_id: '22222222-2222-4222-a222-222222222222',
    responsavel_nome: 'Mariana Souza',
    responsavel_avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    status: 'aberto',
    data_fechamento_esperada: '2026-04-10',
    ultima_atividade_em: new Date(Date.now() - 11 * 86400 * 1000).toISOString(), // Estagnado (Rotting > 7 dias)
    atividades: [], // Sem atividade (Alerta Âmbar)
  },
  {
    id: 'n4444444-4444-4444-f444-444444444444',
    titulo: 'Licenciamento Pro VidaPlus',
    valor: 1490.0,
    moeda: 'BRL',
    funil_id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
    etapa_id: 'e1111111-1111-4111-b111-111111111111', // Prospecção
    contato_id: 'k4444444-4444-4444-e444-444444444444',
    contato_nome: 'Dra. Camila Duarte',
    contato_whatsapp: '+5521955554567',
    contato_email: 'camila@vidaplus.med.br',
    empresa_id: 'c4444444-4444-4444-d444-444444444444',
    empresa_nome: 'VidaPlus Telemedicina',
    responsavel_id: '11111111-1111-4111-a111-111111111111',
    responsavel_nome: 'Carlos Silva',
    responsavel_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    status: 'aberto',
    data_fechamento_esperada: '2026-04-05',
    ultima_atividade_em: new Date(Date.now() - 3 * 86400 * 1000).toISOString(),
    atividades: [
      {
        id: 'a4',
        negocio_id: 'n4444444-4444-4444-f444-444444444444',
        tipo: 'tarefa',
        titulo: 'Enviar material institucional e caso de uso',
        data_vencimento: new Date(Date.now() - 2 * 86400 * 1000).toISOString(), // Atrasada (Vermelho)
        criado_por: 'Carlos Silva',
        criado_em: new Date(Date.now() - 4 * 86400 * 1000).toISOString(),
      },
    ],
  },
];
