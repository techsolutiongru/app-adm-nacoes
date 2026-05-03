import { createBrowserClient } from '@supabase/ssr'

// ID mock para ambiente de desenvolvimento (bypass de auth)
// Usado como created_by quando não há usuário autenticado
export const DEV_USER_ID = '00000000-0000-0000-0000-000000000001'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Retorna o ID do usuário atual.
 * Em modo dev (bypass), retorna um UUID mock para não quebrar campos created_by.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) return user.id

  // Modo dev: retorna UUID mock se bypass ativo
  if (process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true') {
    return null // null é aceito por created_by (ON DELETE SET NULL)
  }

  return null
}
