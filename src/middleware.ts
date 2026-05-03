import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // ── DEV BYPASS ──────────────────────────────────────────────────────────────
  // Permite acesso sem autenticação real em ambiente de desenvolvimento.
  // Remova ou defina como 'false' antes de ir para produção.
  if (process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true') {
    // Redireciona /login para /dashboard no modo bypass
    if (request.nextUrl.pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next({ request })
  }
  // ────────────────────────────────────────────────────────────────────────────

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isPublicRoute =
    request.nextUrl.pathname.startsWith('/asset/') ||
    request.nextUrl.pathname === '/login'

  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
