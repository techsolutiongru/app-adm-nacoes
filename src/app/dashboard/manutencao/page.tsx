'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MaintenanceOrder, MaintenanceCategory } from '@/types'
import { Plus, Search, Edit, Trash2, X, AlertTriangle, Clock } from 'lucide-react'
import { format, parseISO, addDays, isAfter, differenceInDays } from 'date-fns'
import toast from 'react-hot-toast'
import ConfirmModal from '@/components/ConfirmModal'

const LOG = (label: string, data: unknown) => console.log(`[Manutenção] ${label}:`, data)

const PRIORIDADES = ['Baixa', 'Normal', 'Alta', 'Urgente']
const STATUS_OPTIONS = ['Aberto', 'Em andamento', 'Aguardando peça', 'Concluído', 'Cancelado']

function isAtrasada(o: MaintenanceOrder) {
  if (o.status === 'Concluído' || o.status === 'Cancelado') return false
  return isAfter(new Date(), addDays(parseISO(o.data_solicitacao), o.prazo_dias))
}

function statusBadge(status: string, atrasada: boolean) {
  if (atrasada) return 'badge-danger'
  if (status === 'Concluído') return 'badge-success'
  if (status === 'Em andamento') return 'badge-warning'
  if (status === 'Aguardando peça') return 'badge-info'
  return 'badge-default'
}

function prioridadeBadge(p: string) {
  if (p === 'Urgente') return 'badge-danger'
  if (p === 'Alta') return 'badge-warning'
  if (p === 'Normal') return 'badge-info'
  return 'badge-default'
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
  const [confirmDelete, setConfirmDelete] = useState<MaintenanceOrder | null>(null)

  const [form, setForm] = useState({
    prioridade: 'Normal', prazo_dias: 7, descricao: '', categoria_id: '',
    responsavel: '', valor_estimado: '', status: 'Aberto', observacao: '',
    data_solicitacao: new Date().toISOString().split('T')[0],
  })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [ordensRes, catRes] = await Promise.all([
      supabase.from('maintenance_orders').select('*, maintenance_categories(nome)').order('created_at', { ascending: false }),
      supabase.from('maintenance_categories').select('*').order('nome'),
    ])
    LOG('ordens', { data: ordensRes.data, error: ordensRes.error })
    LOG('categorias', { data: catRes.data, error: catRes.error })
    if (ordensRes.error) console.error('[Manutenção] ordens erro:', ordensRes.error)
    if (catRes.error) console.error('[Manutenção] categorias erro:', catRes.error)
    setOrdens(ordensRes.data || [])
    setCategorias(catRes.data || [])
    setLoading(false)
  }

  async function handleSave() {
    const payload = { ...form, data_solicitacao: new Date(form.data_solicitacao).toISOString(), categoria_id: form.categoria_id || null, prazo_dias: form.prazo_dias || 7 }
    LOG('payload', payload)
    if (editing) {
      const { data, error } = await supabase.from('maintenance_orders').update(payload).eq('id', editing.id).select()
      LOG('update', { data, error })
      if (error) { console.error(error); toast.error(`Erro ao atualizar: ${error.message}`); return }
      toast.success('Ordem atualizada!')
    } else {
      const { data, error } = await supabase.from('maintenance_orders').insert([payload]).select()
      LOG('insert', { data, error })
      if (error) { console.error(error); toast.error(`Erro ao criar: ${error.message}`); return }
      toast.success('Ordem criada!')
    }
    setShowModal(false); setEditing(null); resetForm(); loadAll()
  }

  async function handleDelete(ordem: MaintenanceOrder) {
    const { error } = await supabase.from('maintenance_orders').delete().eq('id', ordem.id)
    if (error) { console.error(error); toast.error(`Erro ao remover: ${error.message}`); return }
    toast.success('Ordem removida'); setConfirmDelete(null); loadAll()
  }

  function openEdit(o: MaintenanceOrder) {
    setEditing(o)
    setForm({ prioridade: o.prioridade, prazo_dias: o.prazo_dias, descricao: o.descricao, categoria_id: o.categoria_id || '', responsavel: o.responsavel || '', valor_estimado: o.valor_estimado || '', status: o.status, observacao: o.observacao || '', data_solicitacao: o.data_solicitacao.split('T')[0] })
    setShowModal(true)
  }

  function resetForm() { setForm({ prioridade: 'Normal', prazo_dias: 7, descricao: '', categoria_id: '', responsavel: '', valor_estimado: '', status: 'Aberto', observacao: '', data_solicitacao: new Date().toISOString().split('T')[0] }) }

  const filtered = ordens.filter(o => {
    const matchSearch = o.descricao.toLowerCase().includes(search.toLowerCase()) || (o.responsavel || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || o.status === filterStatus || (filterStatus === 'atrasado' && isAtrasada(o))
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
            {ordens.length} ordem(ns) {atrasadasCount > 0 && <span className="text-red-600 font-medium">— {atrasadasCount} atrasada(s)</span>}
          </p>
        </div>
        <button id="btn-nova-os" onClick={() => { resetForm(); setEditing(null); setShowModal(true) }} className="btn-primary">
          <Plus size={15} /> Nova O.S.
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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

      {loading ? (
        <div className="flex justify-center py-16"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon"><Clock size={28} className="text-gray-400" /></div><p className="text-gray-400 text-sm">Nenhuma ordem encontrada</p></div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Descrição</th><th className="hidden md:table-cell">Categoria</th>
                <th>Prioridade</th><th>Status</th>
                <th className="hidden lg:table-cell">Prazo</th><th className="hidden lg:table-cell">Responsável</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ordem => {
                const atrasada = isAtrasada(ordem)
                const prazoDate = addDays(parseISO(ordem.data_solicitacao), ordem.prazo_dias)
                const diasRestantes = differenceInDays(prazoDate, new Date())
                return (
                  <tr key={ordem.id} className={atrasada ? 'bg-red-50' : ''}>
                    <td>
                      <div className="flex items-start gap-2">
                        {atrasada && <AlertTriangle size={13} className="text-red-500 flex-shrink-0 mt-0.5" />}
                        <div>
                          <div className="font-medium text-gray-800 truncate max-w-64">{ordem.descricao}</div>
                          <div className="text-xs text-gray-400">{format(parseISO(ordem.data_solicitacao), 'dd/MM/yy')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell text-gray-500 text-xs">{(ordem as any).maintenance_categories?.nome || '—'}</td>
                    <td><span className={`badge ${prioridadeBadge(ordem.prioridade)}`}>{ordem.prioridade}</span></td>
                    <td><span className={`badge ${statusBadge(ordem.status, atrasada)}`}>{atrasada ? 'Atrasado' : ordem.status}</span></td>
                    <td className="hidden lg:table-cell text-xs">
                      <div className={atrasada ? 'text-red-600 font-medium' : diasRestantes <= 2 ? 'text-amber-600' : 'text-gray-500'}>
                        {atrasada ? `${Math.abs(diasRestantes)}d em atraso` : `${diasRestantes}d restantes`}
                      </div>
                      <div className="text-gray-400">{format(prazoDate, 'dd/MM/yy')}</div>
                    </td>
                    <td className="hidden lg:table-cell text-gray-500 text-xs">{ordem.responsavel || '—'}</td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(ordem)} className="btn-icon" aria-label="Editar"><Edit size={14} /></button>
                        <button onClick={() => setConfirmDelete(ordem)} className="btn-icon" style={{ color: '#dc2626' }} aria-label="Excluir"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal isOpen={!!confirmDelete} title="Excluir Ordem" message={`Excluir "${confirmDelete?.descricao?.slice(0, 60)}"? Esta ação não pode ser desfeita.`} confirmLabel="Excluir" variant="danger" onConfirm={() => confirmDelete && handleDelete(confirmDelete)} onCancel={() => setConfirmDelete(null)} />

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal animate-scale-in max-w-xl">
            <div className="modal-header"><h2 className="text-sm font-semibold text-gray-800">{editing ? 'Editar Ordem' : 'Nova Ordem de Serviço'}</h2><button onClick={() => setShowModal(false)} className="btn-icon"><X size={16} /></button></div>
            <div className="modal-body">
              <div className="input-group"><label className="label">Descrição *</label><textarea className="input resize-none h-20" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descreva o serviço necessário..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="input-group"><label className="label">Prioridade</label><select className="input" value={form.prioridade} onChange={e => setForm(f => ({ ...f, prioridade: e.target.value }))}>{PRIORIDADES.map(p => <option key={p}>{p}</option>)}</select></div>
                <div className="input-group"><label className="label">Status</label><select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>{STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="input-group"><label className="label">Data de Solicitação</label><input type="date" className="input" value={form.data_solicitacao} onChange={e => setForm(f => ({ ...f, data_solicitacao: e.target.value }))} /></div>
                <div className="input-group"><label className="label">Prazo (dias)</label><input type="number" className="input" value={form.prazo_dias} min="1" onChange={e => setForm(f => ({ ...f, prazo_dias: parseInt(e.target.value) || 7 }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="input-group"><label className="label">Categoria</label>
                  <select className="input" value={form.categoria_id} onChange={e => setForm(f => ({ ...f, categoria_id: e.target.value }))}>
                    <option value="">Selecione...</option>
                    {categorias.length === 0 && <option disabled>Carregando...</option>}
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div className="input-group"><label className="label">Valor Estimado</label><input className="input" value={form.valor_estimado} onChange={e => setForm(f => ({ ...f, valor_estimado: e.target.value }))} placeholder="R$ 0,00" /></div>
              </div>
              <div className="input-group"><label className="label">Responsável</label><input className="input" value={form.responsavel} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))} placeholder="Nome do responsável" /></div>
              <div className="input-group"><label className="label">Observação</label><textarea className="input resize-none h-16" value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} placeholder="Observações adicionais..." /></div>
            </div>
            <div className="modal-footer"><button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button><button onClick={handleSave} className="btn-primary">{editing ? 'Salvar' : 'Criar Ordem'}</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
