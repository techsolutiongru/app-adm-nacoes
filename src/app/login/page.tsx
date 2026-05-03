'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error('Email ou senha inválidos')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)' }}>
      {/* Decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, #d1d5db, transparent)' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, #d1d5db, transparent)' }} />
      </div>

      <div className="relative w-full max-w-sm animate-scale-in px-4">
        <div className="bg-white rounded-2xl p-8" style={{ border: '1px solid #e5e7eb', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}>
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 overflow-hidden" style={{ background: '#f3f4f6', border: '1px solid #e5e7eb' }}>
              <Image
                src="/logo-ccb-light.png"
                alt="CCB Nações"
                width={64}
                height={64}
                className="object-contain opacity-80"
              />
            </div>
            <h1 className="text-lg font-bold text-gray-900 text-center leading-tight">
              ADM CCB — Nações
            </h1>
            <p className="text-xs text-gray-400 mt-1">Sistema de Gestão</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="input-group">
              <label htmlFor="login-email" className="label">Email</label>
              <input
                id="login-email"
                type="email"
                className="input"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="login-password" className="label">Senha</label>
              <input
                id="login-password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center mt-2"
            >
              {loading ? (
                <><span className="spinner" /> Entrando...</>
              ) : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            Congregação Cristã no Brasil
          </p>
        </div>
      </div>
    </div>
  )
}
