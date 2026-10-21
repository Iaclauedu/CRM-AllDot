export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PapelUsuario = 'admin' | 'gestor' | 'vendedor';
export type StatusNegocio = 'aberto' | 'ganho' | 'perdido';
export type TipoAtividade = 'ligacao' | 'reuniao' | 'whatsapp' | 'email' | 'nota' | 'tarefa';
export type TipoCobrancaProduto = 'mensal' | 'a_vista' | 'anual';
export type TipoCampoPersonalizado = 'texto' | 'numero' | 'moeda' | 'data' | 'selecao' | 'booleano';

export interface Database {
  public: {
    Tables: {
      perfis: {
        Row: {
          id: string;
          nome_completo: string;
          email: string;
          avatar_url: string | null;
          telefone: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id: string;
          nome_completo: string;
          email: string;
          avatar_url?: string | null;
          telefone?: string | null;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          nome_completo?: string;
          email?: string;
          avatar_url?: string | null;
          telefone?: string | null;
          criado_em?: string;
          atualizado_em?: string;
        };
      };
      organizacoes: {
        Row: {
          id: string;
          nome: string;
          slug: string;
          cnpj: string | null;
          segmento: string | null;
          plano: 'starter' | 'pro' | 'enterprise';
          ativa: boolean;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          nome: string;
          slug: string;
          cnpj?: string | null;
          segmento?: string | null;
          plano?: 'starter' | 'pro' | 'enterprise';
          ativa?: boolean;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          slug?: string;
          cnpj?: string | null;
          segmento?: string | null;
          plano?: 'starter' | 'pro' | 'enterprise';
          ativa?: boolean;
          criado_em?: string;
          atualizado_em?: string;
        };
      };
      membros_organizacao: {
        Row: {
          id: string;
          organizacao_id: string;
          perfil_id: string;
          cargo: PapelUsuario;
          ativo: boolean;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          organizacao_id: string;
          perfil_id: string;
          cargo?: PapelUsuario;
          ativo?: boolean;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          organizacao_id?: string;
          perfil_id?: string;
          cargo?: PapelUsuario;
          ativo?: boolean;
          criado_em?: string;
          atualizado_em?: string;
        };
      };
      campos_definicoes: {
        Row: {
          id: string;
          organizacao_id: string;
          entidade: 'negocio' | 'empresa' | 'contato' | 'produto';
          nome_chave: string;
          label: string;
          tipo: TipoCampoPersonalizado;
          opcoes_json: Json;
          obrigatorio: boolean;
          ordem: number;
          criado_em: string;
        };
        Insert: {
          id?: string;
          organizacao_id: string;
          entidade: 'negocio' | 'empresa' | 'contato' | 'produto';
          nome_chave: string;
          label: string;
          tipo: TipoCampoPersonalizado;
          opcoes_json?: Json;
          obrigatorio?: boolean;
          ordem?: number;
          criado_em?: string;
        };
        Update: {
          id?: string;
          organizacao_id?: string;
          entidade?: 'negocio' | 'empresa' | 'contato' | 'produto';
          nome_chave?: string;
          label?: string;
          tipo?: TipoCampoPersonalizado;
          opcoes_json?: Json;
          obrigatorio?: boolean;
          ordem?: number;
          criado_em?: string;
        };
      };
      produtos: {
        Row: {
          id: string;
          organizacao_id: string;
          nome: string;
          descricao: string | null;
          codigo_sku: string | null;
          valor: number;
          tipo_cobranca: TipoCobrancaProduto;
          ativo: boolean;
          campos_personalizados: Record<string, Json>;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          organizacao_id: string;
          nome: string;
          descricao?: string | null;
          codigo_sku?: string | null;
          valor?: number;
          tipo_cobranca?: TipoCobrancaProduto;
          ativo?: boolean;
          campos_personalizados?: Record<string, Json>;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          organizacao_id?: string;
          nome?: string;
          descricao?: string | null;
          codigo_sku?: string | null;
          valor?: number;
          tipo_cobranca?: TipoCobrancaProduto;
          ativo?: boolean;
          campos_personalizados?: Record<string, Json>;
          criado_em?: string;
          atualizado_em?: string;
        };
      };
      funis: {
        Row: {
          id: string;
          organizacao_id: string;
          nome: string;
          descricao: string | null;
          padrao: boolean;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          organizacao_id: string;
          nome: string;
          descricao?: string | null;
          padrao?: boolean;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          organizacao_id?: string;
          nome?: string;
          descricao?: string | null;
          padrao?: boolean;
          criado_em?: string;
          atualizado_em?: string;
        };
      };
      etapas_funil: {
        Row: {
          id: string;
          organizacao_id: string;
          funil_id: string;
          nome: string;
          ordem: number;
          probabilidade_fechamento: number;
          dias_estagnacao: number;
          criado_em: string;
        };
        Insert: {
          id?: string;
          organizacao_id: string;
          funil_id: string;
          nome: string;
          ordem: number;
          probabilidade_fechamento?: number;
          dias_estagnacao?: number;
          criado_em?: string;
        };
        Update: {
          id?: string;
          organizacao_id?: string;
          funil_id?: string;
          nome?: string;
          ordem?: number;
          probabilidade_fechamento?: number;
          dias_estagnacao?: number;
          criado_em?: string;
        };
      };
      empresas: {
        Row: {
          id: string;
          organizacao_id: string;
          nome: string;
          cnpj: string | null;
          dominio: string | null;
          segmento: string | null;
          responsavel_id: string | null;
          campos_personalizados: Record<string, Json>;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          organizacao_id: string;
          nome: string;
          cnpj?: string | null;
          dominio?: string | null;
          segmento?: string | null;
          responsavel_id?: string | null;
          campos_personalizados?: Record<string, Json>;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          organizacao_id?: string;
          nome?: string;
          cnpj?: string | null;
          dominio?: string | null;
          segmento?: string | null;
          responsavel_id?: string | null;
          campos_personalizados?: Record<string, Json>;
          criado_em?: string;
          atualizado_em?: string;
        };
      };
      contatos: {
        Row: {
          id: string;
          organizacao_id: string;
          empresa_id: string | null;
          nome: string;
          email: string | null;
          telefone_whatsapp: string | null;
          cargo: string | null;
          responsavel_id: string | null;
          campos_personalizados: Record<string, Json>;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          organizacao_id: string;
          empresa_id?: string | null;
          nome: string;
          email?: string | null;
          telefone_whatsapp?: string | null;
          cargo?: string | null;
          responsavel_id?: string | null;
          campos_personalizados?: Record<string, Json>;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          organizacao_id?: string;
          empresa_id?: string | null;
          nome?: string;
          email?: string | null;
          telefone_whatsapp?: string | null;
          cargo?: string | null;
          responsavel_id?: string | null;
          campos_personalizados?: Record<string, Json>;
          criado_em?: string;
          atualizado_em?: string;
        };
      };
      negocios: {
        Row: {
          id: string;
          organizacao_id: string;
          titulo: string;
          valor: number;
          moeda: string;
          funil_id: string;
          etapa_id: string;
          contato_id: string | null;
          empresa_id: string | null;
          responsavel_id: string | null;
          status: StatusNegocio;
          motivo_perda: string | null;
          data_fechamento_esperada: string | null;
          ultima_atividade_em: string;
          campos_personalizados: Record<string, Json>;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          organizacao_id: string;
          titulo: string;
          valor?: number;
          moeda?: string;
          funil_id: string;
          etapa_id: string;
          contato_id?: string | null;
          empresa_id?: string | null;
          responsavel_id?: string | null;
          status?: StatusNegocio;
          motivo_perda?: string | null;
          data_fechamento_esperada?: string | null;
          ultima_atividade_em?: string;
          campos_personalizados?: Record<string, Json>;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          organizacao_id?: string;
          titulo?: string;
          valor?: number;
          moeda?: string;
          funil_id?: string;
          etapa_id?: string;
          contato_id?: string | null;
          empresa_id?: string | null;
          responsavel_id?: string | null;
          status?: StatusNegocio;
          motivo_perda?: string | null;
          data_fechamento_esperada?: string | null;
          ultima_atividade_em?: string;
          campos_personalizados?: Record<string, Json>;
          criado_em?: string;
          atualizado_em?: string;
        };
      };
      negocios_produtos: {
        Row: {
          id: string;
          organizacao_id: string;
          negocio_id: string;
          produto_id: string;
          quantidade: number;
          valor_unitario: number;
          subtotal: number;
          criado_em: string;
        };
        Insert: {
          id?: string;
          organizacao_id: string;
          negocio_id: string;
          produto_id: string;
          quantidade?: number;
          valor_unitario: number;
          criado_em?: string;
        };
        Update: {
          id?: string;
          organizacao_id?: string;
          negocio_id?: string;
          produto_id?: string;
          quantidade?: number;
          valor_unitario?: number;
          criado_em?: string;
        };
      };
      atividades: {
        Row: {
          id: string;
          organizacao_id: string;
          negocio_id: string;
          contato_id: string | null;
          empresa_id: string | null;
          tipo: TipoAtividade;
          titulo: string;
          descricao: string | null;
          data_vencimento: string | null;
          concluida_em: string | null;
          criado_por: string;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          organizacao_id: string;
          negocio_id: string;
          contato_id?: string | null;
          empresa_id?: string | null;
          tipo: TipoAtividade;
          titulo: string;
          descricao?: string | null;
          data_vencimento?: string | null;
          concluida_em?: string | null;
          criado_por: string;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          organizacao_id?: string;
          negocio_id?: string;
          contato_id?: string | null;
          empresa_id?: string | null;
          tipo?: TipoAtividade;
          titulo?: string;
          descricao?: string | null;
          data_vencimento?: string | null;
          concluida_em?: string | null;
          criado_por?: string;
          criado_em?: string;
          atualizado_em?: string;
        };
      };
      historico_etapas: {
        Row: {
          id: string;
          organizacao_id: string;
          negocio_id: string;
          etapa_anterior_id: string | null;
          etapa_nova_id: string;
          alterado_por: string | null;
          alterado_em: string;
          duracao_segundos: number;
        };
        Insert: {
          id?: string;
          organizacao_id: string;
          negocio_id: string;
          etapa_anterior_id?: string | null;
          etapa_nova_id: string;
          alterado_por?: string | null;
          alterado_em?: string;
          duracao_segundos?: number;
        };
        Update: {
          id?: string;
          organizacao_id?: string;
          negocio_id?: string;
          etapa_anterior_id?: string | null;
          etapa_nova_id?: string;
          alterado_por?: string | null;
          alterado_em?: string;
          duracao_segundos?: number;
        };
      };
    };
    Views: {
      vw_metricas_funil: {
        Row: {
          etapa_id: string;
          funil_id: string;
          organizacao_id: string;
          etapa_nome: string;
          etapa_ordem: number;
          probabilidade_fechamento: number;
          dias_estagnacao: number;
          total_negocios: number;
          valor_total: number;
          valor_ponderado_forecast: number;
          total_estagnados: number;
        };
      };
      vw_metricas_dashboard: {
        Row: {
          organizacao_id: string;
          total_abertos: number;
          total_ganhos: number;
          total_perdidos: number;
          receita_ganha_total: number;
          receita_em_aberto_pipeline: number;
          taxa_conversao_percentual: number;
        };
      };
    };
    Functions: {
      fn_criar_organizacao_com_funil_padrao: {
        Args: {
          p_nome: string;
          p_cnpj?: string;
          p_segmento?: string;
        };
        Returns: Json;
      };
      fn_usuario_pertence_organizacao: {
        Args: {
          p_organizacao_id: string;
        };
        Returns: boolean;
      };
      fn_usuario_cargo_organizacao: {
        Args: {
          p_organizacao_id: string;
        };
        Returns: string;
      };
    };
  };
}
