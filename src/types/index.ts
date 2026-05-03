export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Asset {
  id: string
  nome_item: string
  descricao: string | null
  numero_serie: string | null
  nota_fiscal: string | null
  garantia_status: string | null
  data_garantia_fim: string | null
  possui_manutencao: boolean
  qr_code_url: string | null
  created_at: string
  created_by: string | null
}

export interface AssetLog {
  id: string
  asset_id: string
  tipo: string
  descricao: string
  prestador_nome: string | null
  prestador_contato: string | null
  created_at: string
  created_by: string | null
}

export interface AssetMaintenanceRule {
  id: string
  asset_id: string
  tipo_manutencao: string
  periodicidade_dias: number
  proxima_execucao: string | null
  ativo: boolean
}

export interface MaintenanceCategory {
  id: string
  nome: string
}

export interface MaintenanceOrder {
  id: string
  prioridade: string
  data_solicitacao: string
  prazo_dias: number
  descricao: string
  categoria_id: string | null
  responsavel: string | null
  valor_estimado: string | null
  status: string
  observacao: string | null
  created_at: string
  created_by: string | null
  // joined
  categoria?: MaintenanceCategory
  // computed
  atrasado?: boolean
}

export interface Volunteer {
  id: string
  numero: number
  nome: string
  telefone: string | null
  ativo: boolean
  created_at: string
}

export interface Service {
  id: string
  nome: string
  dia_semana: number
  periodo: string
  tipo: string
  ativo: boolean
}

export interface Location {
  id: string
  nome: string
  tipo_culto: string
  quantidade_pessoas: number
  ativo: boolean
}

export interface Schedule {
  id: string
  nome: string
  data_inicio: string
  data_fim: string
  status: string
  created_at: string
  created_by: string | null
}

export interface ScheduleItem {
  id: string
  schedule_id: string
  service_id: string
  location_id: string
  volunteer_id: string | null
  data: string
  manual: boolean
  created_at: string
  // joined
  service?: Service
  location?: Location
  volunteer?: Volunteer
}

export interface VolunteerRestriction {
  id: string
  volunteer_id: string
  tipo: string
  operador: string
  valor: Json
  created_at: string
}

export interface Settings {
  id: string
  emails_admin: string[]
  dias_alerta: number
  gerar_qrcode: boolean
  updated_at: string
}
