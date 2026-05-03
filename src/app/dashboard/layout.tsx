'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Package, Wrench, Users, BarChart3,
  Settings, LogOut, Menu, X, ChevronRight
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/patrimonio', label: 'Patrimônio', icon: Package },
  { href: '/dashboard/manutencao', label: 'Ordens de Serviço', icon: Wrench },
  { href: '/dashboard/escala', label: 'Escala', icon: Users },
  { href: '/dashboard/relatorios', label: 'Relatórios', icon: BarChart3 },
  { href: '/dashboard/configuracoes', label: 'Configurações', icon: Settings },
]

function SidebarContent({ pathname, onLogout, onClose }: {
  pathname: string
  onLogout: () => void
  onClose?: () => void
}) {
  return (
    <>
      {/* Logo */}
      <div className="px-4 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <Image src="/logo-ccb-light.png" alt="CCB" width={28} height={28} className="object-contain opacity-90" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white leading-tight">ADM CCB</div>
            <div className="text-xs" style={{ color: '#9ca3af' }}>Nações ERP</div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 rounded-lg hover:bg-white/10 transition-colors">
            <X size={16} className="text-gray-400" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} strokeWidth={isActive ? 2.5 : 1.75} />
              <span className="flex-1">{label}</span>
              {isActive && <ChevronRight size={12} className="opacity-50" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <button
          onClick={onLogout}
          className="sidebar-item w-full"
          style={{ color: '#f87171' }}
        >
          <LogOut size={16} strokeWidth={1.75} />
          <span>Sair</span>
        </button>
      </div>
    </>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f3f4f6' }}>
      {/* Sidebar Desktop */}
      <aside className="sidebar hidden lg:flex">
        <SidebarContent pathname={pathname} onLogout={handleLogout} />
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="sidebar animate-slide-in">
            <SidebarContent pathname={pathname} onLogout={handleLogout} onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col lg:ml-60 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Menu size={18} className="text-gray-600" />
          </button>
          <div className="text-sm font-semibold text-gray-800">ADM CCB — Nações</div>
          <div className="w-8" />
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="animate-fade-in">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
