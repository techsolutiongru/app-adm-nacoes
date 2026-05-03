'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Volunteer, Location, Service, ScheduleItem } from '@/types'
import { Users, MapPin, Calendar, Plus, RefreshCw } from 'lucide-react'
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, getDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'

export default function EscalaPage() {
  const [activeTab, setActiveTab] = useState('escala')
  const supabase = createClient()
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }))
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([])
  const [generating, setGenerating] = useState(false)

  useEffect(() => { loadData() }, [])
  useEffect(() => { if (activeTab === 'escala') loadSchedule() }, [currentWeek, activeTab])

  async function loadData() {
    setLoading(true)
    const [volRes, locRes, srvRes] = await Promise.all([
      supabase.from('volunteers').select('*').order('numero'),
      supabase.from('locations').select('*').order('nome'),
      supabase.from('services').select('*').order('dia_semana')
    ])
    setVolunteers(volRes.data || [])
    setLocations(locRes.data || [])
    setServices(srvRes.data || [])
    setLoading(false)
  }

  async function loadSchedule() {
    const end = endOfWeek(currentWeek, { weekStartsOn: 0 })
    const { data } = await supabase.from('schedule_items')
      .select('*, service:services(*), location:locations(*), volunteer:volunteers(*)')
      .gte('data', format(currentWeek, 'yyyy-MM-dd'))
      .lte('data', format(end, 'yyyy-MM-dd'))
    setScheduleItems(data || [])
  }

  async function handleGenerateSchedule() {
    setGenerating(true)
    try {
      const startStr = format(currentWeek, 'yyyy-MM-dd')
      const endStr = format(endOfWeek(currentWeek, { weekStartsOn: 0 }), 'yyyy-MM-dd')
      await supabase.from('schedule_items').delete().gte('data', startStr).lte('data', endStr).eq('manual', false)
      const diasDaSemana = eachDayOfInterval({ start: currentWeek, end: endOfWeek(currentWeek, { weekStartsOn: 0 }) })
      const novosItens: any[] = []
      let lastVolIdx = 0
      for (const data of diasDaSemana) {
        const diaSemana = getDay(data)
        if (diaSemana === 2) continue
        const cultosDoDia = services.filter(s => s.dia_semana === diaSemana)
        for (const culto of cultosDoDia) {
          const locaisCulto = locations.filter(l => l.tipo_culto === culto.tipo)
          let volsDisponiveis = volunteers.filter(v => v.ativo)
          for (const local of locaisCulto) {
            for (let i = 0; i < local.quantidade_pessoas; i++) {
              if (volsDisponiveis.length === 0) break
              const vol = volsDisponiveis[lastVolIdx % volsDisponiveis.length]
              novosItens.push({ service_id: culto.id, location_id: local.id, volunteer_id: vol.id, data: format(data, 'yyyy-MM-dd'), manual: false })
              volsDisponiveis = volsDisponiveis.filter(v => v.id !== vol.id)
              lastVolIdx++
            }
          }
        }
      }
      if (novosItens.length > 0) {
        const { data: schedData } = await supabase.from('schedules').insert({ nome: `Escala Semana ${format(currentWeek, 'dd/MM/yyyy')}`, data_inicio: startStr, data_fim: endStr, status: 'Publicado' }).select().single()
        if (schedData) await supabase.from('schedule_items').insert(novosItens.map(i => ({ ...i, schedule_id: schedData.id })))
      }
      toast.success('Escala gerada!')
      loadSchedule()
    } catch (e) {
      console.error(e)
      toast.error('Erro ao gerar escala')
    } finally { setGenerating(false) }
  }

  const tabs = [
    { id: 'escala', label: 'Escala Semanal', icon: Calendar },
    { id: 'voluntarios', label: 'Voluntários', icon: Users },
    { id: 'locais', label: 'Locais/Postos', icon: MapPin },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Escala de Voluntários</h1>
          <p className="page-subtitle">Gestão de voluntários, postos e escalas</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-gray-800 text-gray-800' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            <tab.icon size={16} />{tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="spinner" /></div>
      ) : (
        <>
          {activeTab === 'escala' && (
            <div className="animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => setCurrentWeek(w => addDays(w, -7))} className="btn-secondary py-1.5 px-3">← Anterior</button>
                  <span className="text-gray-700 font-medium text-sm">{format(currentWeek, 'dd/MM/yyyy')} - {format(endOfWeek(currentWeek, { weekStartsOn: 0 }), 'dd/MM/yyyy')}</span>
                  <button onClick={() => setCurrentWeek(w => addDays(w, 7))} className="btn-secondary py-1.5 px-3">Próxima →</button>
                </div>
                <button onClick={handleGenerateSchedule} disabled={generating} className="btn-primary">
                  {generating ? <span className="spinner" /> : <RefreshCw size={14} />} Gerar Automático
                </button>
              </div>
              {/* Responsive scroll */}
              <div className="overflow-x-auto pb-2">
                <div className="grid grid-cols-7 gap-2 min-w-[700px]">
                  {eachDayOfInterval({ start: currentWeek, end: endOfWeek(currentWeek, { weekStartsOn: 0 }) }).map(dia => {
                    const dataStr = format(dia, 'yyyy-MM-dd')
                    const itensDia = scheduleItems.filter(i => i.data === dataStr)
                    const isTerca = getDay(dia) === 2
                    return (
                      <div key={dataStr} className="card p-3 min-h-[200px]">
                        <div className="text-center pb-2 border-b border-gray-100 mb-2">
                          <div className="text-gray-700 font-medium text-xs capitalize">{format(dia, 'EEEE', { locale: ptBR })}</div>
                          <div className="text-gray-400 text-xs">{format(dia, 'dd/MM')}</div>
                          {isTerca && <span className="badge badge-warning mt-1 text-[10px]">Manual</span>}
                        </div>
                        <div className="space-y-2">
                          {itensDia.length === 0 ? (
                            <div className="text-center text-gray-300 text-xs py-4">Sem escala</div>
                          ) : (
                            services.filter(s => s.dia_semana === getDay(dia)).map(srv => {
                              const itensCulto = itensDia.filter(i => i.service_id === srv.id)
                              if (itensCulto.length === 0) return null
                              return (
                                <div key={srv.id} className="text-xs">
                                  <div className="font-semibold text-gray-500 mb-1">{srv.nome}</div>
                                  {locations.filter(l => l.tipo_culto === srv.tipo).map(loc => {
                                    const vols = itensCulto.filter(i => i.location_id === loc.id)
                                    if (vols.length === 0) return null
                                    return (
                                      <div key={loc.id} className="bg-gray-50 p-1.5 rounded mb-1 border border-gray-100">
                                        <span className="text-gray-400">{loc.nome}:</span>{' '}
                                        <span className="text-gray-700 font-medium">{vols.map(v => v.volunteer?.numero || '?').join(' / ')}</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              )
                            })
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'voluntarios' && (
            <div className="animate-fade-in">
              <div className="flex justify-end mb-4">
                <button className="btn-primary" onClick={() => toast('Cadastro de voluntários em breve')}><Plus size={14} /> Novo Voluntário</button>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Nº</th><th>Nome</th><th>Status</th></tr></thead>
                  <tbody>
                    {volunteers.map(v => (
                      <tr key={v.id}>
                        <td className="font-medium text-gray-800">{v.numero}</td>
                        <td className="text-gray-700">{v.nome}</td>
                        <td><span className={`badge ${v.ativo ? 'badge-success' : 'badge-danger'}`}>{v.ativo ? 'Ativo' : 'Inativo'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'locais' && (
            <div className="animate-fade-in">
              <div className="flex justify-end mb-4">
                <button className="btn-primary" onClick={() => toast('Cadastro de locais em breve')}><Plus size={14} /> Novo Local</button>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Local</th><th>Tipo Culto</th><th>Qtd Pessoas</th></tr></thead>
                  <tbody>
                    {locations.map(l => (
                      <tr key={l.id}>
                        <td className="font-medium text-gray-800">{l.nome}</td>
                        <td className="capitalize text-gray-600">{l.tipo_culto}</td>
                        <td className="text-gray-600">{l.quantidade_pessoas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
