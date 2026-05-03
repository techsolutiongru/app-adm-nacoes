'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Package, Wrench, Users, BarChart3,
  Settings, LogOut, Menu, X, ChevronRight
} from 'lucide-react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/patrimonio', label: 'Patrimônio', icon: Package },
  { href: '/manutencao', label: 'Ordens de Serviço', icon: Wrench },
  { href: '/escala', label: 'Escala', icon: Users },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
]

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
    <div className="flex h-screen bg-[#0f0f0f] overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="sidebar hidden lg:flex">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#2a2a2a] border border-[#3a3a3a] flex items-center justify-center overflow-hidden flex-shrink-0">
              <Image src="/logo-ccb-light.png" alt="CCB" width={28} height={28} className="object-contain filter invert opacity-80" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[#e0e0e0] leading-tight">ADM CCB</div>
              <div className="text-xs text-[#555555]">Nações ERP</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={16} strokeWidth={isActive ? 2.5 : 1.75} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={12} className="text-[#555555]" />}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-2 py-3 border-t border-[#2a2a2a]">
          <button
            onClick={handleLogout}
            className="sidebar-item w-full text-[#f87171] hover:bg-[#3d1515]"
          >
            <LogOut size={16} strokeWidth={1.75} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
          <aside className="sidebar animate-slide-in">
            <div className="px-4 py-5 border-b border-[#2a2a2a] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#2a2a2a] border border-[#3a3a3a] flex items-center justify-center overflow-hidden">
                  <Image src="/logo-ccb-light.png" alt="CCB" width={28} height={28} className="object-contain filter invert opacity-80" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#e0e0e0]">ADM CCB</div>
                  <div className="text-xs text-[#555555]">Nações ERP</div>
                </div>
              </div>
              <button onClick={() => setMobileOpen(false)} className="btn-icon text-[#666666]">
                <X size={16} />
              </button>
            </div>
            <nav className="flex-1 py-4 space-y-0.5">
              {navItems.map(({ href, label, icon: Icon }) => {
                const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`sidebar-item ${isActive ? 'active' : ''}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon size={16} strokeWidth={isActive ? 2.5 : 1.75} />
                    <span className="flex-1">{label}</span>
                  </Link>
                )
              })}
            </nav>
            <div className="px-2 py-3 border-t border-[#2a2a2a]">
              <button onClick={handleLogout} className="sidebar-item w-full text-[#f87171]">
                <LogOut size={16} />
                <span>Sair</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col lg:ml-60 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a] bg-[#141414]">
          <button onClick={() => setMobileOpen(true)} className="btn-icon text-[#888888]">
            <Menu size={18} />
          </button>
          <div className="text-sm font-semibold text-[#e0e0e0]">ADM CCB — Nações</div>
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
