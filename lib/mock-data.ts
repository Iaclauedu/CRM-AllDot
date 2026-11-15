export interface Membro {
  id: string;
  nome_completo: string;
  email: string;
  cargo: 'admin' | 'gestor' | 'vendedor';
  avatar_url: string;
}

export type TipoCliente = 'PJ' | 'PF';

export type OrigemLeadCliente =
  | 'Google'
  | 'Instagram'
  | 'Indicação'
  | 'Feira'
  | 'Prospecção Ativa';

export const OPCOES_ORIGEM_LEAD: OrigemLeadCliente[] = [
  'Google',
  'Instagram',
  'Indicação',
  'Feira',
  'Prospecção Ativa',
];

export interface Empresa {
  id: string;
  tipo_cliente?: TipoCliente;
  cpf_cnpj?: string;
  nome: string;
  razao_social?: string;
  nome_fantasia?: string;
  cnpj: string;
  endereco?: string;
  contato_principal?: string;
  whatsapp_principal?: string;
  email_principal?: string;
  origem_lead?: OrigemLeadCliente | string;
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
  consentimento_email?: boolean;
  descadastrado_email?: boolean;
  descadastrado_em?: string;
  motivo_descadastramento?: string;
}

export interface CampoPersonalizadoDefinicao {
  id: string;
  entidade: 'negocio' | 'empresa' | 'contato' | 'produto';
  nome_chave: string;
  label: string;
  tipo: 'texto' | 'numero' | 'moeda' | 'data' | 'selecao' | 'booleano';
  opcoes_json?: string[];
  obrigatorio?: boolean;
  ordem: number;
}

export type UnidadeMedidaProduto =
  | 'Unidade'
  | 'Cento'
  | 'Milheiro'
  | 'Metro Quadrado'
  | 'Rolo';

export interface UnidadeMedidaItem {
  id: string;
  nome: UnidadeMedidaProduto | string;
  sigla: string;
  ordem: number;
  ativo: boolean;
}

export const DADOS_UNIDADES_MEDIDAS: UnidadeMedidaItem[] = [
  {
    id: '11111111-0001-4000-a000-000000000001',
    nome: 'Unidade',
    sigla: 'UN',
    ordem: 1,
    ativo: true,
  },
  {
    id: '11111111-0002-4000-a000-000000000002',
    nome: 'Cento',
    sigla: 'CT',
    ordem: 2,
    ativo: true,
  },
  {
    id: '11111111-0003-4000-a000-000000000003',
    nome: 'Milheiro',
    sigla: 'MIL',
    ordem: 3,
    ativo: true,
  },
  {
    id: '11111111-0004-4000-a000-000000000004',
    nome: 'Metro Quadrado',
    sigla: 'M²',
    ordem: 4,
    ativo: true,
  },
  {
    id: '11111111-0005-4000-a000-000000000005',
    nome: 'Rolo',
    sigla: 'RL',
    ordem: 5,
    ativo: true,
  },
];

export const OPCOES_UNIDADE_MEDIDA: UnidadeMedidaProduto[] = [
  'Unidade',
  'Cento',
  'Milheiro',
  'Metro Quadrado',
  'Rolo',
];

export type CategoriaProdutoNome =
  | 'Crachás'
  | 'Cordões'
  | 'Insumos de Impressora'
  | 'Papelaria'
  | 'Comunicação Visual'
  | 'Garrafas, squeezes, copos';

export interface CategoriaProdutoItem {
  id: string;
  nome: CategoriaProdutoNome | string;
  ordem: number;
  ativo: boolean;
}

export const DADOS_CATEGORIAS_PRODUTO: CategoriaProdutoItem[] = [
  {
    id: '22222222-0001-4000-a000-000000000001',
    nome: 'Crachás',
    ordem: 1,
    ativo: true,
  },
  {
    id: '22222222-0002-4000-a000-000000000002',
    nome: 'Cordões',
    ordem: 2,
    ativo: true,
  },
  {
    id: '22222222-0003-4000-a000-000000000003',
    nome: 'Insumos de Impressora',
    ordem: 3,
    ativo: true,
  },
  {
    id: '22222222-0004-4000-a000-000000000004',
    nome: 'Papelaria',
    ordem: 4,
    ativo: true,
  },
  {
    id: '22222222-0005-4000-a000-000000000005',
    nome: 'Comunicação Visual',
    ordem: 5,
    ativo: true,
  },
  {
    id: '22222222-0006-4000-a000-000000000006',
    nome: 'Garrafas, squeezes, copos',
    ordem: 6,
    ativo: true,
  },
];

export interface Produto {
  id: string;
  nome: string;
  descricao: string;
  codigo_sku: string;
  valor: number;
  unidades_medidas?: string;
  unidade_medida?: UnidadeMedidaProduto | string;
  categoria_produto?: string;
  categoria_nome?: CategoriaProdutoNome | string;
  ativo: boolean;
  imagem_url?: string;
  campos_personalizados?: Record<string, any>;
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

export type RegraCriacaoNegocioLP =
  | 'sempre_criar'
  | 'atualizar_aberto'
  | 'bloquear_duplicado';

export interface ConfiguracaoIntegracaoLP {
  url_landing_page: string;
  origem_padrao: string;
  funil_id: string;
  etapa_id: string;
  responsavel_id: string;
  regra_criacao_negocio: RegraCriacaoNegocioLP;
  atualizar_contato_existente: boolean;
  ativo: boolean;
}

export interface Negocio {
  id: string;
  codigo?: string;
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
  // Dados brutos do Lead (Landing Page) quando empresa/contato ainda não foram criados
  lead_nome?: string;
  lead_email?: string;
  lead_empresa?: string;
  lead_celular?: string;
  // Dados provisionados de rastreamento, conversão, campanha e UTMs
  origem_lead?: string;
  url_conversao?: string;
  campanha?: string;
  midia?: string;
  conjunto_anuncios?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  produto_interesse?: string;
  data_hora_cadastro?: string;
  responsavel_id: string;
  responsavel_nome?: string;
  responsavel_avatar?: string;
  status: 'aberto' | 'ganho' | 'perdido';
  motivo_perda?: string;
  data_fechamento_esperada?: string;
  ultima_atividade_em: string;
  // Controles de automação de e-mail por negociação
  automacoes_pausadas?: boolean;
  automacoes_pausadas_por?: string;
  automacoes_pausadas_em?: string;
  consentimento_email?: boolean;
  descadastrado_email?: boolean;
  campos_personalizados?: Record<string, any>;
  atividades?: Atividade[];
  produtos?: {
    produto_id: string;
    nome: string;
    quantidade: number;
    valor_unitario: number;
    subtotal: number;
  }[];
  produtos_vinculados?: {
    produto_id: string;
    nome_produto?: string;
    quantidade: number;
    valor_unitario: number;
    subtotal: number;
    produto?: { nome: string };
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
    nome: 'Funil Vendas',
    descricao: 'Pipeline principal de prospecção e fechamento de clientes',
    padrao: true,
  },
  {
    id: '879a7eee-b4c0-44c6-87b0-d8a6cb169114',
    nome: 'Funil de Pré-Impressão e Aprovação',
    descricao: 'Gestão de implementação e retenção de clientes',
    padrao: false,
  },
  {
    id: '5086d2f4-12d9-4245-bf55-ac7e8e655ca0',
    nome: 'Funil de Produção',
    descricao: 'Funil para a confecção dos brindes',
    padrao: false,
  },
  {
    id: '07deaa33-8206-4c91-bef7-a784bc698c47',
    nome: 'Funil Financeiro',
    descricao: '',
    padrao: false,
  },
  {
    id: 'e2dce869-1e3e-4029-a42a-7a317180a00c',
    nome: 'Funil Expedição',
    descricao: '',
    padrao: false,
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
  {
    id: '44444444-4444-4444-a444-444444444444',
    nome_completo: 'Cláudio Barbosa',
    email: 'claudio.barbosa@acme.com',
    cargo: 'vendedor',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
  },
];

export const DADOS_ETAPAS: EtapaFunil[] = [
  {
    id: 'e1111111-1111-4111-b111-111111111111',
    funil_id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
    nome: 'Novo Lead',
    ordem: 1,
    probabilidade_fechamento: 10,
    dias_estagnacao: 5,
  },
  {
    id: 'e2222222-2222-4222-b222-222222222222',
    funil_id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
    nome: 'Em Qualificação / Briefing',
    ordem: 2,
    probabilidade_fechamento: 35,
    dias_estagnacao: 7,
  },
  {
    id: 'e3333333-3333-4333-b333-333333333333',
    funil_id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
    nome: 'Montando Orçamento',
    ordem: 3,
    probabilidade_fechamento: 65,
    dias_estagnacao: 5,
  },
  {
    id: 'e4444444-4444-4444-b444-444444444444',
    funil_id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
    nome: 'Proposta Enviada (Follow-up)',
    ordem: 4,
    probabilidade_fechamento: 85,
    dias_estagnacao: 4,
  },
  {
    id: '8ff891d0-c6ef-4d01-9b48-b79cc6c90704',
    funil_id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
    nome: 'Negociação Ativa',
    ordem: 5,
    probabilidade_fechamento: 85,
    dias_estagnacao: 7,
  },
  {
    id: '0f93bfc9-0f3e-428a-83fa-68ba32f3af60',
    funil_id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
    nome: 'Venda Ganha',
    ordem: 6,
    probabilidade_fechamento: 50,
    dias_estagnacao: 7,
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
    ativo: true,
  },
  {
    id: 'p2222222-2222-4222-c222-222222222222',
    nome: 'Plano Enterprise (MRR)',
    descricao: 'Assinatura mensal para usuários ilimitados, SLA dedicado e SSO',
    codigo_sku: 'SKU-ENT-01',
    valor: 4900.0,
    ativo: true,
  },
  {
    id: 'p3333333-3333-4333-c333-333333333333',
    nome: 'Setup & Onboarding VIP',
    descricao: 'Implantação técnica, migração de dados e treinamento da equipe comercial',
    codigo_sku: 'SKU-SETUP-01',
    valor: 3500.0,
    ativo: true,
  },
  {
    id: 'p4444444-4444-4444-c444-444444444444',
    nome: 'Consultoria Comercial 10h',
    descricao: 'Pacote avulso de 10 horas de mentoria de playbook de vendas',
    codigo_sku: 'SKU-CONS-10H',
    valor: 6000.0,
    ativo: true,
  },
];

export const DADOS_NEGOCIOS: Negocio[] = [
  {
    id: 'n1111111-1111-4111-f111-111111111111',
    codigo: '#1001',
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
    codigo: '#1002',
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
    codigo: '#1003',
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
    codigo: '#1004',
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

// ==============================================================================
// AUTOMAÇÃO DE E-MAILS, TEMPLATES (IMAGENS & ANEXOS) & SERVIDOR SMTP
// ==============================================================================

export type TipoContaEmail =
  | 'gmail_workspace'
  | 'office365_outlook'
  | 'cpanel_titan'
  | 'ses_sendgrid_relay'
  | 'smtp_personalizado';

export type SegurancaSmtp = 'tls' | 'ssl' | 'nenhuma';

export interface ConfiguracaoServidorEmail {
  id?: string;
  tipo_conta: TipoContaEmail;
  provedor_nome?: string;
  nome_remetente: string;
  email_remetente: string;
  email_resposta: string;
  smtp_host: string;
  smtp_porta: number;
  seguranca: SegurancaSmtp;
  autenticacao_requerida?: boolean;
  usuario_smtp: string;
  senha_smtp: string;
  assinatura_html: string;
  limite_diario: number;
  ativo: boolean;
  ultimo_teste_em?: string;
  status_conexao?: 'conectado' | 'erro' | 'nao_testado';
}

export interface ImagemEmailInline {
  id: string;
  nome: string;
  url_ou_base64: string;
  largura: '250px' | '450px' | '100%';
  legenda?: string;
  alt?: string;
}

export interface AnexoEmailTemplate {
  id: string;
  nome?: string;
  nome_arquivo: string;
  tipo_mime: string;
  tamanho_bytes: number;
  conteudo_base64_ou_url: string;
}

export interface TemplateEmail {
  id: string;
  nome: string;
  categoria?: string;
  assunto: string;
  corpo_html: string;
  imagens?: ImagemEmailInline[];
  imagens_corpo: ImagemEmailInline[];
  anexos: AnexoEmailTemplate[];
  ativo: boolean;
  criado_em: string;
  atualizado_em?: string;
}

export type GatilhoAutomacaoEmail =
  | 'mudanca_etapa'
  | 'tempo_inatividade'
  | 'novo_negocio'
  | 'negocio_ganho'
  | 'negocio_perdido';

export type DestinatarioAutomacaoEmail =
  | 'contato_principal'
  | 'responsavel'
  | 'ambos'
  | 'email_personalizado';

export type PoliticaInterrupcaoAutomacao =
  | 'ambos'
  | 'apenas_ganho'
  | 'apenas_perdido'
  | 'nunca';

export interface RegraAutomacaoEmail {
  id: string;
  nome: string;
  descricao?: string;
  gatilho: GatilhoAutomacaoEmail;
  funil_id?: string;
  etapa_id?: string;
  etapa_origem_id?: string;
  etapa_destino_id?: string;
  dias_inatividade?: number;
  atraso_minutos?: number;
  horas_atraso_envio?: number;
  template_id: string;
  destinatario_tipo: DestinatarioAutomacaoEmail;
  email_personalizado?: string;
  copia_cc?: string;
  apenas_horario_comercial?: boolean;
  // Controles obrigatórios de governança da regra
  permitir_redisparo_retorno_etapa?: boolean;
  interromper_se_ganho_perdido?: PoliticaInterrupcaoAutomacao;
  exigir_consentimento?: boolean;
  respeitar_descadastramento?: boolean;
  pausado_por?: string;
  pausado_em?: string;
  ativo: boolean;
  total_disparos: number;
  ultimo_disparo_em?: string;
  criado_em: string;
}

export type StatusEnvioEmail =
  | 'enviado'
  | 'simulado'
  | 'erro'
  | 'bloqueado_duplicidade'
  | 'bloqueado_optout'
  | 'interrompido_status'
  | 'pausado';

export interface LogEnvioEmail {
  id: string;
  automacao_id?: string;
  automacao_nome: string;
  template_id?: string;
  template_nome: string;
  negocio_id?: string;
  negocio_titulo?: string;
  etapa_id?: string;
  etapa_nome?: string;
  destinatario_email: string;
  destinatario_nome?: string;
  assunto: string;
  gatilho: GatilhoAutomacaoEmail | 'teste_manual';
  anexos_count?: number;
  qtd_anexos: number;
  status: StatusEnvioEmail;
  detalhes?: string;
  mensagem_erro?: string;
  motivo_bloqueio?: string;
  enviado_em: string;
}

export interface AutomacaoProgramada {
  id: string;
  automacao_id: string;
  automacao_nome: string;
  template_id?: string;
  template_nome: string;
  negocio_id: string;
  negocio_titulo: string;
  etapa_id?: string;
  etapa_nome?: string;
  destinatario_email: string;
  destinatario_nome?: string;
  gatilho: GatilhoAutomacaoEmail;
  agendado_para: string;
  status: 'agendada' | 'pausada' | 'executada' | 'cancelada' | 'bloqueada';
  motivo_cancelamento?: string;
  criado_em: string;
}

export const CONFIG_SERVIDOR_EMAIL_PADRAO: ConfiguracaoServidorEmail = {
  tipo_conta: 'gmail_workspace',
  provedor_nome: 'Google Workspace (Gmail Corporativo)',
  nome_remetente: 'Comercial Brinday Personalizados',
  email_remetente: 'comercial@brindaypersonalizados.com.br',
  email_resposta: 'atendimento@brindaypersonalizados.com.br',
  smtp_host: 'smtp.gmail.com',
  smtp_porta: 587,
  seguranca: 'tls',
  autenticacao_requerida: true,
  usuario_smtp: 'comercial@brindaypersonalizados.com.br',
  senha_smtp: '',
  assinatura_html:
    'Atenciosamente,\nEquipe Comercial — Brinday Personalizados\nhttps://brindes.brindaypersonalizados.com.br/',
  limite_diario: 500,
  ativo: true,
  status_conexao: 'conectado',
};

export const DADOS_TEMPLATES_EMAIL: TemplateEmail[] = [
  {
    id: 'a1000001-0001-4000-a000-000000000001',
    nome: 'Boas-vindas & Catálogo de Brindes (Entrada no Funil)',
    categoria: 'Boas-vindas',
    assunto: 'Olá {{nome_contato}}, recebemos sua solicitação na Brinday Personalizados!',
    corpo_html: `Olá {{nome_contato}}, tudo bem?

Recebemos o seu contato referente à empresa {{nome_empresa}} para o projeto "{{titulo_negocio}}".

Nosso especialista comercial {{nome_vendedor}} já está analisando a sua demanda na etapa "{{etapa_funil}}" e em breve entrará em contato pelo WhatsApp ou telefone.

Enquanto isso, confira abaixo nossos principais itens de Crachás, Cordões Personalizados e Comunicação Visual em anexo!`,
    imagens_corpo: [
      {
        id: 'img-catalogo-1',
        nome: 'Banner Kit Corporativo Brinday',
        url_ou_base64:
          'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&auto=format&fit=crop&q=80',
        largura: '450px',
        alt: 'Linha Corporativa de Cordões & Crachás Personalizados',
      },
    ],
    anexos: [
      {
        id: 'anexo-cat-1',
        nome_arquivo: 'Catalogo_Corporativo_Brinday_2026.pdf',
        tipo_mime: 'application/pdf',
        tamanho_bytes: 1458200,
        conteudo_base64_ou_url: 'https://brindes.brindaypersonalizados.com.br/catalogo.pdf',
      },
    ],
    ativo: true,
    criado_em: '2026-11-01T10:00:00Z',
  },
  {
    id: 'a1000001-0002-4000-a000-000000000002',
    nome: 'Proposta Comercial Enviada (Mudança de Fase)',
    categoria: 'Comercial',
    assunto: 'Proposta Comercial pronta para {{nome_empresa}} — {{titulo_negocio}}',
    corpo_html: `Olá {{nome_contato}},

Sua proposta comercial referente a "{{titulo_negocio}}" (Valor estimado: {{valor_negocio}}) acaba de avançar para a fase "{{etapa_funil}}".

Segue em anexo o detalhamento técnico e condições comerciais. Ficamos à disposição para aprovação do layout!`,
    imagens_corpo: [],
    anexos: [
      {
        id: 'anexo-prop-1',
        nome_arquivo: 'Condicoes_Comerciais_Padrao.pdf',
        tipo_mime: 'application/pdf',
        tamanho_bytes: 540120,
        conteudo_base64_ou_url: 'https://brindes.brindaypersonalizados.com.br/condicoes.pdf',
      },
    ],
    ativo: true,
    criado_em: '2026-11-02T14:30:00Z',
  },
  {
    id: 'a1000001-0003-4000-a000-000000000003',
    nome: 'Follow-up de Inatividade (Negócio Parado)',
    categoria: 'Follow-up',
    assunto: '{{nome_contato}}, ainda podemos avançar com o orçamento da {{nome_empresa}}?',
    corpo_html: `Olá {{nome_contato}}, tudo bem?

Notamos que nossa negociação "{{titulo_negocio}}" está aguardando retorno na etapa "{{etapa_funil}}" há {{dias_inatividade}} dias.

Gostaria de saber se ficou alguma dúvida sobre os prazos de produção, quantidades ou personalização dos itens. Caso queira ajustar algum item do orçamento, basta responder a este e-mail!`,
    imagens_corpo: [],
    anexos: [],
    ativo: true,
    criado_em: '2026-11-05T09:15:00Z',
  },
];

export const DADOS_AUTOMACOES_EMAIL: RegraAutomacaoEmail[] = [
  {
    id: 'b2000001-0001-4000-b000-000000000001',
    nome: 'Boas-vindas Automático — Entrada em Novo Lead',
    descricao: 'Dispara e-mail com catálogo em anexo assim que um novo card entra na primeira etapa do Funil Vendas.',
    gatilho: 'mudanca_etapa',
    funil_id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
    etapa_destino_id: 'e1111111-1111-4111-b111-111111111111',
    horas_atraso_envio: 0,
    template_id: 'a1000001-0001-4000-a000-000000000001',
    destinatario_tipo: 'contato_principal',
    copia_cc: '',
    apenas_horario_comercial: true,
    permitir_redisparo_retorno_etapa: false,
    interromper_se_ganho_perdido: 'ambos',
    exigir_consentimento: true,
    respeitar_descadastramento: true,
    ativo: true,
    total_disparos: 12,
    ultimo_disparo_em: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    criado_em: '2026-11-01T10:30:00Z',
  },
  {
    id: 'b2000001-0002-4000-b000-000000000002',
    nome: 'Aviso de Proposta Enviada (Mudança de Fase)',
    descricao: 'Envia o e-mail de formalização da proposta quando o card é movido para Proposta Enviada.',
    gatilho: 'mudanca_etapa',
    funil_id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
    etapa_destino_id: 'e4444444-4444-4444-b444-444444444444',
    horas_atraso_envio: 0,
    template_id: 'a1000001-0002-4000-a000-000000000002',
    destinatario_tipo: 'ambos',
    copia_cc: '',
    apenas_horario_comercial: true,
    permitir_redisparo_retorno_etapa: false,
    interromper_se_ganho_perdido: 'ambos',
    exigir_consentimento: true,
    respeitar_descadastramento: true,
    ativo: true,
    total_disparos: 8,
    ultimo_disparo_em: new Date(Date.now() - 3600 * 1000 * 18).toISOString(),
    criado_em: '2026-11-02T15:00:00Z',
  },
  {
    id: 'b2000001-0003-4000-b000-000000000003',
    nome: 'Recuperação por Tempo de Inatividade (5 dias sem atividade)',
    descricao: 'Envia follow-up automático quando o card fica 5 dias parado sem novas interações.',
    gatilho: 'tempo_inatividade',
    funil_id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
    etapa_destino_id: 'e3333333-3333-4333-b333-333333333333',
    dias_inatividade: 5,
    horas_atraso_envio: 0,
    template_id: 'a1000001-0003-4000-a000-000000000003',
    destinatario_tipo: 'contato_principal',
    copia_cc: '',
    apenas_horario_comercial: true,
    permitir_redisparo_retorno_etapa: false,
    interromper_se_ganho_perdido: 'ambos',
    exigir_consentimento: true,
    respeitar_descadastramento: true,
    ativo: true,
    total_disparos: 5,
    ultimo_disparo_em: new Date(Date.now() - 3600 * 1000 * 26).toISOString(),
    criado_em: '2026-11-05T10:00:00Z',
  },
];

export const DADOS_AUTOMACOES_PROGRAMADAS: AutomacaoProgramada[] = [
  {
    id: 'd4000001-0001-4000-d000-000000000001',
    automacao_id: 'b2000001-0003-4000-b000-000000000003',
    automacao_nome: 'Recuperação por Tempo de Inatividade (5 dias sem atividade)',
    template_id: 'a1000001-0003-4000-a000-000000000003',
    template_nome: 'Follow-up de Inatividade (Negócio Parado)',
    negocio_id: 'n4444444-4444-4444-f444-444444444444',
    negocio_titulo: 'Licenciamento Pro VidaPlus',
    etapa_id: 'e3333333-3333-4333-b333-333333333333',
    etapa_nome: 'Montando Orçamento',
    destinatario_email: 'camila@vidaplus.med.br',
    destinatario_nome: 'Dra. Camila Duarte',
    gatilho: 'tempo_inatividade',
    agendado_para: new Date(Date.now() + 3600 * 1000 * 48).toISOString(),
    status: 'agendada',
    criado_em: new Date().toISOString(),
  },
];

export const DADOS_LOGS_EMAIL: LogEnvioEmail[] = [
  {
    id: 'c3000001-0001-4000-c000-000000000001',
    automacao_id: 'b2000001-0001-4000-b000-000000000001',
    automacao_nome: 'Boas-vindas Automático — Entrada em Novo Lead',
    template_id: 'a1000001-0001-4000-a000-000000000001',
    template_nome: 'Boas-vindas & Catálogo de Brindes (Entrada no Funil)',
    negocio_id: 'n4444444-4444-4444-f444-444444444444',
    negocio_titulo: 'Licenciamento Pro VidaPlus',
    destinatario_email: 'camila@vidaplus.med.br',
    destinatario_nome: 'Dra. Camila Duarte',
    assunto: 'Olá Dra. Camila Duarte, recebemos sua solicitação na Brinday Personalizados!',
    gatilho: 'mudanca_etapa',
    qtd_anexos: 1,
    status: 'enviado',
    detalhes: 'Disparado automaticamente ao entrar na etapa Novo Lead (1 anexo incluído).',
    enviado_em: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
  },
];

// ============================================================================
// MÓDULO DE CAMPANHAS DE E-MAIL MARKETING, LISTAS & MÉTRICAS
// ============================================================================

export interface CriteriosSegmentacaoLista {
  status_negocio?: 'todos' | 'aberto' | 'ganho' | 'perdido';
  origem_contem?: string;
  produto_ou_interesse_contem?: string;
  utm_campaign_contem?: string;
  dias_inatividade_min?: number;
  incluir_todos_contatos?: boolean;
}

export interface ListaMarketing {
  id: string;
  nome: string;
  descricao: string;
  tipo: 'dinamica' | 'estatica';
  criterios: CriteriosSegmentacaoLista;
  contatos_estaticos?: Array<{ contato_id?: string; email: string; nome?: string }>;
  ativa: boolean;
  criado_em: string;
  atualizado_em?: string;
}

export type StatusCampanhaMarketing =
  | 'rascunho'
  | 'agendada'
  | 'enviando'
  | 'concluida'
  | 'pausada'
  | 'cancelada';

export interface CampanhaMarketing {
  id: string;
  nome: string;
  lista_id: string;
  lista_nome: string;
  template_id?: string;
  template_nome: string;
  assunto: string;
  nome_remetente: string;
  email_remetente: string;
  corpo_html: string;
  utm_campaign: string;
  utm_source: string;
  utm_medium: string;
  status: StatusCampanhaMarketing;
  agendado_para?: string;
  iniciada_em?: string;
  concluida_em?: string;
  total_destinatarios: number;
  total_enviados: number;
  total_entregues: number;
  total_aberturas: number;
  total_cliques: number;
  total_bounces_temp: number;
  total_bounces_perm: number;
  total_descadastramentos: number;
  total_conversoes: number;
  receita_convertida: number;
  criado_em: string;
  atualizado_em?: string;
}

export type StatusEnvioCampanha =
  | 'pendente'
  | 'enviado'
  | 'entregue'
  | 'bounce_temporario'
  | 'bounce_permanente'
  | 'erro'
  | 'bloqueado_optout';

export interface CampanhaEnvio {
  id: string;
  campanha_id: string;
  contato_id?: string;
  negocio_id?: string;
  destinatario_email: string;
  destinatario_nome?: string;
  tracking_token: string;
  status: StatusEnvioCampanha;
  smtp_codigo?: string;
  smtp_resposta?: string;
  motivo_erro?: string;
  enviado_em?: string;
  entregue_em?: string;
  aberto: boolean;
  aberturas_qtd: number;
  primeira_abertura_em?: string;
  ultima_abertura_em?: string;
  clicou: boolean;
  cliques_qtd: number;
  primeiro_clique_em?: string;
  descadastrado: boolean;
  descadastrado_em?: string;
  converteu: boolean;
  convertido_em?: string;
  valor_conversao: number;
}

export interface CampanhaClique {
  id: string;
  campanha_id: string;
  envio_id: string;
  contato_id?: string;
  destinatario_email: string;
  destinatario_nome?: string;
  url_destino: string;
  clicado_em: string;
}

export const DADOS_LISTAS_MARKETING: ListaMarketing[] = [
  {
    id: 'l1000001-0001-4000-a000-000000000001',
    nome: 'LEAD_CAMPANHA_NATAL',
    descricao: 'Leads captados ou interessados em kits e brindes corporativos de Natal e fim de ano.',
    tipo: 'dinamica',
    criterios: { utm_campaign_contem: 'natal', status_negocio: 'todos' },
    ativa: true,
    criado_em: '2026-10-15T10:00:00Z',
  },
  {
    id: 'l1000001-0002-4000-a000-000000000002',
    nome: 'LEAD_BLACK_FRIDAY',
    descricao: 'Contatos de campanhas promocionais de Black Friday e condições especiais.',
    tipo: 'dinamica',
    criterios: { utm_campaign_contem: 'black', status_negocio: 'todos' },
    ativa: true,
    criado_em: '2026-10-20T10:00:00Z',
  },
  {
    id: 'l1000001-0003-4000-a000-000000000003',
    nome: 'CLIENTES_ATIVOS',
    descricao: 'Clientes com pelo menos uma negociação ganha no CRM.',
    tipo: 'dinamica',
    criterios: { status_negocio: 'ganho' },
    ativa: true,
    criado_em: '2026-10-22T10:00:00Z',
  },
  {
    id: 'l1000001-0004-4000-a000-000000000004',
    nome: 'CLIENTES_INATIVOS',
    descricao: 'Negócios parados sem atualização há mais de 30 dias ou perdidos para reativação.',
    tipo: 'dinamica',
    criterios: { dias_inatividade_min: 30, status_negocio: 'todos' },
    ativa: true,
    criado_em: '2026-10-25T10:00:00Z',
  },
  {
    id: 'l1000001-0005-4000-a000-000000000005',
    nome: 'LEADS_EVENTOS',
    descricao: 'Leads oriundos de feiras, congressos, eventos corporativos e credenciamento.',
    tipo: 'dinamica',
    criterios: { origem_contem: 'evento', status_negocio: 'todos' },
    ativa: true,
    criado_em: '2026-10-28T10:00:00Z',
  },
  {
    id: 'l1000001-0006-4000-a000-000000000006',
    nome: 'LEADS_CORDÕES_E_CRACHÁS',
    descricao: 'Leads com interesse em cordões personalizados, crachás PVC e acessórios.',
    tipo: 'dinamica',
    criterios: { produto_ou_interesse_contem: 'cord', status_negocio: 'todos' },
    ativa: true,
    criado_em: '2026-11-01T10:00:00Z',
  },
  {
    id: 'l1000001-0007-4000-a000-000000000007',
    nome: 'LEADS_BRINDES_CORPORATIVOS',
    descricao: 'Base geral de leads qualificados para kits e brindes corporativos personalizados.',
    tipo: 'dinamica',
    criterios: { incluir_todos_contatos: true, status_negocio: 'todos' },
    ativa: true,
    criado_em: '2026-11-02T10:00:00Z',
  },
];

export const DADOS_CAMPANHAS_MARKETING: CampanhaMarketing[] = [
  {
    id: 'm1000001-0001-4000-a000-000000000001',
    nome: 'Campanha Kits Corporativos de Natal 2026',
    lista_id: 'l1000001-0007-4000-a000-000000000007',
    lista_nome: 'LEADS_BRINDES_CORPORATIVOS',
    template_id: 'a1000001-0001-4000-a000-000000000001',
    template_nome: 'Boas-vindas & Catálogo de Brindes (Entrada no Funil)',
    assunto: 'Garanta os Kits Corporativos de Natal da sua empresa com condições especiais',
    nome_remetente: 'Comercial Brinday Personalizados',
    email_remetente: 'comercial@brindaypersonalizados.com.br',
    corpo_html: `<p>Olá {{nome_contato}},</p>
<p>Antecipe os <strong>Kits Corporativos de Natal</strong> e brindes personalizados para colaboradores e clientes.</p>
<p><a href="https://brindes.brindaypersonalizados.com.br/?utm_campaign=natal_2026">Ver Catálogo e Solicitar Orçamento</a></p>`,
    utm_campaign: 'natal_2026',
    utm_source: 'alldot_crm',
    utm_medium: 'email_marketing',
    status: 'concluida',
    agendado_para: '2026-11-05T12:00:00Z',
    iniciada_em: '2026-11-05T12:00:05Z',
    concluida_em: '2026-11-05T12:04:30Z',
    total_destinatarios: 120,
    total_enviados: 118,
    total_entregues: 114,
    total_aberturas: 52,
    total_cliques: 21,
    total_bounces_temp: 2,
    total_bounces_perm: 2,
    total_descadastramentos: 1,
    total_conversoes: 6,
    receita_convertida: 28400,
    criado_em: '2026-11-04T15:00:00Z',
  },
  {
    id: 'm1000001-0002-4000-a000-000000000002',
    nome: 'Pré-Black Friday — Cordões e Crachás Personalizados',
    lista_id: 'l1000001-0006-4000-a000-000000000006',
    lista_nome: 'LEADS_CORDÕES_E_CRACHÁS',
    template_id: 'a1000001-0002-4000-a000-000000000002',
    template_nome: 'Proposta Comercial Enviada (Mudança de Fase)',
    assunto: 'Condição exclusiva de Black Friday em Cordões e Crachás para eventos',
    nome_remetente: 'Comercial Brinday Personalizados',
    email_remetente: 'comercial@brindaypersonalizados.com.br',
    corpo_html: `<p>Olá {{nome_contato}},</p>
<p>Aproveite lotes promocionais de <strong>Cordões Sublimados e Crachás em PVC</strong> com entrega expressa.</p>
<p><a href="https://brindes.brindaypersonalizados.com.br/?utm_campaign=black_friday_cordoes">Simular Pedido Agora</a></p>`,
    utm_campaign: 'black_friday_cordoes',
    utm_source: 'alldot_crm',
    utm_medium: 'email_marketing',
    status: 'concluida',
    agendado_para: '2026-11-10T14:00:00Z',
    iniciada_em: '2026-11-10T14:00:03Z',
    concluida_em: '2026-11-10T14:02:18Z',
    total_destinatarios: 85,
    total_enviados: 84,
    total_entregues: 81,
    total_aberturas: 39,
    total_cliques: 17,
    total_bounces_temp: 1,
    total_bounces_perm: 2,
    total_descadastramentos: 0,
    total_conversoes: 4,
    receita_convertida: 15900,
    criado_em: '2026-11-09T11:30:00Z',
  },
];

export const DADOS_CAMPANHAS_ENVIOS: CampanhaEnvio[] = [
  {
    id: 'ce100001-0001-4000-a000-000000000001',
    campanha_id: 'm1000001-0001-4000-a000-000000000001',
    destinatario_email: 'camila@vidaplus.med.br',
    destinatario_nome: 'Dra. Camila Duarte',
    tracking_token: 'tok-demo-natal-001',
    status: 'entregue',
    smtp_codigo: '250',
    smtp_resposta: '250 2.0.0 OK',
    enviado_em: '2026-11-05T12:00:10Z',
    entregue_em: '2026-11-05T12:00:12Z',
    aberto: true,
    aberturas_qtd: 3,
    primeira_abertura_em: '2026-11-05T12:18:00Z',
    ultima_abertura_em: '2026-11-05T16:40:00Z',
    clicou: true,
    cliques_qtd: 2,
    primeiro_clique_em: '2026-11-05T12:19:15Z',
    descadastrado: false,
    converteu: true,
    convertido_em: '2026-11-06T09:30:00Z',
    valor_conversao: 8500,
  },
  {
    id: 'ce100001-0002-4000-a000-000000000002',
    campanha_id: 'm1000001-0001-4000-a000-000000000001',
    destinatario_email: 'compras@eventotech.com.br',
    destinatario_nome: 'Mariana Souza',
    tracking_token: 'tok-demo-natal-002',
    status: 'bounce_permanente',
    smtp_codigo: '550',
    smtp_resposta: '550 5.1.1 User unknown',
    motivo_erro: 'Caixa postal inexistente (Hard Bounce)',
    enviado_em: '2026-11-05T12:00:15Z',
    aberto: false,
    aberturas_qtd: 0,
    clicou: false,
    cliques_qtd: 0,
    descadastrado: false,
    converteu: false,
    valor_conversao: 0,
  },
];

export const DADOS_CAMPANHAS_CLIQUES: CampanhaClique[] = [
  {
    id: 'cc100001-0001-4000-a000-000000000001',
    campanha_id: 'm1000001-0001-4000-a000-000000000001',
    envio_id: 'ce100001-0001-4000-a000-000000000001',
    destinatario_email: 'camila@vidaplus.med.br',
    destinatario_nome: 'Dra. Camila Duarte',
    url_destino: 'https://brindes.brindaypersonalizados.com.br/?utm_campaign=natal_2026',
    clicado_em: '2026-11-05T12:19:15Z',
  },
];


