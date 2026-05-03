-- ============================================
-- Migração: Novas Features de Manutenção e Usuários (Resend)
-- ============================================

-- 1. Criação da Tabela users
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid REFERENCES auth.users(id),
  nome text NOT NULL,
  email text NOT NULL UNIQUE,
  role text DEFAULT 'user',
  created_at timestamptz DEFAULT now()
);

-- Inserir o admin padrão (verificar se não existe)
INSERT INTO users (nome, email, role) 
VALUES ('Administrador', 'som.alves.silva@gmail.com', 'admin')
ON CONFLICT (email) DO NOTHING;

-- 2. Criação da Tabela maintenance
CREATE TABLE IF NOT EXISTS maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  descricao text NOT NULL,
  data_programada date NOT NULL,
  data_realizada date,
  status text DEFAULT 'pendente', -- pendente, concluída, cancelada
  last_notified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- RLS (Row Level Security)
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance ENABLE ROW LEVEL SECURITY;

-- Políticas de DEV: permitir tudo para `anon` (já que estamos rodando em ambiente dev/bypass auth)
CREATE POLICY "DEV anon all users" ON users FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "DEV anon all maintenance" ON maintenance FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================
-- Opcional para produção:
-- Políticas para Authenticated
-- ============================================
CREATE POLICY "Authenticated users full access users" ON users
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access maintenance" ON maintenance
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
