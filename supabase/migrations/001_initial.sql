-- ============================================
-- ADM CCB - NAÇÕES - ERP
-- Script SQL completo para Supabase
-- ============================================

-- Habilitar extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- MÓDULO DE PATRIMÔNIO
-- ============================================

CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_item text NOT NULL,
  descricao text,
  numero_serie text,
  nota_fiscal text,
  garantia_status text DEFAULT 'Sem garantia',
  data_garantia_fim date,
  possui_manutencao boolean DEFAULT false,
  qr_code_url text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS asset_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  descricao text NOT NULL,
  prestador_nome text,
  prestador_contato text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS asset_maintenance_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  tipo_manutencao text NOT NULL,
  periodicidade_dias int NOT NULL DEFAULT 30,
  proxima_execucao date,
  ativo boolean DEFAULT true
);

-- ============================================
-- MÓDULO DE ORDENS DE SERVIÇO
-- ============================================

CREATE TABLE IF NOT EXISTS maintenance_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE
);

INSERT INTO maintenance_categories (nome) VALUES
  ('Manutenção geral'),
  ('Pintura'),
  ('Elétrica'),
  ('Hidráulica'),
  ('Jardinagem'),
  ('Limpeza'),
  ('Logística'),
  ('Vidraçaria'),
  ('Serralheria'),
  ('Outros')
ON CONFLICT (nome) DO NOTHING;

CREATE TABLE IF NOT EXISTS maintenance_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prioridade text NOT NULL DEFAULT 'Normal',
  data_solicitacao timestamptz DEFAULT now(),
  prazo_dias int NOT NULL DEFAULT 7,
  descricao text NOT NULL,
  categoria_id uuid REFERENCES maintenance_categories(id) ON DELETE SET NULL,
  responsavel text,
  valor_estimado text,
  status text NOT NULL DEFAULT 'Aberto',
  observacao text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================
-- MÓDULO DE ESCALA DE VOLUNTÁRIOS
-- ============================================

CREATE TABLE IF NOT EXISTS volunteers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero int NOT NULL UNIQUE,
  nome text NOT NULL,
  telefone text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  dia_semana int NOT NULL, -- 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sab, 6=Dom
  periodo text NOT NULL,   -- manhã, tarde, noite
  tipo text NOT NULL,      -- oficial, jovens
  ativo boolean DEFAULT true
);

INSERT INTO services (nome, dia_semana, periodo, tipo) VALUES
  ('Terça-feira Tarde', 2, 'tarde', 'oficial'),
  ('Quinta-feira Noite', 4, 'noite', 'oficial'),
  ('Sábado Noite', 5, 'noite', 'oficial'),
  ('Domingo Manhã (Jovens)', 0, 'manhã', 'jovens'),
  ('Domingo Noite', 0, 'noite', 'oficial')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo_culto text NOT NULL DEFAULT 'oficial', -- oficial ou jovens
  quantidade_pessoas int DEFAULT 2,
  ativo boolean DEFAULT true
);

INSERT INTO locations (nome, tipo_culto, quantidade_pessoas) VALUES
  ('Porta Frontal', 'oficial', 2),
  ('Porta Lateral', 'oficial', 2),
  ('WC Lateral', 'oficial', 2),
  ('Galeria', 'oficial', 1),
  ('WC Galeria', 'oficial', 2),
  ('Porta Frontal', 'jovens', 2),
  ('Porta Lateral', 'jovens', 1),
  ('Banheiro Lateral', 'jovens', 2)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  status text DEFAULT 'Rascunho', -- Rascunho, Publicado
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS schedule_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id),
  location_id uuid NOT NULL REFERENCES locations(id),
  volunteer_id uuid REFERENCES volunteers(id) ON DELETE SET NULL,
  data date NOT NULL,
  manual boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS volunteer_restrictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id uuid NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  tipo text NOT NULL,     -- dia_semana, culto, periodo, tipo_culto
  operador text NOT NULL, -- bloquear, permitir_apenas
  valor jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- CONFIGURAÇÕES
-- ============================================

CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  emails_admin jsonb DEFAULT '["som.alves.silva@gmail.com"]',
  dias_alerta int DEFAULT 7,
  gerar_qrcode boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO settings (emails_admin, dias_alerta, gerar_qrcode)
VALUES ('["som.alves.silva@gmail.com"]', 7, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- RLS (Row Level Security)
-- ============================================

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_maintenance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Políticas: apenas autenticados podem ler/escrever (exceto assets público)
CREATE POLICY "Authenticated users full access assets" ON assets
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Página pública do QR Code pode ler assets sem login
CREATE POLICY "Public read assets" ON assets
  FOR SELECT TO anon USING (true);

CREATE POLICY "Authenticated users full access asset_logs" ON asset_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Logs são imutáveis: não permite UPDATE nem DELETE
CREATE POLICY "No update asset_logs" ON asset_logs
  FOR UPDATE TO authenticated USING (false);

CREATE POLICY "No delete asset_logs" ON asset_logs
  FOR DELETE TO authenticated USING (false);

CREATE POLICY "Authenticated users full access asset_maintenance_rules" ON asset_maintenance_rules
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access maintenance_categories" ON maintenance_categories
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access maintenance_orders" ON maintenance_orders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access volunteers" ON volunteers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access services" ON services
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access locations" ON locations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access schedules" ON schedules
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access schedule_items" ON schedule_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access volunteer_restrictions" ON volunteer_restrictions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access settings" ON settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
