'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Package, Wrench, AlertTriangle, Clock, TrendingUp, CheckCircle2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { format, isAfter, parseISO, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const GRAY_PALETTE = ['#4a4a4a', '#5a5a5a', '#6a6a6a', '#7a7a7a', '#8a8a8a', '#9a9a9a']

export default function DashboardPage() {
  const supabase = createClient()
  const [stats, setStats] = useState({
    totalAssets: 0,
    ordensAbertas: 0,
    ordensAtrasadas: 0,
    proximaManutencao: null as string | null,
  })
  const [manutencaoMes, setManutencaoMes] = useState<any[]>([])
  const [categoriaStats, setCategoriaStats] = useState<any[]>([])
  const [ordensRecentes, setOrdensRecentes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      // Stats gerais
      const [assetsRes, ordensRes, manutRes] = await Promise.all([
        supabase.from('assets').select('id', { count: 'exact', head: true }),
        supabase.from('maintenance_orders').select('id, data_solicitacao, prazo_dias, status'),
        supabase.from('asset_maintenance_rules').select('proxima_execucao').eq('ativo', true).order('proxima_execucao').limit(1),
      ])

      const ordens = ordensRes.data || []
      const abertas = ordens.filter(o => o.status !== 'Concluído').length
      const atrasadas = ordens.filter(o => {
        if (o.status === 'Concluído') return false
        const prazo = addDays(parseISO(o.data_solicitacao), o.prazo_dias)
        return isAfter(new Date(), prazo)
      }).length

      setStats({
        totalAssets: assetsRes.count || 0,
        ordensAbertas: abertas,
        ordensAtrasadas: atrasadas,
        proximaManutencao: manutRes.data?.[0]?.proxima_execucao || null,
      })

      // Manutenções por mês (últimos 6 meses)
      const { data: ordensAll } = await supabase
        .from('maintenance_orders')
        .select('data_solicitacao, status')
        .order('data_solicitacao')

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

      // Categorias
      const { data: catData } = await supabase
        .from('maintenance_orders')
        .select('categoria_id, maintenance_categories(nome)')
      const catMap: Record<string, number> = {}
      catData?.forEach((o: any) => {
        const nome = o.maintenance_categories?.nome || 'Sem categoria'
        catMap[nome] = (catMap[nome] || 0) + 1
      })
      setCategoriaStats(
        Object.entries(catMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([nome, valor]) => ({ nome, valor }))
      )

      // Ordens recentes
      const { data: recentes } = await supabase
        .from('maintenance_orders')
        .select('*, maintenance_categories(nome)')
        .order('created_at', { ascending: false })
        .limit(5)
      setOrdensRecentes(recentes || [])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    )
  }

  const statCards = [
    { label: 'Total de Ativos', value: stats.totalAssets, icon: Package, color: 'text-[#60a5fa]', bg: 'bg-[#152d3d]' },
    { label: 'Ordens Abertas', value: stats.ordensAbertas, icon: Wrench, color: 'text-[#fbbf24]', bg: 'bg-[#3d2c0a]' },
    { label: 'Ordens Atrasadas', value: stats.ordensAtrasadas, icon: AlertTriangle, color: 'text-[#f87171]', bg: 'bg-[#3d1515]' },
    {
      label: 'Próxima Manutenção',
      value: stats.proximaManutencao
        ? format(parseISO(stats.proximaManutencao), 'dd/MM/yy')
        : '—',
      icon: Clock,
      color: 'text-[#4ade80]',
      bg: 'bg-[#153d25]'
    },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Visão geral do sistema — {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="stat-card">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
              <Icon size={18} className={color} strokeWidth={1.75} />
            </div>
            <div>
              <div className="stat-value">{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Manutenções por mês */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={15} className="text-[#888888]" strokeWidth={1.75} />
            <span className="text-sm font-medium text-[#e0e0e0]">Ordens por Mês</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={manutencaoMes} barSize={20}>
              <XAxis dataKey="mes" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} width={25} />
              <Tooltip
                contentStyle={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '8px', color: '#f0f0f0', fontSize: 12 }}
                cursor={{ fill: '#2a2a2a' }}
              />
              <Bar dataKey="total" fill="#4a4a4a" radius={[4, 4, 0, 0]} name="Ordens" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Categorias */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 size={15} className="text-[#888888]" strokeWidth={1.75} />
            <span className="text-sm font-medium text-[#e0e0e0]">Por Categoria</span>
          </div>
          {categoriaStats.length > 0 ? (
            <div className="flex items-center gap-4">
              <PieChart width={140} height={140}>
                <Pie data={categoriaStats} dataKey="valor" cx="50%" cy="50%" outerRadius={60} strokeWidth={2} stroke="#0f0f0f">
                  {categoriaStats.map((_, i) => (
                    <Cell key={i} fill={GRAY_PALETTE[i % GRAY_PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '8px', color: '#f0f0f0', fontSize: 12 }} />
              </PieChart>
              <div className="flex flex-col gap-2 flex-1">
                {categoriaStats.map((cat, i) => (
                  <div key={cat.nome} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: GRAY_PALETTE[i % GRAY_PALETTE.length] }} />
                    <span className="text-[#a0a0a0] truncate flex-1">{cat.nome}</span>
                    <span className="text-[#f0f0f0] font-medium">{cat.valor}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state py-8">
              <p className="text-[#555555] text-sm">Nenhuma ordem registrada</p>
            </div>
          )}
        </div>
      </div>

      {/* Ordens recentes */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-[#e0e0e0]">Ordens Recentes</span>
          <a href="/manutencao" className="text-xs text-[#666666] hover:text-[#888888] transition-colors">Ver todas →</a>
        </div>
        {ordensRecentes.length === 0 ? (
          <div className="empty-state py-6">
            <p className="text-[#555555] text-sm">Nenhuma ordem de serviço</p>
          </div>
        ) : (
          <div className="space-y-2">
            {ordensRecentes.map(ordem => {
              const prazo = addDays(parseISO(ordem.data_solicitacao), ordem.prazo_dias)
              const atrasada = ordem.status !== 'Concluído' && isAfter(new Date(), prazo)
              return (
                <div key={ordem.id} className="flex items-center gap-3 p-3 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] transition-colors">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    atrasada ? 'bg-[#f87171]' :
                    ordem.status === 'Concluído' ? 'bg-[#4ade80]' :
                    ordem.status === 'Em andamento' ? 'bg-[#fbbf24]' : 'bg-[#666666]'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#e0e0e0] truncate">{ordem.descricao}</p>
                    <p className="text-xs text-[#555555]">{(ordem.maintenance_categories as any)?.nome || 'Sem categoria'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`badge text-xs ${
                      atrasada ? 'badge-danger' :
                      ordem.status === 'Concluído' ? 'badge-success' :
                      ordem.status === 'Em andamento' ? 'badge-warning' : 'badge-default'
                    }`}>
                      {atrasada ? 'Atrasado' : ordem.status}
                    </span>
                    <span className="text-xs text-[#555555]">
                      {format(parseISO(ordem.data_solicitacao), 'dd/MM/yy')}
                    </span>
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
