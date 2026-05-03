'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Volunteer, Location, Service, Schedule, ScheduleItem } from '@/types'
import { Users, MapPin, Calendar, Settings, Plus, Search, Trash2, Edit, X, RefreshCw, Save } from 'lucide-react'
import { format, parseISO, addDays, startOfWeek, endOfWeek, eachDayOfInterval, getDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'

export default function EscalaPage() {
  const [activeTab, setActiveTab] = useState('escala')
  const supabase = createClient()
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  // Escala state
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }))
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([])
  const [generating, setGenerating] = useState(false)

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (activeTab === 'escala') loadSchedule()
  }, [currentWeek, activeTab])

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
    const startStr = format(currentWeek, 'yyyy-MM-dd')
    const endStr = format(end, 'yyyy-MM-dd')

    const { data } = await supabase
      .from('schedule_items')
      .select('*, service:services(*), location:locations(*), volunteer:volunteers(*)')
      .gte('data', startStr)
      .lte('data', endStr)

    setScheduleItems(data || [])
  }

  async function handleGenerateSchedule() {
    setGenerating(true)
    try {
      const startStr = format(currentWeek, 'yyyy-MM-dd')
      const endStr = format(endOfWeek(currentWeek, { weekStartsOn: 0 }), 'yyyy-MM-dd')

      // Clear existing automatic schedule items for this week (keep manual ones like Tuesday if they were marked manual)
      await supabase.from('schedule_items')
        .delete()
        .gte('data', startStr)
        .lte('data', endStr)
        .eq('manual', false)

      const diasDaSemana = eachDayOfInterval({ start: currentWeek, end: endOfWeek(currentWeek, { weekStartsOn: 0 }) })
      const novosItens = []
      let lastVolIdx = 0 // Simples rotação

      for (const data of diasDaSemana) {
        const diaSemana = getDay(data)
        // Pular terça-feira (manual)
        if (diaSemana === 2) continue

        const cultosDoDia = services.filter(s => s.dia_semana === diaSemana)
        if (cultosDoDia.length === 0) continue

        for (const culto of cultosDoDia) {
          const locaisCulto = locations.filter(l => l.tipo_culto === culto.tipo)
          let volsDisponiveis = [...volunteers].filter(v => v.ativo)
          
          // A regra pedia sem repetição no dia, então vamos embaralhar ou rotacionar
          // Para simplificar a rotação neste MVP:
          for (const local of locaisCulto) {
            for (let i = 0; i < local.quantidade_pessoas; i++) {
               if (volsDisponiveis.length === 0) break;
               // Pega o próximo voluntário
               const vol = volsDisponiveis[lastVolIdx % volsDisponiveis.length]
               novosItens.push({
                 service_id: culto.id,
                 location_id: local.id,
                 volunteer_id: vol.id,
                 data: format(data, 'yyyy-MM-dd'),
                 manual: false
               })
               // Remove dos disponíveis para não repetir no mesmo dia
               volsDisponiveis = volsDisponiveis.filter(v => v.id !== vol.id)
               lastVolIdx++
            }
          }
        }
      }

      if (novosItens.length > 0) {
         // Create dummy schedule to link items (simplification)
         const { data: schedData } = await supabase.from('schedules').insert({
            nome: `Escala Semana ${format(currentWeek, 'dd/MM/yyyy')}`,
            data_inicio: startStr,
            data_fim: endStr,
            status: 'Publicado'
         }).select().single()

         if (schedData) {
            const itemsToInsert = novosItens.map(i => ({...i, schedule_id: schedData.id}))
            await supabase.from('schedule_items').insert(itemsToInsert)
         }
      }

      toast.success('Escala gerada com sucesso!')
      loadSchedule()
    } catch (e) {
      toast.error('Erro ao gerar escala')
      console.error(e)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Escala de Voluntários</h1>
          <p className="page-subtitle">Gestão de voluntários, postos e escalas</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#333333] mb-6">
        {[
          { id: 'escala', label: 'Escala Semanal', icon: Calendar },
          { id: 'voluntarios', label: 'Voluntários', icon: Users },
          { id: 'locais', label: 'Locais/Postos', icon: MapPin },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id ? 'border-[#f0f0f0] text-[#f0f0f0]' : 'border-transparent text-[#888888] hover:text-[#e0e0e0]'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="spinner" /></div>
      ) : (
        <>
          {activeTab === 'escala' && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <button onClick={() => setCurrentWeek(w => addDays(w, -7))} className="btn-secondary py-1.5 px-3">&larr; Anterior</button>
                  <span className="text-[#f0f0f0] font-medium">
                    {format(currentWeek, 'dd/MM/yyyy')} - {format(endOfWeek(currentWeek, { weekStartsOn: 0 }), 'dd/MM/yyyy')}
                  </span>
                  <button onClick={() => setCurrentWeek(w => addDays(w, 7))} className="btn-secondary py-1.5 px-3">Próxima &rarr;</button>
                </div>
                <button onClick={handleGenerateSchedule} disabled={generating} className="btn-primary">
                  {generating ? <span className="spinner" /> : <RefreshCw size={14} />}
                  Gerar Automático
                </button>
              </div>

              {/* Weekly View */}
              <div className="grid grid-cols-7 gap-2">
                {eachDayOfInterval({ start: currentWeek, end: endOfWeek(currentWeek, { weekStartsOn: 0 }) }).map(dia => {
                  const dataStr = format(dia, 'yyyy-MM-dd')
                  const itensDia = scheduleItems.filter(i => i.data === dataStr)
                  const isTerca = getDay(dia) === 2

                  return (
                    <div key={dataStr} className="card p-3 min-h-[300px]">
                      <div className="text-center pb-2 border-b border-[#333333] mb-2">
                        <div className="text-[#f0f0f0] font-medium capitalize">{format(dia, 'EEEE', { locale: ptBR })}</div>
                        <div className="text-[#888888] text-xs">{format(dia, 'dd/MM')}</div>
                        {isTerca && <span className="badge badge-warning mt-1 text-[10px]">Manual</span>}
                      </div>
                      
                      <div className="space-y-3">
                         {itensDia.length === 0 ? (
                            <div className="text-center text-[#555555] text-xs py-4">Sem escala</div>
                         ) : (
                            services.filter(s => s.dia_semana === getDay(dia)).map(srv => {
                               const itensCulto = itensDia.filter(i => i.service_id === srv.id)
                               if (itensCulto.length === 0) return null
                               return (
                                  <div key={srv.id} className="text-xs">
                                     <div className="font-semibold text-[#a0a0a0] mb-1">{srv.nome}</div>
                                     {locations.filter(l => l.tipo_culto === srv.tipo).map(loc => {
                                        const vols = itensCulto.filter(i => i.location_id === loc.id)
                                        if (vols.length === 0) return null
                                        return (
                                           <div key={loc.id} className="bg-[#2a2a2a] p-1.5 rounded mb-1 border border-[#333333]">
                                              <span className="text-[#888888]">{loc.nome}:</span>{' '}
                                              <span className="text-[#e0e0e0]">
                                                {vols.map(v => v.volunteer?.numero || '?').join(' / ')}
                                              </span>
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
          )}

          {activeTab === 'voluntarios' && (
            <div className="animate-fade-in">
               <div className="flex justify-end mb-4">
                  <button className="btn-primary" onClick={() => toast('Em breve: Cadastro completo')}><Plus size={14}/> Novo Voluntário</button>
               </div>
               <div className="table-wrapper">
                  <table>
                     <thead><tr><th>Nº</th><th>Nome</th><th>Status</th></tr></thead>
                     <tbody>
                        {volunteers.map(v => (
                           <tr key={v.id}>
                              <td className="font-medium text-[#f0f0f0]">{v.numero}</td>
                              <td>{v.nome}</td>
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
                  <button className="btn-primary" onClick={() => toast('Em breve: Cadastro de Locais')}><Plus size={14}/> Novo Local</button>
               </div>
               <div className="table-wrapper">
                  <table>
                     <thead><tr><th>Local</th><th>Tipo Culto</th><th>Qtd Pessoas</th></tr></thead>
                     <tbody>
                        {locations.map(l => (
                           <tr key={l.id}>
                              <td className="font-medium text-[#f0f0f0]">{l.nome}</td>
                              <td className="capitalize">{l.tipo_culto}</td>
                              <td>{l.quantidade_pessoas}</td>
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
