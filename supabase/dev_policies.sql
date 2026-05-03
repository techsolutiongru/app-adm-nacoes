-- ============================================================
-- ADM CCB NAÇÕES — POLÍTICAS DE DESENVOLVIMENTO (DEV ONLY)
-- ============================================================
-- Execute este script no Supabase SQL Editor:
-- Dashboard → SQL Editor → New Query → Cole e clique em Run
--
-- ⚠️ REMOVA ESTAS POLICIES ANTES DE IR PARA PRODUÇÃO ⚠️
-- ============================================================

-- ASSETS: liberar anon para ler e escrever
CREATE POLICY IF NOT EXISTS "DEV anon full access assets"
  ON assets FOR ALL TO anon USING (true) WITH CHECK (true);

-- ASSET_LOGS: liberar anon
CREATE POLICY IF NOT EXISTS "DEV anon full access asset_logs"
  ON asset_logs FOR ALL TO anon USING (true) WITH CHECK (true);

-- ASSET_MAINTENANCE_RULES: liberar anon
CREATE POLICY IF NOT EXISTS "DEV anon full access asset_maintenance_rules"
  ON asset_maintenance_rules FOR ALL TO anon USING (true) WITH CHECK (true);

-- MAINTENANCE_CATEGORIES: liberar anon para SELECT (categorias não carregam!)
CREATE POLICY IF NOT EXISTS "DEV anon full access maintenance_categories"
  ON maintenance_categories FOR ALL TO anon USING (true) WITH CHECK (true);

-- MAINTENANCE_ORDERS: liberar anon
CREATE POLICY IF NOT EXISTS "DEV anon full access maintenance_orders"
  ON maintenance_orders FOR ALL TO anon USING (true) WITH CHECK (true);

-- VOLUNTEERS: liberar anon
CREATE POLICY IF NOT EXISTS "DEV anon full access volunteers"
  ON volunteers FOR ALL TO anon USING (true) WITH CHECK (true);

-- SERVICES: liberar anon
CREATE POLICY IF NOT EXISTS "DEV anon full access services"
  ON services FOR ALL TO anon USING (true) WITH CHECK (true);

-- LOCATIONS: liberar anon
CREATE POLICY IF NOT EXISTS "DEV anon full access locations"
  ON locations FOR ALL TO anon USING (true) WITH CHECK (true);

-- SCHEDULES: liberar anon
CREATE POLICY IF NOT EXISTS "DEV anon full access schedules"
  ON schedules FOR ALL TO anon USING (true) WITH CHECK (true);

-- SCHEDULE_ITEMS: liberar anon
CREATE POLICY IF NOT EXISTS "DEV anon full access schedule_items"
  ON schedule_items FOR ALL TO anon USING (true) WITH CHECK (true);

-- VOLUNTEER_RESTRICTIONS: liberar anon
CREATE POLICY IF NOT EXISTS "DEV anon full access volunteer_restrictions"
  ON volunteer_restrictions FOR ALL TO anon USING (true) WITH CHECK (true);

-- SETTINGS: liberar anon para SELECT e UPDATE
CREATE POLICY IF NOT EXISTS "DEV anon full access settings"
  ON settings FOR ALL TO anon USING (true) WITH CHECK (true);

-- Verificação: listar todas as policies ativas
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
