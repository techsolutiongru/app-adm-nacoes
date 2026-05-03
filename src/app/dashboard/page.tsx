'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Package, Wrench, AlertTriangle, Clock, TrendingUp, CheckCircle2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { format, isAfter, parseISO, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const PIE_PALETTE = ['#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb']

export default function DashboardPage() {
  const supabase = createClient()
  const [stats, setStats] = useState({
    totalAssets: 0, ordensAbertas: 0, ordensAtrasadas: 0, proximaManutencao: null as string | null,
  })
  const [manutencaoMes, setManutencaoMes] = useState<{ mes: string; total: number }[]>([])
  const [categoriaStats, setCategoriaStats] = useState<{ nome: string; valor: number }[]>([])
  const [ordensRecentes, setOrdensRecentes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard() {
    try {
      const [assetsRes, ordensRes, manutRes] = await Promise.all([
        supabase.from('assets').select('id', { count: 'exact', head: true }),
        supabase.from('maintenance_orders').select('id, data_solicitacao, prazo_dias, status'),
        supabase.from('asset_maintenance_rules').select('proxima_execucao').eq('ativo', true).order('proxima_execucao').limit(1),
      ])
      const ordens = ordensRes.data || []
      const abertas = ordens.filter(o => o.status !== 'Concluído').length
      const atrasadas = ordens.filter(o => {
        if (o.status === 'Concluído') return false
        return isAfter(new Date(), addDays(parseISO(o.data_solicitacao), o.prazo_dias))
      }).length
      setStats({ totalAssets: assetsRes.count || 0, ordensAbertas: abertas, ordensAtrasadas: atrasadas, proximaManutencao: manutRes.data?.[0]?.proxima_execucao || null })

      const { data: ordensAll } = await supabase.from('maintenance_orders').select('data_solicitacao').order('data_solicitacao')
      const mesesMap: Record<string, number> = {}
      const now = new Date()
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        mesesMap[format(d, 'MMM/yy', { locale: ptBR })] = 0
      }
      ordensAll?.forEach(o => {
        const mes = format(parseISO(o.data_solicitacao), 'MMM/yy', { locale: ptBR })
        if (mes in mesesMap) mesesMap[mes]++
      })
      setManutencaoMes(Object.entries(mesesMap).map(([mes, total]) => ({ mes, total })))

      const { data: catData } = await supabase.from('maintenance_orders').select('categoria_id, maintenance_categories(nome)')
      const catMap: Record<string, number> = {}
      catData?.forEach((o: any) => {
        const nome = o.maintenance_categories?.nome || 'Sem categoria'
        catMap[nome] = (catMap[nome] || 0) + 1
      })
      setCategoriaStats(Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([nome, valor]) => ({ nome, valor })))

      const { data: recentes } = await supabase.from('maintenance_orders').select('*, maintenance_categories(nome)').order('created_at', { ascending: false }).limit(5)
      setOrdensRecentes(recentes || [])
    } finally { setLoading(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner" /></div>

  const statCards = [
    { label: 'Total de Ativos', value: stats.totalAssets, icon: Package, iconColor: '#2563eb', iconBg: '#dbeafe' },
    { label: 'Ordens Abertas', value: stats.ordensAbertas, icon: Wrench, iconColor: '#d97706', iconBg: '#fef3c7' },
    { label: 'Ordens Atrasadas', value: stats.ordensAtrasadas, icon: AlertTriangle, iconColor: '#dc2626', iconBg: '#fee2e2' },
    {
      label: 'Próxima Manutenção',
      value: stats.proximaManutencao ? format(parseISO(stats.proximaManutencao), 'dd/MM/yy') : '—',
      icon: Clock, iconColor: '#16a34a', iconBg: '#dcfce7'
    },
  ]

  const tooltipStyle = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#111827', fontSize: 12, boxShadow: '0 4px 6px -1px rgb(0 0 0/0.1)' }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Visão geral — {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map(({ label, value, icon: Icon, iconColor, iconBg }) => (
          <div key={label} className="stat-card">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: iconBg }}>
              <Icon size={18} style={{ color: iconColor }} strokeWidth={1.75} />
            </div>
            <div>
              <div className="stat-value">{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={15} className="text-gray-400" strokeWidth={1.75} />
            <span className="text-sm font-medium text-gray-700">Ordens por Mês</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={manutencaoMes} barSize={20}>
              <XAxis dataKey="mes" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={25} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f3f4f6' }} />
              <Bar dataKey="total" fill="#374151" radius={[4, 4, 0, 0]} name="Ordens" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 size={15} className="text-gray-400" strokeWidth={1.75} />
            <span className="text-sm font-medium text-gray-700">Por Categoria</span>
          </div>
          {categoriaStats.length > 0 ? (
            <div className="flex items-center gap-4">
              <PieChart width={140} height={140}>
                <Pie data={categoriaStats} dataKey="valor" cx="50%" cy="50%" outerRadius={60} strokeWidth={2} stroke="#fff">
                  {categoriaStats.map((_, i) => <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
              <div className="flex flex-col gap-2 flex-1">
                {categoriaStats.map((cat, i) => (
                  <div key={cat.nome} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: PIE_PALETTE[i % PIE_PALETTE.length] }} />
                    <span className="text-gray-500 truncate flex-1">{cat.nome}</span>
                    <span className="text-gray-800 font-medium">{cat.valor}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state py-8"><p className="text-gray-400 text-sm">Nenhuma ordem registrada</p></div>
          )}
        </div>
      </div>

      {/* Recent orders */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-gray-700">Ordens Recentes</span>
          <a href="/dashboard/manutencao" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Ver todas →</a>
        </div>
        {ordensRecentes.length === 0 ? (
          <div className="empty-state py-6"><p className="text-gray-400 text-sm">Nenhuma ordem de serviço</p></div>
        ) : (
          <div className="space-y-2">
            {ordensRecentes.map(ordem => {
              const prazo = addDays(parseISO(ordem.data_solicitacao), ordem.prazo_dias)
              const atrasada = ordem.status !== 'Concluído' && isAfter(new Date(), prazo)
              const dotColor = atrasada ? '#dc2626' : ordem.status === 'Concluído' ? '#16a34a' : ordem.status === 'Em andamento' ? '#d97706' : '#9ca3af'
              const badgeCls = atrasada ? 'badge-danger' : ordem.status === 'Concluído' ? 'badge-success' : ordem.status === 'Em andamento' ? 'badge-warning' : 'badge-default'
              return (
                <div key={ordem.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dotColor }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{ordem.descricao}</p>
                    <p className="text-xs text-gray-400">{(ordem.maintenance_categories as any)?.nome || 'Sem categoria'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`badge ${badgeCls}`}>{atrasada ? 'Atrasado' : ordem.status}</span>
                    <span className="text-xs text-gray-400">{format(parseISO(ordem.data_solicitacao), 'dd/MM/yy')}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
