'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MaintenanceOrder, MaintenanceCategory } from '@/types'
import { Plus, Search, Filter, Edit, Trash2, X, AlertTriangle, Clock } from 'lucide-react'
import { format, parseISO, addDays, isAfter, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'

const PRIORIDADES = ['Baixa', 'Normal', 'Alta', 'Urgente']
const STATUS_OPTIONS = ['Aberto', 'Em andamento', 'Aguardando peça', 'Concluído', 'Cancelado']

function getStatusBadge(status: string, atrasada: boolean) {
  if (atrasada) return 'badge-danger'
  if (status === 'Concluído') return 'badge-success'
  if (status === 'Em andamento') return 'badge-warning'
  if (status === 'Aguardando peça') return 'badge-info'
  if (status === 'Cancelado') return 'badge-default'
  return 'badge-default'
}

function getPrioridadeBadge(p: string) {
  if (p === 'Urgente') return 'badge-danger'
  if (p === 'Alta') return 'badge-warning'
  if (p === 'Normal') return 'badge-info'
  return 'badge-default'
}

function isAtrasada(ordem: MaintenanceOrder) {
  if (ordem.status === 'Concluído' || ordem.status === 'Cancelado') return false
  const prazo = addDays(parseISO(ordem.data_solicitacao), ordem.prazo_dias)
  return isAfter(new Date(), prazo)
}

export default function ManutencaoPage() {
  const supabase = createClient()
  const [ordens, setOrdens] = useState<MaintenanceOrder[]>([])
  const [categorias, setCategorias] = useState<MaintenanceCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPrioridade, setFilterPrioridade] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<MaintenanceOrder | null>(null)

  const [form, setForm] = useState({
    prioridade: 'Normal', prazo_dias: 7, descricao: '',
    categoria_id: '', responsavel: '', valor_estimado: '',
    status: 'Aberto', observacao: '', data_solicitacao: new Date().toISOString().split('T')[0],
  })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [ordensRes, catRes] = await Promise.all([
      supabase.from('maintenance_orders').select('*, maintenance_categories(nome)').order('created_at', { ascending: false }),
      supabase.from('maintenance_categories').select('*').order('nome'),
    ])
    setOrdens(ordensRes.data || [])
    setCategorias(catRes.data || [])
    setLoading(false)
  }

  async function handleSave() {
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      ...form,
      data_solicitacao: new Date(form.data_solicitacao).toISOString(),
      categoria_id: form.categoria_id || null,
      created_by: user?.id,
    }

    if (editing) {
      const { error } = await supabase.from('maintenance_orders').update(payload).eq('id', editing.id)
      if (error) { toast.error('Erro ao atualizar'); return }
      toast.success('Ordem atualizada!')
    } else {
      const { error } = await supabase.from('maintenance_orders').insert(payload)
      if (error) { toast.error('Erro ao criar'); return }
      toast.success('Ordem criada!')
    }
    setShowModal(false)
    setEditing(null)
    resetForm()
    loadAll()
  }

  async function handleDelete(id: string) {
    if (!confirm('Deseja excluir esta ordem?')) return
    await supabase.from('maintenance_orders').delete().eq('id', id)
    toast.success('Ordem removida')
    loadAll()
  }

  function openEdit(o: MaintenanceOrder) {
    setEditing(o)
    setForm({
      prioridade: o.prioridade,
      prazo_dias: o.prazo_dias,
      descricao: o.descricao,
      categoria_id: o.categoria_id || '',
      responsavel: o.responsavel || '',
      valor_estimado: o.valor_estimado || '',
      status: o.status,
      observacao: o.observacao || '',
      data_solicitacao: o.data_solicitacao.split('T')[0],
    })
    setShowModal(true)
  }

  function resetForm() {
    setForm({ prioridade: 'Normal', prazo_dias: 7, descricao: '', categoria_id: '', responsavel: '', valor_estimado: '', status: 'Aberto', observacao: '', data_solicitacao: new Date().toISOString().split('T')[0] })
  }

  const filtered = ordens.filter(o => {
    const matchSearch = o.descricao.toLowerCase().includes(search.toLowerCase()) ||
      (o.responsavel || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || o.status === filterStatus ||
      (filterStatus === 'atrasado' && isAtrasada(o))
    const matchPrioridade = filterPrioridade === 'all' || o.prioridade === filterPrioridade
    return matchSearch && matchStatus && matchPrioridade
  })

  const atrasadasCount = ordens.filter(isAtrasada).length

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Ordens de Serviço</h1>
          <p className="page-subtitle">
            {ordens.length} ordem(ns) — {atrasadasCount > 0 && (
              <span className="text-[#f87171]">{atrasadasCount} atrasada(s)</span>
            )}
          </p>
        </div>
        <button id="btn-nova-os" onClick={() => { resetForm(); setEditing(null); setShowModal(true) }} className="btn-primary">
          <Plus size={15} /> Nova O.S.
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555555]" />
          <input className="input pl-9" placeholder="Buscar descrição, responsável..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">Todos status</option>
          <option value="atrasado">⚠ Atrasadas</option>
          {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="input w-auto" value={filterPrioridade} onChange={e => setFilterPrioridade(e.target.value)}>
          <option value="all">Todas prioridades</option>
          {PRIORIDADES.map(p => <option key={p}>{p}</option>)}
        </select>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Clock size={28} className="text-[#555555]" /></div>
          <p className="text-[#555555] text-sm">Nenhuma ordem encontrada</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Descrição</th>
                <th className="hidden md:table-cell">Categoria</th>
                <th>Prioridade</th>
                <th>Status</th>
                <th className="hidden lg:table-cell">Prazo</th>
                <th className="hidden lg:table-cell">Responsável</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ordem => {
                const atrasada = isAtrasada(ordem)
                const prazoDate = addDays(parseISO(ordem.data_solicitacao), ordem.prazo_dias)
                const diasRestantes = differenceInDays(prazoDate, new Date())
                return (
                  <tr key={ordem.id} className={atrasada ? 'bg-[#1a0f0f]' : ''}>
                    <td>
                      <div className="flex items-start gap-2">
                        {atrasada && <AlertTriangle size={13} className="text-[#f87171] flex-shrink-0 mt-0.5" />}
                        <div>
                          <div className="font-medium text-[#f0f0f0] truncate max-w-64">{ordem.descricao}</div>
                          <div className="text-xs text-[#555555]">
                            {format(parseISO(ordem.data_solicitacao), 'dd/MM/yy')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell text-[#888888] text-xs">
                      {(ordem.categoria as any)?.nome || (ordem as any).maintenance_categories?.nome || '—'}
                    </td>
                    <td>
                      <span className={`badge ${getPrioridadeBadge(ordem.prioridade)}`}>{ordem.prioridade}</span>
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadge(ordem.status, atrasada)}`}>
                        {atrasada ? 'Atrasado' : ordem.status}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell text-xs">
                      <div className={atrasada ? 'text-[#f87171]' : diasRestantes <= 2 ? 'text-[#fbbf24]' : 'text-[#888888]'}>
                        {atrasada ? `${Math.abs(diasRestantes)}d em atraso` : `${diasRestantes}d restantes`}
                      </div>
                      <div className="text-[#555555]">{format(prazoDate, 'dd/MM/yy')}</div>
                    </td>
                    <td className="hidden lg:table-cell text-[#888888] text-xs">{ordem.responsavel || '—'}</td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(ordem)} className="btn-icon text-[#888888]"><Edit size={14} /></button>
                        <button onClick={() => handleDelete(ordem.id)} className="btn-icon text-[#f87171]"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal animate-scale-in max-w-xl">
            <div className="modal-header">
              <h2 className="text-sm font-semibold text-[#f0f0f0]">{editing ? 'Editar Ordem' : 'Nova Ordem de Serviço'}</h2>
              <button onClick={() => setShowModal(false)} className="btn-icon text-[#666666]"><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label className="label">Descrição *</label>
                <textarea className="input resize-none h-20" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descreva o serviço necessário..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="input-group">
                  <label className="label">Prioridade</label>
                  <select className="input" value={form.prioridade} onChange={e => setForm(f => ({ ...f, prioridade: e.target.value }))}>
                    {PRIORIDADES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="label">Status</label>
                  <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="input-group">
                  <label className="label">Data de Solicitação</label>
                  <input type="date" className="input" value={form.data_solicitacao} onChange={e => setForm(f => ({ ...f, data_solicitacao: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label className="label">Prazo (dias)</label>
                  <input type="number" className="input" value={form.prazo_dias} min="1" onChange={e => setForm(f => ({ ...f, prazo_dias: parseInt(e.target.value) }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="input-group">
                  <label className="label">Categoria</label>
                  <select className="input" value={form.categoria_id} onChange={e => setForm(f => ({ ...f, categoria_id: e.target.value }))}>
                    <option value="">Selecione...</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="label">Valor Estimado</label>
                  <input className="input" value={form.valor_estimado} onChange={e => setForm(f => ({ ...f, valor_estimado: e.target.value }))} placeholder="R$ 0,00" />
                </div>
              </div>
              <div className="input-group">
                <label className="label">Responsável</label>
                <input className="input" value={form.responsavel} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))} placeholder="Nome do responsável" />
              </div>
              <div className="input-group">
                <label className="label">Observação</label>
                <textarea className="input resize-none h-16" value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} placeholder="Observações adicionais..." />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleSave} className="btn-primary">{editing ? 'Salvar' : 'Criar Ordem'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
